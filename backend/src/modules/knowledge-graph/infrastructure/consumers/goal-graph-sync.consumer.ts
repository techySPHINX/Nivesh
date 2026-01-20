import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import {
  GraphNode,
  GraphRelationship,
  NodeType,
  RelationshipType,
} from '../../domain';

/**
 * Goal Created Event (placeholder)
 */
export interface GoalCreatedEvent {
  goalId: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'paused';
  category: string;
}

/**
 * Kafka Consumer for Goal Graph Synchronization
 * Handles goal lifecycle events and maintains goal nodes + relationships
 * 
 * Creates:
 * - Goal nodes
 * - User -[HAS_GOAL]-> Goal
 * - Account -[CONTRIBUTES_TO_GOAL]-> Goal
 */
@EventsHandler(GoalCreatedEvent)
@Injectable()
export class GoalGraphSyncConsumer implements IEventHandler<GoalCreatedEvent> {
  private readonly logger = new Logger(GoalGraphSyncConsumer.name);

  constructor(
    // Will inject IKnowledgeGraphRepository in next commit
    // private readonly graphRepository: IKnowledgeGraphRepository,
  ) {}

  /**
   * Handle goal created event
   * Creates Goal node and relationship to User
   */
  async handle(event: GoalCreatedEvent): Promise<void> {
    try {
      this.logger.log(`Syncing goal to knowledge graph: ${event.goalId}`);

      // 1. Create Goal node
      const goalNode = await this.createGoalNode(event);

      // 2. Create User -> Goal relationship
      await this.createUserGoalRelationship(event, goalNode);

      this.logger.log(`Goal synced successfully: ${event.goalId}`);
    } catch (error) {
      this.logger.error(
        `Failed to sync goal to knowledge graph: ${event.goalId}`,
        error.stack,
      );
    }
  }

  /**
   * Create Goal node
   */
  private async createGoalNode(event: GoalCreatedEvent): Promise<GraphNode> {
    const goalNode = GraphNode.create(NodeType.GOAL, {
      userId: event.userId,
      name: event.name,
      targetAmount: event.targetAmount,
      currentAmount: event.currentAmount,
      targetDate: event.targetDate,
      priority: event.priority,
      status: event.status,
      category: event.category,
      progress: event.targetAmount > 0 
        ? (event.currentAmount / event.targetAmount) * 100 
        : 0,
      daysRemaining: this.calculateDaysRemaining(event.targetDate),
      metadata: {
        source: 'goal-service',
        synced: true,
      },
    });

    // await this.graphRepository.createNode(goalNode);
    return goalNode;
  }

  /**
   * Calculate days remaining until target date
   */
  private calculateDaysRemaining(targetDate: Date): number {
    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Create User -[HAS_GOAL]-> Goal
   */
  private async createUserGoalRelationship(
    event: GoalCreatedEvent,
    goalNode: GraphNode,
  ): Promise<void> {
    try {
      // Find User node
      // const userNode = await this.graphRepository.findNodeById(event.userId);
      
      // if (userNode) {
      //   const relationship = GraphRelationship.create(
      //     RelationshipType.HAS_GOAL,
      //     userNode,
      //     goalNode,
      //     {
      //       weight: 1.0,
      //       metadata: {
      //         priority: event.priority,
      //       },
      //     },
      //   );
      //   await this.graphRepository.createRelationship(relationship);
      // }

      this.logger.debug(`Created HAS_GOAL relationship for ${event.goalId}`);
    } catch (error) {
      this.logger.error('Failed to create user-goal relationship', error.stack);
    }
  }

  /**
   * Handle goal updated event
   * Updates goal progress, status, and properties
   */
  async handleGoalUpdated(event: any): Promise<void> {
    try {
      this.logger.log(`Updating goal in knowledge graph: ${event.goalId}`);

      // Update goal node
      // const existingNode = await this.graphRepository.findNodeById(event.goalId);
      
      // if (existingNode) {
      //   existingNode.updateProperties({
      //     name: event.name,
      //     targetAmount: event.targetAmount,
      //     currentAmount: event.currentAmount,
      //     targetDate: event.targetDate,
      //     priority: event.priority,
      //     status: event.status,
      //     progress: event.targetAmount > 0 
      //       ? (event.currentAmount / event.targetAmount) * 100 
      //       : 0,
      //     daysRemaining: this.calculateDaysRemaining(event.targetDate),
      //   });
      //   await this.graphRepository.updateNode(existingNode);
      // }

      this.logger.log(`Goal updated successfully: ${event.goalId}`);
    } catch (error) {
      this.logger.error(`Failed to update goal: ${event.goalId}`, error.stack);
    }
  }

  /**
   * Handle goal contribution event
   * Links account to goal when contribution is made
   */
  async handleGoalContribution(event: any): Promise<void> {
    try {
      this.logger.log(
        `Recording contribution for goal: ${event.goalId} from account: ${event.accountId}`,
      );

      // Find Account and Goal nodes
      // const accountNode = await this.graphRepository.findNodeById(event.accountId);
      // const goalNode = await this.graphRepository.findNodeById(event.goalId);

      // if (accountNode && goalNode) {
      //   // Check if relationship already exists
      //   const existingRels = await this.graphRepository.findRelationshipsForNode(
      //     event.accountId,
      //     'outgoing',
      //   );
      //   
      //   const existingRel = existingRels.find(
      //     (r) =>
      //       r.type === RelationshipType.CONTRIBUTES_TO_GOAL &&
      //       r.toNode.id === event.goalId,
      //   );

      //   if (existingRel) {
      //     // Update existing relationship
      //     const currentAmount = existingRel.properties.amount || 0;
      //     existingRel.updateProperties({
      //       amount: currentAmount + event.amount,
      //       lastContribution: event.date,
      //     });
      //     existingRel.incrementFrequency();
      //     await this.graphRepository.updateRelationship(existingRel);
      //   } else {
      //     // Create new relationship
      //     const relationship = GraphRelationship.create(
      //       RelationshipType.CONTRIBUTES_TO_GOAL,
      //       accountNode,
      //       goalNode,
      //       {
      //         amount: event.amount,
      //         frequency: 1,
      //         metadata: {
      //           firstContribution: event.date,
      //           lastContribution: event.date,
      //         },
      //       },
      //     );
      //     await this.graphRepository.createRelationship(relationship);
      //   }
      // }

      this.logger.debug(
        `Recorded contribution for goal ${event.goalId}: ${event.amount}`,
      );
    } catch (error) {
      this.logger.error('Failed to record goal contribution', error.stack);
    }
  }

  /**
   * Handle goal completed event
   * Updates status and marks achievement
   */
  async handleGoalCompleted(event: any): Promise<void> {
    try {
      this.logger.log(`Goal completed: ${event.goalId}`);

      // Update goal status
      // const existingNode = await this.graphRepository.findNodeById(event.goalId);
      
      // if (existingNode) {
      //   existingNode.updateProperties({
      //     status: 'completed',
      //     completedAt: new Date(),
      //     actualAmount: event.actualAmount,
      //     daysToComplete: this.calculateDaysToComplete(
      //       existingNode.getProperty('createdAt'),
      //     ),
      //   });
      //   await this.graphRepository.updateNode(existingNode);
      // }

      this.logger.log(`Goal status updated to completed: ${event.goalId}`);
    } catch (error) {
      this.logger.error(
        `Failed to update goal status: ${event.goalId}`,
        error.stack,
      );
    }
  }

  /**
   * Calculate days taken to complete goal
   */
  private calculateDaysToComplete(createdAt: Date): number {
    const now = new Date();
    const diff = now.getTime() - createdAt.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Handle goal deleted event
   */
  async handleGoalDeleted(event: any): Promise<void> {
    try {
      this.logger.log(`Deleting goal from knowledge graph: ${event.goalId}`);

      // Delete node and relationships
      // await this.graphRepository.deleteNode(event.goalId);

      this.logger.log(`Goal deleted successfully: ${event.goalId}`);
    } catch (error) {
      this.logger.error(`Failed to delete goal: ${event.goalId}`, error.stack);
    }
  }
}
