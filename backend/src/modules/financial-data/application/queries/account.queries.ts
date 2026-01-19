export class GetAccountQuery {
  constructor(public readonly accountId: string) { }
}

export class GetAccountsByUserQuery {
  constructor(
    public readonly userId: string,
    public readonly activeOnly: boolean = false,
  ) { }
}

export class GetAllAccountsQuery {
  constructor(
    public readonly skip: number = 0,
    public readonly take: number = 10,
    public readonly userId?: string,
  ) { }
}
