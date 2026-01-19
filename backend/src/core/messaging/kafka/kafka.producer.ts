import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import { KafkaTopic } from './topics.enum';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka: Kafka;
  private producer: Producer;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      this.kafka = new Kafka({
        clientId: this.configService.get<string>('kafka.clientId') || 'nivesh-backend',
        brokers: this.configService.get<string[]>('kafka.brokers') || ['localhost:29092'],
        sasl: this.configService.get('kafka.sasl'),
      });

      this.producer = this.kafka.producer();
      await this.producer.connect();
      this.logger.log('✅ Kafka Producer connected successfully');
    } catch (error) {
      this.logger.error('❌ Failed to connect Kafka Producer', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.producer) {
      await this.producer.disconnect();
      this.logger.log('Kafka Producer disconnected');
    }
  }

  async publish(topic: KafkaTopic | string, message: any, key?: string): Promise<void> {
    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key,
            value: JSON.stringify(message),
            timestamp: Date.now().toString(),
          },
        ],
      });

      this.logger.debug(`Published message to topic: ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to publish message to topic: ${topic}`, error);
      throw error;
    }
  }

  async publishBatch(topic: KafkaTopic | string, messages: any[]): Promise<void> {
    try {
      const kafkaMessages = messages.map((msg) => ({
        value: JSON.stringify(msg),
        timestamp: Date.now().toString(),
      }));

      await this.producer.send({
        topic,
        messages: kafkaMessages,
      });

      this.logger.debug(`Published ${messages.length} messages to topic: ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to publish batch to topic: ${topic}`, error);
      throw error;
    }
  }
}
