import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { Logger } from "@nestjs/common";
import { GetSpendingTrendsQuery } from "../get-spending-trends.query";
import { SpendingTrendsResponseDto } from "../../dto/analytics-response.dto";
import { ClickhouseService } from "../../../../../core/database/clickhouse/clickhouse.service";
import { PrismaService } from "../../../../../core/database/postgres/prisma.service";
import {
  TimeGranularity,
  SpendingTrendPoint,
} from "../../../domain/entities/analytics.entity";

@QueryHandler(GetSpendingTrendsQuery)
export class GetSpendingTrendsHandler implements IQueryHandler<GetSpendingTrendsQuery> {
  private readonly logger = new Logger(GetSpendingTrendsHandler.name);

  constructor(
    private readonly clickhouse: ClickhouseService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    query: GetSpendingTrendsQuery,
  ): Promise<SpendingTrendsResponseDto> {
    const { userId, granularity } = query;
    const now = new Date();
    const from =
      query.from ||
      new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString();
    const to = query.to || now.toISOString();

    let data: SpendingTrendPoint[];

    try {
      // Attempt ClickHouse for time-series analytics
      const dateFormat = this.getClickHouseDateFormat(granularity);
      const rows = await this.clickhouse.query<any>(
        `
        SELECT
          ${dateFormat} as period,
          sum(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) as totalSpent,
          sum(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) as totalIncome,
          count(*) as transactionCount
        FROM transactions
        WHERE user_id = {userId:String}
          AND created_at >= {from:DateTime}
          AND created_at <= {to:DateTime}
        GROUP BY period
        ORDER BY period ASC
      `,
        { userId, from, to },
      );

      data = rows.map((row) => ({
        period: row.period,
        totalSpent: Number(row.totalSpent),
        totalIncome: Number(row.totalIncome),
        netSavings: Number(row.totalIncome) - Number(row.totalSpent),
        transactionCount: Number(row.transactionCount),
      }));
    } catch (error) {
      this.logger.warn(
        "ClickHouse unavailable, falling back to Prisma for spending trends",
      );
      data = await this.fallbackSpendingTrends(userId, from, to, granularity);
    }

    const totalSpent = data.reduce((sum, d) => sum + d.totalSpent, 0);
    const totalIncome = data.reduce((sum, d) => sum + d.totalIncome, 0);
    const daysDiff = Math.max(
      1,
      Math.ceil(
        (new Date(to).getTime() - new Date(from).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    return {
      userId,
      period: { from, to, granularity },
      data,
      summary: {
        totalSpent,
        totalIncome,
        netSavings: totalIncome - totalSpent,
        averageDailySpend: totalSpent / daysDiff,
      },
      generatedAt: new Date(),
    };
  }

  private getClickHouseDateFormat(granularity: TimeGranularity): string {
    switch (granularity) {
      case TimeGranularity.DAILY:
        return "formatDateTime(created_at, '%Y-%m-%d')";
      case TimeGranularity.WEEKLY:
        return "formatDateTime(toMonday(created_at), '%Y-%m-%d')";
      case TimeGranularity.MONTHLY:
        return "formatDateTime(created_at, '%Y-%m')";
      case TimeGranularity.QUARTERLY:
        return "concat(toString(toYear(created_at)), '-Q', toString(toQuarter(created_at)))";
      case TimeGranularity.YEARLY:
        return "formatDateTime(created_at, '%Y')";
      default:
        return "formatDateTime(created_at, '%Y-%m')";
    }
  }

  private async fallbackSpendingTrends(
    userId: string,
    from: string,
    to: string,
    granularity: TimeGranularity,
  ): Promise<SpendingTrendPoint[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(from),
          lte: new Date(to),
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const grouped = new Map<string, SpendingTrendPoint>();
    for (const tx of transactions) {
      const key = this.getPeriodKey(tx.createdAt, granularity);
      const existing = grouped.get(key) || {
        period: key,
        totalSpent: 0,
        totalIncome: 0,
        netSavings: 0,
        transactionCount: 0,
      };

      const amount = Number(tx.amount);
      if (tx.type === "DEBIT") {
        existing.totalSpent += amount;
      } else {
        existing.totalIncome += amount;
      }
      existing.netSavings = existing.totalIncome - existing.totalSpent;
      existing.transactionCount++;
      grouped.set(key, existing);
    }

    return Array.from(grouped.values());
  }

  private getPeriodKey(date: Date, granularity: TimeGranularity): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    switch (granularity) {
      case TimeGranularity.DAILY:
        return `${year}-${month}-${day}`;
      case TimeGranularity.WEEKLY: {
        const monday = new Date(date);
        monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
        return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
      }
      case TimeGranularity.MONTHLY:
        return `${year}-${month}`;
      case TimeGranularity.QUARTERLY:
        return `${year}-Q${Math.ceil((date.getMonth() + 1) / 3)}`;
      case TimeGranularity.YEARLY:
        return `${year}`;
      default:
        return `${year}-${month}`;
    }
  }
}
