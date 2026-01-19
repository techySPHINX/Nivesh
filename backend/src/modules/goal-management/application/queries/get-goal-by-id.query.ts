export class GetGoalByIdQuery {
  constructor(
    public readonly userId: string,
    public readonly goalId: string,
  ) { }
}
