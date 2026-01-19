// Base Event Interface
export interface IEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  timestamp: Date;
  version: number;
  metadata?: Record<string, any>;
}

// Base Event Class
export abstract class BaseEvent implements IEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  timestamp: Date;
  version: number;
  metadata?: Record<string, any>;

  constructor(data: Partial<IEvent>) {
    this.eventId = data.eventId || crypto.randomUUID();
    this.eventType = data.eventType || this.constructor.name;
    this.aggregateId = data.aggregateId!;
    this.aggregateType = data.aggregateType!;
    this.timestamp = data.timestamp || new Date();
    this.version = data.version || 1;
    this.metadata = data.metadata || {};
  }
}

// Event Types Registry
export enum EventType {
  // User Events
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',

  // Account Events
  ACCOUNT_CREATED = 'account.created',
  ACCOUNT_UPDATED = 'account.updated',
  ACCOUNT_DELETED = 'account.deleted',
  ACCOUNT_SYNCED = 'account.synced',

  // Transaction Events
  TRANSACTION_CREATED = 'transaction.created',
  TRANSACTION_UPDATED = 'transaction.updated',
  TRANSACTION_DELETED = 'transaction.deleted',
  TRANSACTION_CATEGORIZED = 'transaction.categorized',
  TRANSACTION_ENRICHED = 'transaction.enriched',

  // Goal Events
  GOAL_CREATED = 'goal.created',
  GOAL_UPDATED = 'goal.updated',
  GOAL_ACHIEVED = 'goal.achieved',
  GOAL_PROGRESS_UPDATED = 'goal.progress.updated',

  // AI Events
  AI_QUERY_RECEIVED = 'ai.query.received',
  AI_RESPONSE_GENERATED = 'ai.response.generated',
  AI_REASONING_COMPLETED = 'ai.reasoning.completed',

  // Alert Events
  ALERT_TRIGGERED = 'alert.triggered',
  ALERT_RESOLVED = 'alert.resolved',

  // System Events
  SYSTEM_ERROR = 'system.error',
  SYSTEM_HEALTH_CHECK = 'system.health_check',
}
