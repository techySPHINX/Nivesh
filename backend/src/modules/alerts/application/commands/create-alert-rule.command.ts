import { CreateAlertRuleDto } from '../dto/create-alert-rule.dto';

export class CreateAlertRuleCommand {
  constructor(
    public readonly userId: string,
    public readonly createAlertRuleDto: CreateAlertRuleDto,
  ) {}
}
