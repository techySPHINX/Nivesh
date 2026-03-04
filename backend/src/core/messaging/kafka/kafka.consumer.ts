import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, Producer, EachMessagePayload } from 'kafkajs';
import { getDLQTopic } from './topics.enum';

const MAX_RETRIES = 3;

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private kafka: Kafka;
  private consumer: Consumer;
  private dlqProducer: Producer;
  private readonly handlers = new Map<string, (message: any) => Promise<void>>();
  private isRunning = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      this.kafka = new Kafka({
        clientId: this.configService.get<string>('kafka.clientId') || 'nivesh-backend',
        brokers: this.configService.get<string[]>('kafka.brokers') || ['localhost:29092'],
        sasl: this.configService.get('kafka.sasl'),
        retry: {
          initialRetryTime: 300,
          retries: 10,
        },
      });

      this.consumer = this.kafka.consumer({
        groupId: this.configService.get<string>('kafka.groupId') || 'nivesh-consumer-group',
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
      });

      this.dlqProducer = this.kafka.producer();

      await Promise.all([
        this.consumer.connect(),
        this.dlqProducer.connect(),
      ]);
      this.logger.log('✅ Kafka Consumer connected successfully');
    } catch (error) {
      this.logger.error('❌ Failed to connect Kafka Consumer', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await Promise.all([
      this.consumer?.disconnect(),
      this.dlqProducer?.disconnect(),
    ]);
    this.logger.log('Kafka Consumer disconnected');
  }

  async subscribe(topic: string, handler: (message: any) => Promise<void>): Promise<void> {
    this.handlers.set(topic, handler);
    await this.consumer.subscribe({ topic, fromBeginning: false });

    // consumer.run() must only be called once; subsequent subscribe() calls
    // just register the topic + handler — the shared eachMessage dispatcher
    // already routes by topic.
    if (!this.isRunning) {
      this.isRunning = true;
      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          const { topic, partition, message } = payload;
          const handler = this.handlers.get(topic);

          if (handler && message.value) {
            let attempt = 0;
            while (attempt < MAX_RETRIES) {
              try {
                const parsedMessage = JSON.parse(message.value.toString());
                await handler(parsedMessage);
                this.logger.debug(`Processed message from topic: ${topic}`);
                return;
              } catch (error) {
                attempt++;
                this.logger.warn(
                  `Retry ${attempt}/${MAX_RETRIES} for topic ${topic}, partition ${partition}, offset ${message.offset}`,
                );
                if (attempt >= MAX_RETRIES) {
                  await this.sendToDLQ(topic, message, error);
                }
              }
            }
          }
        },
      });
    }

    this.logger.log(`Subscribed to topic: ${topic}`);
  }

  private async sendToDLQ(
    originalTopic: string,
    message: any,
    error: any,
  ): Promise<void> {
    const dlqTopic = getDLQTopic(originalTopic);
    if (!dlqTopic) {
      this.logger.error(
        `No DLQ topic configured for ${originalTopic}. Message dropped.`,
      );
      return;
    }

    try {
      await this.dlqProducer.send({
        topic: dlqTopic,
        messages: [
          {
            key: message.key,
            value: message.value,
            headers: {
              ...message.headers,
              'x-original-topic': originalTopic,
              'x-error-message': String(error?.message ?? error),
              'x-failed-at': new Date().toISOString(),
              'x-retry-count': String(MAX_RETRIES),
            },
          },
        ],
      });
      this.logger.warn(
        `Message from ${originalTopic} sent to DLQ: ${dlqTopic}`,
      );
    } catch (dlqError) {
      this.logger.error(
        `Failed to send message to DLQ ${dlqTopic}`,
        dlqError,
      );
    }
  }
}
