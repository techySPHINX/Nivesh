export class GetAlertRulesQuery {
  constructor(
    public readonly userId: string,
    public readonly activeOnly: boolean = false,
  ) {}
}
