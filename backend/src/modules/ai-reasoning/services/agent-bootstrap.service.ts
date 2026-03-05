import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AgentRegistry } from './agent-registry.service';
import { AgentType } from '../types/agent.types';

// Specialized agents
import { OrchestratorAgent } from '../agents/orchestrator.agent';
import { FinancialPlanningAgent } from '../agents/financial-planning.agent';
import { RiskAssessmentAgent } from '../agents/risk-assessment.agent';
import { InvestmentAdvisorAgent } from '../agents/investment-advisor.agent';
import { SimulationAgent } from '../agents/simulation.agent';
import { FinancialGraphAgent } from '../agents/financial-graph.agent';
import { ActionExecutionAgent } from '../agents/action-execution.agent';
import { MonitoringAgent } from '../agents/monitoring.agent';

/**
 * AgentBootstrapService
 *
 * Registers all specialized agents with the AgentRegistry on module initialization.
 * Follows the same pattern as ToolBootstrapService for tool registration.
 */
@Injectable()
export class AgentBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AgentBootstrapService.name);

  constructor(
    private readonly agentRegistry: AgentRegistry,
    private readonly orchestratorAgent: OrchestratorAgent,
    private readonly financialPlanningAgent: FinancialPlanningAgent,
    private readonly riskAssessmentAgent: RiskAssessmentAgent,
    private readonly investmentAdvisorAgent: InvestmentAdvisorAgent,
    private readonly simulationAgent: SimulationAgent,
    private readonly financialGraphAgent: FinancialGraphAgent,
    private readonly actionExecutionAgent: ActionExecutionAgent,
    private readonly monitoringAgent: MonitoringAgent,
  ) {}

  async onModuleInit() {
    this.logger.log('Bootstrapping agent registry...');

    try {
      const agentMap = new Map([
        [AgentType.ORCHESTRATOR, this.orchestratorAgent],
        [AgentType.FINANCIAL_PLANNING, this.financialPlanningAgent],
        [AgentType.RISK_ASSESSMENT, this.riskAssessmentAgent],
        [AgentType.INVESTMENT_ADVISOR, this.investmentAdvisorAgent],
        [AgentType.SIMULATION, this.simulationAgent],
        [AgentType.FINANCIAL_GRAPH, this.financialGraphAgent],
        [AgentType.ACTION_EXECUTION, this.actionExecutionAgent],
        [AgentType.MONITORING_ALERTING, this.monitoringAgent],
      ]);

      this.agentRegistry.registerAgents(agentMap as any);

      this.logger.log(
        `Agent bootstrap complete — ${agentMap.size} agents registered: ${[...agentMap.keys()].join(', ')}`,
      );
    } catch (error) {
      this.logger.error('Agent bootstrap failed', error.stack);
      throw error;
    }
  }
}
