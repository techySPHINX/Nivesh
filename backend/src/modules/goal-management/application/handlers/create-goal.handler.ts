import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateGoalCommand } from '../commands/create-goal.command';
import { Goal } from '../../domain/entities/goal.entity';
import { IGoalRepository, GOAL_REPOSITORY } from '../../domain/repositories/goal.repository.interface';
import { GoalCreatedEvent } from '../../domain/events/goal.events';
import { GoalResponseDto } from '../dto/goal-response.dto';

@CommandHandler(CreateGoalCommand)
export class CreateGoalHandler implements ICommandHandler<CreateGoalCommand, GoalResponseDto> {
  constructor(
    @Inject(GOAL_REPOSITORY) private readonly goalRepository: IGoalRepository,
    private readonly eventBus: EventBus,
  ) { }

  async execute(command: CreateGoalCommand): Promise<GoalResponseDto> {
    const { userId, dto } = command;

    // Create goal entity
    const goal = Goal.create({
      id: crypto.randomUUID(),
      userId,
      name: dto.name,
      description: dto.description,
      category: dto.category,
      targetAmount: dto.targetAmount,
      currency: dto.currency,
      startDate: new Date(dto.startDate),
      targetDate: new Date(dto.targetDate),
      priority: dto.priority,
      linkedAccountId: dto.linkedAccountId,
      autoContribute: dto.autoContribute,
      contributionAmount: dto.contributionAmount,
      contributionFrequency: dto.contributionFrequency,
      metadata: dto.metadata,
    });

    // Save to repository
    const savedGoal = await this.goalRepository.save(goal);

    // Publish domain event
    const event = new GoalCreatedEvent(
      savedGoal.id,
      savedGoal.userId,
      savedGoal.name,
      savedGoal.category,
      savedGoal.targetAmount,
      savedGoal.targetDate,
    );
    this.eventBus.publish(event);

    // Return DTO
    return this.toResponseDto(savedGoal);
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
