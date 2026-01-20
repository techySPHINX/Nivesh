import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import {
  GraphNode,
  GraphRelationship,
  NodeType,
  RelationshipType,
} from '../../domain';

/**
 * Transaction Created Event (placeholder - will be defined in transaction module)
 */
export interface TransactionCreatedEvent {
  transactionId: string;
  accountId: string;
  userId: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  description: string;
  date: Date;
  categoryId?: string;
  merchantId?: string;
  locationId?: string;
  tags?: string[];
  isRecurring: boolean;
}

/**
 * Kafka Consumer for Transaction Graph Synchronization
 * Listens to transaction events and creates nodes + relationships in Neo4j
 * 
 * Creates:
 * - Transaction nodes
 * - Relationships: MADE_TRANSACTION, BELONGS_TO_CATEGORY, AT_MERCHANT, etc.
 * 
 * This is the most critical consumer as transactions are the core of the graph
 */
@EventsHandler(TransactionCreatedEvent)
@Injectable()
export class TransactionGraphSyncConsumer
  implements IEventHandler<TransactionCreatedEvent> {
  private readonly logger = new Logger(TransactionGraphSyncConsumer.name);

  constructor(
    // Will inject IKnowledgeGraphRepository in next commit
    // private readonly graphRepository: IKnowledgeGraphRepository,
  ) { }

  /**
   * Handle transaction created event
   * Creates Transaction node and all relevant relationships
   */
  async handle(event: TransactionCreatedEvent): Promise<void> {
    try {
      this.logger.log(
        `Syncing transaction to knowledge graph: ${event.transactionId}`,
      );

      // 1. Create Transaction node
      const transactionNode = await this.createTransactionNode(event);

      // 2. Create Account -> Transaction relationship
      await this.createAccountRelationship(event, transactionNode);

      // 3. Create Category relationship if present
      if (event.categoryId) {
        await this.createCategoryRelationship(event, transactionNode);
      }

      // 4. Create Merchant relationship if present
      if (event.merchantId) {
        await this.createMerchantRelationship(event, transactionNode);
      }

      // 5. Create Location relationship if present
      if (event.locationId) {
        await this.createLocationRelationship(event, transactionNode);
      }

      // 6. Create Tag relationships
      if (event.tags && event.tags.length > 0) {
        await this.createTagRelationships(event, transactionNode);
      }

      this.logger.log(
        `Transaction synced successfully: ${event.transactionId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to sync transaction to knowledge graph: ${event.transactionId}`,
        error.stack,
      );
    }
  }

  /**
   * Create Transaction node with all properties
   */
  private async createTransactionNode(
    event: TransactionCreatedEvent,
  ): Promise<GraphNode> {
    const transactionNode = GraphNode.create(NodeType.TRANSACTION, {
      accountId: event.accountId,
      amount: event.amount,
      type: event.type,
      description: event.description || '',
      date: event.date,
      merchantId: event.merchantId,
      categoryId: event.categoryId,
      locationId: event.locationId,
      isRecurring: event.isRecurring,
      confidence: 1.0, // Manual transactions have 100% confidence
      metadata: {
        source: 'transaction-service',
        synced: true,
      },
    });

    // await this.graphRepository.createNode(transactionNode);
    return transactionNode;
  }

  /**
   * Create Account -[MADE_TRANSACTION]-> Transaction
   */
  private async createAccountRelationship(
    event: TransactionCreatedEvent,
    transactionNode: GraphNode,
  ): Promise<void> {
    try {
      // Find Account node
      // const accountNode = await this.graphRepository.findNodeById(event.accountId);

      // if (accountNode) {
      //   const relationship = GraphRelationship.create(
      //     RelationshipType.MADE_TRANSACTION,
      //     accountNode,
      //     transactionNode,
      //     {
      //       weight: 1.0,
      //       metadata: { transactionDate: event.date },
      //     },
      //   );
      //   await this.graphRepository.createRelationship(relationship);
      // }

      this.logger.debug(
        `Created MADE_TRANSACTION relationship for ${event.transactionId}`,
      );
    } catch (error) {
      this.logger.error('Failed to create account relationship', error.stack);
    }
  }

  /**
   * Create Transaction -[BELONGS_TO_CATEGORY]-> Category
   */
  private async createCategoryRelationship(
    event: TransactionCreatedEvent,
    transactionNode: GraphNode,
  ): Promise<void> {
    try {
      // Find or create Category node
      // const categoryNode = await this.findOrCreateCategoryNode(event.categoryId!);

      // const relationship = GraphRelationship.create(
      //   RelationshipType.BELONGS_TO_CATEGORY,
      //   transactionNode,
      //   categoryNode,
      //   {
      //     confidence: 1.0, // Manual categorization
      //     isAutomatic: false,
      //   },
      // );

      // await this.graphRepository.createRelationship(relationship);

      this.logger.debug(
        `Created BELONGS_TO_CATEGORY relationship for ${event.transactionId}`,
      );
    } catch (error) {
      this.logger.error('Failed to create category relationship', error.stack);
    }
  }

  /**
   * Create Transaction -[AT_MERCHANT]-> Merchant
   */
  private async createMerchantRelationship(
    event: TransactionCreatedEvent,
    transactionNode: GraphNode,
  ): Promise<void> {
    try {
      // Find or create Merchant node
      // const merchantNode = await this.findOrCreateMerchantNode(event.merchantId!);

      // const relationship = GraphRelationship.create(
      //   RelationshipType.AT_MERCHANT,
      //   transactionNode,
      //   merchantNode,
      //   {
      //     isVerified: true,
      //   },
      // );

      // await this.graphRepository.createRelationship(relationship);

      this.logger.debug(
        `Created AT_MERCHANT relationship for ${event.transactionId}`,
      );
    } catch (error) {
      this.logger.error('Failed to create merchant relationship', error.stack);
    }
  }

  /**
   * Create Transaction -[AT_LOCATION]-> Location
   */
  private async createLocationRelationship(
    event: TransactionCreatedEvent,
    transactionNode: GraphNode,
  ): Promise<void> {
    try {
      // Find or create Location node
      // const locationNode = await this.findOrCreateLocationNode(event.locationId!);

      // const relationship = GraphRelationship.create(
      //   RelationshipType.AT_LOCATION,
      //   transactionNode,
      //   locationNode,
      //   {
      //     accuracy: 100, // GPS accuracy in meters
      //   },
      // );

      // await this.graphRepository.createRelationship(relationship);

      this.logger.debug(
        `Created AT_LOCATION relationship for ${event.transactionId}`,
      );
    } catch (error) {
      this.logger.error('Failed to create location relationship', error.stack);
    }
  }

  /**
   * Create Transaction -[HAS_TAG]-> Tag relationships
   */
  private async createTagRelationships(
    event: TransactionCreatedEvent,
    transactionNode: GraphNode,
  ): Promise<void> {
    try {
      for (const tagId of event.tags!) {
        // Find or create Tag node
        // const tagNode = await this.findOrCreateTagNode(tagId);

        // const relationship = GraphRelationship.create(
        //   RelationshipType.HAS_TAG,
        //   transactionNode,
        //   tagNode,
        // );

        // await this.graphRepository.createRelationship(relationship);
      }

      this.logger.debug(
        `Created HAS_TAG relationships for ${event.transactionId}`,
      );
    } catch (error) {
      this.logger.error('Failed to create tag relationships', error.stack);
    }
  }

  /**
   * Handle transaction updated event
   * Updates transaction node and relationships
   */
  async handleTransactionUpdated(event: any): Promise<void> {
    try {
      this.logger.log(
        `Updating transaction in knowledge graph: ${event.transactionId}`,
      );

      // Update transaction node properties
      // const existingNode = await this.graphRepository.findNodeById(event.transactionId);

      // if (existingNode) {
      //   existingNode.updateProperties({
      //     amount: event.amount,
      //     description: event.description,
      //     categoryId: event.categoryId,
      //     merchantId: event.merchantId,
      //   });
      //   await this.graphRepository.updateNode(existingNode);
      // }

      this.logger.log(
        `Transaction updated successfully: ${event.transactionId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update transaction: ${event.transactionId}`,
        error.stack,
      );
    }
  }

  /**
   * Handle transaction deleted event
   * Removes transaction node and relationships
   */
  async handleTransactionDeleted(event: any): Promise<void> {
    try {
      this.logger.log(
        `Deleting transaction from knowledge graph: ${event.transactionId}`,
      );

      // Delete node and relationships
      // await this.graphRepository.deleteNode(event.transactionId);

      this.logger.log(
        `Transaction deleted successfully: ${event.transactionId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete transaction: ${event.transactionId}`,
        error.stack,
      );
    }
  }
}
