import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import {
  Inject,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { DeleteAlertRuleCommand } from "../delete-alert-rule.command";
import {
  IAlertRuleRepository,
  ALERT_RULE_REPOSITORY,
} from "../../../domain/repositories/alert-rule.repository.interface";

@CommandHandler(DeleteAlertRuleCommand)
export class DeleteAlertRuleHandler implements ICommandHandler<DeleteAlertRuleCommand> {
  private readonly logger = new Logger(DeleteAlertRuleHandler.name);

  constructor(
    @Inject(ALERT_RULE_REPOSITORY)
    private readonly alertRuleRepository: IAlertRuleRepository,
  ) {}

  async execute(command: DeleteAlertRuleCommand): Promise<void> {
    const { ruleId, userId } = command;

    const rule = await this.alertRuleRepository.findById(ruleId);
    if (!rule) {
      throw new NotFoundException(`Alert rule ${ruleId} not found`);
    }
    if (rule.userId !== userId) {
      throw new ForbiddenException("Access denied");
    }

    await this.alertRuleRepository.delete(ruleId);
    this.logger.log(`Alert rule deleted: ${ruleId}`);
  }
}
