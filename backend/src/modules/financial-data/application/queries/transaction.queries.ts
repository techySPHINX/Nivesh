export class GetTransactionQuery {
  constructor(public readonly transactionId: string) { }
}

export class GetTransactionsByAccountQuery {
  constructor(
    public readonly accountId: string,
    public readonly limit: number = 50,
  ) { }
}

export class GetTransactionsByUserQuery {
  constructor(
    public readonly userId: string,
    public readonly limit: number = 50,
  ) { }
}

export class GetAllTransactionsQuery {
  constructor(
    public readonly skip: number = 0,
    public readonly take: number = 50,
    public readonly userId?: string,
    public readonly accountId?: string,
    public readonly category?: string,
    public readonly startDate?: Date,
    public readonly endDate?: Date,
    public readonly sortBy: 'transactionDate' | 'amount' | 'createdAt' = 'transactionDate',
    public readonly sortOrder: 'asc' | 'desc' = 'desc',
  ) { }
}

export class GetRecentTransactionsQuery {
  constructor(
    public readonly userId: string,
    public readonly days: number = 7,
    public readonly limit: number = 20,
  ) { }
}
