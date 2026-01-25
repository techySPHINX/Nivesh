import { Injectable, Logger } from '@nestjs/common';
import {
  AgentType,
  ExecutionPlan,
  ExecutionStep,
} from '../types/agent.types';

/**
 * Intent Type
 */
export type IntentType =
  | 'goal_planning'
  | 'portfolio_review'
  | 'risk_assessment'
  | 'budget_analysis'
  | 'loan_affordability'
  | 'retirement_planning'
  | 'tax_optimization'
  | 'comprehensive_analysis';

/**
 * Workflow Template Interface
 */
interface WorkflowTemplate {
  name: string;
  description: string;
  agents: AgentType[];
  mode: 'sequential' | 'parallel';
  contextEnrichment: boolean;
  estimatedDuration: number; // milliseconds
}

/**
 * ExecutionPlanBuilder
 * Service for building execution plans from user intents.
 *
 * Capabilities:
 * - Intent-to-workflow mapping
 * - Dynamic agent sequencing
 * - Dependency resolution
 * - Context propagation rules
 * - Parallel execution optimization
 *
 * Example:
 * Intent: goal_planning
 * Plan: [Planning → Risk → Investment → Simulation → Action]
 * Mode: Sequential (each agent uses previous results)
 *
 * Intent: portfolio_review
 * Plan: [Risk, Investment, Graph] (parallel)
 * Mode: Parallel (independent analysis)
 *
 * @Injectable
 */
@Injectable()
export class ExecutionPlanBuilder {
  private readonly logger = new Logger(ExecutionPlanBuilder.name);

  private workflows: Map<IntentType, WorkflowTemplate> = new Map();

  constructor() {
    this.initializeWorkflows();
  }

  /**
   * Build execution plan from intent
   */
  buildPlan(
    intent: IntentType,
    context: any,
    customAgents?: AgentType[],
  ): ExecutionPlan {
    this.logger.log(`Building execution plan for intent: ${intent}`);

    const workflow = this.workflows.get(intent);

    if (!workflow) {
      throw new Error(`Unknown intent: ${intent}`);
    }

    const agents = customAgents || workflow.agents;
    const steps = this.createSteps(agents, workflow.mode, workflow.contextEnrichment);

    const plan: ExecutionPlan = {
      steps,
      context: {
        ...context,
        intent,
        workflowName: workflow.name,
      },
      metadata: {
        totalSteps: steps.length,
        executionMode: workflow.mode,
        estimatedDuration: workflow.estimatedDuration,
        contextEnrichment: workflow.contextEnrichment,
      },
    };

    this.logger.log(
      `Plan created: ${steps.length} steps (${workflow.mode} mode)`,
    );

    return plan;
  }

  /**
   * Create execution steps from agent list
   */
  private createSteps(
    agents: AgentType[],
    mode: 'sequential' | 'parallel',
    contextEnrichment: boolean,
  ): ExecutionStep[] {
    return agents.map((agentType, index) => {
      const step: ExecutionStep = {
        stepId: `step-${index + 1}`,
        agentType,
        task: this.getDefaultTask(agentType),
        dependencies: mode === 'sequential' && index > 0 ? [`step-${index}`] : [],
        timeout: this.getTimeout(agentType),
        retryOnFailure: true,
        maxRetries: 2,
      };

      return step;
    });
  }

  /**
   * Get default task for each agent type
   */
  private getDefaultTask(agentType: AgentType): string {
    const taskMap: Record<AgentType, string> = {
      [AgentType.FINANCIAL_PLANNING]: 'create_savings_plan',
      [AgentType.RISK_ASSESSMENT]: 'assess_overall_risk',
      [AgentType.INVESTMENT_ADVISOR]: 'recommend_allocation',
      [AgentType.SIMULATION]: 'run_monte_carlo',
      [AgentType.FINANCIAL_GRAPH]: 'analyze_spending_patterns',
      [AgentType.MONITORING_ALERTING]: 'check_alerts',
      [AgentType.ACTION_EXECUTION]: 'generate_actions',
      [AgentType.ORCHESTRATOR]: 'orchestrate',
    };

    return taskMap[agentType] || 'execute';
  }

  /**
   * Get timeout based on agent complexity
   */
  private getTimeout(agentType: AgentType): number {
    const timeoutMap: Record<AgentType, number> = {
      [AgentType.FINANCIAL_PLANNING]: 15000, // 15s
      [AgentType.RISK_ASSESSMENT]: 20000, // 20s (complex calculations)
      [AgentType.INVESTMENT_ADVISOR]: 15000, // 15s
      [AgentType.SIMULATION]: 30000, // 30s (Monte Carlo intensive)
      [AgentType.FINANCIAL_GRAPH]: 25000, // 25s (Neo4j queries)
      [AgentType.MONITORING_ALERTING]: 20000, // 20s (multiple checks)
      [AgentType.ACTION_EXECUTION]: 10000, // 10s (simple generation)
      [AgentType.ORCHESTRATOR]: 60000, // 60s (coordinates others)
    };

    return timeoutMap[agentType] || 30000;
  }

  /**
   * Get workflow template by intent
   */
  getWorkflow(intent: IntentType): WorkflowTemplate | undefined {
    return this.workflows.get(intent);
  }

  /**
   * Get all available intents
   */
  getAvailableIntents(): IntentType[] {
    return Array.from(this.workflows.keys());
  }

  /**
   * Validate execution plan
   */
  validatePlan(plan: ExecutionPlan): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!plan.steps || plan.steps.length === 0) {
      errors.push('Plan must have at least one step');
    }

    // Check for circular dependencies
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const step of plan.steps) {
      if (this.hasCyclicDependency(step, plan.steps, visited, recursionStack)) {
        errors.push(`Circular dependency detected in step: ${step.stepId}`);
      }
    }

    // Check for invalid dependencies
    const stepIds = new Set(plan.steps.map((s) => s.stepId));
    for (const step of plan.steps) {
      for (const dep of step.dependencies) {
        if (!stepIds.has(dep)) {
          errors.push(
            `Step ${step.stepId} has invalid dependency: ${dep}`,
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check for cyclic dependencies
   */
  private hasCyclicDependency(
    step: ExecutionStep,
    allSteps: ExecutionStep[],
    visited: Set<string>,
    recursionStack: Set<string>,
  ): boolean {
    if (!visited.has(step.stepId)) {
      visited.add(step.stepId);
      recursionStack.add(step.stepId);

      for (const depId of step.dependencies) {
        const depStep = allSteps.find((s) => s.stepId === depId);
        if (!depStep) continue;

        if (
          !visited.has(depId) &&
          this.hasCyclicDependency(depStep, allSteps, visited, recursionStack)
        ) {
          return true;
        } else if (recursionStack.has(depId)) {
          return true;
        }
      }
    }

    recursionStack.delete(step.stepId);
    return false;
  }

  /**
   * Initialize workflow definitions
   */
  private initializeWorkflows(): void {
    // Goal Planning: Sequential workflow with context enrichment
    this.workflows.set('goal_planning', {
      name: 'Goal Planning',
      description: 'Comprehensive financial goal planning with savings plan, risk assessment, and investment strategy',
      agents: [
        AgentType.FINANCIAL_PLANNING,
        AgentType.RISK_ASSESSMENT,
        AgentType.INVESTMENT_ADVISOR,
        AgentType.SIMULATION,
        AgentType.ACTION_EXECUTION,
      ],
      mode: 'sequential',
      contextEnrichment: true,
      estimatedDuration: 90000, // 90s
    });

    // Portfolio Review: Parallel workflow for faster analysis
    this.workflows.set('portfolio_review', {
      name: 'Portfolio Review',
      description: 'Multi-faceted portfolio analysis including risk, allocation, and transaction patterns',
      agents: [
        AgentType.RISK_ASSESSMENT,
        AgentType.INVESTMENT_ADVISOR,
        AgentType.FINANCIAL_GRAPH,
      ],
      mode: 'parallel',
      contextEnrichment: false,
      estimatedDuration: 30000, // 30s (parallel)
    });

    // Risk Assessment: Sequential with graph insights
    this.workflows.set('risk_assessment', {
      name: 'Risk Assessment',
      description: 'Comprehensive risk analysis with spending pattern insights and mitigation actions',
      agents: [
        AgentType.RISK_ASSESSMENT,
        AgentType.FINANCIAL_GRAPH,
        AgentType.ACTION_EXECUTION,
      ],
      mode: 'sequential',
      contextEnrichment: true,
      estimatedDuration: 55000, // 55s
    });

    // Budget Analysis: Graph-driven spending insights
    this.workflows.set('budget_analysis', {
      name: 'Budget Analysis',
      description: 'Spending pattern analysis with budget monitoring and actionable recommendations',
      agents: [
        AgentType.FINANCIAL_GRAPH,
        AgentType.MONITORING_ALERTING,
        AgentType.ACTION_EXECUTION,
      ],
      mode: 'sequential',
      contextEnrichment: true,
      estimatedDuration: 55000, // 55s
    });

    // Loan Affordability: Simulation-driven with risk checks
    this.workflows.set('loan_affordability', {
      name: 'Loan Affordability',
      description: 'Loan affordability check with stress testing and risk assessment',
      agents: [
        AgentType.SIMULATION,
        AgentType.RISK_ASSESSMENT,
        AgentType.ACTION_EXECUTION,
      ],
      mode: 'sequential',
      contextEnrichment: true,
      estimatedDuration: 60000, // 60s
    });

    // Retirement Planning: Long-term projection
    this.workflows.set('retirement_planning', {
      name: 'Retirement Planning',
      description: 'Retirement corpus calculation with investment strategy and timeline',
      agents: [
        AgentType.FINANCIAL_PLANNING,
        AgentType.SIMULATION,
        AgentType.INVESTMENT_ADVISOR,
        AgentType.ACTION_EXECUTION,
      ],
      mode: 'sequential',
      contextEnrichment: true,
      estimatedDuration: 75000, // 75s
    });

    // Tax Optimization: Investment-focused
    this.workflows.set('tax_optimization', {
      name: 'Tax Optimization',
      description: 'Tax-saving investment recommendations with product suggestions',
      agents: [
        AgentType.INVESTMENT_ADVISOR,
        AgentType.FINANCIAL_GRAPH,
        AgentType.ACTION_EXECUTION,
      ],
      mode: 'sequential',
      contextEnrichment: true,
      estimatedDuration: 50000, // 50s
    });

    // Comprehensive Analysis: All agents for complete financial health check
    this.workflows.set('comprehensive_analysis', {
      name: 'Comprehensive Analysis',
      description: 'Full financial health check covering all aspects: planning, risk, investments, monitoring',
      agents: [
        AgentType.FINANCIAL_PLANNING,
        AgentType.RISK_ASSESSMENT,
        AgentType.INVESTMENT_ADVISOR,
        AgentType.FINANCIAL_GRAPH,
        AgentType.SIMULATION,
        AgentType.MONITORING_ALERTING,
        AgentType.ACTION_EXECUTION,
      ],
      mode: 'sequential',
      contextEnrichment: true,
      estimatedDuration: 150000, // 150s (2.5 minutes)
    });

    this.logger.log(`Initialized ${this.workflows.size} workflow templates`);
  }

  /**
   * Optimize plan for parallel execution where possible
   */
  optimizePlan(plan: ExecutionPlan): ExecutionPlan {
    // Find steps that can run in parallel (no dependencies)
    const parallelBatches: ExecutionStep[][] = [];
    const remaining = [...plan.steps];

    while (remaining.length > 0) {
      const batch = remaining.filter(
        (step) =>
          step.dependencies.length === 0 ||
          step.dependencies.every((dep) =>
            parallelBatches.flat().some((s) => s.stepId === dep),
          ),
      );

      if (batch.length === 0) break; // Circular dependency or invalid plan

      parallelBatches.push(batch);
      batch.forEach((step) => {
        const index = remaining.indexOf(step);
        remaining.splice(index, 1);
      });
    }

    this.logger.log(
      `Optimized plan: ${parallelBatches.length} parallel batches`,
    );

    // Return optimized plan with metadata
    return {
      ...plan,
      metadata: {
        ...plan.metadata,
        parallelBatches: parallelBatches.length,
        estimatedDuration: this.calculateOptimizedDuration(parallelBatches),
      },
    };
  }

  /**
   * Calculate estimated duration for optimized plan
   */
  private calculateOptimizedDuration(batches: ExecutionStep[][]): number {
    return batches.reduce((total, batch) => {
      const batchDuration = Math.max(...batch.map((s) => s.timeout || 30000));
      return total + batchDuration;
    }, 0);
  }
}
