import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import {
  GetAccountQuery,
  GetAccountsByUserQuery,
  GetAllAccountsQuery,
} from '../account.queries';
import {
  IAccountRepository,
  ACCOUNT_REPOSITORY,
} from '../../../domain/repositories/account.repository.interface';
import { Account } from '../../../domain/entities/account.entity';
import { EntityNotFoundException } from '../../../../../core/exceptions/base.exception';

@QueryHandler(GetAccountQuery)
export class GetAccountHandler implements IQueryHandler<GetAccountQuery> {
  private readonly logger = new Logger(GetAccountHandler.name);

  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
  ) { }

  async execute(query: GetAccountQuery): Promise<Account> {
    this.logger.debug(`Getting account: ${query.accountId}`);

    const account = await this.accountRepository.findById(query.accountId);

    if (!account) {
      throw new EntityNotFoundException('Account', query.accountId);
    }

    return account;
  }
}

@QueryHandler(GetAccountsByUserQuery)
export class GetAccountsByUserHandler implements IQueryHandler<GetAccountsByUserQuery> {
  private readonly logger = new Logger(GetAccountsByUserHandler.name);

  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
  ) { }

  async execute(query: GetAccountsByUserQuery): Promise<Account[]> {
    this.logger.debug(`Getting accounts for user: ${query.userId}`);

    if (query.activeOnly) {
      return this.accountRepository.findActiveByUserId(query.userId);
    }

    return this.accountRepository.findByUserId(query.userId);
  }
}

@QueryHandler(GetAllAccountsQuery)
export class GetAllAccountsHandler implements IQueryHandler<GetAllAccountsQuery> {
  private readonly logger = new Logger(GetAllAccountsHandler.name);

  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
  ) { }

  async execute(query: GetAllAccountsQuery): Promise<{ accounts: Account[]; total: number }> {
    this.logger.debug(`Getting all accounts with pagination`);

    return this.accountRepository.findAll({
      skip: query.skip,
      take: query.take,
      userId: query.userId,
    });
  }
}
