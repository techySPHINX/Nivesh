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
    const defaults = {
      id: TestIdGenerator.generate(),
      userId: TestIdGenerator.generate(),
      accountType: TestDataGenerator.randomElement(Object.values(AccountType)),
      bankName: `${TestDataGenerator.randomString(8)} Bank`,
      accountNumber: new AccountNumber(TestDataGenerator.randomAccountNumber()),
      ifscCode: new IFSCCode(TestDataGenerator.randomIFSCCode()),
      balance: new Money(TestDataGenerator.randomDecimal(1000, 100000), Currency.INR),
      status: AccountStatus.ACTIVE,
      isLinked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return Account.fromPersistence({
      ...defaults,
      ...overrides,
      accountNumber: overrides?.accountNumber || defaults.accountNumber,
      balance: overrides?.balance || defaults.balance,
      ifscCode: overrides?.ifscCode || defaults.ifscCode,
    });
  }

  buildCreateDto(overrides?: Partial<CreateAccountDto>): CreateAccountDto {
    const dto = new CreateAccountDto();
    dto.accountType = overrides?.accountType || AccountType.SAVINGS;
    dto.bankName = overrides?.bankName || `${TestDataGenerator.randomString(8)} Bank`;
    dto.accountNumber = overrides?.accountNumber || TestDataGenerator.randomAccountNumber();
    dto.ifscCode = overrides?.ifscCode || TestDataGenerator.randomIFSCCode();
    dto.initialBalance = overrides?.initialBalance ?? TestDataGenerator.randomDecimal(1000, 50000);
    dto.currency = overrides?.currency || Currency.INR;
    return dto;
  }

  buildUpdateDto(overrides?: Partial<UpdateAccountDto>): UpdateAccountDto {
    const dto = new UpdateAccountDto();
    if (overrides?.accountName !== undefined) dto.accountName = overrides.accountName;
    if (overrides?.bankName !== undefined) dto.bankName = overrides.bankName;
    if (overrides?.balance !== undefined) dto.balance = overrides.balance;
    if (overrides?.status !== undefined) dto.status = overrides.status;
    return dto;
  }

  static withBalance(balance: number, currency: Currency = Currency.INR): Partial<Account> {
    return { balance: new Money(balance, currency) };
  }

  static withStatus(status: AccountStatus): Partial<Account> {
    return { status };
  }

  static withType(accountType: AccountType): Partial<Account> {
    return { accountType };
  }

  static linked(): Partial<Account> {
    return { isLinked: true };
  }
}

/**
 * Transaction Factory
 */
export class TransactionFactory extends MockFactory<Transaction> {
  build(overrides?: Partial<Transaction>): Transaction {
    const defaults = {
      id: TestIdGenerator.generate(),
      userId: TestIdGenerator.generate(),
      accountId: TestIdGenerator.generate(),
      type: TestDataGenerator.randomElement(Object.values(TransactionType)),
      amount: new Money(TestDataGenerator.randomDecimal(100, 10000), Currency.INR),
      category: TestDataGenerator.randomElement(Object.values(TransactionCategory)),
      description: `Test transaction ${TestDataGenerator.randomString(6)}`,
      transactionDate: new Date(),
      status: TransactionStatus.COMPLETED,
      merchant: `Merchant ${TestDataGenerator.randomString(5)}`,
      referenceNumber: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return Transaction.fromPersistence({
      ...defaults,
      ...overrides,
      amount: overrides?.amount || defaults.amount,
    });
  }

  buildCreateDto(overrides?: Partial<CreateTransactionDto>): CreateTransactionDto {
    const dto = new CreateTransactionDto();
    dto.accountId = overrides?.accountId || TestIdGenerator.generate();
    dto.type = overrides?.type || TransactionType.DEBIT;
    dto.amount = overrides?.amount ?? TestDataGenerator.randomDecimal(100, 5000);
    dto.currency = overrides?.currency || Currency.INR;
    dto.category = overrides?.category || TransactionCategory.OTHER_EXPENSE;
    dto.description = overrides?.description || `Test transaction ${TestDataGenerator.randomString(6)}`;
    dto.transactionDate = overrides?.transactionDate || new Date();
    dto.merchant = overrides?.merchant || `Merchant ${TestDataGenerator.randomString(5)}`;
    return dto;
  }

  buildUpdateDto(overrides?: Partial<UpdateTransactionDto>): UpdateTransactionDto {
    const dto = new UpdateTransactionDto();
    if (overrides?.category !== undefined) dto.category = overrides.category;
    if (overrides?.description !== undefined) dto.description = overrides.description;
    if (overrides?.merchant !== undefined) dto.merchant = overrides.merchant;
    return dto;
  }

  static debit(amount: number, category: TransactionCategory = TransactionCategory.OTHER_EXPENSE): Partial<Transaction> {
    return {
      type: TransactionType.DEBIT,
      amount: new Money(amount, Currency.INR),
      category,
    };
  }

  static credit(amount: number, category: TransactionCategory = TransactionCategory.SALARY): Partial<Transaction> {
    return {
      type: TransactionType.CREDIT,
      amount: new Money(amount, Currency.INR),
      category,
    };
  }

  static withStatus(status: TransactionStatus): Partial<Transaction> {
    return { status };
  }

  static withDate(date: Date): Partial<Transaction> {
    return { transactionDate: date };
  }

  static withAccount(accountId: string): Partial<Transaction> {
    return { accountId };
  }

  static withUser(userId: string): Partial<Transaction> {
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
      const account = accountFactory.build({ userId });
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
      const transaction = transactionFactory.build({ accountId, userId });
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
    const savingsAccount = accountFactory.build({
      userId,
      accountType: AccountType.SAVINGS,
      ...AccountFactory.withBalance(50000),
    });
    const currentAccount = accountFactory.build({
      userId,
      accountType: AccountType.CURRENT,
      ...AccountFactory.withBalance(30000),
    });
    const creditCard = accountFactory.build({
      userId,
      accountType: AccountType.CREDIT_CARD,
      ...AccountFactory.withBalance(-10000),
    });

    this.accounts.push(savingsAccount, currentAccount, creditCard);

    // Create transactions for each account
    const transactionFactory = new TransactionFactory();

    // Savings account transactions
    this.transactions.push(
      transactionFactory.build({
        accountId: savingsAccount.id,
        userId,
        ...TransactionFactory.credit(5000, TransactionCategory.SALARY),
      }),
      transactionFactory.build({
        accountId: savingsAccount.id,
        userId,
        ...TransactionFactory.debit(500, TransactionCategory.FOOD),
      }),
    );

    // Current account transactions
    this.transactions.push(
      transactionFactory.build({
        accountId: currentAccount.id,
        userId,
        ...TransactionFactory.debit(1000, TransactionCategory.RENT),
      }),
    );

    // Credit card transactions
    this.transactions.push(
      transactionFactory.build({
        accountId: creditCard.id,
        userId,
        ...TransactionFactory.debit(500, TransactionCategory.SHOPPING),
      }),
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
