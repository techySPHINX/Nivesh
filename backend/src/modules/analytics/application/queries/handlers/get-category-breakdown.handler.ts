import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { GetCategoryBreakdownQuery } from '../get-category-breakdown.query';
import { CategoryBreakdownResponseDto } from '../../dto/analytics-response.dto';
import { ClickhouseService } from '../../../../core/database/clickhouse/clickhouse.service';
import { PrismaService } from '../../../../core/database/prisma.service';
import { CategoryBreakdown } from '../../../analytics/domain/entities/analytics.entity';

@QueryHandler(GetCategoryBreakdownQuery)
export class GetCategoryBreakdownHandler implements IQueryHandler<GetCategoryBreakdownQuery> {
  private readonly logger = new Logger(GetCategoryBreakdownHandler.name);

  constructor(
    private readonly clickhouse: ClickhouseService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(query: GetCategoryBreakdownQuery): Promise<CategoryBreakdownResponseDto> {
    const { userId } = query;
    const now = new Date();
    const from = query.from || new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const to = query.to || now.toISOString();

    let categories: CategoryBreakdown[];

    try {
      const rows = await this.clickhouse.query<any>(`
        SELECT
          category,
          sum(amount) as totalAmount,
          count(*) as transactionCount,
          avg(amount) as averageAmount
        FROM transactions
        WHERE user_id = {userId:String}
          AND type = 'DEBIT'
          AND created_at >= {from:DateTime}
          AND created_at <= {to:DateTime}
        GROUP BY category
        ORDER BY totalAmount DESC
      `, { userId, from, to });

      const grandTotal = rows.reduce((sum, r) => sum + Number(r.totalAmount), 0);
      categories = rows.map((row) => ({
        category: row.category,
        totalAmount: Number(row.totalAmount),
        percentage: grandTotal > 0 ? (Number(row.totalAmount) / grandTotal) * 100 : 0,
        transactionCount: Number(row.transactionCount),
        averageAmount: Number(row.averageAmount),
        trend: 'STABLE' as const,
        changePercentage: 0,
      }));
    } catch (error) {
      this.logger.warn('ClickHouse unavailable, falling back to Prisma for category breakdown');
      categories = await this.fallbackCategoryBreakdown(userId, from, to);
    }

    const totalSpent = categories.reduce((sum, c) => sum + c.totalAmount, 0);
    const topCategory = categories.length > 0 ? categories[0].category : 'N/A';

    // Calculate trends by comparing with previous period
    await this.calculateTrends(categories, userId, from, to);

    return {
      userId,
      period: { from, to },
      data: categories,
      topCategory,
      totalSpent,
      generatedAt: new Date(),
    };
  }

  private async fallbackCategoryBreakdown(
    userId: string,
    from: string,
    to: string,
  ): Promise<CategoryBreakdown[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: 'DEBIT',
        createdAt: { gte: new Date(from), lte: new Date(to) },
      },
    });

    const grouped = new Map<string, { total: number; count: number }>();
    for (const tx of transactions) {
      const cat = tx.category || 'UNCATEGORIZED';
      const existing = grouped.get(cat) || { total: 0, count: 0 };
      existing.total += Number(tx.amount);
      existing.count++;
      grouped.set(cat, existing);
    }

    const grandTotal = Array.from(grouped.values()).reduce((s, v) => s + v.total, 0);
    return Array.from(grouped.entries())
      .map(([category, { total, count }]) => ({
        category,
        totalAmount: total,
        percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
        transactionCount: count,
        averageAmount: count > 0 ? total / count : 0,
        trend: 'STABLE' as const,
        changePercentage: 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }

  private async calculateTrends(
    categories: CategoryBreakdown[],
    userId: string,
    from: string,
    to: string,
  ): Promise<void> {
    try {
      const periodLength = new Date(to).getTime() - new Date(from).getTime();
      const prevFrom = new Date(new Date(from).getTime() - periodLength).toISOString();

      const prevTransactions = await this.prisma.transaction.findMany({
        where: {
          userId,
          type: 'DEBIT',
          createdAt: { gte: new Date(prevFrom), lt: new Date(from) },
        },
      });

      const prevMap = new Map<string, number>();
      for (const tx of prevTransactions) {
        const cat = tx.category || 'UNCATEGORIZED';
        prevMap.set(cat, (prevMap.get(cat) || 0) + Number(tx.amount));
      }

      for (const cat of categories) {
        const prevAmount = prevMap.get(cat.category) || 0;
        if (prevAmount > 0) {
          cat.changePercentage = ((cat.totalAmount - prevAmount) / prevAmount) * 100;
          cat.trend = cat.changePercentage > 5 ? 'UP' : cat.changePercentage < -5 ? 'DOWN' : 'STABLE';
        }
      }
    } catch {
      // Keep default STABLE trend if comparison fails
    }
  }
}
