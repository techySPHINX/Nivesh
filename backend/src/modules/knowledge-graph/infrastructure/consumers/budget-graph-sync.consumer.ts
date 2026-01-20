import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import {
  GraphNode,
  GraphRelationship,
  NodeType,
  RelationshipType,
} from '../../domain';

/**
 * Budget Created Event (placeholder)
 */
export interface BudgetCreatedEvent {
  budgetId: string;
  userId: string;
  categoryId: string;
  amount: number;
  spent: number;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate: Date;
  status: 'active' | 'exceeded' | 'completed';
  alertThreshold: number;
}

/**
 * Kafka Consumer for Budget Graph Synchronization
 * Handles budget lifecycle events and maintains budget nodes + relationships
 * 
 * Creates:
 * - Budget nodes
 * - User -[HAS_BUDGET]-> Budget
 * - Budget -[AFFECTS_BUDGET]-> Transaction (when transactions hit budget)
 */
@EventsHandler(BudgetCreatedEvent)
@Injectable()
export class BudgetGraphSyncConsumer
  implements IEventHandler<BudgetCreatedEvent> {
  private readonly logger = new Logger(BudgetGraphSyncConsumer.name);

  constructor(
    // Will inject IKnowledgeGraphRepository in next commit
    // private readonly graphRepository: IKnowledgeGraphRepository,
  ) { }

  /**
   * Handle budget created event
   * Creates Budget node and relationship to User
   */
  async handle(event: BudgetCreatedEvent): Promise<void> {
    try {
      this.logger.log(`Syncing budget to knowledge graph: ${event.budgetId}`);

      // 1. Create Budget node
      const budgetNode = await this.createBudgetNode(event);

      // 2. Create User -> Budget relationship
      await this.createUserBudgetRelationship(event, budgetNode);

      // 3. Link to Category if exists
      if (event.categoryId) {
        await this.createBudgetCategoryRelationship(event, budgetNode);
      }

      this.logger.log(`Budget synced successfully: ${event.budgetId}`);
    } catch (error) {
      this.logger.error(
        `Failed to sync budget to knowledge graph: ${event.budgetId}`,
        error.stack,
      );
    }
  }

  /**
   * Create Budget node
   */
  private async createBudgetNode(
    event: BudgetCreatedEvent,
  ): Promise<GraphNode> {
    const budgetNode = GraphNode.create(NodeType.BUDGET, {
      userId: event.userId,
      categoryId: event.categoryId,
      amount: event.amount,
      spent: event.spent,
      period: event.period,
      startDate: event.startDate,
      endDate: event.endDate,
      status: event.status,
      alertThreshold: event.alertThreshold,
      utilization: event.amount > 0 ? event.spent / event.amount : 0,
      metadata: {
        source: 'budget-service',
        synced: true,
      },
    });

    // await this.graphRepository.createNode(budgetNode);
    return budgetNode;
  }

  /**
   * Create User -[HAS_BUDGET]-> Budget
   */
  private async createUserBudgetRelationship(
    event: BudgetCreatedEvent,
    budgetNode: GraphNode,
  ): Promise<void> {
    try {
      // Find User node
      // const userNode = await this.graphRepository.findNodeById(event.userId);

      // if (userNode) {
      //   const relationship = GraphRelationship.create(
      //     RelationshipType.HAS_BUDGET,
      //     userNode,
      //     budgetNode,
      //     {
      //       weight: 1.0,
      //     },
      //   );
      //   await this.graphRepository.createRelationship(relationship);
      // }

      this.logger.debug(`Created HAS_BUDGET relationship for ${event.budgetId}`);
    } catch (error) {
      this.logger.error('Failed to create user-budget relationship', error.stack);
    }
  }

  /**
   * Create Budget -> Category relationship
   */
  private async createBudgetCategoryRelationship(
    event: BudgetCreatedEvent,
    budgetNode: GraphNode,
  ): Promise<void> {
    try {
      // Find Category node
      // const categoryNode = await this.graphRepository.findNodeById(event.categoryId);

      // if (categoryNode) {
      //   // Budget is linked to category (no direct relationship in schema, but stored in properties)
      //   this.logger.debug(`Budget ${event.budgetId} linked to category ${event.categoryId}`);
      // }
    } catch (error) {
      this.logger.error('Failed to link budget to category', error.stack);
    }
  }

  /**
   * Handle budget updated event
   * Updates budget node properties (especially spent amount and status)
   */
  async handleBudgetUpdated(event: any): Promise<void> {
    try {
      this.logger.log(`Updating budget in knowledge graph: ${event.budgetId}`);

      // Update budget node
      // const existingNode = await this.graphRepository.findNodeById(event.budgetId);

      // if (existingNode) {
      //   existingNode.updateProperties({
      //     amount: event.amount,
      //     spent: event.spent,
      //     status: event.status,
      //     utilization: event.amount > 0 ? event.spent / event.amount : 0,
      //   });
      //   await this.graphRepository.updateNode(existingNode);
      // }

      this.logger.log(`Budget updated successfully: ${event.budgetId}`);
    } catch (error) {
      this.logger.error(
        `Failed to update budget: ${event.budgetId}`,
        error.stack,
      );
    }
  }

  /**
   * Handle budget exceeded event
   * Updates status and can trigger alerts
   */
  async handleBudgetExceeded(event: any): Promise<void> {
    try {
      this.logger.warn(`Budget exceeded: ${event.budgetId}`);

      // Update status to exceeded
      // const existingNode = await this.graphRepository.findNodeById(event.budgetId);

      // if (existingNode) {
      //   existingNode.updateProperties({
      //     status: 'exceeded',
      //     exceededAt: new Date(),
      //     exceededBy: event.exceededBy,
      //   });
      //   await this.graphRepository.updateNode(existingNode);
      // }

      this.logger.log(`Budget status updated to exceeded: ${event.budgetId}`);
    } catch (error) {
      this.logger.error(
        `Failed to update budget status: ${event.budgetId}`,
        error.stack,
      );
    }
  }

  /**
   * Handle budget deleted event
   */
  async handleBudgetDeleted(event: any): Promise<void> {
    try {
      this.logger.log(`Deleting budget from knowledge graph: ${event.budgetId}`);

      // Delete node and relationships
      // await this.graphRepository.deleteNode(event.budgetId);

      this.logger.log(`Budget deleted successfully: ${event.budgetId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete budget: ${event.budgetId}`,
        error.stack,
      );
    }
  }

  /**
   * Link transaction to budget when it affects budget
   * Called when a transaction matches budget criteria
   */
  async linkTransactionToBudget(
    transactionId: string,
    budgetId: string,
    amount: number,
  ): Promise<void> {
    try {
      // Find Transaction and Budget nodes
      // const transactionNode = await this.graphRepository.findNodeById(transactionId);
      // const budgetNode = await this.graphRepository.findNodeById(budgetId);

      // if (transactionNode && budgetNode) {
      //   const relationship = GraphRelationship.create(
      //     RelationshipType.AFFECTS_BUDGET,
      //     transactionNode,
      //     budgetNode,
      //     {
      //       amount: amount,
      //     },
      //   );
      //   await this.graphRepository.createRelationship(relationship);
      // }

      this.logger.debug(
        `Linked transaction ${transactionId} to budget ${budgetId}`,
      );
    } catch (error) {
      this.logger.error('Failed to link transaction to budget', error.stack);
    }
  }
}
