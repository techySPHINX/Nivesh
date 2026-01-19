import { Account } from '../entities/account.entity';

export const ACCOUNT_REPOSITORY = Symbol('ACCOUNT_REPOSITORY');

export interface IAccountRepository {
  save(account: Account): Promise<Account>;

  findById(id: string): Promise<Account | null>;

  findByUserId(userId: string): Promise<Account[]>;

  findByAccountNumber(accountNumber: string): Promise<Account | null>;

  existsByAccountNumber(accountNumber: string): Promise<boolean>;

  findActiveByUserId(userId: string): Promise<Account[]>;

  findLinkedByUserId(userId: string): Promise<Account[]>;

  findAll(options: {
    skip?: number;
    take?: number;
    userId?: string;
  }): Promise<{ accounts: Account[]; total: number }>;

  delete(id: string): Promise<void>;
}
