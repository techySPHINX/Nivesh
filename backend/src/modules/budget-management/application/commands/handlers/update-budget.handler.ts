import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { UpdateBudgetCommand } from '../update-budget.command';
import { PrismaService } from '../../../../../core/database/postgres/prisma.service';
import { BudgetResponseDto } from '../../dto';

@CommandHandler(UpdateBudgetCommand)
@Injectable()
export class UpdateBudgetHandler implements ICommandHandler<UpdateBudgetCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UpdateBudgetCommand): Promise<BudgetResponseDto> {
    const { budgetId, userId, updateBudgetDto } = command;

    // Check if budget exists and belongs to user
    const existingBudget = await this.prisma.budget.findUnique({
      where: { id: budgetId },
    });

    if (!existingBudget) {
      throw new NotFoundException(`Budget with ID ${budgetId} not found`);
    }

    if (existingBudget.userId !== userId) {
      throw new ForbiddenException('You do not have permission to update this budget');
    }

    // Update budget
    const budget = await this.prisma.budget.update({
      where: { id: budgetId },
      data: {
        ...(updateBudgetDto.category && { category: updateBudgetDto.category }),
        ...(updateBudgetDto.amount !== undefined && { amount: updateBudgetDto.amount }),
        ...(updateBudgetDto.currency && { currency: updateBudgetDto.currency }),
        ...(updateBudgetDto.period && { period: updateBudgetDto.period }),
        ...(updateBudgetDto.startDate && { startDate: new Date(updateBudgetDto.startDate) }),
        ...(updateBudgetDto.endDate && { endDate: new Date(updateBudgetDto.endDate) }),
        ...(updateBudgetDto.alertThreshold !== undefined && { alertThreshold: updateBudgetDto.alertThreshold }),
        ...(updateBudgetDto.isRecurring !== undefined && { isRecurring: updateBudgetDto.isRecurring }),
        ...(updateBudgetDto.isActive !== undefined && { isActive: updateBudgetDto.isActive }),
      },
    });

    // Publish domain event
    // this.eventBus.publish(new BudgetUpdatedEvent(budget.id, userId));

    return BudgetResponseDto.fromEntity(budget);
  }
}
