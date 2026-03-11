import { IsOptional, IsString, IsEnum } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TimeGranularity } from "../../domain/entities/analytics.entity";

export class SpendingTrendsQueryDto {
  @ApiPropertyOptional({ description: "Start date (ISO 8601)" })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: "End date (ISO 8601)" })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({
    enum: TimeGranularity,
    default: TimeGranularity.MONTHLY,
    description: "Time granularity",
  })
  @IsOptional()
  @IsEnum(TimeGranularity)
  granularity?: TimeGranularity = TimeGranularity.MONTHLY;
}

export class CategoryBreakdownQueryDto {
  @ApiPropertyOptional({ description: "Start date (ISO 8601)" })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: "End date (ISO 8601)" })
  @IsOptional()
  @IsString()
  to?: string;
}

export class NetWorthHistoryQueryDto {
  @ApiPropertyOptional({ description: "Start date (ISO 8601)" })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: "End date (ISO 8601)" })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({
    enum: TimeGranularity,
    default: TimeGranularity.MONTHLY,
  })
  @IsOptional()
  @IsEnum(TimeGranularity)
  granularity?: TimeGranularity = TimeGranularity.MONTHLY;
}
