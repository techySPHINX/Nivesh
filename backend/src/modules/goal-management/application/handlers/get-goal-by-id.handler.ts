import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { GetGoalByIdQuery } from '../queries/get-goal-by-id.query';
import { IGoalRepository, GOAL_REPOSITORY } from '../../domain/repositories/goal.repository.interface';
import { GoalResponseDto } from '../dto/goal-response.dto';
import { Goal } from '../../domain/entities/goal.entity';

@QueryHandler(GetGoalByIdQuery)
export class GetGoalByIdHandler implements IQueryHandler<GetGoalByIdQuery, GoalResponseDto> {
  constructor(
    @Inject(GOAL_REPOSITORY) private readonly goalRepository: IGoalRepository,
  ) { }

  async execute(query: GetGoalByIdQuery): Promise<GoalResponseDto> {
    const { userId, goalId } = query;

    const goal = await this.goalRepository.findById(goalId);
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    // Check ownership
    if (goal.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view this goal');
    }

    return this.toResponseDto(goal);
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
