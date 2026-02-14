import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { GetBudgetQuery } from '../get-budget.query';
import { PrismaService } from '../../../../../core/database/postgres/prisma.service';
import { BudgetResponseDto } from '../../dto';

@QueryHandler(GetBudgetQuery)
@Injectable()
export class GetBudgetHandler implements IQueryHandler<GetBudgetQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetBudgetQuery): Promise<BudgetResponseDto> {
    const { budgetId, userId } = query;

    const budget = await this.prisma.budget.findUnique({
      where: { id: budgetId },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${budgetId} not found`);
    }

    if (budget.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view this budget');
    }

    return BudgetResponseDto.fromEntity(budget);
  }
}
