/**
 * AI Reasoning Module
 * Core financial decision-making and simulation engine
 * 
 * @module ai-reasoning
 */

import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// RAG Pipeline Integration
import { RAGPipelineModule } from '../rag-pipeline/rag-pipeline.module';

// Domain Services
import { FinancialContextBuilderService } from './domain/services/context-builder.service';
import { DecisionEngineService } from './domain/services/decision-engine.service';

// Infrastructure Services
import { GeminiReasoningService } from './infrastructure/services/gemini-reasoning.service';
import { PromptTemplateService } from './infrastructure/services/prompt-template.service';

// Application Handlers
import { ProcessQueryHandler } from './application/handlers/process-query.handler';
import { SimulateScenarioHandler } from './application/handlers/simulate-scenario.handler';

// Presentation
import { ReasoningController } from './presentation/reasoning.controller';

// Repository imports
import {
  ACCOUNT_REPOSITORY
} from '../financial-data/domain/repositories/account.repository.interface';
import {
  TRANSACTION_REPOSITORY
} from '../financial-data/domain/repositories/transaction.repository.interface';
import { AccountRepository } from '../financial-data/infrastructure/persistence/account.repository';
import { TransactionRepository } from '../financial-data/infrastructure/persistence/transaction.repository';

const DomainServices = [
  FinancialContextBuilderService,
  DecisionEngineService,
];

const InfrastructureServices = [
  GeminiReasoningService,
  PromptTemplateService,
];

const CommandHandlers = [
  ProcessQueryHandler,
  SimulateScenarioHandler,
];

const QueryHandlers = [];

@Module({
  imports: [
    CqrsModule,
    RAGPipelineModule, // Import RAG capabilities
  ],
  controllers: [
    ReasoningController,
  ],
  providers: [
    ...DomainServices,
    ...InfrastructureServices,
    ...CommandHandlers,
    ...QueryHandlers,
    // Repository providers
    {
      provide: ACCOUNT_REPOSITORY,
      useClass: AccountRepository,
    },
    {
      provide: TRANSACTION_REPOSITORY,
      useClass: TransactionRepository,
    },
  ],
  exports: [
    FinancialContextBuilderService,
    DecisionEngineService,
    GeminiReasoningService,
  ],
})
export class AiReasoningModule { }
