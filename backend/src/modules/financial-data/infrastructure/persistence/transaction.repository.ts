import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../core/database/postgres/prisma.service';
import {
  ITransactionRepository,
  TransactionFilters,
} from '../../domain/repositories/transaction.repository.interface';
import { Transaction, TransactionCategory } from '../../domain/entities/transaction.entity';
import { Money, Currency } from '../../domain/value-objects/money.vo';

@Injectable()
export class TransactionRepository implements ITransactionRepository {
  private readonly logger = new Logger(TransactionRepository.name);

  constructor(private readonly prisma: PrismaService) { }

  async save(transaction: Transaction): Promise<Transaction> {
    const data = transaction.toPersistence();

    const saved = await this.prisma.transaction.upsert({
      where: { id: data.id },
      create: data,
      update: {
        category: data.category,
        description: data.description,
        status: data.status,
        metadata: data.metadata as any,
        updatedAt: data.updatedAt,
      },
    });

    this.logger.debug(`Transaction saved: ${saved.id}`);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Transaction | null> {
    const transaction = await this.prisma.transaction.findUnique({ where: { id } });
    return transaction ? this.toDomain(transaction) : null;
  }

  async findByUserId(userId: string, limit?: number): Promise<Transaction[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { transactionDate: 'desc' },
      take: limit || 50,
    });
    return transactions.map((t) => this.toDomain(t));
  }

  async findByAccountId(accountId: string, limit?: number): Promise<Transaction[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: { accountId },
      orderBy: { transactionDate: 'desc' },
      take: limit || 50,
    });
    return transactions.map((t) => this.toDomain(t));
  }

  async findByReferenceNumber(referenceNumber: string): Promise<Transaction | null> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { referenceNumber },
    });
    return transaction ? this.toDomain(transaction) : null;
  }

  async findAll(options: {
    skip?: number;
    take?: number;
    filters?: TransactionFilters;
    sortBy?: 'transactionDate' | 'amount' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ transactions: Transaction[]; total: number }> {
    const where: any = {};

    if (options.filters) {
      if (options.filters.userId) where.userId = options.filters.userId;
      if (options.filters.accountId) where.accountId = options.filters.accountId;
      if (options.filters.category) where.category = options.filters.category;
      if (options.filters.startDate || options.filters.endDate) {
        where.transactionDate = {};
        if (options.filters.startDate) where.transactionDate.gte = options.filters.startDate;
        if (options.filters.endDate) where.transactionDate.lte = options.filters.endDate;
      }
      if (options.filters.minAmount || options.filters.maxAmount) {
        where.amount = {};
        if (options.filters.minAmount) where.amount.gte = options.filters.minAmount;
        if (options.filters.maxAmount) where.amount.lte = options.filters.maxAmount;
      }
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip: options.skip || 0,
        take: options.take || 50,
        orderBy: { [options.sortBy || 'transactionDate']: options.sortOrder || 'desc' },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      transactions: transactions.map((t) => this.toDomain(t)),
      total,
    };
  }

  async getTotalByCategory(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ category: string; total: number }>> {
    const result = await this.prisma.transaction.groupBy({
      by: ['category'],
      where: {
        userId,
        transactionDate: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
      },
      _sum: { amount: true },
    });

    return result.map((r) => ({
      category: r.category,
      total: parseFloat(r._sum.amount?.toString() || '0'),
    }));
  }

  async getMonthlySpending(userId: string, year: number, month: number): Promise<number> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const result = await this.prisma.transaction.aggregate({
      where: {
        userId,
        type: 'DEBIT',
        transactionDate: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
      },
      _sum: { amount: true },
    });

    return parseFloat(result._sum.amount?.toString() || '0');
  }

  async getRecentTransactions(
    userId: string,
    days: number,
    limit?: number,
  ): Promise<Transaction[]> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        transactionDate: { gte: sinceDate },
      },
      orderBy: { transactionDate: 'desc' },
      take: limit || 20,
    });

    return transactions.map((t) => this.toDomain(t));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.transaction.delete({ where: { id } });
    this.logger.log(`Transaction deleted: ${id}`);
  }

  private toDomain(data: any): Transaction {
    return Transaction.fromPersistence({
      id: data.id,
      userId: data.userId,
      accountId: data.accountId,
      type: data.type,
      amount: parseFloat(data.amount.toString()),
      currency: data.currency,
      category: data.category,
      description: data.description,
      merchantName: data.merchantName,
      transactionDate: data.transactionDate,
      referenceNumber: data.referenceNumber,
      status: data.status,
      metadata: data.metadata as Record<string, any>,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
