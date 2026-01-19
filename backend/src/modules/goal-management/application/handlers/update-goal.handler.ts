import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { UpdateGoalCommand } from '../commands/update-goal.command';
import { Goal } from '../../domain/entities/goal.entity';
import { IGoalRepository, GOAL_REPOSITORY } from '../../domain/repositories/goal.repository.interface';
import { GoalUpdatedEvent } from '../../domain/events/goal.events';
import { GoalResponseDto } from '../dto/goal-response.dto';

@CommandHandler(UpdateGoalCommand)
export class UpdateGoalHandler implements ICommandHandler<UpdateGoalCommand, GoalResponseDto> {
  constructor(
    @Inject(GOAL_REPOSITORY) private readonly goalRepository: IGoalRepository,
    private readonly eventBus: EventBus,
  ) { }

  async execute(command: UpdateGoalCommand): Promise<GoalResponseDto> {
    const { userId, goalId, dto } = command;

    // Find existing goal
    const goal = await this.goalRepository.findById(goalId);
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    // Check ownership
    if (goal.userId !== userId) {
      throw new ForbiddenException('You do not have permission to update this goal');
    }

    // Update goal
    goal.updateDetails({
      name: dto.name,
      description: dto.description,
      targetAmount: dto.targetAmount,
      targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      priority: dto.priority,
    });

    // Update auto-contribution settings if provided
    if (dto.autoContribute !== undefined) {
      if (dto.autoContribute && dto.contributionAmount && dto.contributionFrequency && dto.linkedAccountId) {
        goal.enableAutoContribution(dto.contributionAmount, dto.contributionFrequency, dto.linkedAccountId);
      } else if (!dto.autoContribute) {
        goal.disableAutoContribution();
      }
    }

    // Save updated goal
    const updatedGoal = await this.goalRepository.save(goal);

    // Publish domain event
    const event = new GoalUpdatedEvent(goalId, userId, dto);
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
