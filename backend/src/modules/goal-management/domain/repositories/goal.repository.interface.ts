import { Goal } from '../entities/goal.entity';
import { GoalStatus, GoalCategory } from '../entities/goal.entity';

/**
 * Goal Repository Interface
 * Defines data access operations for Goal aggregate
 */
export interface IGoalRepository {
  /**
   * Save goal (create or update)
   */
  save(goal: Goal): Promise<Goal>;

  /**
   * Find goal by ID
   */
  findById(id: string): Promise<Goal | null>;

  /**
   * Find all goals for a user
   */
  findByUserId(userId: string): Promise<Goal[]>;

  /**
   * Find active goals for a user
   */
  findActiveByUserId(userId: string): Promise<Goal[]>;

  /**
   * Find goals by status
   */
  findByStatus(userId: string, status: GoalStatus): Promise<Goal[]>;

  /**
   * Find goals by category
   */
  findByCategory(userId: string, category: GoalCategory): Promise<Goal[]>;

  /**
   * Find overdue goals
   */
  findOverdueGoals(userId: string): Promise<Goal[]>;

  /**
   * Find goals with auto-contribution enabled
   */
  findAutoContributionGoals(userId: string): Promise<Goal[]>;

  /**
   * Find goals linked to an account
   */
  findByLinkedAccount(accountId: string): Promise<Goal[]>;

  /**
   * Get total target amount for user
   */
  getTotalTargetAmount(userId: string): Promise<number>;

  /**
   * Get total current amount for user
   */
  getTotalCurrentAmount(userId: string): Promise<number>;

  /**
   * Delete goal
   */
  delete(id: string): Promise<void>;
}

export const GOAL_REPOSITORY = Symbol('GOAL_REPOSITORY');
