import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TransactionType,
  TransactionCategory,
  TransactionStatus,
} from '../../domain/entities/transaction.entity';
import { Currency } from '../../domain/value-objects/money.vo';

// ==========================================
// Transaction DTOs
// ==========================================

export class CreateTransactionDto {
  @ApiProperty({ description: 'Account ID' })
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({
    enum: TransactionType,
    description: 'Transaction type',
    example: TransactionType.DEBIT,
  })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ description: 'Transaction amount', example: 1500 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    enum: Currency,
    description: 'Currency',
    default: Currency.INR,
  })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @ApiProperty({
    enum: TransactionCategory,
    description: 'Transaction category',
    example: TransactionCategory.FOOD,
  })
  @IsEnum(TransactionCategory)
  category: TransactionCategory;

  @ApiProperty({ description: 'Transaction description', example: 'Dinner at restaurant' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ description: 'Merchant name', example: 'Pizza Hut' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  merchantName?: string;

  @ApiProperty({ description: 'Transaction date', example: '2026-01-20T10:30:00Z' })
  @IsDateString()
  transactionDate: string;

  @ApiPropertyOptional({ description: 'Reference number' })
  @IsString()
  @IsOptional()
  referenceNumber?: string;
}

export class UpdateTransactionDto {
  @ApiPropertyOptional({ enum: TransactionCategory, description: 'Category' })
  @IsEnum(TransactionCategory)
  @IsOptional()
  category?: TransactionCategory;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: TransactionStatus, description: 'Status' })
  @IsEnum(TransactionStatus)
  @IsOptional()
  status?: TransactionStatus;
}

export class TransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  accountId: string;

  @ApiProperty({ enum: TransactionType })
  type: TransactionType;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  formattedAmount: string;

  @ApiProperty({ enum: Currency })
  currency: Currency;

  @ApiProperty({ enum: TransactionCategory })
  category: TransactionCategory;

  @ApiProperty()
  description: string;

  @ApiProperty({ required: false })
  merchantName?: string;

  @ApiProperty()
  transactionDate: Date;

  @ApiProperty({ required: false })
  referenceNumber?: string;

  @ApiProperty({ enum: TransactionStatus })
  status: TransactionStatus;

  @ApiProperty()
  isDebit: boolean;

  @ApiProperty()
  isCredit: boolean;

  @ApiProperty()
  isIncome: boolean;

  @ApiProperty()
  isExpense: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class TransactionFiltersDto {
  @ApiPropertyOptional({ description: 'Account ID' })
  @IsString()
  @IsOptional()
  accountId?: string;

  @ApiPropertyOptional({ enum: TransactionCategory })
  @IsEnum(TransactionCategory)
  @IsOptional()
  category?: TransactionCategory;

  @ApiPropertyOptional({ description: 'Start date', example: '2026-01-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date', example: '2026-01-31' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Minimum amount' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum amount' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  maxAmount?: number;
}
