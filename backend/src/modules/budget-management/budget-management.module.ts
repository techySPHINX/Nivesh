import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BudgetController } from './presentation/budget.controller';
import {
  CreateBudgetHandler,
  UpdateBudgetHandler,
  DeleteBudgetHandler,
} from './application/commands';
import {
  GetBudgetHandler,
  GetUserBudgetsHandler,
  GetBudgetSpendingHandler,
} from './application/queries';
import { PrismaService } from '../../core/database/postgres/prisma.service';
import { PrismaBudgetRepository } from './infrastructure/persistence/budget.repository';
import { BUDGET_REPOSITORY } from './domain/repositories/budget.repository.interface';
import { BudgetAlertHandler } from './application/events/budget-alert.handler';
import { AlertsModule } from '../alerts/alerts.module';

const CommandHandlers = [
  CreateBudgetHandler,
  UpdateBudgetHandler,
  DeleteBudgetHandler,
];

const QueryHandlers = [
  GetBudgetHandler,
  GetUserBudgetsHandler,
  GetBudgetSpendingHandler,
];

const Repositories = [
  { provide: BUDGET_REPOSITORY, useClass: PrismaBudgetRepository },
];

@Module({
  imports: [CqrsModule, AlertsModule],
  controllers: [BudgetController],
  providers: [
    PrismaService,
    ...CommandHandlers,
    ...QueryHandlers,
    ...Repositories,
    ...BudgetAlertHandler,
  ],
  exports: [BUDGET_REPOSITORY],
})
export class BudgetManagementModule {}
