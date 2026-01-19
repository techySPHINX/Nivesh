import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DeleteGoalCommand } from '../commands/delete-goal.command';
import { IGoalRepository, GOAL_REPOSITORY } from '../../domain/repositories/goal.repository.interface';

@CommandHandler(DeleteGoalCommand)
export class DeleteGoalHandler implements ICommandHandler<DeleteGoalCommand, void> {
  constructor(
    @Inject(GOAL_REPOSITORY) private readonly goalRepository: IGoalRepository,
  ) { }

  async execute(command: DeleteGoalCommand): Promise<void> {
    const { userId, goalId } = command;

    // Find goal
    const goal = await this.goalRepository.findById(goalId);
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    // Check ownership
    if (goal.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this goal');
    }

    // Delete goal
    await this.goalRepository.delete(goalId);
  }
}
