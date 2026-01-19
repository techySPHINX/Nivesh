import { v4 as uuidv4 } from 'uuid';
import { DomainException } from '../../../../core/exceptions/base.exception';
import { AccountNumber } from '../value-objects/account-number.vo';
import { IFSCCode } from '../value-objects/ifsc-code.vo';
import { Money, Currency } from '../value-objects/money.vo';

export enum AccountType {
  SAVINGS = 'SAVINGS',
  CURRENT = 'CURRENT',
  CREDIT_CARD = 'CREDIT_CARD',
  INVESTMENT = 'INVESTMENT',
  LOAN = 'LOAN',
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  FROZEN = 'FROZEN',
  CLOSED = 'CLOSED',
}

export interface CreateAccountProps {
  userId: string;
  accountName: string;
  accountNumber: AccountNumber;
  accountType: AccountType;
  bankName: string;
  ifscCode?: IFSCCode;
  balance: Money;
}

export interface AccountPersistence {
  id: string;
  userId: string;
  accountName: string;
  accountNumber: string;
  accountType: string;
  bankName: string;
  ifscCode?: string;
  balance: number;
  currency: string;
  status: string;
  isLinked: boolean;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Account {
  private constructor(
    private readonly id: string,
    private readonly userId: string,
    private accountName: string,
    private readonly accountNumber: AccountNumber,
    private readonly accountType: AccountType,
    private readonly bankName: string,
    private readonly ifscCode: IFSCCode | undefined,
    private balance: Money,
    private status: AccountStatus,
    private isLinked: boolean,
    private lastSyncedAt: Date | undefined,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) { }

  // Factory method for creating new account
  static create(props: CreateAccountProps): Account {
    const id = uuidv4();
    const now = new Date();

    return new Account(
      id,
      props.userId,
      props.accountName,
      props.accountNumber,
      props.accountType,
      props.bankName,
      props.ifscCode,
      props.balance,
      AccountStatus.ACTIVE,
      false,
      undefined,
      now,
      now,
    );
  }

  // Factory method for reconstituting from persistence
  static fromPersistence(data: AccountPersistence): Account {
    const accountNumber = new AccountNumber(data.accountNumber);
    const ifscCode = data.ifscCode ? new IFSCCode(data.ifscCode) : undefined;
    const balance = new Money(data.balance, data.currency as Currency);

    return new Account(
      data.id,
      data.userId,
      data.accountName,
      accountNumber,
      data.accountType as AccountType,
      data.bankName,
      ifscCode,
      balance,
      data.status as AccountStatus,
      data.isLinked,
      data.lastSyncedAt,
      data.createdAt,
      data.updatedAt,
    );
  }

  // Business methods
  updateBalance(newBalance: Money): void {
    if (this.status === AccountStatus.CLOSED) {
      throw new DomainException('Cannot update balance of closed account');
    }

    if (newBalance.getCurrency() !== this.balance.getCurrency()) {
      throw new DomainException('Currency mismatch');
    }

    this.balance = newBalance;
    this.updatedAt = new Date();
  }

  credit(amount: Money): void {
    this.balance = this.balance.add(amount);
    this.updatedAt = new Date();
  }

  debit(amount: Money): void {
    if (this.accountType === AccountType.SAVINGS || this.accountType === AccountType.CURRENT) {
      if (amount.isGreaterThan(this.balance)) {
        throw new DomainException('Insufficient balance');
      }
    }

    this.balance = this.balance.subtract(amount);
    this.updatedAt = new Date();
  }

  linkAccount(): void {
    if (this.isLinked) {
      throw new DomainException('Account is already linked');
    }
    this.isLinked = true;
    this.updatedAt = new Date();
  }

  unlinkAccount(): void {
    if (!this.isLinked) {
      throw new DomainException('Account is not linked');
    }
    this.isLinked = false;
    this.lastSyncedAt = undefined;
    this.updatedAt = new Date();
  }

  syncCompleted(): void {
    this.lastSyncedAt = new Date();
    this.updatedAt = new Date();
  }

  activate(): void {
    if (this.status === AccountStatus.CLOSED) {
      throw new DomainException('Cannot activate closed account');
    }
    this.status = AccountStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this.status = AccountStatus.INACTIVE;
    this.updatedAt = new Date();
  }

  freeze(): void {
    this.status = AccountStatus.FROZEN;
    this.updatedAt = new Date();
  }

  close(): void {
    if (!this.balance.isZero()) {
      throw new DomainException('Cannot close account with non-zero balance');
    }
    this.status = AccountStatus.CLOSED;
    this.updatedAt = new Date();
  }

  rename(newName: string): void {
    if (!newName || newName.trim().length === 0) {
      throw new DomainException('Account name cannot be empty');
    }
    if (newName.length > 100) {
      throw new DomainException('Account name too long (max 100 characters)');
    }
    this.accountName = newName.trim();
    this.updatedAt = new Date();
  }

  // Getters
  get Id(): string {
    return this.id;
  }

  get UserId(): string {
    return this.userId;
  }

  get AccountName(): string {
    return this.accountName;
  }

  get AccountNumber(): AccountNumber {
    return this.accountNumber;
  }

  get AccountType(): AccountType {
    return this.accountType;
  }

  get BankName(): string {
    return this.bankName;
  }

  get IFSCCode(): IFSCCode | undefined {
    return this.ifscCode;
  }

  get Balance(): Money {
    return this.balance;
  }

  get Status(): AccountStatus {
    return this.status;
  }

  get IsLinked(): boolean {
    return this.isLinked;
  }

  get LastSyncedAt(): Date | undefined {
    return this.lastSyncedAt;
  }

  get CreatedAt(): Date {
    return this.createdAt;
  }

  get UpdatedAt(): Date {
    return this.updatedAt;
  }

  // Helper methods
  isActive(): boolean {
    return this.status === AccountStatus.ACTIVE;
  }

  isClosed(): boolean {
    return this.status === AccountStatus.CLOSED;
  }

  canTransact(): boolean {
    return this.status === AccountStatus.ACTIVE && !this.isClosed();
  }

  needsSync(): boolean {
    if (!this.isLinked) return false;
    if (!this.lastSyncedAt) return true;

    const hoursSinceSync = (Date.now() - this.lastSyncedAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceSync > 24; // Needs sync if > 24 hours
  }

  // Serialization
  toPersistence(): AccountPersistence {
    return {
      id: this.id,
      userId: this.userId,
      accountName: this.accountName,
      accountNumber: this.accountNumber.getValue(),
      accountType: this.accountType,
      bankName: this.bankName,
      ifscCode: this.ifscCode?.getValue(),
      balance: this.balance.getAmount(),
      currency: this.balance.getCurrency(),
      status: this.status,
      isLinked: this.isLinked,
      lastSyncedAt: this.lastSyncedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
