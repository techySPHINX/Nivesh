import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Controllers
import { AccountController } from './presentation/account.controller';
import { TransactionController } from './presentation/transaction.controller';

// Command Handlers
import {
  CreateAccountHandler,
  UpdateAccountHandler,
  DeleteAccountHandler,
  LinkAccountHandler,
} from './application/commands/handlers/account.handlers';
import {
  CreateTransactionHandler,
  UpdateTransactionHandler,
  DeleteTransactionHandler,
} from './application/commands/handlers/transaction.handlers';

// Query Handlers
import {
  GetAccountHandler,
  GetAccountsByUserHandler,
  GetAllAccountsHandler,
} from './application/queries/handlers/account.query-handlers';
import {
  GetTransactionHandler,
  GetTransactionsByAccountHandler,
  GetTransactionsByUserHandler,
  GetAllTransactionsHandler,
  GetRecentTransactionsHandler,
} from './application/queries/handlers/transaction.query-handlers';

// Repositories
import { AccountRepository } from './infrastructure/persistence/account.repository';
import { TransactionRepository } from './infrastructure/persistence/transaction.repository';
import { ACCOUNT_REPOSITORY } from './domain/repositories/account.repository.interface';
import { TRANSACTION_REPOSITORY } from './domain/repositories/transaction.repository.interface';

// Core modules
import { DatabaseModule } from '../../core/database/database.module';
import { MessagingModule } from '../../core/messaging/messaging.module';

const CommandHandlers = [
  // Account
  CreateAccountHandler,
  UpdateAccountHandler,
  DeleteAccountHandler,
  LinkAccountHandler,
  // Transaction
  CreateTransactionHandler,
  UpdateTransactionHandler,
  DeleteTransactionHandler,
];

const QueryHandlers = [
  // Account
  GetAccountHandler,
  GetAccountsByUserHandler,
  GetAllAccountsHandler,
  // Transaction
  GetTransactionHandler,
  GetTransactionsByAccountHandler,
  GetTransactionsByUserHandler,
  GetAllTransactionsHandler,
  GetRecentTransactionsHandler,
];

@Module({
  imports: [CqrsModule, DatabaseModule, MessagingModule],
  controllers: [AccountController, TransactionController],
  providers: [
    // Repositories
    {
      provide: ACCOUNT_REPOSITORY,
      useClass: AccountRepository,
    },
    {
      provide: TRANSACTION_REPOSITORY,
      useClass: TransactionRepository,
    },
    // Handlers
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: [ACCOUNT_REPOSITORY, TRANSACTION_REPOSITORY],
})
export class FinancialDataModule { }
