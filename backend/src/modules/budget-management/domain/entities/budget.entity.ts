/**
 * Budget Status Enum
 */
export enum BudgetStatus {
  ACTIVE = 'ACTIVE',
  EXCEEDED = 'EXCEEDED',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
}

/**
 * Alert Threshold Enum
 */
export enum AlertThreshold {
  FIFTY_PERCENT = 50,
  SEVENTY_FIVE_PERCENT = 75,
  NINETY_PERCENT = 90,
  HUNDRED_PERCENT = 100,
}

/**
 * Budget Period Enum
 */
export enum BudgetPeriod {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

/**
 * Category Budget
 * Value object for per-category budget limits
 */
export class CategoryBudget {
  constructor(
    public readonly category: string,
    public readonly limit: number,
    public readonly spent: number = 0,
  ) {
    if (limit <= 0) {
      throw new Error('Budget limit must be positive');
    }
  }

  /**
   * Get spending percentage
   */
  getSpendingPercentage(): number {
    return (this.spent / this.limit) * 100;
  }

  /**
   * Get remaining budget
   */
  getRemaining(): number {
    return Math.max(this.limit - this.spent, 0);
  }

  /**
   * Check if exceeded
   */
  isExceeded(): boolean {
    return this.spent >= this.limit;
  }

  /**
   * Check if threshold reached
   */
  hasReachedThreshold(threshold: AlertThreshold): boolean {
    return this.getSpendingPercentage() >= threshold;
  }

  /**
   * Add spending
   */
  addSpending(amount: number): CategoryBudget {
    return new CategoryBudget(this.category, this.limit, this.spent + amount);
  }
}

/**
 * Budget Entity
 * Aggregate root for budget management
 */
export class Budget {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public name: string,
    public description: string,
    public totalLimit: number,
    public totalSpent: number,
    public currency: string,
    public period: BudgetPeriod,
    public startDate: Date,
    public endDate: Date,
    public status: BudgetStatus,
    public categoryBudgets: Map<string, CategoryBudget>,
    public alertThresholds: AlertThreshold[],
    public alertsSent: Set<number>,
    public metadata: Record<string, any> | null,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) { }

  /**
   * Factory method to create a new budget
   */
  static create(params: {
    id: string;
    userId: string;
    name: string;
    description: string;
    totalLimit: number;
    currency: string;
    period: BudgetPeriod;
    startDate: Date;
    endDate: Date;
    categoryBudgets?: Map<string, CategoryBudget>;
    alertThresholds?: AlertThreshold[];
    metadata?: Record<string, any>;
  }): Budget {
    if (params.totalLimit <= 0) {
      throw new Error('Total budget limit must be positive');
    }

    if (params.endDate <= params.startDate) {
      throw new Error('End date must be after start date');
    }

    return new Budget(
      params.id,
      params.userId,
      params.name,
      params.description,
      params.totalLimit,
      0, // Initial spent
      params.currency,
      params.period,
      params.startDate,
      params.endDate,
      BudgetStatus.ACTIVE,
      params.categoryBudgets || new Map(),
      params.alertThresholds || [
        AlertThreshold.FIFTY_PERCENT,
        AlertThreshold.SEVENTY_FIVE_PERCENT,
        AlertThreshold.NINETY_PERCENT,
        AlertThreshold.HUNDRED_PERCENT,
      ],
      new Set(),
      params.metadata || null,
      new Date(),
      new Date(),
    );
  }

  /**
   * Add spending to budget
   */
  addSpending(amount: number, category: string): void {
    if (amount <= 0) {
      throw new Error('Spending amount must be positive');
    }

    // Update total spent
    this.totalSpent += amount;

    // Update category spending if exists
    const categoryBudget = this.categoryBudgets.get(category);
    if (categoryBudget) {
      this.categoryBudgets.set(category, categoryBudget.addSpending(amount));
    }

    // Check if budget exceeded
    if (this.totalSpent >= this.totalLimit) {
      this.status = BudgetStatus.EXCEEDED;
    }

    this.updatedAt = new Date();
  }

  /**
   * Set category budget
   */
  setCategoryBudget(category: string, limit: number): void {
    if (limit <= 0) {
      throw new Error('Category budget limit must be positive');
    }

    const existing = this.categoryBudgets.get(category);
    const spent = existing ? existing.spent : 0;
    this.categoryBudgets.set(category, new CategoryBudget(category, limit, spent));
    this.updatedAt = new Date();
  }

  /**
   * Remove category budget
   */
  removeCategoryBudget(category: string): void {
    this.categoryBudgets.delete(category);
    this.updatedAt = new Date();
  }

  /**
   * Update budget details
   */
  updateDetails(params: {
    name?: string;
    description?: string;
    totalLimit?: number;
    alertThresholds?: AlertThreshold[];
  }): void {
    if (params.name !== undefined) {
      this.name = params.name;
    }

    if (params.description !== undefined) {
      this.description = params.description;
    }

    if (params.totalLimit !== undefined) {
      if (params.totalLimit <= 0) {
        throw new Error('Total budget limit must be positive');
      }
      this.totalLimit = params.totalLimit;

      // Update status if needed
      if (this.totalSpent >= this.totalLimit) {
        this.status = BudgetStatus.EXCEEDED;
      } else if (this.status === BudgetStatus.EXCEEDED) {
        this.status = BudgetStatus.ACTIVE;
      }
    }

    if (params.alertThresholds !== undefined) {
      this.alertThresholds = params.alertThresholds;
    }

    this.updatedAt = new Date();
  }

  /**
   * Mark alert as sent for threshold
   */
  markAlertSent(threshold: AlertThreshold): void {
    this.alertsSent.add(threshold);
  }

  /**
   * Check if alert should be sent
   */
  shouldSendAlert(threshold: AlertThreshold): boolean {
    const spendingPercentage = this.getSpendingPercentage();
    return (
      this.alertThresholds.includes(threshold) &&
      !this.alertsSent.has(threshold) &&
      spendingPercentage >= threshold
    );
  }

  /**
   * Get spending percentage
   */
  getSpendingPercentage(): number {
    return this.totalLimit > 0 ? (this.totalSpent / this.totalLimit) * 100 : 0;
  }

  /**
   * Get remaining budget
   */
  getRemainingBudget(): number {
    return Math.max(this.totalLimit - this.totalSpent, 0);
  }

  /**
   * Get days remaining
   */
  getDaysRemaining(): number {
    const now = new Date();
    const diffTime = this.endDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if budget is active
   */
  isActive(): boolean {
    return this.status === BudgetStatus.ACTIVE;
  }

  /**
   * Check if budget is exceeded
   */
  isExceeded(): boolean {
    return this.status === BudgetStatus.EXCEEDED || this.totalSpent >= this.totalLimit;
  }

  /**
   * Check if budget period is current
   */
  isCurrent(): boolean {
    const now = new Date();
    return now >= this.startDate && now <= this.endDate;
  }

  /**
   * Check if budget period has ended
   */
  hasEnded(): boolean {
    return new Date() > this.endDate;
  }

  /**
   * Mark budget as completed
   */
  complete(): void {
    this.status = BudgetStatus.COMPLETED;
    this.updatedAt = new Date();
  }

  /**
   * Pause budget
   */
  pause(): void {
    if (this.status !== BudgetStatus.ACTIVE) {
      throw new Error(`Cannot pause budget with status ${this.status}`);
    }
    this.status = BudgetStatus.PAUSED;
    this.updatedAt = new Date();
  }

  /**
   * Resume budget
   */
  resume(): void {
    if (this.status !== BudgetStatus.PAUSED) {
      throw new Error(`Cannot resume budget with status ${this.status}`);
    }
    this.status = BudgetStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  /**
   * Get category budgets as array
   */
  getCategoryBudgetsArray(): CategoryBudget[] {
    return Array.from(this.categoryBudgets.values());
  }

  /**
   * Get exceeded categories
   */
  getExceededCategories(): CategoryBudget[] {
    return this.getCategoryBudgetsArray().filter(cb => cb.isExceeded());
  }

  /**
   * Factory method to recreate from persistence
   */
  static fromPersistence(data: any): Budget {
    const categoryBudgetsMap = new Map<string, CategoryBudget>();
    if (data.categoryBudgets) {
      if (typeof data.categoryBudgets === 'object') {
        Object.entries(data.categoryBudgets).forEach(([category, budget]: [string, any]) => {
          categoryBudgetsMap.set(
            category,
            new CategoryBudget(category, budget.limit, budget.spent),
          );
        });
      }
    }

    const alertsSentSet = new Set<number>();
    if (Array.isArray(data.alertsSent)) {
      data.alertsSent.forEach((threshold: number) => alertsSentSet.add(threshold));
    }

    return new Budget(
      data.id,
      data.userId,
      data.name,
      data.description,
      data.totalLimit,
      data.totalSpent,
      data.currency,
      data.period,
      new Date(data.startDate),
      new Date(data.endDate),
      data.status,
      categoryBudgetsMap,
      data.alertThresholds || [],
      alertsSentSet,
      data.metadata,
      new Date(data.createdAt),
      new Date(data.updatedAt),
    );
  }

  /**
   * Serialize category budgets for persistence
   */
  serializeCategoryBudgets(): Record<string, any> {
    const result: Record<string, any> = {};
    this.categoryBudgets.forEach((budget, category) => {
      result[category] = {
        category: budget.category,
        limit: budget.limit,
        spent: budget.spent,
      };
    });
    return result;
  }
}
