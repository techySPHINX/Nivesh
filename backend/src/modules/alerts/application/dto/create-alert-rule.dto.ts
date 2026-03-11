import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsObject,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  AlertRuleType,
  AlertRuleConditions,
  AlertRuleActions,
} from "../../domain/entities/alert-rule.entity";

export class CreateAlertRuleDto {
  @ApiProperty({ description: "Rule name", example: "Budget 90% threshold" })
  @IsString()
  name: string;

  @ApiProperty({ enum: AlertRuleType, example: AlertRuleType.BUDGET_THRESHOLD })
  @IsEnum(AlertRuleType)
  ruleType: AlertRuleType;

  @ApiProperty({
    description: "Rule conditions",
    example: {
      threshold: 90,
      metric: "spending_percentage",
      operator: "gte",
      value: 90,
    },
  })
  @IsObject()
  conditions: AlertRuleConditions;

  @ApiProperty({
    description: "Rule actions on trigger",
    example: { notifyPush: true, notifyEmail: true, notifySms: false },
  })
  @IsObject()
  actions: AlertRuleActions;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}
