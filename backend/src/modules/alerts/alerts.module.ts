import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from '../../core/database/database.module';

// Presentation
import { AlertController } from './presentation/alert.controller';

// Command Handlers
import {
  CreateAlertRuleHandler,
  MarkAlertReadHandler,
  DismissAlertHandler,
  DeleteAlertRuleHandler,
} from './application/commands/handlers';

// Query Handlers
import {
  GetActiveAlertsHandler,
  GetUserAlertsHandler,
  GetAlertRulesHandler,
  GetUnreadCountHandler,
} from './application/queries/handlers';

// Infrastructure
import { PrismaAlertRepository } from './infrastructure/repositories/alert.repository';
import { PrismaAlertRuleRepository } from './infrastructure/repositories/alert-rule.repository';

// Domain tokens
import { ALERT_REPOSITORY } from './domain/repositories/alert.repository.interface';
import { ALERT_RULE_REPOSITORY } from './domain/repositories/alert-rule.repository.interface';

const CommandHandlers = [
  CreateAlertRuleHandler,
  MarkAlertReadHandler,
  DismissAlertHandler,
  DeleteAlertRuleHandler,
];

const QueryHandlers = [
  GetActiveAlertsHandler,
  GetUserAlertsHandler,
  GetAlertRulesHandler,
  GetUnreadCountHandler,
];

@Module({
  imports: [CqrsModule, DatabaseModule],
  controllers: [AlertController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    {
      provide: ALERT_REPOSITORY,
      useClass: PrismaAlertRepository,
    },
    {
      provide: ALERT_RULE_REPOSITORY,
      useClass: PrismaAlertRuleRepository,
    },
  ],
  exports: [ALERT_REPOSITORY, ALERT_RULE_REPOSITORY],
})
export class AlertsModule {}
