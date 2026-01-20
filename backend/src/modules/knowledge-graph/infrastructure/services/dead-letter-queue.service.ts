import { Injectable, Logger } from '@nestjs/common';
import { KafkaProducerService } from '../../../../core/messaging/kafka/kafka.producer';

/**
 * Dead Letter Queue Service
 * Handles failed event processing by sending events to a DLQ topic
 * for later retry or manual intervention
 */
@Injectable()
export class DeadLetterQueueService {
  private readonly logger = new Logger(DeadLetterQueueService.name);
  private readonly DLQ_TOPIC = 'nivesh.dlq.events';
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor(private readonly kafkaProducer: KafkaProducerService) { }

  /**
   * Send failed event to DLQ
   */
  async sendToDeadLetterQueue(
    originalTopic: string,
    event: any,
    error: Error,
    attemptCount: number = 1,
  ): Promise<void> {
    try {
      const dlqMessage = {
        originalTopic,
        originalEvent: event,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        failedAt: new Date().toISOString(),
        attemptCount,
        maxRetries: this.MAX_RETRY_ATTEMPTS,
      };

      await this.kafkaProducer.publish(this.DLQ_TOPIC, dlqMessage);

      this.logger.warn(
        `Event sent to DLQ after ${attemptCount} attempts. Topic: ${originalTopic}`,
      );
    } catch (dlqError) {
      this.logger.error('Failed to send event to DLQ', dlqError);
      // Log to persistent storage or alerting system
    }
  }

  /**
   * Check if event should be sent to DLQ
   */
  shouldSendToDLQ(attemptCount: number): boolean {
    return attemptCount >= this.MAX_RETRY_ATTEMPTS;
  }

  /**
   * Get retry delay in milliseconds (exponential backoff)
   */
  getRetryDelay(attemptCount: number): number {
    const baseDelay = 1000; // 1 second
    return baseDelay * Math.pow(2, attemptCount - 1);
  }
}
