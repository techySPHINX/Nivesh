import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../core/database/postgres/prisma.service';
import { IAccountRepository } from '../../domain/repositories/account.repository.interface';
import { Account, AccountStatus, AccountType } from '../../domain/entities/account.entity';
import { AccountNumber } from '../../domain/value-objects/account-number.vo';
import { IFSCCode } from '../../domain/value-objects/ifsc-code.vo';
import { Money, Currency } from '../../domain/value-objects/money.vo';

@Injectable()
export class AccountRepository implements IAccountRepository {
  private readonly logger = new Logger(AccountRepository.name);

  constructor(private readonly prisma: PrismaService) { }

  async save(account: Account): Promise<Account> {
    const data = account.toPersistence();

    const saved = await this.prisma.account.upsert({
      where: { id: data.id },
      create: data,
      update: {
        accountName: data.accountName,
        balance: data.balance,
        status: data.status,
        isLinked: data.isLinked,
        lastSyncedAt: data.lastSyncedAt,
        updatedAt: data.updatedAt,
      },
    });

    this.logger.debug(`Account saved: ${saved.id}`);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Account | null> {
    const account = await this.prisma.account.findUnique({ where: { id } });
    return account ? this.toDomain(account) : null;
  }

  async findByUserId(userId: string): Promise<Account[]> {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return accounts.map((a) => this.toDomain(a));
  }

  async findByAccountNumber(accountNumber: string): Promise<Account | null> {
    const account = await this.prisma.account.findUnique({
      where: { accountNumber },
    });
    return account ? this.toDomain(account) : null;
  }

  async existsByAccountNumber(accountNumber: string): Promise<boolean> {
    const count = await this.prisma.account.count({ where: { accountNumber } });
    return count > 0;
  }

  async findActiveByUserId(userId: string): Promise<Account[]> {
    const accounts = await this.prisma.account.findMany({
      where: { userId, status: AccountStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    });
    return accounts.map((a) => this.toDomain(a));
  }

  async findLinkedByUserId(userId: string): Promise<Account[]> {
    const accounts = await this.prisma.account.findMany({
      where: { userId, isLinked: true },
      orderBy: { lastSyncedAt: 'desc' },
    });
    return accounts.map((a) => this.toDomain(a));
  }

  async findAll(options: {
    skip?: number;
    take?: number;
    userId?: string;
  }): Promise<{ accounts: Account[]; total: number }> {
    const where = options.userId ? { userId: options.userId } : {};

    const [accounts, total] = await Promise.all([
      this.prisma.account.findMany({
        where,
        skip: options.skip || 0,
        take: options.take || 10,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.account.count({ where }),
    ]);

    return {
      accounts: accounts.map((a) => this.toDomain(a)),
      total,
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.account.delete({ where: { id } });
    this.logger.log(`Account deleted: ${id}`);
  }

  private toDomain(data: any): Account {
    const accountNumber = new AccountNumber(data.accountNumber);
    const ifscCode = data.ifscCode ? new IFSCCode(data.ifscCode) : undefined;
    const balance = new Money(parseFloat(data.balance.toString()), data.currency as Currency);

    return Account.fromPersistence({
      id: data.id,
      userId: data.userId,
      accountName: data.accountName,
      accountNumber: accountNumber.getValue(),
      accountType: data.accountType,
      bankName: data.bankName,
      ifscCode: ifscCode?.getValue(),
      balance: balance.getAmount(),
      currency: balance.getCurrency(),
      status: data.status,
      isLinked: data.isLinked,
      lastSyncedAt: data.lastSyncedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
