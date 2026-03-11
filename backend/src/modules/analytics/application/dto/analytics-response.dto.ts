import { ApiProperty } from "@nestjs/swagger";
import {
  SpendingTrendPoint,
  CategoryBreakdown,
  NetWorthPoint,
  TimeGranularity,
} from "../../domain/entities/analytics.entity";

export class SpendingTrendsResponseDto {
  @ApiProperty() userId: string;
  @ApiProperty() period: {
    from: string;
    to: string;
    granularity: TimeGranularity;
  };
  @ApiProperty() data: SpendingTrendPoint[];
  @ApiProperty() summary: {
    totalSpent: number;
    totalIncome: number;
    netSavings: number;
    averageDailySpend: number;
  };
  @ApiProperty() generatedAt: Date;
}

export class CategoryBreakdownResponseDto {
  @ApiProperty() userId: string;
  @ApiProperty() period: { from: string; to: string };
  @ApiProperty() data: CategoryBreakdown[];
  @ApiProperty() topCategory: string;
  @ApiProperty() totalSpent: number;
  @ApiProperty() generatedAt: Date;
}

export class NetWorthHistoryResponseDto {
  @ApiProperty() userId: string;
  @ApiProperty() period: {
    from: string;
    to: string;
    granularity: TimeGranularity;
  };
  @ApiProperty() data: NetWorthPoint[];
  @ApiProperty() currentNetWorth: number;
  @ApiProperty() changeOverPeriod: number;
  @ApiProperty() changePercentage: number;
  @ApiProperty() generatedAt: Date;
}
