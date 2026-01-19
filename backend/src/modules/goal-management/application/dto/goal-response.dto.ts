import { GoalStatus, GoalPriority, GoalCategory } from '../../domain/entities/goal.entity';

export class GoalResponseDto {
  id: string;
  userId: string;
  name: string;
  description: string;
  category: GoalCategory;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  startDate: Date;
  targetDate: Date;
  status: GoalStatus;
  priority: GoalPriority;
  linkedAccountId: string | null;
  autoContribute: boolean;
  contributionAmount: number | null;
  contributionFrequency: string | null;
  progressPercentage: number;
  remainingAmount: number;
  daysRemaining: number;
  isOnTrack: boolean;
  isOverdue: boolean;
  requiredMonthlyContribution: number;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}
