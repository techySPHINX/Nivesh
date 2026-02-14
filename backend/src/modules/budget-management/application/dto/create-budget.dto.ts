import { IsString, IsNumber, IsDateString, IsEnum, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BudgetPeriod } from '../../domain/entities/budget.entity';

export class CreateBudgetDto {
  @ApiProperty({ 
    description: 'Budget category (e.g., FOOD, TRANSPORT, ENTERTAINMENT)',
    example: 'FOOD' 
  })
  @IsString()
  category: string;

  @ApiProperty({ 
    description: 'Budget amount limit',
    example: 50000 
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ 
    description: 'Currency code',
    example: 'INR',
    default: 'INR'
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ 
    description: 'Budget period',
    enum: BudgetPeriod,
    example: 'MONTHLY'
  })
  @IsEnum(BudgetPeriod)
  period: BudgetPeriod;

  @ApiProperty({ 
    description: 'Budget start date',
    example: '2026-02-01T00:00:00.000Z'
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({ 
    description: 'Budget end date',
    example: '2026-02-28T23:59:59.999Z'
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({ 
    description: 'Alert threshold percentage (when to send alerts)',
    example: 90,
    default: 90,
    minimum: 0,
    maximum: 100
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  alertThreshold?: number;

  @ApiProperty({ 
    description: 'Whether this is a recurring budget',
    example: true,
    default: false
  })
  @IsOptional()
  isRecurring?: boolean;
}
