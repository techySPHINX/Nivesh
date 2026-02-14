import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Core modules
import { CoreConfigModule } from './core/config/config.module';
import { DatabaseModule } from './core/database/database.module';
import { MessagingModule } from './core/messaging/messaging.module';
import { SecurityModule } from './core/security/security.module';
import { ObservabilityModule } from './core/observability/observability.module';
import { IntegrationsModule } from './core/integrations/integrations.module';

// Feature modules
import { UserModule } from './modules/user/user.module';
import { FinancialDataModule } from './modules/financial-data/financial-data.module';
import { GoalManagementModule } from './modules/goal-management/goal-management.module';
import { BudgetManagementModule } from './modules/budget-management/budget-management.module';
import { AiReasoningModule } from './modules/ai-reasoning/ai-reasoning.module';
import { KnowledgeGraphModule } from './modules/knowledge-graph/knowledge-graph.module';

// Controllers
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Event emitter for domain events
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 10,
    }),

    // Core infrastructure
    CoreConfigModule,
    DatabaseModule,
    MessagingModule,
    SecurityModule,
    ObservabilityModule,
    IntegrationsModule,

    // Feature modules
    UserModule,
    FinancialDataModule,
    GoalManagementModule,
    BudgetManagementModule,
    AiReasoningModule,
    KnowledgeGraphModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule { }
