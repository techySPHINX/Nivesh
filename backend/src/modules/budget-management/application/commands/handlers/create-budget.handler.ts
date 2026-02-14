import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBudgetCommand } from '../create-budget.command';
import { PrismaService } from '../../../../../core/database/postgres/prisma.service';
import { BudgetResponseDto } from '../../dto';

@CommandHandler(CreateBudgetCommand)
@Injectable()
export class CreateBudgetHandler implements ICommandHandler<CreateBudgetCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateBudgetCommand): Promise<BudgetResponseDto> {
    const { userId, createBudgetDto } = command;

    // Create budget in database
    const budget = await this.prisma.budget.create({
      data: {
        userId,
        category: createBudgetDto.category,
        amount: createBudgetDto.amount,
        currency: createBudgetDto.currency || 'INR',
        period: createBudgetDto.period,
        startDate: new Date(createBudgetDto.startDate),
        endDate: new Date(createBudgetDto.endDate),
        alertThreshold: createBudgetDto.alertThreshold || 90,
        isRecurring: createBudgetDto.isRecurring || false,
        isActive: true,
        currentSpending: 0,
      },
    });

    // Publish domain event (optional)
    // this.eventBus.publish(new BudgetCreatedEvent(budget.id, userId));

    return BudgetResponseDto.fromEntity(budget);
  }
}
