/**
 * Contribution Type Enum
 */
export enum ContributionType {
  MANUAL = 'MANUAL',
  AUTOMATIC = 'AUTOMATIC',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
}

/**
 * Goal Contribution Entity
 * Represents a contribution to a financial goal
 */
export class GoalContribution {
  constructor(
    public readonly id: string,
    public readonly goalId: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly type: ContributionType,
    public readonly transactionId: string | null,
    public readonly accountId: string | null,
    public readonly notes: string | null,
    public readonly metadata: Record<string, any> | null,
    public readonly createdAt: Date,
  ) { }

  /**
   * Factory method to create a new contribution
   */
  static create(params: {
    id: string;
    goalId: string;
    userId: string;
    amount: number;
    currency: string;
    type: ContributionType;
    transactionId?: string;
    accountId?: string;
    notes?: string;
    metadata?: Record<string, any>;
  }): GoalContribution {
    if (params.amount <= 0) {
      throw new Error('Contribution amount must be positive');
    }

    return new GoalContribution(
      params.id,
      params.goalId,
      params.userId,
      params.amount,
      params.currency,
      params.type,
      params.transactionId || null,
      params.accountId || null,
      params.notes || null,
      params.metadata || null,
      new Date(),
    );
  }

  /**
   * Check if contribution is manual
   */
  isManual(): boolean {
    return this.type === ContributionType.MANUAL;
  }

  /**
   * Check if contribution is automatic
   */
  isAutomatic(): boolean {
    return this.type === ContributionType.AUTOMATIC;
  }

  /**
   * Check if contribution is linked to transaction
   */
  hasTransaction(): boolean {
    return this.transactionId !== null;
  }

  /**
   * Factory method to recreate from persistence
   */
  static fromPersistence(data: any): GoalContribution {
    return new GoalContribution(
      data.id,
      data.goalId,
      data.userId,
      data.amount,
      data.currency,
      data.type,
      data.transactionId,
      data.accountId,
      data.notes,
      data.metadata,
      new Date(data.createdAt),
    );
  }
}
