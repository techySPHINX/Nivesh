import { TransactionType, TransactionCategory } from '../../domain/entities/transaction.entity';
import { Currency } from '../../domain/value-objects/money.vo';

export class CreateTransactionCommand {
  constructor(
    public readonly userId: string,
    public readonly accountId: string,
    public readonly type: TransactionType,
    public readonly amount: number,
    public readonly currency: Currency,
    public readonly category: TransactionCategory,
    public readonly description: string,
    public readonly transactionDate: Date,
    public readonly merchantName?: string,
    public readonly referenceNumber?: string,
  ) { }
}

export class UpdateTransactionCommand {
  constructor(
    public readonly transactionId: string,
    public readonly userId: string,
    public readonly updates: {
      category?: TransactionCategory;
      description?: string;
      status?: string;
    },
  ) { }
}

export class DeleteTransactionCommand {
  constructor(
    public readonly transactionId: string,
    public readonly userId: string,
  ) { }
}
