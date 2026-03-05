import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GetFinancialContextQuery } from '../get-financial-context.query';
import { FinancialContextBuilderService } from '../../domain/services/context-builder.service';
import {
  IAccountRepository,
  ACCOUNT_REPOSITORY,
} from '../../../financial-data/domain/repositories/account.repository.interface';
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
} from '../../../financial-data/domain/repositories/transaction.repository.interface';

/**
 * GetFinancialContextQueryHandler
 *
 * Returns a structured AI-ready snapshot of the user's financial state:
 *   - income / expense totals (last 90 days)
 *   - savings rate
 *   - account balances & types
 *   - top spending categories
 */
@QueryHandler(GetFinancialContextQuery)
export class GetFinancialContextQueryHandler
  implements IQueryHandler<GetFinancialContextQuery>
{
  private readonly logger = new Logger(GetFinancialContextQueryHandler.name);

  constructor(
    private readonly contextBuilder: FinancialContextBuilderService,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    @Inject(TRANSACTION_REPOSITORY) private readonly transactionRepository: ITransactionRepository,
  ) {}

  async execute(query: GetFinancialContextQuery): Promise<Record<string, any>> {
    const { userId } = query;
    this.logger.debug(`Building financial context for user: ${userId}`);

    const [accounts, transactions] = await Promise.all([
      this.accountRepository.findByUserId(userId),
      this.transactionRepository.getRecentTransactions(userId, 90),
    ]);

    const accountsData = accounts.map((acc) => ({
      id: acc.Id,
      userId: acc.UserId,
      accountType: acc.AccountType,
      balance: acc.Balance.getAmount(),
      currency: acc.Balance.getCurrency(),
      status: acc.Status,
    }));

    const transactionsData = transactions.map((txn) => ({
      id: txn.Id,
      userId: txn.UserId,
      accountId: txn.AccountId,
      amount: txn.Amount.getAmount(),
      type: txn.Type,
      category: txn.Category,
      transactionDate: txn.TransactionDate,
      description: txn.Description,
    }));

    const context = await this.contextBuilder.buildContext({
      userId,
      accountsData,
      transactionsData,
      goalsData: [],
    });

    return context.toAIContext();
  }
}
