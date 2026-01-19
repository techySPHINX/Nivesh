import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetUserGoalsQuery } from '../queries/get-user-goals.query';
import { IGoalRepository, GOAL_REPOSITORY } from '../../domain/repositories/goal.repository.interface';
import { GoalResponseDto } from '../dto/goal-response.dto';
import { Goal, GoalStatus } from '../../domain/entities/goal.entity';

@QueryHandler(GetUserGoalsQuery)
export class GetUserGoalsHandler implements IQueryHandler<GetUserGoalsQuery, GoalResponseDto[]> {
  constructor(
    @Inject(GOAL_REPOSITORY) private readonly goalRepository: IGoalRepository,
  ) { }

  async execute(query: GetUserGoalsQuery): Promise<GoalResponseDto[]> {
    const { userId, status, category, includeCompleted } = query;

    let goals: Goal[];

    // Fetch goals based on filters
    if (status) {
      goals = await this.goalRepository.findByStatus(userId, status);
    } else if (category) {
      goals = await this.goalRepository.findByCategory(userId, category);
    } else {
      goals = await this.goalRepository.findByUserId(userId);
    }

    // Filter out completed if not requested
    if (!includeCompleted) {
      goals = goals.filter(g => g.status !== GoalStatus.COMPLETED);
    }

    return goals.map(goal => this.toResponseDto(goal));
  }

  private toResponseDto(goal: Goal): GoalResponseDto {
    return {
      id: goal.id,
      userId: goal.userId,
      name: goal.name,
      description: goal.description,
      category: goal.category,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      currency: goal.currency,
      startDate: goal.startDate,
      targetDate: goal.targetDate,
      status: goal.status,
      priority: goal.priority,
      linkedAccountId: goal.linkedAccountId,
      autoContribute: goal.autoContribute,
      contributionAmount: goal.contributionAmount,
      contributionFrequency: goal.contributionFrequency,
      progressPercentage: goal.getProgressPercentage(),
      remainingAmount: goal.getRemainingAmount(),
      daysRemaining: goal.getDaysRemaining(),
      isOnTrack: goal.isOnTrack(),
      isOverdue: goal.isOverdue(),
      requiredMonthlyContribution: goal.getRequiredMonthlyContribution(),
      metadata: goal.metadata,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
    };
  }
}
