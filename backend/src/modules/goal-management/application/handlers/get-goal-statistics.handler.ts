import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetGoalStatisticsQuery } from '../queries/get-goal-statistics.query';
import { IGoalRepository, GOAL_REPOSITORY } from '../../domain/repositories/goal.repository.interface';
import { GoalStatus } from '../../domain/entities/goal.entity';

export interface GoalStatisticsDto {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  pausedGoals: number;
  cancelledGoals: number;
  expiredGoals: number;
  totalTargetAmount: number;
  totalCurrentAmount: number;
  overallProgress: number;
  goalsOnTrack: number;
  goalsOffTrack: number;
  overdueGoals: number;
}

@QueryHandler(GetGoalStatisticsQuery)
export class GetGoalStatisticsHandler implements IQueryHandler<GetGoalStatisticsQuery, GoalStatisticsDto> {
  constructor(
    @Inject(GOAL_REPOSITORY) private readonly goalRepository: IGoalRepository,
  ) { }

  async execute(query: GetGoalStatisticsQuery): Promise<GoalStatisticsDto> {
    const { userId } = query;

    // Fetch all goals for user
    const allGoals = await this.goalRepository.findByUserId(userId);

    // Calculate statistics
    const activeGoals = allGoals.filter(g => g.status === GoalStatus.ACTIVE);
    const completedGoals = allGoals.filter(g => g.status === GoalStatus.COMPLETED);
    const pausedGoals = allGoals.filter(g => g.status === GoalStatus.PAUSED);
    const cancelledGoals = allGoals.filter(g => g.status === GoalStatus.CANCELLED);
    const expiredGoals = allGoals.filter(g => g.status === GoalStatus.EXPIRED);

    const totalTargetAmount = await this.goalRepository.getTotalTargetAmount(userId);
    const totalCurrentAmount = await this.goalRepository.getTotalCurrentAmount(userId);
    const overallProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;

    const goalsOnTrack = activeGoals.filter(g => g.isOnTrack()).length;
    const goalsOffTrack = activeGoals.length - goalsOnTrack;
    const overdueGoals = await this.goalRepository.findOverdueGoals(userId);

    return {
      totalGoals: allGoals.length,
      activeGoals: activeGoals.length,
      completedGoals: completedGoals.length,
      pausedGoals: pausedGoals.length,
      cancelledGoals: cancelledGoals.length,
      expiredGoals: expiredGoals.length,
      totalTargetAmount,
      totalCurrentAmount,
      overallProgress,
      goalsOnTrack,
      goalsOffTrack,
      overdueGoals: overdueGoals.length,
    };
  }
}
