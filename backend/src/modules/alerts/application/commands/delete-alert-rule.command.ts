export class DeleteAlertRuleCommand {
  constructor(
    public readonly ruleId: string,
    public readonly userId: string,
  ) {}
}
