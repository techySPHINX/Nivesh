import { BaseEvent, EventType } from './base.event';

// User Events
export class UserCreatedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string,
  ) {
    super({
      eventType: EventType.USER_CREATED,
      aggregateId: userId,
      aggregateType: 'User',
    });
  }
}

export class UserUpdatedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    public readonly changes: Record<string, any>,
  ) {
    super({
      eventType: EventType.USER_UPDATED,
      aggregateId: userId,
      aggregateType: 'User',
    });
  }
}

// Transaction Events
export class TransactionCreatedEvent extends BaseEvent {
  constructor(
    public readonly transactionId: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly type: string,
    public readonly category: string,
  ) {
    super({
      eventType: EventType.TRANSACTION_CREATED,
      aggregateId: transactionId,
      aggregateType: 'Transaction',
    });
  }
}

// Goal Events
export class GoalCreatedEvent extends BaseEvent {
  constructor(
    public readonly goalId: string,
    public readonly userId: string,
    public readonly goalType: string,
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

export class GoalProgressUpdatedEvent extends BaseEvent {
  constructor(
    public readonly goalId: string,
    public readonly currentAmount: number,
    public readonly progressPercentage: number,
  ) {
    super({
      eventType: EventType.GOAL_PROGRESS_UPDATED,
      aggregateId: goalId,
      aggregateType: 'Goal',
    });
  }
}

// AI Events
export class AIQueryReceivedEvent extends BaseEvent {
  constructor(
    public readonly queryId: string,
    public readonly userId: string,
    public readonly query: string,
    public readonly intent: string,
  ) {
    super({
      eventType: EventType.AI_QUERY_RECEIVED,
      aggregateId: queryId,
      aggregateType: 'AIQuery',
    });
  }
}

export class AIResponseGeneratedEvent extends BaseEvent {
  constructor(
    public readonly queryId: string,
    public readonly userId: string,
    public readonly response: string,
    public readonly confidence: number,
    public readonly processingTimeMs: number,
  ) {
    super({
      eventType: EventType.AI_RESPONSE_GENERATED,
      aggregateId: queryId,
      aggregateType: 'AIQuery',
    });
  }
}

// Alert Events
export class AlertTriggeredEvent extends BaseEvent {
  constructor(
    public readonly alertId: string,
    public readonly userId: string,
    public readonly alertType: string,
    public readonly severity: string,
    public readonly message: string,
  ) {
    super({
      eventType: EventType.ALERT_TRIGGERED,
      aggregateId: alertId,
      aggregateType: 'Alert',
    });
  }
}
