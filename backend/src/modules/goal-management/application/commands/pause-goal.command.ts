export class PauseGoalCommand {
  constructor(
    public readonly userId: string,
    public readonly goalId: string,
  ) { }
}
