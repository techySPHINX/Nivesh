export class CancelGoalCommand {
  constructor(
    public readonly userId: string,
    public readonly goalId: string,
    public readonly reason?: string,
  ) { }
}
