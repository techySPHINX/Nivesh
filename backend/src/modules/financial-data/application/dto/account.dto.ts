import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountType, AccountStatus } from '../../domain/entities/account.entity';
import { Currency } from '../../domain/value-objects/money.vo';

// ==========================================
// Account DTOs
// ==========================================

export class CreateAccountDto {
  @ApiProperty({ description: 'Account name/label', example: 'HDFC Savings' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  accountName: string;

  @ApiProperty({ description: 'Account number', example: '12345678901234' })
  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @ApiProperty({
    enum: AccountType,
    description: 'Type of account',
    example: AccountType.SAVINGS,
  })
  @IsEnum(AccountType)
  accountType: AccountType;

  @ApiProperty({ description: 'Bank name', example: 'HDFC Bank' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bankName: string;

  @ApiPropertyOptional({ description: 'IFSC code', example: 'HDFC0001234' })
  @IsString()
  @IsOptional()
  ifscCode?: string;

  @ApiProperty({ description: 'Initial balance', example: 50000 })
  @IsNumber()
  @Min(0)
  balance: number;

  @ApiPropertyOptional({
    enum: Currency,
    description: 'Currency',
    example: Currency.INR,
    default: Currency.INR,
  })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;
}

export class UpdateAccountDto {
  @ApiPropertyOptional({ description: 'Account name/label' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  accountName?: string;

  @ApiPropertyOptional({ description: 'Current balance' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  balance?: number;

  @ApiPropertyOptional({ enum: AccountStatus, description: 'Account status' })
  @IsEnum(AccountStatus)
  @IsOptional()
  status?: AccountStatus;
}

export class AccountResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  accountName: string;

  @ApiProperty()
  accountNumber: string;

  @ApiProperty()
  maskedAccountNumber: string;

  @ApiProperty({ enum: AccountType })
  accountType: AccountType;

  @ApiProperty()
  bankName: string;

  @ApiProperty({ required: false })
  ifscCode?: string;

  @ApiProperty()
  balance: number;

  @ApiProperty()
  formattedBalance: string;

  @ApiProperty({ enum: Currency })
  currency: Currency;

  @ApiProperty({ enum: AccountStatus })
  status: AccountStatus;

  @ApiProperty()
  isLinked: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ required: false })
  lastSyncedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
