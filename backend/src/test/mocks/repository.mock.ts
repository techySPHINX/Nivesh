/**
 * Repository Mocks for Testing
 * Provides mock implementations of repository interfaces
 */

import { IAccountRepository } from '../../modules/financial-data/domain/repositories/account.repository.interface';
import {
  ITransactionRepository,
  TransactionFilters,
} from '../../modules/financial-data/domain/repositories/transaction.repository.interface';
import { Account } from '../../modules/financial-data/domain/entities/account.entity';
import { Transaction } from '../../modules/financial-data/domain/entities/transaction.entity';

/**
 * Mock Account Repository
 */
export class MockAccountRepository implements IAccountRepository {
  private accounts: Map<string, Account> = new Map();

  async save(account: Account): Promise<Account> {
    this.accounts.set(account.Id, account);
    return account;
  }

  async findById(id: string): Promise<Account | null> {
    return this.accounts.get(id) || null;
  }

  async findByUserId(userId: string): Promise<Account[]> {
    return Array.from(this.accounts.values()).filter((account) => account.UserId === userId);
  }

  async findByAccountNumber(accountNumber: string): Promise<Account | null> {
    return (
      Array.from(this.accounts.values()).find(
        (account) => account.AccountNumber.getValue() === accountNumber,
      ) || null
    );
  }

  async existsByAccountNumber(accountNumber: string): Promise<boolean> {
    return Array.from(this.accounts.values()).some(
      (account) => account.AccountNumber.getValue() === accountNumber,
    );
  }

  async findActiveByUserId(userId: string): Promise<Account[]> {
    return Array.from(this.accounts.values()).filter(
      (account) => account.UserId === userId && account.Status === 'ACTIVE',
    );
  }

  async findLinkedByUserId(userId: string): Promise<Account[]> {
    return Array.from(this.accounts.values()).filter(
      (account) => account.UserId === userId && account.IsLinked,
    );
  }

  async findAll(options: {
    skip?: number;
    take?: number;
    userId?: string;
  }): Promise<{ accounts: Account[]; total: number }> {
    let result = Array.from(this.accounts.values());

    if (options.userId) {
      result = result.filter((account) => account.UserId === options.userId);
    }

    const total = result.length;
    const skip = options.skip || 0;
    const take = options.take || 50;

    const accounts = result.slice(skip, skip + take);

    return { accounts, total };
  }

  async delete(id: string): Promise<void> {
    this.accounts.delete(id);
  }

  // Test utilities
  clear(): void {
    this.accounts.clear();
  }

  getAll(): Account[] {
    return Array.from(this.accounts.values());
  }

  count(): number {
    return this.accounts.size;
  }
}

/**
 * Mock Transaction Repository
 */
export class MockTransactionRepository implements ITransactionRepository {
  private transactions: Map<string, Transaction> = new Map();

  async save(transaction: Transaction): Promise<Transaction> {
    this.transactions.set(transaction.Id, transaction);
    return transaction;
  }

  async findById(id: string): Promise<Transaction | null> {
    return this.transactions.get(id) || null;
  }

  async findByUserId(userId: string, limit: number = 50): Promise<Transaction[]> {
    const userTransactions = Array.from(this.transactions.values()).filter(
      (transaction) => transaction.UserId === userId,
    );
    return userTransactions.slice(0, limit);
  }

  async findByAccountId(accountId: string, limit: number = 50): Promise<Transaction[]> {
    const accountTransactions = Array.from(this.transactions.values()).filter(
      (transaction) => transaction.AccountId === accountId,
    );
    return accountTransactions.slice(0, limit);
  }

  async findByReferenceNumber(referenceNumber: string): Promise<Transaction | null> {
    return (
      Array.from(this.transactions.values()).find(
        (transaction) => transaction.ReferenceNumber === referenceNumber,
      ) || null
    );
  }

  async findAll(options: {
    skip?: number;
    take?: number;
    filters?: TransactionFilters;
    sortBy?: 'transactionDate' | 'amount' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ transactions: Transaction[]; total: number }> {
    let result = Array.from(this.transactions.values());

    // Apply filters
    if (options.filters) {
      const filters = options.filters;

      if (filters.userId) {
        result = result.filter((t) => t.UserId === filters.userId);
      }

      if (filters.accountId) {
        result = result.filter((t) => t.AccountId === filters.accountId);
      }

      if (filters.category) {
        result = result.filter((t) => t.Category === filters.category);
      }

      if (filters.startDate) {
        result = result.filter((t) => t.TransactionDate >= filters.startDate!);
      }

      if (filters.endDate) {
        result = result.filter((t) => t.TransactionDate <= filters.endDate!);
      }

      if (filters.minAmount !== undefined) {
        result = result.filter((t) => t.Amount.getAmount() >= filters.minAmount!);
      }

      if (filters.maxAmount !== undefined) {
        result = result.filter((t) => t.Amount.getAmount() <= filters.maxAmount!);
      }
    }

    // Sorting
    if (options.sortBy) {
      result.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (options.sortBy) {
          case 'transactionDate':
            aValue = a.TransactionDate.getTime();
            bValue = b.TransactionDate.getTime();
            break;
          case 'amount':
            aValue = a.Amount.getAmount();
            bValue = b.Amount.getAmount();
            break;
          case 'createdAt':
            aValue = a.CreatedAt.getTime();
            bValue = b.CreatedAt.getTime();
            break;
          default:
            aValue = a.CreatedAt.getTime();
            bValue = b.CreatedAt.getTime();
        }

        const order = options.sortOrder === 'asc' ? 1 : -1;
        if (aValue < bValue) return -1 * order;
        if (aValue > bValue) return 1 * order;
        return 0;
      });
    }

    const total = result.length;
    const skip = options.skip || 0;
    const take = options.take || 50;

    const transactions = result.slice(skip, skip + take);

    return { transactions, total };
  }

  async getTotalByCategory(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ category: string; total: number }>> {
    let userTransactions = Array.from(this.transactions.values()).filter(
      (transaction) => transaction.UserId === userId,
    );

    userTransactions = userTransactions.filter(
      (t) => t.TransactionDate >= startDate && t.TransactionDate <= endDate,
    );

    const categoryTotals = new Map<string, number>();

    userTransactions.forEach((transaction) => {
      const current = categoryTotals.get(transaction.Category) || 0;
      categoryTotals.set(transaction.Category, current + transaction.Amount.getAmount());
    });

    return Array.from(categoryTotals.entries()).map(([category, total]) => ({
      category,
      total,
    }));
  }

  async getMonthlySpending(userId: string, year: number, month: number): Promise<number> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const monthlyTransactions = Array.from(this.transactions.values()).filter(
      (transaction) =>
        transaction.UserId === userId &&
        transaction.TransactionDate >= startDate &&
        transaction.TransactionDate <= endDate &&
        transaction.Type === 'DEBIT',
    );

    return monthlyTransactions.reduce((sum, transaction) => sum + transaction.Amount.getAmount(), 0);
  }

  async getRecentTransactions(userId: string, days: number = 7, limit?: number): Promise<Transaction[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let result = Array.from(this.transactions.values())
      .filter(
        (transaction) => transaction.UserId === userId && transaction.TransactionDate >= cutoffDate,
      )
      .sort((a, b) => b.TransactionDate.getTime() - a.TransactionDate.getTime());

    if (limit) {
      result = result.slice(0, limit);
    }

    return result;
  }

  async delete(id: string): Promise<void> {
    this.transactions.delete(id);
  }

  // Test utilities
  clear(): void {
    this.transactions.clear();
  }

  getAll(): Transaction[] {
    return Array.from(this.transactions.values());
  }

  count(): number {
    return this.transactions.size;
  }
}
