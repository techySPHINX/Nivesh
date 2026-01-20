/**
 * AI Reasoning Module
 * Core financial decision-making and simulation engine
 * 
 * @module ai-reasoning
 */

import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Domain Services
import { FinancialContextBuilderService } from './domain/services/context-builder.service';
import { DecisionEngineService } from './domain/services/decision-engine.service';

// Infrastructure Services
import { GeminiReasoningService } from './infrastructure/services/gemini-reasoning.service';
import { PromptTemplateService } from './infrastructure/services/prompt-template.service';

// Application Handlers
import { ProcessQueryHandler } from './application/handlers/process-query.handler';
// import { SimulateScenarioHandler } from './application/handlers/simulate-scenario.handler';

// Presentation
import { ReasoningController } from './presentation/reasoning.controller';

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
  // SimulateScenarioHandler,
];

const QueryHandlers = [];

@Module({
  imports: [CqrsModule],
  controllers: [
    ReasoningController,
  ],
  providers: [
    ...DomainServices,
    ...InfrastructureServices,
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: [
    FinancialContextBuilderService,
    DecisionEngineService,
    GeminiReasoningService,
  ],
})
export class AiReasoningModule { }
