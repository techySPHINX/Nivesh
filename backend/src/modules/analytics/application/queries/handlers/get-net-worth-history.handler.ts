import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { GetNetWorthHistoryQuery } from '../get-net-worth-history.query';
import { NetWorthHistoryResponseDto } from '../../dto/analytics-response.dto';
import { ClickhouseService } from '../../../../core/database/clickhouse/clickhouse.service';
import { PrismaService } from '../../../../core/database/prisma.service';
import { TimeGranularity, NetWorthPoint } from '../../../analytics/domain/entities/analytics.entity';

@QueryHandler(GetNetWorthHistoryQuery)
export class GetNetWorthHistoryHandler implements IQueryHandler<GetNetWorthHistoryQuery> {
  private readonly logger = new Logger(GetNetWorthHistoryHandler.name);

  constructor(
    private readonly clickhouse: ClickhouseService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(query: GetNetWorthHistoryQuery): Promise<NetWorthHistoryResponseDto> {
    const { userId, granularity } = query;
    const now = new Date();
    const from = query.from || new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString();
    const to = query.to || now.toISOString();

    let data: NetWorthPoint[];

    try {
      data = await this.calculateNetWorthFromClickHouse(userId, from, to, granularity);
    } catch (error) {
      this.logger.warn('ClickHouse unavailable, falling back to Prisma for net worth history');
      data = await this.calculateNetWorthFromPrisma(userId, from, to, granularity);
    }

    const currentNetWorth = data.length > 0 ? data[data.length - 1].netWorth : 0;
    const firstNetWorth = data.length > 0 ? data[0].netWorth : 0;
    const changeOverPeriod = currentNetWorth - firstNetWorth;
    const changePercentage = firstNetWorth !== 0 ? (changeOverPeriod / Math.abs(firstNetWorth)) * 100 : 0;

    return {
      userId,
      period: { from, to, granularity },
      data,
      currentNetWorth,
      changeOverPeriod,
      changePercentage,
      generatedAt: new Date(),
    };
  }

  private async calculateNetWorthFromClickHouse(
    userId: string,
    from: string,
    to: string,
    granularity: TimeGranularity,
  ): Promise<NetWorthPoint[]> {
    const dateFormat = granularity === TimeGranularity.DAILY
      ? "formatDateTime(snapshot_date, '%Y-%m-%d')"
      : "formatDateTime(snapshot_date, '%Y-%m')";

    const rows = await this.clickhouse.query<any>(`
      SELECT
        ${dateFormat} as date,
        sum(CASE WHEN account_type IN ('SAVINGS', 'INVESTMENT', 'CHECKING') THEN balance ELSE 0 END) as totalAssets,
        sum(CASE WHEN account_type IN ('CREDIT_CARD', 'LOAN') THEN balance ELSE 0 END) as totalLiabilities
      FROM account_snapshots
      WHERE user_id = {userId:String}
        AND snapshot_date >= {from:DateTime}
        AND snapshot_date <= {to:DateTime}
      GROUP BY date
      ORDER BY date ASC
    `, { userId, from, to });

    let previousNetWorth = 0;
    return rows.map((row) => {
      const totalAssets = Number(row.totalAssets);
      const totalLiabilities = Number(row.totalLiabilities);
      const netWorth = totalAssets - totalLiabilities;
      const change = netWorth - previousNetWorth;
      previousNetWorth = netWorth;

      return {
        date: row.date,
        totalAssets,
        totalLiabilities,
        netWorth,
        changeFromPrevious: change,
      };
    });
  }

  private async calculateNetWorthFromPrisma(
    userId: string,
    from: string,
    to: string,
    granularity: TimeGranularity,
  ): Promise<NetWorthPoint[]> {
    // Fetch user accounts and build net worth history from transactions
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      select: { id: true, accountType: true, balance: true },
    });

    const totalAssets = accounts
      .filter((a) => ['SAVINGS', 'INVESTMENT', 'CHECKING'].includes(a.accountType))
      .reduce((sum, a) => sum + Number(a.balance), 0);

    const totalLiabilities = accounts
      .filter((a) => ['CREDIT_CARD', 'LOAN'].includes(a.accountType))
      .reduce((sum, a) => sum + Number(a.balance), 0);

    // Single snapshot for fallback - real data requires historical snapshots
    const point: NetWorthPoint = {
      date: new Date().toISOString().slice(0, 10),
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
      changeFromPrevious: 0,
    };

    return [point];
  }
}
