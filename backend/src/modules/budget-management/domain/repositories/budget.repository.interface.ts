import { Budget, BudgetPeriod, BudgetStatus } from '../entities/budget.entity';

/**
 * Budget Repository Interface
 */
export interface IBudgetRepository {
  /**
   * Save budget (create or update)
   */
  save(budget: Budget): Promise<Budget>;

  /**
   * Find budget by ID
   */
  findById(id: string): Promise<Budget | null>;

  /**
   * Find all budgets for a user
   */
  findByUserId(userId: string): Promise<Budget[]>;

  /**
   * Find active budgets for a user
   */
  findActiveByUserId(userId: string): Promise<Budget[]>;

  /**
   * Find current budget for user and period
   */
  findCurrentByUserAndPeriod(userId: string, period: BudgetPeriod): Promise<Budget | null>;

  /**
   * Find budgets by status
   */
  findByStatus(userId: string, status: BudgetStatus): Promise<Budget[]>;

  /**
   * Find exceeded budgets
   */
  findExceededBudgets(userId: string): Promise<Budget[]>;

  /**
   * Find budgets for date range
   */
  findByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Budget[]>;

  /**
   * Delete budget
   */
  delete(id: string): Promise<void>;
}

export const BUDGET_REPOSITORY = Symbol('BUDGET_REPOSITORY');
