export class GetUserAlertsQuery {
  constructor(
    public readonly userId: string,
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly type?: string,
    public readonly severity?: string,
  ) {}
}
