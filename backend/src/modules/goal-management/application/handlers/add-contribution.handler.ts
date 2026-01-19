import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AddContributionCommand } from '../commands/add-contribution.command';
import { Goal } from '../../domain/entities/goal.entity';
import { GoalContribution, ContributionType } from '../../domain/entities/goal-contribution.entity';
import { IGoalRepository, GOAL_REPOSITORY } from '../../domain/repositories/goal.repository.interface';
import { IGoalContributionRepository, GOAL_CONTRIBUTION_REPOSITORY } from '../../domain/repositories/goal-contribution.repository.interface';
import { GoalContributionAddedEvent, GoalCompletedEvent } from '../../domain/events/goal.events';
import { ContributionResponseDto } from '../dto/contribution-response.dto';

@CommandHandler(AddContributionCommand)
export class AddContributionHandler implements ICommandHandler<AddContributionCommand, ContributionResponseDto> {
  constructor(
    @Inject(GOAL_REPOSITORY) private readonly goalRepository: IGoalRepository,
    @Inject(GOAL_CONTRIBUTION_REPOSITORY) private readonly contributionRepository: IGoalContributionRepository,
    private readonly eventBus: EventBus,
  ) { }

  async execute(command: AddContributionCommand): Promise<ContributionResponseDto> {
    const { userId, goalId, dto } = command;

    // Find goal
    const goal = await this.goalRepository.findById(goalId);
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    // Check ownership
    if (goal.userId !== userId) {
      throw new ForbiddenException('You do not have permission to contribute to this goal');
    }

    // Create contribution entity
    const contribution = GoalContribution.create({
      id: crypto.randomUUID(),
      goalId: goal.id,
      userId: goal.userId,
      amount: dto.amount,
      currency: goal.currency,
      type: dto.type || ContributionType.MANUAL,
      transactionId: dto.transactionId,
      accountId: dto.accountId,
      notes: dto.notes,
    });

    // Save contribution
    const savedContribution = await this.contributionRepository.save(contribution);

    // Add contribution to goal
    const previousStatus = goal.status;
    goal.addContribution(dto.amount);

    // Save updated goal
    await this.goalRepository.save(goal);

    // Publish contribution event
    const contributionEvent = new GoalContributionAddedEvent(
      goal.id,
      goal.userId,
      savedContribution.id,
      dto.amount,
      goal.currentAmount,
      goal.targetAmount,
    );
    this.eventBus.publish(contributionEvent);

    // If goal was completed, publish completion event
    if (goal.isCompleted() && !previousStatus) {
      const completionEvent = new GoalCompletedEvent(
        goal.id,
        goal.userId,
        goal.name,
        goal.targetAmount,
        new Date(),
      );
      this.eventBus.publish(completionEvent);
    }

    // Return DTO
    return this.toResponseDto(savedContribution);
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
