import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PauseGoalCommand } from '../commands/pause-goal.command';
import { IGoalRepository, GOAL_REPOSITORY } from '../../domain/repositories/goal.repository.interface';
import { GoalUpdatedEvent } from '../../domain/events/goal.events';
import { GoalResponseDto } from '../dto/goal-response.dto';
import { Goal } from '../../domain/entities/goal.entity';

@CommandHandler(PauseGoalCommand)
export class PauseGoalHandler implements ICommandHandler<PauseGoalCommand, GoalResponseDto> {
  constructor(
    @Inject(GOAL_REPOSITORY) private readonly goalRepository: IGoalRepository,
    private readonly eventBus: EventBus,
  ) { }

  async execute(command: PauseGoalCommand): Promise<GoalResponseDto> {
    const { userId, goalId } = command;

    // Find goal
    const goal = await this.goalRepository.findById(goalId);
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    // Check ownership
    if (goal.userId !== userId) {
      throw new ForbiddenException('You do not have permission to pause this goal');
    }

    // Pause goal
    goal.pause();

    // Save updated goal
    const updatedGoal = await this.goalRepository.save(goal);

    // Publish event
    const event = new GoalUpdatedEvent(goalId, userId, { status: 'PAUSED' });
    this.eventBus.publish(event);

    // Return DTO
    return this.toResponseDto(updatedGoal);
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
