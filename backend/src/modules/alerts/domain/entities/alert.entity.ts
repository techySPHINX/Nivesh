/**
 * Alert Type Enum
 */
export enum AlertType {
  OVERSPENDING = 'overspending',
  GOAL_AT_RISK = 'goal_at_risk',
  INVESTMENT_ALERT = 'investment_alert',
  ANOMALY = 'anomaly',
  RECOMMENDATION = 'recommendation',
  BUDGET_THRESHOLD = 'budget_threshold',
  GOAL_DEADLINE = 'goal_deadline',
  PRICE_ALERT = 'price_alert',
}

/**
 * Alert Severity Enum
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

/**
 * Alert Entity
 */
export class Alert {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public alertType: AlertType,
    public severity: AlertSeverity,
    public title: string,
    public message: string,
    public actionable: boolean,
    public actionUrl: string | null,
    public isRead: boolean,
    public readAt: Date | null,
    public isDismissed: boolean,
    public dismissedAt: Date | null,
    public metadata: Record<string, any> | null,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  static create(params: {
    id: string;
    userId: string;
    alertType: AlertType;
    severity: AlertSeverity;
    title: string;
    message: string;
    actionable?: boolean;
    actionUrl?: string;
    metadata?: Record<string, any>;
  }): Alert {
    return new Alert(
      params.id,
      params.userId,
      params.alertType,
      params.severity,
      params.title,
      params.message,
      params.actionable || false,
      params.actionUrl || null,
      false,
      null,
      false,
      null,
      params.metadata || null,
      new Date(),
      new Date(),
    );
  }

  markRead(): void {
    if (!this.isRead) {
      this.isRead = true;
      this.readAt = new Date();
      this.updatedAt = new Date();
    }
  }

  dismiss(): void {
    if (!this.isDismissed) {
      this.isDismissed = true;
      this.dismissedAt = new Date();
      this.updatedAt = new Date();
    }
  }

  isActive(): boolean {
    return !this.isRead && !this.isDismissed;
  }

  isCritical(): boolean {
    return this.severity === AlertSeverity.CRITICAL;
  }

  static fromPersistence(data: any): Alert {
    return new Alert(
      data.id,
      data.userId,
      data.alertType as AlertType,
      data.severity as AlertSeverity,
      data.title,
      data.message,
      data.actionable,
      data.actionUrl,
      data.isRead,
      data.readAt,
      data.isDismissed,
      data.dismissedAt,
      data.metadata,
      data.createdAt,
      data.updatedAt,
    );
  }
}
