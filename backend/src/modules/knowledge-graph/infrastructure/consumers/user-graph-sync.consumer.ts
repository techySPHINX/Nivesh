import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserCreatedEvent } from '../../../user/domain/events/user.events';
import { GraphNode, NodeType } from '../../domain';
import { DeadLetterQueueService } from '../services/dead-letter-queue.service';
import { IKnowledgeGraphRepository } from '../../domain/repositories/knowledge-graph.repository.interface';
import { Inject } from '@nestjs/common';

/**
 * Kafka Consumer for User Graph Synchronization
 * Listens to user events and creates/updates nodes in Neo4j
 * 
 * Events handled:
 * - UserCreatedEvent: Create User node
 * - UserUpdatedEvent: Update User node properties
 * - UserDeletedEvent: Delete User node and relationships
 */
@EventsHandler(UserCreatedEvent)
@Injectable()
export class UserGraphSyncConsumer implements IEventHandler<UserCreatedEvent> {
  private readonly logger = new Logger(UserGraphSyncConsumer.name);
  private readonly eventAttempts = new Map<string, number>();

  constructor(
    @Inject('IKnowledgeGraphRepository')
    private readonly graphRepository: IKnowledgeGraphRepository,
    private readonly dlqService: DeadLetterQueueService,
  ) { }

  /**
   * Handle user created event
   * Creates User node in knowledge graph
   */
  async handle(event: UserCreatedEvent): Promise<void> {
    const eventKey = `user_created_${event.userId}`;
    const attemptCount = (this.eventAttempts.get(eventKey) || 0) + 1;
    this.eventAttempts.set(eventKey, attemptCount);

    try {
      this.logger.log(`Syncing user to knowledge graph: ${event.userId} (attempt ${attemptCount})`);

      // Create User node
      const userNode = GraphNode.create(NodeType.USER, {
        email: event.email,
        phoneNumber: event.phoneNumber,
        riskProfile: 'moderate', // Default risk profile
        monthlyIncome: 0,
        metadata: {
          source: 'user-service',
          synced: true,
          syncedAt: new Date().toISOString(),
        },
      });

      // Persist to Neo4j
      await this.graphRepository.createNode(userNode);

      this.logger.log(`User node created successfully: ${event.userId}`);

      // Clear attempt count on success
      this.eventAttempts.delete(eventKey);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to sync user to knowledge graph: ${event.userId} (attempt ${attemptCount})`,
        errorObj.stack,
      );

      // Send to DLQ if max retries reached
      if (this.dlqService.shouldSendToDLQ(attemptCount)) {
        await this.dlqService.sendToDeadLetterQueue(
          'user.events',
          event,
          errorObj,
          attemptCount,
        );
        this.eventAttempts.delete(eventKey);
      }

      // Don't throw - we don't want to stop event processing
    }
  }

  /**
   * Handle user updated event
   * Updates User node properties in Neo4j
   */
  async handleUserUpdated(event: any): Promise<void> {
    const eventKey = `user_updated_${event.userId}`;
    const attemptCount = (this.eventAttempts.get(eventKey) || 0) + 1;
    this.eventAttempts.set(eventKey, attemptCount);

    try {
      this.logger.log(`Updating user in knowledge graph: ${event.userId}`);

      // Find existing node
      const existingNode = await this.graphRepository.findNodeById(event.userId);

      if (existingNode) {
        existingNode.updateProperties({
          email: event.email,
          riskProfile: event.riskProfile,
          monthlyIncome: event.monthlyIncome,
          metadata: {
            ...existingNode.properties.metadata,
            lastUpdated: new Date().toISOString(),
          },
        });
        await this.graphRepository.updateNode(existingNode);
      } else {
        this.logger.warn(`User node not found for update: ${event.userId}`);
      }

      this.logger.log(`User node updated successfully: ${event.userId}`);
      this.eventAttempts.delete(eventKey);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to update user in knowledge graph: ${event.userId}`,
        errorObj.stack,
      );

      if (this.dlqService.shouldSendToDLQ(attemptCount)) {
        await this.dlqService.sendToDeadLetterQueue(
          'user.events',
          event,
          errorObj,
          attemptCount,
        );
        this.eventAttempts.delete(eventKey);
      }
    }
  }

  /**
   * Handle user deleted event
   * Removes User node and all relationships from Neo4j
   */
  async handleUserDeleted(event: any): Promise<void> {
    const eventKey = `user_deleted_${event.userId}`;
    const attemptCount = (this.eventAttempts.get(eventKey) || 0) + 1;
    this.eventAttempts.set(eventKey, attemptCount);

    try {
      this.logger.log(`Deleting user from knowledge graph: ${event.userId}`);

      // Delete node and all relationships
      await this.graphRepository.deleteNode(event.userId);

      this.logger.log(`User node deleted successfully: ${event.userId}`);
      this.eventAttempts.delete(eventKey);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to delete user from knowledge graph: ${event.userId}`,
        errorObj.stack,
      );

      if (this.dlqService.shouldSendToDLQ(attemptCount)) {
        await this.dlqService.sendToDeadLetterQueue(
          'user.events',
          event,
          errorObj,
          attemptCount,
        );
        this.eventAttempts.delete(eventKey);
      }
    }
  }
}
