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

// Core Integrations
import { GeminiModule } from '../../core/integrations/gemini/gemini.module';

// Domain Services
import { FinancialContextBuilderService } from './domain/services/context-builder.service';
import { DecisionEngineService } from './domain/services/decision-engine.service';
import { FunctionRegistry } from './domain/services/function-registry.service';
import { FunctionExecutorService } from './domain/services/function-executor.service';

// Infrastructure Services
import { GeminiReasoningService } from './infrastructure/services/gemini-reasoning.service';
import { PromptTemplateService } from './infrastructure/services/prompt-template.service';
import { PromptManagementService } from './infrastructure/services/prompt-management.service';
import { SafetyGuardrailsService } from './infrastructure/services/safety-guardrails.service';
import { StreamingResponseService } from './infrastructure/services/streaming-response.service';

// Application Handlers
import { ProcessQueryHandler } from './application/handlers/process-query.handler';
import { SimulateScenarioHandler } from './application/handlers/simulate-scenario.handler';

// Presentation
import { ReasoningController } from './presentation/reasoning.controller';
import { LLMController } from './presentation/llm.controller';
import { AIChatGateway } from './presentation/gateways/ai-chat.gateway';

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
  FunctionRegistry,
  FunctionExecutorService,
];

const InfrastructureServices = [
  GeminiReasoningService,
  PromptTemplateService,
  PromptManagementService,
  SafetyGuardrailsService,
  StreamingResponseService,
];

const CommandHandlers = [
  ProcessQueryHandler,
  SimulateScenarioHandler,
];

const QueryHandlers = [];

const Gateways = [
  AIChatGateway,
];

@Module({
  imports: [
    CqrsModule,
    RAGPipelineModule, // Import RAG capabilities
    GeminiModule, // Import Gemini integration
  ],
  controllers: [
    ReasoningController,
    LLMController,
  ],
  providers: [
    ...DomainServices,
    ...InfrastructureServices,
    ...CommandHandlers,
    ...QueryHandlers,
    ...Gateways,
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
    PromptManagementService,
    FunctionRegistry,
    FunctionExecutorService,
  ],
})
export class AiReasoningModule { }
