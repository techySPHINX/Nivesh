import { Injectable, Logger } from '@nestjs/common';
import { BaseAgent } from './base.agent';
import {
  AgentMessage,
  AgentResponse,
  AgentType,
  ExecutionPlan,
  ExecutionStep,
} from '../types/agent.types';
import { ToolRegistry } from '../services/tool-registry.service';
import { DecisionTraceService } from '../services/decision-trace.service';
import { AgentRegistry } from '../services/agent-registry.service';
import { SemanticRetrieverService } from '../../rag-pipeline/application/services/semantic-retriever.service';
import { ContextBuilderService } from '../../rag-pipeline/application/services/context-builder.service';
import { AgentMemoryService } from '../services/agent-memory.service';

/**
 * User Intent Interface
 */
interface UserIntent {
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  requiredAgents: AgentType[];
  executionMode: 'sequential' | 'parallel';
}

/**
 * Workflow Definition Interface
 */
interface WorkflowDefinition {
  name: string;
  description: string;
  requiredAgents: AgentType[];
  executionMode: 'sequential' | 'parallel';
  contextEnrichment: boolean;
}

/**
 * Synthesis Result Interface
 */
interface SynthesisResult {
  summary: string;
  keyInsights: string[];
  recommendations: string[];
  confidence: number;
  sources: AgentType[];
}

/**
 * OrchestratorAgent
 * Master coordinator that routes user queries to specialized agents and synthesizes results.
 *
 * Capabilities:
 * - Intent classification (goal_planning, portfolio_review, risk_assessment, etc.)
 * - Execution plan building (sequential/parallel agent orchestration)
 * - Agent coordination with context sharing
 * - Multi-agent result synthesis using LLM
 * - Workflow optimization and caching
 *
 * Example Workflow:
 * User Query: "I want to buy a house worth ₹50L in 5 years"
 *
 * Step 1: Intent Classification
 * - Intent: goal_planning
 * - Entities: { goalType: 'house', amount: 5000000, timeline: 5 }
 * - Confidence: 0.95
 *
 * Step 2: Execution Plan
 * ```
 * Sequential Execution:
 * 1. FinancialPlanningAgent → Create savings plan
 * 2. RiskAssessmentAgent → Assess risk profile (uses context from #1)
 * 3. InvestmentAdvisorAgent → Recommend products (uses #1, #2)
 * 4. SimulationAgent → Run Monte Carlo (uses #1, #2, #3)
 * 5. ActionExecutionAgent → Generate next steps (uses all)
 * ```
 *
 * Step 3: Synthesis
 * - LLM combines all agent outputs
 * - Generates cohesive narrative
 * - Highlights key insights
 * - Provides actionable recommendations
 *
 * @Injectable
 */
@Injectable()
export class OrchestratorAgent extends BaseAgent {
  protected readonly logger = new Logger(OrchestratorAgent.name);

  private workflowDefinitions: Map<string, WorkflowDefinition> = new Map();

  constructor(
    toolRegistry: ToolRegistry,
    decisionTraceService: DecisionTraceService,
    private readonly agentRegistry: AgentRegistry,
    private readonly semanticRetriever: SemanticRetrieverService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly agentMemory: AgentMemoryService,
  ) {
    super(AgentType.ORCHESTRATOR, toolRegistry, decisionTraceService);
    this.initializeWorkflows();
  }

  /**
   * Execute orchestration task
   */
  async execute(message: AgentMessage): Promise<AgentResponse> {
    const { query, context } = message.payload;
    const traceId = context.traceId || (await this.decisionTraceService.generateTraceId());
    const userId = context.userId || context.userContext?.userId;

    this.logger.log(`Orchestrating query: "${query}" for user: ${userId}`);

    try {
      await this.recordReasoning(
        `Starting RAG-enhanced orchestration for: ${query}`,
        traceId,
      );

      // Step 0: Retrieve relevant context from RAG pipeline
      const ragContext = await this.retrieveRelevantContext(query, userId, traceId);

      await this.recordReasoning(
        `Retrieved ${ragContext.documentsCount} relevant documents from RAG pipeline`,
        traceId,
      );

      // Enrich context with RAG results and user memory
      const enrichedContext = await this.enrichContextWithMemory(
        { ...context, ragContext },
        userId,
        traceId,
      );

      await this.recordReasoning(
        `Context enriched with user preferences and conversation history`,
        traceId,
      );

      // Step 1: Classify user intent (using RAG-enriched context)
      const intent = await this.classifyIntent(query, enrichedContext, traceId);

      await this.recordReasoning(
        `Classified intent: ${intent.intent} (confidence: ${intent.confidence})`,
        traceId,
      );

      // Step 2: Build execution plan
      const plan = await this.buildExecutionPlan(intent, enrichedContext, traceId);

      await this.recordReasoning(
        `Execution plan: ${plan.steps.length} steps (${intent.executionMode} mode)`,
        traceId,
      );

      // Step 3: Execute plan
      const results = await this.executePlan(plan, traceId);

      await this.recordReasoning(
        `Plan executed: ${results.length} agent responses`,
        traceId,
      );

      // Step 4: Synthesize results
      const synthesis = await this.synthesizeResults(
        query,
        results,
        enrichedContext,
        traceId,
      );

      await this.recordReasoning(
        `Results synthesized with ${synthesis.keyInsights.length} insights`,
        traceId,
      );

      return this.createSuccessResponse(
        {
          synthesis,
          intent,
          plan,
          agentResults: results,
        },
        [
          `Intent: ${intent.intent}`,
          `Agents used: ${results.length}`,
          `Confidence: ${synthesis.confidence}`,
        ],
        intent.requiredAgents.map((a) => a.toString()),
        synthesis.confidence,
        synthesis.recommendations,
      );
    } catch (error) {
      this.logger.error(
        `Orchestration failed: ${error.message}`,
        error.stack,
      );
      return this.handleError(error, context);
    }
  }

  /**
   * Retrieve relevant context from RAG pipeline
   * Searches across user financial data, knowledge base, and conversation history
   */
  private async retrieveRelevantContext(
    query: string,
    userId: string | undefined,
    traceId: string,
  ): Promise<any> {
    try {
      if (!userId) {
        this.logger.warn('No userId provided, skipping RAG context retrieval');
        return { documents: [], documentsCount: 0 };
      }

      // Retrieve semantically similar documents
      const retrievalResults = await this.semanticRetriever.retrieveContext(
        query,
        userId,
        {
          topK: 8,
          scoreThreshold: 0.7,
          diversityWeight: 0.2,
          recencyWeight: 0.3,
        },
      );

      // Build structured context from retrieval results
      const structuredContext = await this.contextBuilder.buildContext(
        retrievalResults,
        {
          maxTokens: 2000,
          includeMetadata: true,
          format: 'structured',
        },
      );

      await this.recordReasoning(
        `RAG retrieved: ${retrievalResults.length} documents (avg score: ${this.calculateAvgScore(retrievalResults)})`,
        traceId,
      );

      return {
        documents: retrievalResults,
        documentsCount: retrievalResults.length,
        structuredContext,
        userFinancialSnapshot: this.extractFinancialSnapshot(retrievalResults),
      };
    } catch (error) {
      this.logger.error('RAG context retrieval failed:', error);
      return { documents: [], documentsCount: 0 };
    }
  }

  /**
   * Enrich context with user memory and preferences
   */
  private async enrichContextWithMemory(
    context: any,
    userId: string | undefined,
    traceId: string,
  ): Promise<any> {
    try {
      if (!userId) {
        return context;
      }

      // Get user preferences from memory service
      const userPreferences = await this.agentMemory.getUserPreferences(userId);

      // Get relevant past conversations
      const conversationHistory = await this.agentMemory.getRelevantConversations(
        userId,
        context.query || '',
        3, // Top 3 relevant conversations
      );

      await this.recordReasoning(
        `Memory enrichment: preferences loaded, ${conversationHistory.length} relevant conversations`,
        traceId,
      );

      return {
        ...context,
        userPreferences,
        conversationHistory,
        personalization: {
          riskTolerance: userPreferences.riskTolerance,
          investmentStyle: userPreferences.investmentStyle,
          preferredAgents: userPreferences.preferredAgents,
          communicationStyle: userPreferences.communicationStyle,
        },
      };
    } catch (error) {
      this.logger.error('Memory enrichment failed:', error);
      return context;
    }
  }

  /**
   * Calculate average retrieval score
   */
  private calculateAvgScore(results: any[]): string {
    if (results.length === 0) return '0.00';
    const avg = results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length;
    return avg.toFixed(2);
  }

  /**
   * Extract financial snapshot from RAG results
   */
  private extractFinancialSnapshot(results: any[]): any {
    const snapshot = {
      recentTransactions: [],
      activeGoals: [],
      portfolioSummary: {},
      budgetStatus: {},
    };

    results.forEach((result) => {
      const metadata = result.metadata || {};

      if (metadata.type === 'transaction') {
        snapshot.recentTransactions.push(metadata);
      } else if (metadata.type === 'goal') {
        snapshot.activeGoals.push(metadata);
      } else if (metadata.type === 'portfolio') {
        snapshot.portfolioSummary = { ...snapshot.portfolioSummary, ...metadata };
      } else if (metadata.type === 'budget') {
        snapshot.budgetStatus = { ...snapshot.budgetStatus, ...metadata };
      }
    });

    return snapshot;
  }

  /**
   * Classify user intent from natural language query
   */
  private async classifyIntent(
    query: string,
    context: any,
    traceId?: string,
  ): Promise<UserIntent> {
    await this.recordReasoning('Classifying user intent', traceId);

    const queryLower = query.toLowerCase();

    // Goal Planning Intent
    if (
      queryLower.includes('goal') ||
      queryLower.includes('buy') ||
      queryLower.includes('save for') ||
      queryLower.includes('plan')
    ) {
      const workflow = this.workflowDefinitions.get('goal_planning');
      return {
        intent: 'goal_planning',
        entities: this.extractGoalEntities(query),
        confidence: 0.9,
        requiredAgents: workflow?.requiredAgents || [],
        executionMode: workflow?.executionMode || 'sequential',
      };
    }

    // Portfolio Review Intent
    if (
      queryLower.includes('portfolio') ||
      queryLower.includes('investment') ||
      queryLower.includes('review')
    ) {
      const workflow = this.workflowDefinitions.get('portfolio_review');
      return {
        intent: 'portfolio_review',
        entities: {},
        confidence: 0.85,
        requiredAgents: workflow?.requiredAgents || [],
        executionMode: workflow?.executionMode || 'parallel',
      };
    }

    // Risk Assessment Intent
    if (
      queryLower.includes('risk') ||
      queryLower.includes('safe') ||
      queryLower.includes('secure')
    ) {
      const workflow = this.workflowDefinitions.get('risk_assessment');
      return {
        intent: 'risk_assessment',
        entities: {},
        confidence: 0.88,
        requiredAgents: workflow?.requiredAgents || [],
        executionMode: workflow?.executionMode || 'sequential',
      };
    }

    // Budget Analysis Intent
    if (
      queryLower.includes('budget') ||
      queryLower.includes('spending') ||
      queryLower.includes('expense')
    ) {
      const workflow = this.workflowDefinitions.get('budget_analysis');
      return {
        intent: 'budget_analysis',
        entities: {},
        confidence: 0.87,
        requiredAgents: workflow?.requiredAgents || [],
        executionMode: workflow?.executionMode || 'sequential',
      };
    }

    // Loan Affordability Intent
    if (
      queryLower.includes('loan') ||
      queryLower.includes('emi') ||
      queryLower.includes('afford')
    ) {
      const workflow = this.workflowDefinitions.get('loan_affordability');
      return {
        intent: 'loan_affordability',
        entities: this.extractLoanEntities(query),
        confidence: 0.9,
        requiredAgents: workflow?.requiredAgents || [],
        executionMode: workflow?.executionMode || 'sequential',
      };
    }

    // Default: Comprehensive Analysis
    const workflow = this.workflowDefinitions.get('comprehensive_analysis');
    return {
      intent: 'comprehensive_analysis',
      entities: {},
      confidence: 0.7,
      requiredAgents: workflow?.requiredAgents || [],
      executionMode: workflow?.executionMode || 'sequential',
    };
  }

  /**
   * Build execution plan from intent
   */
  private async buildExecutionPlan(
    intent: UserIntent,
    context: any,
    traceId?: string,
  ): Promise<ExecutionPlan> {
    await this.recordReasoning('Building execution plan', traceId);

    const steps: ExecutionStep[] = intent.requiredAgents.map((agentType, index) => ({
      stepId: `step-${index + 1}`,
      agentType,
      task: this.getTaskForAgent(agentType, intent),
      dependencies: index > 0 ? [`step-${index}`] : [],
      timeout: 30000,
      retryOnFailure: true,
      maxRetries: 2,
    }));

    return {
      steps,
      context: {
        ...context,
        intent: intent.intent,
        entities: intent.entities,
        traceId,
      },
      metadata: {
        totalSteps: steps.length,
        executionMode: intent.executionMode,
        estimatedDuration: steps.length * 5000, // 5s per step estimate
      },
    };
  }

  /**
   * Execute the plan by coordinating agents
   */
  private async executePlan(
    plan: ExecutionPlan,
    traceId?: string,
  ): Promise<AgentResponse[]> {
    await this.recordReasoning(
      `Executing plan with ${plan.steps.length} steps`,
      traceId,
    );

    const results: AgentResponse[] = [];
    const enrichedContext = { ...plan.context };

    for (const step of plan.steps) {
      this.logger.log(`Executing step: ${step.stepId} (${step.agentType})`);

      const message: AgentMessage = {
        id: `msg-${Date.now()}`,
        from: AgentType.ORCHESTRATOR,
        to: [step.agentType],
        type: 'request',
        payload: {
          task: step.task,
          context: enrichedContext,
        },
        timestamp: new Date(),
      };

      try {
        const response = await this.agentRegistry.routeMessage(message);

        if (response.length > 0) {
          const agentResponse = response[0];
          results.push(agentResponse);

          // Enrich context with agent result for next steps
          enrichedContext[`${step.agentType}_result`] = agentResponse.result;

          await this.recordReasoning(
            `Step ${step.stepId} completed successfully`,
            traceId,
          );
        }
      } catch (error) {
        this.logger.error(`Step ${step.stepId} failed: ${error.message}`);

        if (step.retryOnFailure && step.maxRetries && step.maxRetries > 0) {
          // Retry logic handled by individual agents
          await this.recordReasoning(
            `Step ${step.stepId} failed, will retry`,
            traceId,
          );
        } else {
          await this.recordReasoning(
            `Step ${step.stepId} failed permanently`,
            traceId,
          );
        }
      }
    }

    return results;
  }

  /**
   * Synthesize results from multiple agents using LLM
   */
  private async synthesizeResults(
    query: string,
    results: AgentResponse[],
    context: any,
    traceId?: string,
  ): Promise<SynthesisResult> {
    await this.recordReasoning('Synthesizing agent results', traceId);

    // Extract key information from all agent responses
    const keyInsights: string[] = [];
    const recommendations: string[] = [];
    const sources: AgentType[] = [];

    for (const result of results) {
      if (result.success && result.reasoning) {
        keyInsights.push(...result.reasoning.slice(0, 3)); // Top 3 insights per agent
      }

      if (result.nextActions) {
        recommendations.push(...result.nextActions);
      }

      sources.push(result.result.agentType || AgentType.ORCHESTRATOR);
    }

    // Use LLM tool to create cohesive narrative
    const llmPrompt = this.buildSynthesisPrompt(query, results);

    let summary = '';
    try {
      const llmResult = await this.callTool(
        'generate_llm_response',
        {
          prompt: llmPrompt,
          maxTokens: 500,
          temperature: 0.7,
        },
        traceId,
      );

      summary = llmResult.text || this.generateFallbackSummary(results);
    } catch (error) {
      this.logger.warn('LLM synthesis failed, using fallback');
      summary = this.generateFallbackSummary(results);
    }

    // Calculate average confidence
    const avgConfidence =
      results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length;

    return {
      summary,
      keyInsights: keyInsights.slice(0, 10), // Top 10 insights
      recommendations: recommendations.slice(0, 8), // Top 8 recommendations
      confidence: avgConfidence,
      sources,
    };
  }

  /**
   * Build LLM prompt for result synthesis
   */
  private buildSynthesisPrompt(
    query: string,
    results: AgentResponse[],
  ): string {
    let prompt = `User Query: "${query}"\n\n`;
    prompt += `You are a financial advisor synthesizing insights from multiple AI agents.\n\n`;

    results.forEach((result, index) => {
      prompt += `Agent ${index + 1} Insights:\n`;
      prompt += result.reasoning?.join('\n') || 'No reasoning provided';
      prompt += `\n\n`;
    });

    prompt += `Based on all agent insights above, provide a cohesive, actionable summary for the user.\n`;
    prompt += `Focus on: 1) Key findings, 2) Specific recommendations, 3) Next steps\n`;
    prompt += `Keep it concise (under 300 words) and user-friendly.`;

    return prompt;
  }

  /**
   * Generate fallback summary when LLM unavailable
   */
  private generateFallbackSummary(results: AgentResponse[]): string {
    const successful = results.filter((r) => r.success);

    if (successful.length === 0) {
      return 'Analysis could not be completed. Please try again.';
    }

    let summary = `Analysis complete using ${successful.length} specialized agents.\n\n`;

    successful.forEach((result, index) => {
      const topInsight = result.reasoning?.[0] || 'Analysis completed';
      summary += `${index + 1}. ${topInsight}\n`;
    });

    return summary;
  }

  /**
   * Initialize workflow definitions
   */
  private initializeWorkflows(): void {
    // Goal Planning Workflow
    this.workflowDefinitions.set('goal_planning', {
      name: 'Goal Planning',
      description: 'Comprehensive financial goal planning',
      requiredAgents: [
        AgentType.FINANCIAL_PLANNING,
        AgentType.RISK_ASSESSMENT,
        AgentType.INVESTMENT_ADVISOR,
        AgentType.SIMULATION,
        AgentType.ACTION_EXECUTION,
      ],
      executionMode: 'sequential',
      contextEnrichment: true,
    });

    // Portfolio Review Workflow
    this.workflowDefinitions.set('portfolio_review', {
      name: 'Portfolio Review',
      description: 'Investment portfolio analysis',
      requiredAgents: [
        AgentType.RISK_ASSESSMENT,
        AgentType.INVESTMENT_ADVISOR,
        AgentType.FINANCIAL_GRAPH,
      ],
      executionMode: 'parallel',
      contextEnrichment: false,
    });

    // Risk Assessment Workflow
    this.workflowDefinitions.set('risk_assessment', {
      name: 'Risk Assessment',
      description: 'Comprehensive risk analysis',
      requiredAgents: [
        AgentType.RISK_ASSESSMENT,
        AgentType.FINANCIAL_GRAPH,
        AgentType.ACTION_EXECUTION,
      ],
      executionMode: 'sequential',
      contextEnrichment: true,
    });

    // Budget Analysis Workflow
    this.workflowDefinitions.set('budget_analysis', {
      name: 'Budget Analysis',
      description: 'Spending pattern and budget analysis',
      requiredAgents: [
        AgentType.FINANCIAL_GRAPH,
        AgentType.MONITORING_ALERTING,
        AgentType.ACTION_EXECUTION,
      ],
      executionMode: 'sequential',
      contextEnrichment: true,
    });

    // Loan Affordability Workflow
    this.workflowDefinitions.set('loan_affordability', {
      name: 'Loan Affordability',
      description: 'Loan affordability and stress testing',
      requiredAgents: [
        AgentType.SIMULATION,
        AgentType.RISK_ASSESSMENT,
        AgentType.ACTION_EXECUTION,
      ],
      executionMode: 'sequential',
      contextEnrichment: true,
    });

    // Comprehensive Analysis Workflow
    this.workflowDefinitions.set('comprehensive_analysis', {
      name: 'Comprehensive Analysis',
      description: 'Full financial health check',
      requiredAgents: [
        AgentType.FINANCIAL_PLANNING,
        AgentType.RISK_ASSESSMENT,
        AgentType.INVESTMENT_ADVISOR,
        AgentType.FINANCIAL_GRAPH,
        AgentType.SIMULATION,
        AgentType.MONITORING_ALERTING,
        AgentType.ACTION_EXECUTION,
      ],
      executionMode: 'sequential',
      contextEnrichment: true,
    });
  }

  /**
   * Get task name for agent based on intent
   */
  private getTaskForAgent(agentType: AgentType, intent: UserIntent): string {
    const taskMap: Record<AgentType, string> = {
      [AgentType.FINANCIAL_PLANNING]: 'create_savings_plan',
      [AgentType.RISK_ASSESSMENT]: 'assess_overall_risk',
      [AgentType.INVESTMENT_ADVISOR]: 'recommend_allocation',
      [AgentType.SIMULATION]: intent.intent === 'loan_affordability' ? 'check_loan_affordability' : 'run_monte_carlo',
      [AgentType.FINANCIAL_GRAPH]: 'analyze_spending_patterns',
      [AgentType.MONITORING_ALERTING]: 'check_alerts',
      [AgentType.ACTION_EXECUTION]: 'generate_actions',
      [AgentType.ORCHESTRATOR]: 'orchestrate',
    };

    return taskMap[agentType] || 'execute';
  }

  /**
   * Extract goal entities from query
   */
  private extractGoalEntities(query: string): Record<string, any> {
    const entities: Record<string, any> = {};

    // Extract amount (₹50L, ₹5000000, 50 lakh, etc.)
    const amountMatch = query.match(/₹?([\d,]+)(L|lakh|lakhs|crore|cr)?/i);
    if (amountMatch) {
      let amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      const unit = amountMatch[2]?.toLowerCase();

      if (unit === 'l' || unit === 'lakh' || unit === 'lakhs') {
        amount *= 100000;
      } else if (unit === 'cr' || unit === 'crore') {
        amount *= 10000000;
      }

      entities.amount = amount;
    }

    // Extract timeline (5 years, 3 months, etc.)
    const timelineMatch = query.match(/(\d+)\s*(year|years|month|months|yr|yrs)/i);
    if (timelineMatch) {
      const value = parseInt(timelineMatch[1]);
      const unit = timelineMatch[2].toLowerCase();

      entities.timeline =
        unit.startsWith('year') || unit === 'yr' || unit === 'yrs'
          ? value
          : value / 12;
    }

    // Extract goal type
    if (query.toLowerCase().includes('house') || query.toLowerCase().includes('home')) {
      entities.goalType = 'house';
    } else if (query.toLowerCase().includes('car') || query.toLowerCase().includes('vehicle')) {
      entities.goalType = 'car';
    } else if (query.toLowerCase().includes('education') || query.toLowerCase().includes('study')) {
      entities.goalType = 'education';
    } else if (query.toLowerCase().includes('retirement') || query.toLowerCase().includes('retire')) {
      entities.goalType = 'retirement';
    }

    return entities;
  }

  /**
   * Extract loan entities from query
   */
  private extractLoanEntities(query: string): Record<string, any> {
    const entities: Record<string, any> = {};

    // Extract loan amount
    const amountMatch = query.match(/₹?([\d,]+)(L|lakh|lakhs)?/i);
    if (amountMatch) {
      let amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      if (amountMatch[2]) amount *= 100000;
      entities.loanAmount = amount;
    }

    // Extract interest rate
    const rateMatch = query.match(/([\d.]+)%/);
    if (rateMatch) {
      entities.interestRate = parseFloat(rateMatch[1]);
    }

    // Extract tenure
    const tenureMatch = query.match(/(\d+)\s*(year|years|yr|yrs)/i);
    if (tenureMatch) {
      entities.tenureYears = parseInt(tenureMatch[1]);
    }

    return entities;
  }
}
