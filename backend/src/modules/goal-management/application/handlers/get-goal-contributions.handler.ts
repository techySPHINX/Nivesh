import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { GetGoalContributionsQuery } from '../queries/get-goal-contributions.query';
import { IGoalRepository, GOAL_REPOSITORY } from '../../domain/repositories/goal.repository.interface';
import { IGoalContributionRepository, GOAL_CONTRIBUTION_REPOSITORY } from '../../domain/repositories/goal-contribution.repository.interface';
import { ContributionResponseDto } from '../dto/contribution-response.dto';
import { GoalContribution } from '../../domain/entities/goal-contribution.entity';

@QueryHandler(GetGoalContributionsQuery)
export class GetGoalContributionsHandler implements IQueryHandler<GetGoalContributionsQuery, ContributionResponseDto[]> {
  constructor(
    @Inject(GOAL_REPOSITORY) private readonly goalRepository: IGoalRepository,
    @Inject(GOAL_CONTRIBUTION_REPOSITORY) private readonly contributionRepository: IGoalContributionRepository,
  ) { }

  async execute(query: GetGoalContributionsQuery): Promise<ContributionResponseDto[]> {
    const { userId, goalId } = query;

    // Verify goal exists and user owns it
    const goal = await this.goalRepository.findById(goalId);
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    if (goal.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view contributions for this goal');
    }

    // Fetch contributions
    const contributions = await this.contributionRepository.findByGoalId(goalId);

    return contributions.map(contribution => this.toResponseDto(contribution));
  }

  private toResponseDto(contribution: GoalContribution): ContributionResponseDto {
    return {
      id: contribution.id,
      goalId: contribution.goalId,
      userId: contribution.userId,
      amount: contribution.amount,
      currency: contribution.currency,
      type: contribution.type,
      transactionId: contribution.transactionId,
      accountId: contribution.accountId,
      notes: contribution.notes,
      metadata: contribution.metadata,
      createdAt: contribution.createdAt,
    };
  }
}
