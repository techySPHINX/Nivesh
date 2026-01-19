import { Transaction, TransactionCategory } from '../entities/transaction.entity';

export const TRANSACTION_REPOSITORY = Symbol('TRANSACTION_REPOSITORY');

export interface TransactionFilters {
  userId?: string;
  accountId?: string;
  category?: TransactionCategory;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
}

export interface ITransactionRepository {
  save(transaction: Transaction): Promise<Transaction>;

  findById(id: string): Promise<Transaction | null>;

  findByUserId(userId: string, limit?: number): Promise<Transaction[]>;

  findByAccountId(accountId: string, limit?: number): Promise<Transaction[]>;

  findByReferenceNumber(referenceNumber: string): Promise<Transaction | null>;

  findAll(options: {
    skip?: number;
    take?: number;
    filters?: TransactionFilters;
    sortBy?: 'transactionDate' | 'amount' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ transactions: Transaction[]; total: number }>;

  // Analytics methods
  getTotalByCategory(userId: string, startDate: Date, endDate: Date): Promise<
    Array<{ category: string; total: number }>
  >;

  getMonthlySpending(userId: string, year: number, month: number): Promise<number>;

  getRecentTransactions(userId: string, days: number, limit?: number): Promise<Transaction[]>;

  delete(id: string): Promise<void>;
}
