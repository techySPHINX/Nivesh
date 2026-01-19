/**
 * Goal Status Enum
 * Represents different states in the goal lifecycle
 */
export enum GoalStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

/**
 * Goal Priority Enum
 */
export enum GoalPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Goal Category Enum
 */
export enum GoalCategory {
  SAVINGS = 'SAVINGS',
  INVESTMENT = 'INVESTMENT',
  DEBT_PAYMENT = 'DEBT_PAYMENT',
  EMERGENCY_FUND = 'EMERGENCY_FUND',
  RETIREMENT = 'RETIREMENT',
  EDUCATION = 'EDUCATION',
  VACATION = 'VACATION',
  REAL_ESTATE = 'REAL_ESTATE',
  VEHICLE = 'VEHICLE',
  WEDDING = 'WEDDING',
  BUSINESS = 'BUSINESS',
  OTHER = 'OTHER',
}

/**
 * Goal Entity
 * Aggregate root for financial goal management
 */
export class Goal {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public name: string,
    public description: string,
    public category: GoalCategory,
    public targetAmount: number,
    public currentAmount: number,
    public currency: string,
    public startDate: Date,
    public targetDate: Date,
    public status: GoalStatus,
    public priority: GoalPriority,
    public linkedAccountId: string | null,
    public autoContribute: boolean,
    public contributionAmount: number | null,
    public contributionFrequency: string | null, // 'DAILY', 'WEEKLY', 'MONTHLY'
    public metadata: Record<string, any> | null,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) { }

  /**
   * Factory method to create a new goal
   */
  static create(params: {
    id: string;
    userId: string;
    name: string;
    description: string;
    category: GoalCategory;
    targetAmount: number;
    currency: string;
    startDate: Date;
    targetDate: Date;
    priority?: GoalPriority;
    linkedAccountId?: string;
    autoContribute?: boolean;
    contributionAmount?: number;
    contributionFrequency?: string;
    metadata?: Record<string, any>;
  }): Goal {
    // Validate target date is in future
    if (params.targetDate <= params.startDate) {
      throw new Error('Target date must be after start date');
    }

    // Validate target amount
    if (params.targetAmount <= 0) {
      throw new Error('Target amount must be positive');
    }

    return new Goal(
      params.id,
      params.userId,
      params.name,
      params.description,
      params.category,
      params.targetAmount,
      0, // Initial current amount
      params.currency,
      params.startDate,
      params.targetDate,
      GoalStatus.ACTIVE,
      params.priority || GoalPriority.MEDIUM,
      params.linkedAccountId || null,
      params.autoContribute || false,
      params.contributionAmount || null,
      params.contributionFrequency || null,
      params.metadata || null,
      new Date(),
      new Date(),
    );
  }

  /**
   * Add contribution to goal
   */
  addContribution(amount: number): void {
    if (this.status !== GoalStatus.ACTIVE) {
      throw new Error(`Cannot add contribution to goal with status ${this.status}`);
    }

    if (amount <= 0) {
      throw new Error('Contribution amount must be positive');
    }

    this.currentAmount += amount;
    this.updatedAt = new Date();

    // Check if goal is completed
    if (this.currentAmount >= this.targetAmount) {
      this.status = GoalStatus.COMPLETED;
    }
  }

  /**
   * Withdraw from goal
   */
  withdraw(amount: number, reason?: string): void {
    if (this.status !== GoalStatus.ACTIVE) {
      throw new Error(`Cannot withdraw from goal with status ${this.status}`);
    }

    if (amount <= 0) {
      throw new Error('Withdrawal amount must be positive');
    }

    if (amount > this.currentAmount) {
      throw new Error('Insufficient balance in goal');
    }

    this.currentAmount -= amount;
    this.updatedAt = new Date();
  }

  /**
   * Update goal details
   */
  updateDetails(params: {
    name?: string;
    description?: string;
    targetAmount?: number;
    targetDate?: Date;
    priority?: GoalPriority;
  }): void {
    if (params.name !== undefined) {
      this.name = params.name;
    }

    if (params.description !== undefined) {
      this.description = params.description;
    }

    if (params.targetAmount !== undefined) {
      if (params.targetAmount <= 0) {
        throw new Error('Target amount must be positive');
      }
      this.targetAmount = params.targetAmount;

      // Update status if goal is now completed
      if (this.currentAmount >= this.targetAmount && this.status === GoalStatus.ACTIVE) {
        this.status = GoalStatus.COMPLETED;
      }
    }

    if (params.targetDate !== undefined) {
      if (params.targetDate <= this.startDate) {
        throw new Error('Target date must be after start date');
      }
      this.targetDate = params.targetDate;
    }

    if (params.priority !== undefined) {
      this.priority = params.priority;
    }

    this.updatedAt = new Date();
  }

  /**
   * Pause goal
   */
  pause(): void {
    if (this.status !== GoalStatus.ACTIVE) {
      throw new Error(`Cannot pause goal with status ${this.status}`);
    }

    this.status = GoalStatus.PAUSED;
    this.updatedAt = new Date();
  }

  /**
   * Resume paused goal
   */
  resume(): void {
    if (this.status !== GoalStatus.PAUSED) {
      throw new Error(`Cannot resume goal with status ${this.status}`);
    }

    this.status = GoalStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  /**
   * Cancel goal
   */
  cancel(): void {
    if (this.status === GoalStatus.COMPLETED) {
      throw new Error('Cannot cancel completed goal');
    }

    this.status = GoalStatus.CANCELLED;
    this.updatedAt = new Date();
  }

  /**
   * Mark goal as expired
   */
  markExpired(): void {
    if (this.status !== GoalStatus.ACTIVE) {
      throw new Error(`Cannot expire goal with status ${this.status}`);
    }

    this.status = GoalStatus.EXPIRED;
    this.updatedAt = new Date();
  }

  /**
   * Enable auto-contribution
   */
  enableAutoContribution(amount: number, frequency: string, accountId: string): void {
    if (amount <= 0) {
      throw new Error('Contribution amount must be positive');
    }

    if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(frequency)) {
      throw new Error('Invalid contribution frequency');
    }

    this.autoContribute = true;
    this.contributionAmount = amount;
    this.contributionFrequency = frequency;
    this.linkedAccountId = accountId;
    this.updatedAt = new Date();
  }

  /**
   * Disable auto-contribution
   */
  disableAutoContribution(): void {
    this.autoContribute = false;
    this.contributionAmount = null;
    this.contributionFrequency = null;
    this.updatedAt = new Date();
  }

  /**
   * Calculate progress percentage
   */
  getProgressPercentage(): number {
    if (this.targetAmount === 0) return 0;
    return Math.min((this.currentAmount / this.targetAmount) * 100, 100);
  }

  /**
   * Calculate remaining amount
   */
  getRemainingAmount(): number {
    return Math.max(this.targetAmount - this.currentAmount, 0);
  }

  /**
   * Calculate days remaining
   */
  getDaysRemaining(): number {
    const now = new Date();
    const diffTime = this.targetDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate required monthly contribution
   */
  getRequiredMonthlyContribution(): number {
    const remaining = this.getRemainingAmount();
    const daysRemaining = this.getDaysRemaining();

    if (daysRemaining <= 0) return remaining;

    const monthsRemaining = daysRemaining / 30;
    return monthsRemaining > 0 ? remaining / monthsRemaining : remaining;
  }

  /**
   * Check if goal is on track
   */
  isOnTrack(): boolean {
    const progress = this.getProgressPercentage();
    const totalDays = (this.targetDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const elapsedDays = (new Date().getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const expectedProgress = (elapsedDays / totalDays) * 100;

    return progress >= expectedProgress * 0.9; // 90% of expected progress
  }

  /**
   * Check if goal is overdue
   */
  isOverdue(): boolean {
    return this.getDaysRemaining() < 0 && this.status === GoalStatus.ACTIVE;
  }

  /**
   * Check if goal is completed
   */
  isCompleted(): boolean {
    return this.status === GoalStatus.COMPLETED;
  }

  /**
   * Check if goal is active
   */
  isActive(): boolean {
    return this.status === GoalStatus.ACTIVE;
  }

  /**
   * Factory method to recreate from persistence
   */
  static fromPersistence(data: any): Goal {
    return new Goal(
      data.id,
      data.userId,
      data.name,
      data.description,
      data.category,
      data.targetAmount,
      data.currentAmount,
      data.currency,
      new Date(data.startDate),
      new Date(data.targetDate),
      data.status,
      data.priority,
      data.linkedAccountId,
      data.autoContribute,
      data.contributionAmount,
      data.contributionFrequency,
      data.metadata,
      new Date(data.createdAt),
      new Date(data.updatedAt),
    );
  }
}
