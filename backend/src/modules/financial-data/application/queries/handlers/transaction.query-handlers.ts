import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import {
  GetTransactionQuery,
  GetTransactionsByAccountQuery,
  GetTransactionsByUserQuery,
  GetAllTransactionsQuery,
  GetRecentTransactionsQuery,
} from '../transaction.queries';
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
} from '../../../domain/repositories/transaction.repository.interface';
import { Transaction, TransactionCategory } from '../../../domain/entities/transaction.entity';
import { EntityNotFoundException } from '../../../../../core/exceptions/base.exception';

@QueryHandler(GetTransactionQuery)
export class GetTransactionHandler implements IQueryHandler<GetTransactionQuery> {
  private readonly logger = new Logger(GetTransactionHandler.name);

  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: ITransactionRepository,
  ) { }

  async execute(query: GetTransactionQuery): Promise<Transaction> {
    this.logger.debug(`Getting transaction: ${query.transactionId}`);

    const transaction = await this.transactionRepository.findById(query.transactionId);

    if (!transaction) {
      throw new EntityNotFoundException('Transaction', query.transactionId);
    }

    return transaction;
  }
}

@QueryHandler(GetTransactionsByAccountQuery)
export class GetTransactionsByAccountHandler
  implements IQueryHandler<GetTransactionsByAccountQuery> {
  private readonly logger = new Logger(GetTransactionsByAccountHandler.name);

  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: ITransactionRepository,
  ) { }

  async execute(query: GetTransactionsByAccountQuery): Promise<Transaction[]> {
    this.logger.debug(`Getting transactions for account: ${query.accountId}`);

    return this.transactionRepository.findByAccountId(query.accountId, query.limit);
  }
}

@QueryHandler(GetTransactionsByUserQuery)
export class GetTransactionsByUserHandler implements IQueryHandler<GetTransactionsByUserQuery> {
  private readonly logger = new Logger(GetTransactionsByUserHandler.name);

  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: ITransactionRepository,
  ) { }

  async execute(query: GetTransactionsByUserQuery): Promise<Transaction[]> {
    this.logger.debug(`Getting transactions for user: ${query.userId}`);

    return this.transactionRepository.findByUserId(query.userId, query.limit);
  }
}

@QueryHandler(GetAllTransactionsQuery)
export class GetAllTransactionsHandler implements IQueryHandler<GetAllTransactionsQuery> {
  private readonly logger = new Logger(GetAllTransactionsHandler.name);

  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: ITransactionRepository,
  ) { }

  async execute(
    query: GetAllTransactionsQuery,
  ): Promise<{ transactions: Transaction[]; total: number }> {
    this.logger.debug(`Getting all transactions with filters`);

    return this.transactionRepository.findAll({
      skip: query.skip,
      take: query.take,
      filters: {
        userId: query.userId,
        accountId: query.accountId,
        category: query.category as TransactionCategory,
        startDate: query.startDate,
        endDate: query.endDate,
      },
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }
}

@QueryHandler(GetRecentTransactionsQuery)
export class GetRecentTransactionsHandler implements IQueryHandler<GetRecentTransactionsQuery> {
  private readonly logger = new Logger(GetRecentTransactionsHandler.name);

  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: ITransactionRepository,
  ) { }

  async execute(query: GetRecentTransactionsQuery): Promise<Transaction[]> {
    this.logger.debug(`Getting recent transactions for user: ${query.userId}`);

    return this.transactionRepository.getRecentTransactions(
      query.userId,
      query.days,
      query.limit,
    );
  }
}
