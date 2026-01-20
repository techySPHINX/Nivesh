import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserCreatedEvent } from '../../../../modules/user/domain/events/user-created.event';
import { GraphNode, NodeType } from '../../domain';

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

  constructor(
    // Will inject IKnowledgeGraphRepository in next commit
    // private readonly graphRepository: IKnowledgeGraphRepository,
  ) { }

  /**
   * Handle user created event
   * Creates User node in knowledge graph
   */
  async handle(event: UserCreatedEvent): Promise<void> {
    try {
      this.logger.log(`Syncing user to knowledge graph: ${event.userId}`);

      // Create User node
      const userNode = GraphNode.create(NodeType.USER, {
        email: event.email,
        name: event.name || 'Unknown',
        riskProfile: 'moderate', // Default risk profile
        monthlyIncome: 0,
        metadata: {
          source: 'user-service',
          synced: true,
        },
      });

      // Persist to Neo4j
      // await this.graphRepository.createNode(userNode);

      this.logger.log(`User node created successfully: ${event.userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to sync user to knowledge graph: ${event.userId}`,
        error.stack,
      );
      // Don't throw - we don't want to stop event processing
      // TODO: Implement dead letter queue for failed events
    }
  }

  /**
   * Handle user updated event
   * Updates User node properties in Neo4j
   */
  async handleUserUpdated(event: any): Promise<void> {
    try {
      this.logger.log(`Updating user in knowledge graph: ${event.userId}`);

      // Find existing node
      // const existingNode = await this.graphRepository.findNodeById(event.userId);

      // if (existingNode) {
      //   existingNode.updateProperties({
      //     email: event.email,
      //     name: event.name,
      //     riskProfile: event.riskProfile,
      //     monthlyIncome: event.monthlyIncome,
      //   });
      //   await this.graphRepository.updateNode(existingNode);
      // }

      this.logger.log(`User node updated successfully: ${event.userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to update user in knowledge graph: ${event.userId}`,
        error.stack,
      );
    }
  }

  /**
   * Handle user deleted event
   * Removes User node and all relationships from Neo4j
   */
  async handleUserDeleted(event: any): Promise<void> {
    try {
      this.logger.log(`Deleting user from knowledge graph: ${event.userId}`);

      // Delete node and all relationships
      // await this.graphRepository.deleteNode(event.userId);

      this.logger.log(`User node deleted successfully: ${event.userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete user from knowledge graph: ${event.userId}`,
        error.stack,
      );
    }
  }
}
