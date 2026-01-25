import { IsString, IsArray, IsOptional, IsNumber, IsObject, Min, Max, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IndexTransactionDto {
  @ApiProperty({ description: 'Transaction ID to index' })
  @IsString()
  transactionId: string;
}

export class IndexGoalDto {
  @ApiProperty({ description: 'Goal ID to index' })
  @IsString()
  goalId: string;
}

export class IndexKnowledgeDto {
  @ApiProperty({ description: 'Question text' })
  @IsString()
  question: string;

  @ApiProperty({ description: 'Answer text' })
  @IsString()
  answer: string;

  @ApiProperty({ description: 'Knowledge type', enum: ['faq', 'regulation', 'product', 'strategy', 'guideline'] })
  @IsEnum(['faq', 'regulation', 'product', 'strategy', 'guideline'])
  knowledgeType: 'faq' | 'regulation' | 'product' | 'strategy' | 'guideline';

  @ApiProperty({ description: 'Tags for categorization', type: [String] })
  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @ApiProperty({ description: 'Source of information' })
  @IsString()
  source: string;

  @ApiPropertyOptional({ description: 'Authority (e.g., RBI, SEBI)' })
  @IsOptional()
  @IsString()
  authority?: string;
}

export class SearchDto {
  @ApiProperty({ description: 'Search query text' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ description: 'User ID for personalized search' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Collections to search', type: [String], default: ['user_financial_context', 'financial_knowledge', 'conversation_history'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  collections?: string[];

  @ApiPropertyOptional({ description: 'Number of results to return', default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  topK?: number;

  @ApiPropertyOptional({ description: 'Minimum relevance score threshold', default: 0.7, minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  scoreThreshold?: number;

  @ApiPropertyOptional({ description: 'Additional filters', type: 'object' })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}

export class ReindexUserDto {
  @ApiProperty({ description: 'User ID to reindex' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'Include transactions', default: true })
  @IsOptional()
  includeTransactions?: boolean;

  @ApiPropertyOptional({ description: 'Include goals', default: true })
  @IsOptional()
  includeGoals?: boolean;

  @ApiPropertyOptional({ description: 'Include budgets', default: true })
  @IsOptional()
  includeBudgets?: boolean;
}
