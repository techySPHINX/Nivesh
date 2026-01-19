import { BaseEvent, EventType } from '../../../../core/messaging/events/base.event';
import { BudgetPeriod, AlertThreshold } from '../entities/budget.entity';

/**
 * Budget Created Event
 */
export class BudgetCreatedEvent extends BaseEvent {
  constructor(
    public readonly budgetId: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly totalLimit: number,
    public readonly period: BudgetPeriod,
    public readonly startDate: Date,
    public readonly endDate: Date,
  ) {
    super({
      eventType: EventType.BUDGET_CREATED,
      aggregateId: budgetId,
      aggregateType: 'Budget',
    });
  }
}

/**
 * Budget Exceeded Event
 */
export class BudgetExceededEvent extends BaseEvent {
  constructor(
    public readonly budgetId: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly totalLimit: number,
    public readonly totalSpent: number,
    public readonly exceededAt: Date,
  ) {
    super({
      eventType: EventType.BUDGET_EXCEEDED,
      aggregateId: budgetId,
      aggregateType: 'Budget',
    });
  }
}

/**
 * Budget Threshold Reached Event
 */
export class BudgetThresholdReachedEvent extends BaseEvent {
  constructor(
    public readonly budgetId: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly threshold: AlertThreshold,
    public readonly spendingPercentage: number,
    public readonly totalSpent: number,
    public readonly totalLimit: number,
  ) {
    super({
      eventType: EventType.BUDGET_THRESHOLD_REACHED,
      aggregateId: budgetId,
      aggregateType: 'Budget',
    });
  }
}

/**
 * Category Budget Exceeded Event
 */
export class CategoryBudgetExceededEvent extends BaseEvent {
  constructor(
    public readonly budgetId: string,
    public readonly userId: string,
    public readonly category: string,
    public readonly limit: number,
    public readonly spent: number,
    public readonly exceededAt: Date,
  ) {
    super({
      eventType: EventType.CATEGORY_BUDGET_EXCEEDED,
      aggregateId: budgetId,
      aggregateType: 'Budget',
    });
  }
}

/**
 * Budget Updated Event
 */
export class BudgetUpdatedEvent extends BaseEvent {
  constructor(
    public readonly budgetId: string,
    public readonly userId: string,
    public readonly updates: Record<string, any>,
  ) {
    super({
      eventType: EventType.BUDGET_UPDATED,
      aggregateId: budgetId,
      aggregateType: 'Budget',
    });
  }
}

/**
 * Budget Completed Event
 */
export class BudgetCompletedEvent extends BaseEvent {
  constructor(
    public readonly budgetId: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly totalLimit: number,
    public readonly totalSpent: number,
    public readonly completedAt: Date,
  ) {
    super({
      eventType: EventType.BUDGET_COMPLETED,
      aggregateId: budgetId,
      aggregateType: 'Budget',
    });
  }
}
