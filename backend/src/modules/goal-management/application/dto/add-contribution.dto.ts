import { IsNumber, IsNotEmpty, IsString, IsOptional, IsEnum, Min, MaxLength } from 'class-validator';
import { ContributionType } from '../../domain/entities/goal-contribution.entity';

export class AddContributionDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  amount: number;

  @IsEnum(ContributionType)
  @IsOptional()
  type?: ContributionType;

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
