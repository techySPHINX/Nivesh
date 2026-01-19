import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, IsBoolean, IsDateString, Min, MaxLength, IsObject } from 'class-validator';
import { GoalCategory, GoalPriority } from '../../domain/entities/goal.entity';

export class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @IsEnum(GoalCategory)
  @IsNotEmpty()
  category: GoalCategory;

  @IsNumber()
  @Min(0.01)
  targetAmount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  targetDate: string;

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
