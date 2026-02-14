export class GetBudgetSpendingQuery {
  constructor(
    public readonly budgetId: string,
    public readonly userId: string,
  ) {}
}
