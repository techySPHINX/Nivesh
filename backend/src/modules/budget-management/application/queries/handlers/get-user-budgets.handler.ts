import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { GetUserBudgetsQuery } from '../get-user-budgets.query';
import { PrismaService } from '../../../../../core/database/postgres/prisma.service';
import { BudgetResponseDto } from '../../dto';

@QueryHandler(GetUserBudgetsQuery)
@Injectable()
export class GetUserBudgetsHandler implements IQueryHandler<GetUserBudgetsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetUserBudgetsQuery): Promise<BudgetResponseDto[]> {
    const { userId, isActive } = query;

    const budgets = await this.prisma.budget.findMany({
      where: {
        userId,
        ...(isActive !== undefined && { isActive }),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return budgets.map(budget => BudgetResponseDto.fromEntity(budget));
  }
}
