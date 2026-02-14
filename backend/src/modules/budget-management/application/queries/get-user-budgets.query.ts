export class GetUserBudgetsQuery {
  constructor(
    public readonly userId: string,
    public readonly isActive?: boolean,
  ) {}
}
