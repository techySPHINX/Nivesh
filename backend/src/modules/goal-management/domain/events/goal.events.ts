import { BaseEvent, EventType } from '../../../../core/messaging/events/base.event';
import { GoalStatus, GoalPriority, GoalCategory } from '../entities/goal.entity';

/**
 * Goal Created Event
 */
export class GoalCreatedEvent extends BaseEvent {
  constructor(
    public readonly goalId: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly category: GoalCategory,
    public readonly targetAmount: number,
    public readonly targetDate: Date,
  ) {
    super({
      eventType: EventType.GOAL_CREATED,
      aggregateId: goalId,
      aggregateType: 'Goal',
    });
  }
}

/**
 * Goal Contribution Added Event
 */
export class GoalContributionAddedEvent extends BaseEvent {
  constructor(
    public readonly goalId: string,
    public readonly userId: string,
    public readonly contributionId: string,
    public readonly amount: number,
    public readonly currentAmount: number,
    public readonly targetAmount: number,
  ) {
    super({
      eventType: EventType.GOAL_CONTRIBUTION_ADDED,
      aggregateId: goalId,
      aggregateType: 'Goal',
    });
  }
}

/**
 * Goal Completed Event
 */
export class GoalCompletedEvent extends BaseEvent {
  constructor(
    public readonly goalId: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly targetAmount: number,
    public readonly completedAt: Date,
  ) {
    super({
      eventType: EventType.GOAL_COMPLETED,
      aggregateId: goalId,
      aggregateType: 'Goal',
    });
  }
}

/**
 * Goal Updated Event
 */
export class GoalUpdatedEvent extends BaseEvent {
  constructor(
    public readonly goalId: string,
    public readonly userId: string,
    public readonly updates: Record<string, any>,
  ) {
    super({
      eventType: EventType.GOAL_UPDATED,
      aggregateId: goalId,
      aggregateType: 'Goal',
    });
  }
}

/**
 * Goal Cancelled Event
 */
export class GoalCancelledEvent extends BaseEvent {
  constructor(
    public readonly goalId: string,
    public readonly userId: string,
    public readonly reason: string | null,
  ) {
    super({
      eventType: EventType.GOAL_CANCELLED,
      aggregateId: goalId,
      aggregateType: 'Goal',
    });
  }
}

/**
 * Goal Expired Event
 */
export class GoalExpiredEvent extends BaseEvent {
  constructor(
    public readonly goalId: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly currentAmount: number,
    public readonly targetAmount: number,
  ) {
    super({
      eventType: EventType.GOAL_EXPIRED,
      aggregateId: goalId,
      aggregateType: 'Goal',
    });
  }
}
