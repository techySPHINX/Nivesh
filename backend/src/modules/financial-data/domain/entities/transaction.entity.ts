import { v4 as uuidv4 } from 'uuid';
import { DomainException } from '../../../../core/exceptions/base.exception';
import { Money } from '../value-objects/money.vo';

export enum TransactionType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum TransactionCategory {
  // Income
  SALARY = 'SALARY',
  FREELANCE = 'FREELANCE',
  INVESTMENT_RETURN = 'INVESTMENT_RETURN',
  REFUND = 'REFUND',
  OTHER_INCOME = 'OTHER_INCOME',

  // Expenses
  FOOD = 'FOOD',
  TRANSPORT = 'TRANSPORT',
  SHOPPING = 'SHOPPING',
  BILLS = 'BILLS',
  ENTERTAINMENT = 'ENTERTAINMENT',
  HEALTHCARE = 'HEALTHCARE',
  EDUCATION = 'EDUCATION',
  RENT = 'RENT',
  EMI = 'EMI',
  INVESTMENT = 'INVESTMENT',
  TRANSFER = 'TRANSFER',
  OTHER_EXPENSE = 'OTHER_EXPENSE',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

export interface CreateTransactionProps {
  userId: string;
  accountId: string;
  type: TransactionType;
  amount: Money;
  category: TransactionCategory;
  description: string;
  merchantName?: string;
  transactionDate: Date;
  referenceNumber?: string;
}

export interface TransactionPersistence {
  id: string;
  userId: string;
  accountId: string;
  type: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  merchantName?: string;
  transactionDate: Date;
  referenceNumber?: string;
  status: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class Transaction {
  private constructor(
    private readonly id: string,
    private readonly userId: string,
    private readonly accountId: string,
    private readonly type: TransactionType,
    private readonly amount: Money,
    private category: TransactionCategory,
    private description: string,
    private readonly merchantName: string | undefined,
    private readonly transactionDate: Date,
    private readonly referenceNumber: string | undefined,
    private status: TransactionStatus,
    private metadata: Record<string, any> | undefined,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) { }

  // Factory method for creating new transaction
  static create(props: CreateTransactionProps): Transaction {
    const id = uuidv4();
    const now = new Date();

    // Validate transaction date is not in future
    if (props.transactionDate > now) {
      throw new DomainException('Transaction date cannot be in the future');
    }

    return new Transaction(
      id,
      props.userId,
      props.accountId,
      props.type,
      props.amount,
      props.category,
      props.description,
      props.merchantName,
      props.transactionDate,
      props.referenceNumber,
      TransactionStatus.PENDING,
      undefined,
      now,
      now,
    );
  }

  // Factory method for reconstituting from persistence
  static fromPersistence(data: TransactionPersistence): Transaction {
    const amount = Money.fromJSON({ amount: data.amount, currency: data.currency });

    return new Transaction(
      data.id,
      data.userId,
      data.accountId,
      data.type as TransactionType,
      amount,
      data.category as TransactionCategory,
      data.description,
      data.merchantName,
      data.transactionDate,
      data.referenceNumber,
      data.status as TransactionStatus,
      data.metadata,
      data.createdAt,
      data.updatedAt,
    );
  }

  // Business methods
  complete(): void {
    if (this.status !== TransactionStatus.PENDING) {
      throw new DomainException(
        `Cannot complete transaction in status: ${this.status}`,
      );
    }
    this.status = TransactionStatus.COMPLETED;
    this.updatedAt = new Date();
  }

  fail(reason?: string): void {
    if (this.status !== TransactionStatus.PENDING) {
      throw new DomainException(
        `Cannot fail transaction in status: ${this.status}`,
      );
    }
    this.status = TransactionStatus.FAILED;
    if (reason) {
      this.addMetadata('failureReason', reason);
    }
    this.updatedAt = new Date();
  }

  reverse(reason?: string): void {
    if (this.status !== TransactionStatus.COMPLETED) {
      throw new DomainException('Can only reverse completed transactions');
    }
    this.status = TransactionStatus.REVERSED;
    if (reason) {
      this.addMetadata('reversalReason', reason);
    }
    this.updatedAt = new Date();
  }

  updateCategory(newCategory: TransactionCategory): void {
    if (this.category === newCategory) return;

    this.category = newCategory;
    this.addMetadata('categoryChangedAt', new Date().toISOString());
    this.addMetadata('previousCategory', this.category);
    this.updatedAt = new Date();
  }

  updateDescription(newDescription: string): void {
    if (!newDescription || newDescription.trim().length === 0) {
      throw new DomainException('Description cannot be empty');
    }
    if (newDescription.length > 500) {
      throw new DomainException('Description too long (max 500 characters)');
    }

    this.description = newDescription.trim();
    this.updatedAt = new Date();
  }

  addMetadata(key: string, value: any): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata[key] = value;
    this.updatedAt = new Date();
  }

  // Getters
  get Id(): string {
    return this.id;
  }

  get UserId(): string {
    return this.userId;
  }

  get AccountId(): string {
    return this.accountId;
  }

  get Type(): TransactionType {
    return this.type;
  }

  get Amount(): Money {
    return this.amount;
  }

  get Category(): TransactionCategory {
    return this.category;
  }

  get Description(): string {
    return this.description;
  }

  get MerchantName(): string | undefined {
    return this.merchantName;
  }

  get TransactionDate(): Date {
    return this.transactionDate;
  }

  get ReferenceNumber(): string | undefined {
    return this.referenceNumber;
  }

  get Status(): TransactionStatus {
    return this.status;
  }

  get Metadata(): Record<string, any> | undefined {
    return this.metadata;
  }

  get CreatedAt(): Date {
    return this.createdAt;
  }

  get UpdatedAt(): Date {
    return this.updatedAt;
  }

  // Helper methods
  isDebit(): boolean {
    return this.type === TransactionType.DEBIT;
  }

  isCredit(): boolean {
    return this.type === TransactionType.CREDIT;
  }

  isCompleted(): boolean {
    return this.status === TransactionStatus.COMPLETED;
  }

  isPending(): boolean {
    return this.status === TransactionStatus.PENDING;
  }

  isFailed(): boolean {
    return this.status === TransactionStatus.FAILED;
  }

  isReversed(): boolean {
    return this.status === TransactionStatus.REVERSED;
  }

  isIncome(): boolean {
    return (
      this.type === TransactionType.CREDIT &&
      [
        TransactionCategory.SALARY,
        TransactionCategory.FREELANCE,
        TransactionCategory.INVESTMENT_RETURN,
        TransactionCategory.REFUND,
        TransactionCategory.OTHER_INCOME,
      ].includes(this.category)
    );
  }

  isExpense(): boolean {
    return this.type === TransactionType.DEBIT || !this.isIncome();
  }

  // Get age of transaction in days
  getAgeInDays(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.transactionDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Serialization
  toPersistence(): TransactionPersistence {
    return {
      id: this.id,
      userId: this.userId,
      accountId: this.accountId,
      type: this.type,
      amount: this.amount.getAmount(),
      currency: this.amount.getCurrency(),
      category: this.category,
      description: this.description,
      merchantName: this.merchantName,
      transactionDate: this.transactionDate,
      referenceNumber: this.referenceNumber,
      status: this.status,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
