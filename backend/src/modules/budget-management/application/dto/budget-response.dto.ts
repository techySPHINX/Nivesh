import { ApiProperty } from '@nestjs/swagger';
import { BudgetPeriod } from '../../domain/entities/budget.entity';

export class BudgetResponseDto {
  @ApiProperty({ description: 'Budget ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Budget category' })
  category: string;

  @ApiProperty({ description: 'Budget amount limit' })
  amount: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Budget period', enum: BudgetPeriod })
  period: BudgetPeriod;

  @ApiProperty({ description: 'Budget start date' })
  startDate: Date;

  @ApiProperty({ description: 'Budget end date' })
  endDate: Date;

  @ApiProperty({ description: 'Whether the budget is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Whether this is a recurring budget' })
  isRecurring: boolean;

  @ApiProperty({ description: 'Alert threshold percentage' })
  alertThreshold: number;

  @ApiProperty({ description: 'Current spending amount' })
  currentSpending: number;

  @ApiProperty({ description: 'Remaining budget amount' })
  remainingAmount: number;

  @ApiProperty({ description: 'Spending percentage' })
  spendingPercentage: number;

  @ApiProperty({ description: 'Whether budget is exceeded' })
  isExceeded: boolean;

  @ApiProperty({ description: 'Last calculated timestamp' })
  lastCalculatedAt: Date | null;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: Date;

  static fromEntity(budget: any): BudgetResponseDto {
    const remaining = Math.max(Number(budget.amount) - Number(budget.currentSpending), 0);
    const percentage = Number(budget.amount) > 0 
      ? (Number(budget.currentSpending) / Number(budget.amount)) * 100 
      : 0;

    return {
      id: budget.id,
      userId: budget.userId,
      category: budget.category,
      amount: Number(budget.amount),
      currency: budget.currency,
      period: budget.period,
      startDate: budget.startDate,
      endDate: budget.endDate,
      isActive: budget.isActive,
      isRecurring: budget.isRecurring,
      alertThreshold: budget.alertThreshold,
      currentSpending: Number(budget.currentSpending),
      remainingAmount: remaining,
      spendingPercentage: Math.round(percentage),
      isExceeded: Number(budget.currentSpending) >= Number(budget.amount),
      lastCalculatedAt: budget.lastCalculatedAt,
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
    };
  }
}
