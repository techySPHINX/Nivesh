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

@Module({
  imports: [CqrsModule],
  controllers: [BudgetController],
  providers: [
    PrismaService,
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: [],
})
export class BudgetManagementModule {}
