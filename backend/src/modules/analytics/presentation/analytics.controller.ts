import {
  Controller,
  Get,
  Query,
  Param,
  Logger,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { SpendingTrendsQueryDto, CategoryBreakdownQueryDto, NetWorthHistoryQueryDto } from '../application/dto';
import {
  SpendingTrendsResponseDto,
  CategoryBreakdownResponseDto,
  NetWorthHistoryResponseDto,
} from '../application/dto/analytics-response.dto';
import { GetSpendingTrendsQuery } from '../application/queries/get-spending-trends.query';
import { GetCategoryBreakdownQuery } from '../application/queries/get-category-breakdown.query';
import { GetNetWorthHistoryQuery } from '../application/queries/get-net-worth-history.query';
import { TimeGranularity } from '../domain/entities/analytics.entity';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly queryBus: QueryBus) {}

  @Get('spending-trends/:userId')
  @ApiOperation({ summary: 'Get spending trends over time with configurable granularity' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
  @ApiQuery({ name: 'granularity', required: false, enum: TimeGranularity })
  @ApiResponse({ status: 200, description: 'Spending trends data', type: SpendingTrendsResponseDto })
  async getSpendingTrends(
    @Param('userId') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('granularity') granularity?: TimeGranularity,
  ): Promise<SpendingTrendsResponseDto> {
    return this.queryBus.execute(
      new GetSpendingTrendsQuery(
        userId,
        from,
        to,
        granularity || TimeGranularity.MONTHLY,
      ),
    );
  }

  @Get('category-breakdown/:userId')
  @ApiOperation({ summary: 'Get spending breakdown by category with trend analysis' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Category breakdown data', type: CategoryBreakdownResponseDto })
  async getCategoryBreakdown(
    @Param('userId') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<CategoryBreakdownResponseDto> {
    return this.queryBus.execute(new GetCategoryBreakdownQuery(userId, from, to));
  }

  @Get('net-worth-history/:userId')
  @ApiOperation({ summary: 'Get net worth history over time' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
  @ApiQuery({ name: 'granularity', required: false, enum: TimeGranularity })
  @ApiResponse({ status: 200, description: 'Net worth history data', type: NetWorthHistoryResponseDto })
  async getNetWorthHistory(
    @Param('userId') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('granularity') granularity?: TimeGranularity,
  ): Promise<NetWorthHistoryResponseDto> {
    return this.queryBus.execute(
      new GetNetWorthHistoryQuery(
        userId,
        from,
        to,
        granularity || TimeGranularity.MONTHLY,
      ),
    );
  }
}
