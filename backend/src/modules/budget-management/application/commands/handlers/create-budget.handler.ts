import { CommandHandler, ICommandHandler, EventBus } from "@nestjs/cqrs";
import { Injectable, Inject, ConflictException } from "@nestjs/common";
import { CreateBudgetCommand } from "../create-budget.command";
import { PrismaService } from "../../../../../core/database/postgres/prisma.service";
import { BudgetResponseDto } from "../../dto";
import { BudgetCreatedEvent } from "../../../domain/events/budget.events";

@CommandHandler(CreateBudgetCommand)
@Injectable()
export class CreateBudgetHandler implements ICommandHandler<CreateBudgetCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateBudgetCommand): Promise<BudgetResponseDto> {
    const { userId, createBudgetDto } = command;

    // Guard: no duplicate active budget for same category + period
    const existing = await this.prisma.budget.findFirst({
      where: {
        userId,
        category: createBudgetDto.category,
        period: createBudgetDto.period,
        isActive: true,
      },
    });

    if (existing) {
      throw new ConflictException(
        `An active ${createBudgetDto.period} budget for category "${createBudgetDto.category}" already exists.`,
      );
    }

    // Create budget in database
    const budget = await this.prisma.budget.create({
      data: {
        userId,
        category: createBudgetDto.category,
        amount: createBudgetDto.amount,
        currency: createBudgetDto.currency || "INR",
        period: createBudgetDto.period,
        startDate: new Date(createBudgetDto.startDate),
        endDate: new Date(createBudgetDto.endDate),
        alertThreshold: createBudgetDto.alertThreshold || 90,
        isRecurring: createBudgetDto.isRecurring || false,
        isActive: true,
        currentSpending: 0,
      },
    });

    // Publish domain event
    this.eventBus.publish(
      new BudgetCreatedEvent(
        budget.id,
        userId,
        budget.category,
        Number(budget.amount),
        budget.period as any,
        budget.startDate,
        budget.endDate,
      ),
    );

    return BudgetResponseDto.fromEntity(budget);
  }
}
