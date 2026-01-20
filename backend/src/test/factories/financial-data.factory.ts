/**
 * Test Data Factories for Financial Data Module
 * Provides factory methods for creating test data
 */

import { Account, AccountType, AccountStatus } from '../../modules/financial-data/domain/entities/account.entity';
import {
  Transaction,
  TransactionType,
  TransactionCategory,
  TransactionStatus,
} from '../../modules/financial-data/domain/entities/transaction.entity';
import { Money, Currency } from '../../modules/financial-data/domain/value-objects/money.vo';
import { AccountNumber } from '../../modules/financial-data/domain/value-objects/account-number.vo';
import { IFSCCode } from '../../modules/financial-data/domain/value-objects/ifsc-code.vo';
import { TestIdGenerator, TestDataGenerator, MockFactory } from '../helpers/test.helper';
import { CreateAccountDto, UpdateAccountDto } from '../../modules/financial-data/application/dto/account.dto';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
} from '../../modules/financial-data/application/dto/transaction.dto';

/**
 * Account Factory
 */
export class AccountFactory extends MockFactory<Account> {
  build(overrides?: Partial<Account>): Account {
    const accountNumber = new AccountNumber(TestDataGenerator.randomAccountNumber());
    const ifscCode = new IFSCCode(TestDataGenerator.randomIFSCCode());
    const balance = new Money(TestDataGenerator.randomDecimal(1000, 100000), Currency.INR);

    const defaults = {
      id: TestIdGenerator.generate(),
      userId: TestIdGenerator.generate(),
      accountName: `Test Account ${TestDataGenerator.randomString(6)}`,
      accountNumber: accountNumber.getValue(),
      accountType: TestDataGenerator.randomElement(Object.values(AccountType)),
      bankName: `${TestDataGenerator.randomString(8)} Bank`,
      ifscCode: ifscCode.getValue(),
      balance: balance.getAmount(),
      currency: Currency.INR,
      status: AccountStatus.ACTIVE,
      isLinked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return Account.fromPersistence(defaults);
  }

  buildCreateDto(overrides?: Partial<CreateAccountDto>): CreateAccountDto {
    const dto = new CreateAccountDto();
    dto.accountName = overrides?.accountName || `Test Account ${TestDataGenerator.randomString(6)}`;
    dto.accountType = overrides?.accountType || AccountType.SAVINGS;
    dto.bankName = overrides?.bankName || `${TestDataGenerator.randomString(8)} Bank`;
    dto.accountNumber = overrides?.accountNumber || TestDataGenerator.randomAccountNumber();
    dto.ifscCode = overrides?.ifscCode || TestDataGenerator.randomIFSCCode();
    dto.balance = overrides?.balance ?? TestDataGenerator.randomDecimal(1000, 50000);
    dto.currency = overrides?.currency || Currency.INR;
    return dto;
  }

  buildUpdateDto(overrides?: Partial<UpdateAccountDto>): UpdateAccountDto {
    const dto = new UpdateAccountDto();
    if (overrides?.accountName !== undefined) dto.accountName = overrides.accountName;
    if (overrides?.balance !== undefined) dto.balance = overrides.balance;
    if (overrides?.status !== undefined) dto.status = overrides.status;
    return dto;
  }

  static withBalance(balance: number, currency: Currency = Currency.INR): any {
    return { balance, currency };
  }

  static withStatus(status: AccountStatus): any {
    return { status };
  }

  static withType(accountType: AccountType): any {
    return { accountType };
  }

  static linked(): any {
    return { isLinked: true };
  }
}

/**
 * Transaction Factory
 */
export class TransactionFactory extends MockFactory<Transaction> {
  build(overrides?: Partial<Transaction>): Transaction {
    const amount = new Money(TestDataGenerator.randomDecimal(100, 10000), Currency.INR);

    const defaults = {
      id: TestIdGenerator.generate(),
      userId: TestIdGenerator.generate(),
      accountId: TestIdGenerator.generate(),
      type: TestDataGenerator.randomElement(Object.values(TransactionType)),
      amount: amount.getAmount(),
      currency: Currency.INR,
      category: TestDataGenerator.randomElement(Object.values(TransactionCategory)),
      description: `Test transaction ${TestDataGenerator.randomString(6)}`,
      transactionDate: new Date(),
      status: TransactionStatus.COMPLETED,
      merchantName: `Merchant ${TestDataGenerator.randomString(5)}`,
      referenceNumber: undefined,
      metadata: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return Transaction.fromPersistence(defaults);
  }

  buildCreateDto(overrides?: Partial<CreateTransactionDto>): CreateTransactionDto {
    const dto = new CreateTransactionDto();
    dto.accountId = overrides?.accountId || TestIdGenerator.generate();
    dto.type = overrides?.type || TransactionType.DEBIT;
    dto.amount = overrides?.amount ?? TestDataGenerator.randomDecimal(100, 5000);
    dto.currency = overrides?.currency || Currency.INR;
    dto.category = overrides?.category || TransactionCategory.OTHER_EXPENSE;
    dto.description = overrides?.description || `Test transaction ${TestDataGenerator.randomString(6)}`;
    dto.transactionDate = overrides?.transactionDate || new Date().toISOString();
    dto.merchantName = overrides?.merchantName || `Merchant ${TestDataGenerator.randomString(5)}`;
    return dto;
  }

  buildUpdateDto(overrides?: Partial<UpdateTransactionDto>): UpdateTransactionDto {
    const dto = new UpdateTransactionDto();
    if (overrides?.category !== undefined) dto.category = overrides.category;
    if (overrides?.description !== undefined) dto.description = overrides.description;
    if (overrides?.status !== undefined) dto.status = overrides.status;
    return dto;
  }

  static debit(amount: number, category: TransactionCategory = TransactionCategory.OTHER_EXPENSE): any {
    return {
      type: TransactionType.DEBIT,
      amount,
      currency: Currency.INR,
      category,
    };
  }

  static credit(amount: number, category: TransactionCategory = TransactionCategory.SALARY): any {
    return {
      type: TransactionType.CREDIT,
      amount,
      currency: Currency.INR,
      category,
    };
  }

  static withStatus(status: TransactionStatus): any {
    return { status };
  }

  static withDate(date: Date): any {
    return { transactionDate: date };
  }

  static withAccount(accountId: string): any {
    return { accountId };
  }

  static withUser(userId: string): any {
    return { userId };
  }
}

/**
 * Money Factory
 */
export class MoneyFactory {
  static create(amount: number, currency: Currency = Currency.INR): Money {
    return new Money(amount, currency);
  }

  static zero(currency: Currency = Currency.INR): Money {
    return new Money(0, currency);
  }

  static random(min: number = 100, max: number = 10000, currency: Currency = Currency.INR): Money {
    return new Money(TestDataGenerator.randomDecimal(min, max), currency);
  }
}

/**
 * Scenario builders for complex test scenarios
 */
export class FinancialDataScenarioBuilder {
  private accounts: Account[] = [];
  private transactions: Transaction[] = [];

  /**
   * Create a user with multiple accounts
   */
  withUserAccounts(userId: string, accountCount: number = 3): this {
    const accountFactory = new AccountFactory();
    for (let i = 0; i < accountCount; i++) {
      const account = accountFactory.build();
      this.accounts.push(account);
    }
    return this;
  }

  /**
   * Create transactions for an account
   */
  withAccountTransactions(
    accountId: string,
    userId: string,
    transactionCount: number = 5,
  ): this {
    const transactionFactory = new TransactionFactory();
    for (let i = 0; i < transactionCount; i++) {
      const transaction = transactionFactory.build();
      this.transactions.push(transaction);
    }
    return this;
  }

  /**
   * Create a complete financial scenario
   */
  withCompleteScenario(userId: string): this {
    // Create 3 accounts
    const accountFactory = new AccountFactory();
    const savingsAccount = accountFactory.build();
    const currentAccount = accountFactory.build();
    const creditCard = accountFactory.build();

    this.accounts.push(savingsAccount, currentAccount, creditCard);

    // Create transactions for each account
    const transactionFactory = new TransactionFactory();

    // Savings account transactions
    this.transactions.push(
      transactionFactory.build(),
      transactionFactory.build(),
    );

    // Current account transactions
    this.transactions.push(
      transactionFactory.build(),
    );

    // Credit card transactions
    this.transactions.push(
      transactionFactory.build(),
    );

    return this;
  }

  getAccounts(): Account[] {
    return this.accounts;
  }

  getTransactions(): Transaction[] {
    return this.transactions;
  }

  build(): { accounts: Account[]; transactions: Transaction[] } {
    return {
      accounts: this.accounts,
      transactions: this.transactions,
    };
  }
}
