import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DeleteBudgetCommand } from '../delete-budget.command';
import { PrismaService } from '../../../../../core/database/postgres/prisma.service';

@CommandHandler(DeleteBudgetCommand)
@Injectable()
export class DeleteBudgetHandler implements ICommandHandler<DeleteBudgetCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: DeleteBudgetCommand): Promise<void> {
    const { budgetId, userId } = command;

    // Check if budget exists and belongs to user
    const existingBudget = await this.prisma.budget.findUnique({
      where: { id: budgetId },
    });

    if (!existingBudget) {
      throw new NotFoundException(`Budget with ID ${budgetId} not found`);
    }

    if (existingBudget.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this budget');
    }

    // Delete budget
    await this.prisma.budget.delete({
      where: { id: budgetId },
    });

    // Publish domain event
    // this.eventBus.publish(new BudgetDeletedEvent(budgetId, userId));
  }
}
