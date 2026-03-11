import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  AlertRule,
  AlertRuleType,
  AlertRuleConditions,
  AlertRuleActions,
} from "../../domain/entities/alert-rule.entity";

export class AlertRuleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: AlertRuleType })
  ruleType: AlertRuleType;

  @ApiProperty()
  conditions: AlertRuleConditions;

  @ApiProperty()
  actions: AlertRuleActions;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  lastTriggeredAt: Date | null;

  @ApiProperty()
  triggerCount: number;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(rule: AlertRule): AlertRuleResponseDto {
    const dto = new AlertRuleResponseDto();
    dto.id = rule.id;
    dto.userId = rule.userId;
    dto.name = rule.name;
    dto.ruleType = rule.ruleType;
    dto.conditions = rule.conditions;
    dto.actions = rule.actions;
    dto.isActive = rule.isActive;
    dto.lastTriggeredAt = rule.lastTriggeredAt;
    dto.triggerCount = rule.triggerCount;
    dto.createdAt = rule.createdAt;
    return dto;
  }
}
