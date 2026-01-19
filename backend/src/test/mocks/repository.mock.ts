/**
 * Repository Mocks for Testing
 * Provides mock implementations of repository interfaces
 */

import { IAccountRepository } from '../../modules/financial-data/domain/repositories/account.repository.interface';
import { ITransactionRepository } from '../../modules/financial-data/domain/repositories/transaction.repository.interface';
import { Account } from '../../modules/financial-data/domain/entities/account.entity';
import { Transaction } from '../../modules/financial-data/domain/entities/transaction.entity';
import { TransactionFiltersDto } from '../../modules/financial-data/application/dto/transaction.dto';

/**
 * Mock Account Repository
 */
export class MockAccountRepository implements IAccountRepository {
  private accounts: Map<string, Account> = new Map();

  async save(account: Account): Promise<Account> {
    this.accounts.set(account.id, account);
    return account;
  }

  async findById(id: string): Promise<Account | null> {
    return this.accounts.get(id) || null;
  }

  async findByUserId(userId: string): Promise<Account[]> {
    return Array.from(this.accounts.values()).filter((account) => account.userId === userId);
  }

  async findByAccountNumber(accountNumber: string): Promise<Account | null> {
    return (
      Array.from(this.accounts.values()).find(
        (account) => account.accountNumber.getValue() === accountNumber,
      ) || null
    );
  }

  async existsByAccountNumber(accountNumber: string): Promise<boolean> {
    return Array.from(this.accounts.values()).some(
      (account) => account.accountNumber.getValue() === accountNumber,
    );
  }

  async findActiveByUserId(userId: string): Promise<Account[]> {
    return Array.from(this.accounts.values()).filter(
      (account) => account.userId === userId && account.status === 'ACTIVE',
    );
  }

  async findLinkedByUserId(userId: string): Promise<Account[]> {
    return Array.from(this.accounts.values()).filter(
      (account) => account.userId === userId && account.isLinked,
    );
  }

  async findAll(page: number = 1, limit: number = 50): Promise<Account[]> {
    const start = (page - 1) * limit;
    const end = start + limit;
    return Array.from(this.accounts.values()).slice(start, end);
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
    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  async findById(id: string): Promise<Transaction | null> {
    return this.transactions.get(id) || null;
  }

  async findByUserId(userId: string, page: number = 1, limit: number = 50): Promise<Transaction[]> {
    const userTransactions = Array.from(this.transactions.values()).filter(
      (transaction) => transaction.userId === userId,
    );
    const start = (page - 1) * limit;
    const end = start + limit;
    return userTransactions.slice(start, end);
  }

  async findByAccountId(
    accountId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<Transaction[]> {
    const accountTransactions = Array.from(this.transactions.values()).filter(
      (transaction) => transaction.accountId === accountId,
    );
    const start = (page - 1) * limit;
    const end = start + limit;
    return accountTransactions.slice(start, end);
  }

  async findByReferenceNumber(referenceNumber: string): Promise<Transaction | null> {
    return (
      Array.from(this.transactions.values()).find(
        (transaction) => transaction.referenceNumber === referenceNumber,
      ) || null
    );
  }

  async findAll(filters?: TransactionFiltersDto): Promise<Transaction[]> {
    let result = Array.from(this.transactions.values());

    if (filters?.accountId) {
      result = result.filter((t) => t.accountId === filters.accountId);
    }

    if (filters?.category) {
      result = result.filter((t) => t.category === filters.category);
    }

    if (filters?.type) {
      result = result.filter((t) => t.type === filters.type);
    }

    if (filters?.status) {
      result = result.filter((t) => t.status === filters.status);
    }

    if (filters?.startDate) {
      result = result.filter((t) => t.transactionDate >= filters.startDate!);
    }

    if (filters?.endDate) {
      result = result.filter((t) => t.transactionDate <= filters.endDate!);
    }

    // Sorting
    if (filters?.sortBy) {
      result.sort((a, b) => {
        const aValue = a[filters.sortBy as keyof Transaction];
        const bValue = b[filters.sortBy as keyof Transaction];

        if (aValue < bValue) return filters.sortOrder === 'ASC' ? -1 : 1;
        if (aValue > bValue) return filters.sortOrder === 'ASC' ? 1 : -1;
        return 0;
      });
    }

    // Pagination
    if (filters?.page && filters?.limit) {
      const start = (filters.page - 1) * filters.limit;
      const end = start + filters.limit;
      result = result.slice(start, end);
    }

    return result;
  }

  async getTotalByCategory(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Array<{ category: string; total: number }>> {
    let userTransactions = Array.from(this.transactions.values()).filter(
      (transaction) => transaction.userId === userId,
    );

    if (startDate) {
      userTransactions = userTransactions.filter((t) => t.transactionDate >= startDate);
    }

    if (endDate) {
      userTransactions = userTransactions.filter((t) => t.transactionDate <= endDate);
    }

    const categoryTotals = new Map<string, number>();

    userTransactions.forEach((transaction) => {
      const current = categoryTotals.get(transaction.category) || 0;
      categoryTotals.set(transaction.category, current + transaction.amount.getValue());
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
        transaction.userId === userId &&
        transaction.transactionDate >= startDate &&
        transaction.transactionDate <= endDate &&
        transaction.type === 'DEBIT',
    );

    return monthlyTransactions.reduce((sum, transaction) => sum + transaction.amount.getValue(), 0);
  }

  async getRecentTransactions(userId: string, days: number = 7): Promise<Transaction[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return Array.from(this.transactions.values())
      .filter(
        (transaction) => transaction.userId === userId && transaction.transactionDate >= cutoffDate,
      )
      .sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());
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
