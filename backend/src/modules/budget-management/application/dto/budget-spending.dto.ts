import { ApiProperty } from '@nestjs/swagger';

export class BudgetSpendingDto {
  @ApiProperty({ description: 'Budget ID' })
  budgetId: string;

  @ApiProperty({ description: 'Budget category' })
  category: string;

  @ApiProperty({ description: 'Budget limit amount' })
  limit: number;

  @ApiProperty({ description: 'Current spending' })
  currentSpending: number;

  @ApiProperty({ description: 'Remaining amount' })
  remaining: number;

  @ApiProperty({ description: 'Spending percentage' })
  percentage: number;

  @ApiProperty({ description: 'Number of transactions' })
  transactionCount: number;

  @ApiProperty({ description: 'Whether budget is exceeded' })
  isExceeded: boolean;

  @ApiProperty({ description: 'Days remaining in budget period' })
  daysRemaining: number;

  @ApiProperty({ description: 'Average daily spending' })
  averageDailySpending: number;

  @ApiProperty({ description: 'Projected spending at current rate' })
  projectedSpending: number;

  @ApiProperty({ description: 'Whether projected to exceed' })
  projectedToExceed: boolean;
}
