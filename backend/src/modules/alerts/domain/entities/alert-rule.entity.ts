/**
 * Alert Rule Type Enum
 */
export enum AlertRuleType {
  BUDGET_THRESHOLD = 'BUDGET_THRESHOLD',
  GOAL_DEADLINE = 'GOAL_DEADLINE',
  ANOMALY = 'ANOMALY',
  PRICE_ALERT = 'PRICE_ALERT',
  CUSTOM = 'CUSTOM',
}

/**
 * Alert Rule Conditions
 */
export interface AlertRuleConditions {
  metric?: string;
  operator?: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  value?: number;
  threshold?: number;
  budgetId?: string;
  goalId?: string;
  symbol?: string;
}

/**
 * Alert Rule Actions
 */
export interface AlertRuleActions {
  notifyPush: boolean;
  notifyEmail: boolean;
  notifySms: boolean;
  webhookUrl?: string;
}

/**
 * Alert Rule Entity
 */
export class AlertRule {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public name: string,
    public ruleType: AlertRuleType,
    public conditions: AlertRuleConditions,
    public actions: AlertRuleActions,
    public isActive: boolean,
    public lastTriggeredAt: Date | null,
    public triggerCount: number,
    public metadata: Record<string, any> | null,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  static create(params: {
    id: string;
    userId: string;
    name: string;
    ruleType: AlertRuleType;
    conditions: AlertRuleConditions;
    actions: AlertRuleActions;
    metadata?: Record<string, any>;
  }): AlertRule {
    return new AlertRule(
      params.id,
      params.userId,
      params.name,
      params.ruleType,
      params.conditions,
      params.actions,
      true,
      null,
      0,
      params.metadata || null,
      new Date(),
      new Date(),
    );
  }

  trigger(): void {
    this.lastTriggeredAt = new Date();
    this.triggerCount += 1;
    this.updatedAt = new Date();
  }

  activate(): void {
    this.isActive = true;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
  }

  static fromPersistence(data: any): AlertRule {
    return new AlertRule(
      data.id,
      data.userId,
      data.name,
      data.ruleType as AlertRuleType,
      data.conditions as AlertRuleConditions,
      data.actions as AlertRuleActions,
      data.isActive,
      data.lastTriggeredAt,
      data.triggerCount,
      data.metadata,
      data.createdAt,
      data.updatedAt,
    );
  }
}
