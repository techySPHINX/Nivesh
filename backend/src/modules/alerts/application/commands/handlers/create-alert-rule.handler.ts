import { CommandHandler, ICommandHandler, EventBus } from "@nestjs/cqrs";
import { Inject, Logger } from "@nestjs/common";
import { CreateAlertRuleCommand } from "../create-alert-rule.command";
import { AlertRuleResponseDto } from "../../dto/alert-rule-response.dto";
import {
  IAlertRuleRepository,
  ALERT_RULE_REPOSITORY,
} from "../../../domain/repositories/alert-rule.repository.interface";
import { AlertRule } from "../../../domain/entities/alert-rule.entity";
import { AlertRuleCreatedEvent } from "../../../domain/events/alert.events";

@CommandHandler(CreateAlertRuleCommand)
export class CreateAlertRuleHandler implements ICommandHandler<CreateAlertRuleCommand> {
  private readonly logger = new Logger(CreateAlertRuleHandler.name);

  constructor(
    @Inject(ALERT_RULE_REPOSITORY)
    private readonly alertRuleRepository: IAlertRuleRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    command: CreateAlertRuleCommand,
  ): Promise<AlertRuleResponseDto> {
    const { userId, createAlertRuleDto } = command;

    const rule = AlertRule.create({
      id: crypto.randomUUID(),
      userId,
      name: createAlertRuleDto.name,
      ruleType: createAlertRuleDto.ruleType,
      conditions: createAlertRuleDto.conditions,
      actions: createAlertRuleDto.actions,
      metadata: createAlertRuleDto.metadata,
    });

    const savedRule = await this.alertRuleRepository.save(rule);

    this.eventBus.publish(
      new AlertRuleCreatedEvent(
        savedRule.id,
        userId,
        savedRule.ruleType,
        savedRule.name,
      ),
    );

    this.logger.log(`Alert rule created: ${savedRule.id} for user ${userId}`);
    return AlertRuleResponseDto.fromEntity(savedRule);
  }
}
