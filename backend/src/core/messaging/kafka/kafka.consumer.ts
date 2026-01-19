import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private kafka: Kafka;
  private consumer: Consumer;
  private readonly handlers = new Map<string, (message: any) => Promise<void>>();

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      this.kafka = new Kafka({
        clientId: this.configService.get<string>('kafka.clientId') || 'nivesh-backend',
        brokers: this.configService.get<string[]>('kafka.brokers') || ['localhost:29092'],
        sasl: this.configService.get('kafka.sasl'),
      });

      this.consumer = this.kafka.consumer({
        groupId: this.configService.get<string>('kafka.groupId') || 'nivesh-consumer-group',
      });

      await this.consumer.connect();
      this.logger.log('✅ Kafka Consumer connected successfully');
    } catch (error) {
      this.logger.error('❌ Failed to connect Kafka Consumer', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.consumer) {
      await this.consumer.disconnect();
      this.logger.log('Kafka Consumer disconnected');
    }
  }

  async subscribe(topic: string, handler: (message: any) => Promise<void>): Promise<void> {
    this.handlers.set(topic, handler);
    await this.consumer.subscribe({ topic, fromBeginning: false });

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        const { topic, message } = payload;
        const handler = this.handlers.get(topic);

        if (handler && message.value) {
          try {
            const parsedMessage = JSON.parse(message.value.toString());
            await handler(parsedMessage);
            this.logger.debug(`Processed message from topic: ${topic}`);
          } catch (error) {
            this.logger.error(`Failed to process message from topic: ${topic}`, error);
          }
        }
      },
    });

    this.logger.log(`Subscribed to topic: ${topic}`);
  }
}
