export class DeleteGoalCommand {
  constructor(
    public readonly userId: string,
    public readonly goalId: string,
  ) { }
}
