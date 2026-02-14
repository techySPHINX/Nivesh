import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { GetBudgetSpendingQuery } from '../get-budget-spending.query';
import { PrismaService } from '../../../../../core/database/postgres/prisma.service';
import { BudgetSpendingDto } from '../../dto';

@QueryHandler(GetBudgetSpendingQuery)
@Injectable()
export class GetBudgetSpendingHandler implements IQueryHandler<GetBudgetSpendingQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetBudgetSpendingQuery): Promise<BudgetSpendingDto> {
    const { budgetId, userId } = query;

    // Get budget
    const budget = await this.prisma.budget.findUnique({
      where: { id: budgetId },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${budgetId} not found`);
    }

    if (budget.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view this budget');
    }

    // Get transactions for the budget period and category
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        category: budget.category,
        transactionDate: {
          gte: budget.startDate,
          lte: budget.endDate,
        },
        type: 'DEBIT', // Only count expenses
      },
    });

    const currentSpending = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const limit = Number(budget.amount);
    const remaining = Math.max(limit - currentSpending, 0);
    const percentage = limit > 0 ? (currentSpending / limit) * 100 : 0;

    // Calculate days remaining
    const now = new Date();
    const endDate = new Date(budget.endDate);
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    // Calculate projections
    const startDate = new Date(budget.startDate);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.max(1, totalDays - daysRemaining);
    const averageDailySpending = currentSpending / elapsedDays;
    const projectedSpending = averageDailySpending * totalDays;

    return {
      budgetId: budget.id,
      category: budget.category,
      limit,
      currentSpending,
      remaining,
      percentage: Math.round(percentage),
      transactionCount: transactions.length,
      isExceeded: currentSpending >= limit,
      daysRemaining,
      averageDailySpending: Math.round(averageDailySpending),
      projectedSpending: Math.round(projectedSpending),
      projectedToExceed: projectedSpending > limit,
    };
  }
}
