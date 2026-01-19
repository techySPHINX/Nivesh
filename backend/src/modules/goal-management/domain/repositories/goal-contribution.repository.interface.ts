import { GoalContribution } from '../entities/goal-contribution.entity';

/**
 * Goal Contribution Repository Interface
 */
export interface IGoalContributionRepository {
  /**
   * Save contribution
   */
  save(contribution: GoalContribution): Promise<GoalContribution>;

  /**
   * Find contribution by ID
   */
  findById(id: string): Promise<GoalContribution | null>;

  /**
   * Find all contributions for a goal
   */
  findByGoalId(goalId: string): Promise<GoalContribution[]>;

  /**
   * Find all contributions for a user
   */
  findByUserId(userId: string): Promise<GoalContribution[]>;

  /**
   * Get total contributions for a goal
   */
  getTotalContributionsByGoal(goalId: string): Promise<number>;

  /**
   * Get recent contributions for a user
   */
  getRecentContributions(userId: string, limit: number): Promise<GoalContribution[]>;

  /**
   * Get contributions for a date range
   */
  findByDateRange(userId: string, startDate: Date, endDate: Date): Promise<GoalContribution[]>;

  /**
   * Delete contribution
   */
  delete(id: string): Promise<void>;
}

export const GOAL_CONTRIBUTION_REPOSITORY = Symbol('GOAL_CONTRIBUTION_REPOSITORY');
