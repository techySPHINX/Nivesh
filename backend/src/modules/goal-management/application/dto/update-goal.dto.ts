import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean, IsDateString, Min, MaxLength, IsObject } from 'class-validator';
import { GoalPriority } from '../../domain/entities/goal.entity';

export class UpdateGoalDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(0.01)
  targetAmount?: number;

  @IsDateString()
  @IsOptional()
  targetDate?: string;

  @IsEnum(GoalPriority)
  @IsOptional()
  priority?: GoalPriority;

  @IsString()
  @IsOptional()
  linkedAccountId?: string;

  @IsBoolean()
  @IsOptional()
  autoContribute?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0.01)
  contributionAmount?: number;

  @IsString()
  @IsOptional()
  contributionFrequency?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
