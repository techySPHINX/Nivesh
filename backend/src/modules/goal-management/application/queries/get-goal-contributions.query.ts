export class GetGoalContributionsQuery {
  constructor(
    public readonly userId: string,
    public readonly goalId: string,
  ) { }
}
