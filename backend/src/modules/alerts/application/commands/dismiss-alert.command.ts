export class DismissAlertCommand {
  constructor(
    public readonly alertId: string,
    public readonly userId: string,
  ) {}
}
