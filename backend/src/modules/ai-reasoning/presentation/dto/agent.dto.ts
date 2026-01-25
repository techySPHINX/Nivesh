import { IsString, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * UserContext DTO
 */
export class UserContextDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'Risk tolerance', enum: ['conservative', 'moderate', 'aggressive'] })
  @IsOptional()
  @IsString()
  riskTolerance?: string;

  @ApiPropertyOptional({ description: 'Investment style', enum: ['value', 'growth', 'balanced', 'income'] })
  @IsOptional()
  @IsString()
  investmentStyle?: string;

  @ApiPropertyOptional({ description: 'Financial goals', type: Object })
  @IsOptional()
  @IsObject()
  financialGoals?: any;
}

/**
 * Agent Request DTO
 */
export class AgentRequestDto {
  @ApiProperty({ description: 'User query or task description' })
  @IsString()
  query: string;

  @ApiProperty({ description: 'User context information', type: UserContextDto })
  @ValidateNested()
  @Type(() => UserContextDto)
  userContext: UserContextDto;

  @ApiPropertyOptional({ description: 'Additional context data', type: Object })
  @IsOptional()
  @IsObject()
  additionalContext?: any;

  @ApiPropertyOptional({ description: 'Conversation ID for context continuity' })
  @IsOptional()
  @IsString()
  conversationId?: string;
}

/**
 * Agent Feedback DTO
 */
export class AgentFeedbackDto {
  @ApiProperty({ description: 'Feedback type', enum: ['positive', 'negative', 'neutral'] })
  @IsString()
  feedback: 'positive' | 'negative' | 'neutral';

  @ApiProperty({ description: 'Rating from 1-5' })
  @IsOptional()
  rating?: number;

  @ApiPropertyOptional({ description: 'User comment' })
  @IsOptional()
  @IsString()
  comment?: string;
}
