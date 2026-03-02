export class MarkAlertReadCommand {
  constructor(
    public readonly alertId: string,
    public readonly userId: string,
  ) {}
}
