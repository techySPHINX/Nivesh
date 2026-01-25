import { Injectable, Logger } from '@nestjs/common';
import {
  AgentMessage,
  AgentResponse,
  AgentType,
} from '../types/agent.types';
import { BaseAgent } from '../agents/base.agent';

/**
 * AgentRegistry Service
 * Central registry for all agents in the multi-agent orchestration system.
 *
 * Responsibilities:
 * - Register and manage specialized agents
 * - Route messages to appropriate agents
 * - Support parallel and sequential agent execution
 * - Provide agent discovery and metadata
 *
 * Design Pattern: Registry Pattern + Mediator Pattern
 * - Agents register themselves on module initialization
 * - Registry mediates communication between agents
 * - Supports both direct agent calls and message-based routing
 *
 * @Injectable
 */
@Injectable()
export class AgentRegistry {
  private readonly logger = new Logger(AgentRegistry.name);
  private readonly agents: Map<AgentType, BaseAgent> = new Map();

  constructor() {
    this.logger.log('AgentRegistry initialized');
  }

  /**
   * Register an agent in the registry
   * Each agent type can only be registered once
   *
   * @param agentType - Type identifier for the agent
   * @param agent - Agent instance
   * @throws Error if agent type already registered
   *
   * @example
   * ```typescript
   * agentRegistry.registerAgent(
   *   AgentType.FINANCIAL_PLANNING,
   *   financialPlanningAgent
   * );
   * ```
   */
  registerAgent(agentType: AgentType, agent: BaseAgent): void {
    if (this.agents.has(agentType)) {
      throw new Error(
        `Agent type '${agentType}' is already registered. Each agent type must be unique.`,
      );
    }

    this.agents.set(agentType, agent);
    this.logger.log(`Registered agent: ${agentType}`);
  }

  /**
   * Register multiple agents at once
   * Convenience method for bulk registration
   *
   * @param agentMap - Map of agent types to agent instances
   */
  registerAgents(agentMap: Map<AgentType, BaseAgent>): void {
    agentMap.forEach((agent, type) => {
      this.registerAgent(type, agent);
    });
    this.logger.log(`Registered ${agentMap.size} agents`);
  }

  /**
   * Get an agent by type
   *
   * @param agentType - Type of agent to retrieve
   * @returns The requested agent instance
   * @throws Error if agent type not found
   *
   * @example
   * ```typescript
   * const planningAgent = agentRegistry.getAgent(AgentType.FINANCIAL_PLANNING);
   * const response = await planningAgent.execute(message);
   * ```
   */
  getAgent(agentType: AgentType): BaseAgent {
    const agent = this.agents.get(agentType);

    if (!agent) {
      const availableAgents = Array.from(this.agents.keys()).join(', ');
      throw new Error(
        `Agent type '${agentType}' not found. Available agents: ${availableAgents}`,
      );
    }

    return agent;
  }

  /**
   * Route a message to target agents and collect responses
   * Supports parallel execution when message targets multiple agents
   *
   * Execution Strategy:
   * - If message.to contains 1 agent: Execute directly
   * - If message.to contains multiple agents: Execute in parallel with Promise.all()
   * - Returns array of responses in same order as message.to
   *
   * @param message - Agent message containing routing information
   * @returns Promise resolving to array of agent responses
   * @throws Error if any target agent not found
   *
   * @example
   * ```typescript
   * const message: AgentMessage = {
   *   id: 'msg-123',
   *   from: AgentType.ORCHESTRATOR,
   *   to: [AgentType.RISK_ASSESSMENT, AgentType.INVESTMENT_ADVISOR],
   *   type: 'request',
   *   payload: {
   *     task: 'analyze_portfolio',
   *     context: { userId: '123' }
   *   },
   *   timestamp: new Date()
   * };
   *
   * const responses = await agentRegistry.routeMessage(message);
   * // Returns [riskResponse, investmentResponse]
   * ```
   */
  async routeMessage(message: AgentMessage): Promise<AgentResponse[]> {
    this.logger.debug(
      `Routing message ${message.id} from ${message.from} to ${message.to.join(', ')}`,
    );

    const recipients = message.to;

    if (recipients.length === 0) {
      this.logger.warn(`Message ${message.id} has no recipients`);
      return [];
    }

    try {
      // Execute agents in parallel
      const responses = await Promise.all(
        recipients.map(async (agentType) => {
          const agent = this.getAgent(agentType);

          this.logger.debug(
            `Executing agent ${agentType} for message ${message.id}`,
          );

          const startTime = Date.now();
          const response = await agent.execute(message);
          const duration = Date.now() - startTime;

          this.logger.log(
            `Agent ${agentType} completed in ${duration}ms for message ${message.id}`,
          );

          return response;
        }),
      );

      this.logger.log(
        `Message ${message.id} routed to ${recipients.length} agent(s) successfully`,
      );

      return responses;
    } catch (error) {
      this.logger.error(
        `Failed to route message ${message.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Execute a single agent directly (bypassing message routing)
   * Useful for orchestration when you need to call agents sequentially
   *
   * @param agentType - Type of agent to execute
   * @param message - Agent message
   * @returns Promise resolving to agent response
   *
   * @example
   * ```typescript
   * const response = await agentRegistry.executeAgent(
   *   AgentType.FINANCIAL_PLANNING,
   *   {
   *     id: 'msg-123',
   *     from: AgentType.ORCHESTRATOR,
   *     to: [AgentType.FINANCIAL_PLANNING],
   *     type: 'request',
   *     payload: { task: 'create_plan', context: {...} },
   *     timestamp: new Date()
   *   }
   * );
   * ```
   */
  async executeAgent(
    agentType: AgentType,
    message: AgentMessage,
  ): Promise<AgentResponse> {
    this.logger.debug(
      `Direct execution of agent ${agentType} for message ${message.id}`,
    );

    const agent = this.getAgent(agentType);

    const startTime = Date.now();
    const response = await agent.execute(message);
    const duration = Date.now() - startTime;

    this.logger.log(`Agent ${agentType} executed in ${duration}ms`);

    return response;
  }

  /**
   * Execute multiple agents in parallel
   * Helper method for concurrent agent execution
   *
   * @param agentTypes - Array of agent types to execute
   * @param message - Shared message for all agents
   * @returns Promise resolving to array of responses
   *
   * @example
   * ```typescript
   * // Execute risk and investment agents concurrently
   * const [riskResponse, investmentResponse] = await agentRegistry.executeParallel(
   *   [AgentType.RISK_ASSESSMENT, AgentType.INVESTMENT_ADVISOR],
   *   message
   * );
   * ```
   */
  async executeParallel(
    agentTypes: AgentType[],
    message: AgentMessage,
  ): Promise<AgentResponse[]> {
    this.logger.debug(
      `Parallel execution of ${agentTypes.length} agents: ${agentTypes.join(', ')}`,
    );

    const responses = await Promise.all(
      agentTypes.map((agentType) => this.executeAgent(agentType, message)),
    );

    return responses;
  }

  /**
   * Execute agents sequentially with context passing
   * Each agent receives results from previous agents in context
   *
   * @param agentTypes - Array of agent types in execution order
   * @param initialMessage - Starting message
   * @returns Promise resolving to array of all responses
   *
   * Context Enrichment:
   * - After each agent executes, its result is added to context
   * - Next agent receives enriched context: context[`${agentType}_result`] = response
   *
   * @example
   * ```typescript
   * const responses = await agentRegistry.executeSequential(
   *   [
   *     AgentType.FINANCIAL_PLANNING,
   *     AgentType.RISK_ASSESSMENT,
   *     AgentType.INVESTMENT_ADVISOR
   *   ],
   *   message
   * );
   * // Investment advisor sees results from planning and risk agents
   * ```
   */
  async executeSequential(
    agentTypes: AgentType[],
    initialMessage: AgentMessage,
  ): Promise<AgentResponse[]> {
    this.logger.debug(
      `Sequential execution of ${agentTypes.length} agents: ${agentTypes.join(' → ')}`,
    );

    const responses: AgentResponse[] = [];
    let currentContext = { ...initialMessage.payload.context };

    for (const agentType of agentTypes) {
      // Create message with enriched context
      const message: AgentMessage = {
        ...initialMessage,
        payload: {
          ...initialMessage.payload,
          context: currentContext,
        },
      };

      // Execute agent
      const response = await this.executeAgent(agentType, message);
      responses.push(response);

      // Enrich context with this agent's result
      currentContext = {
        ...currentContext,
        [`${agentType}_result`]: response.result,
        [`${agentType}_success`]: response.success,
      };

      this.logger.debug(
        `Agent ${agentType} completed. Context enriched with result.`,
      );
    }

    this.logger.log(
      `Sequential execution of ${agentTypes.length} agents completed`,
    );

    return responses;
  }

  /**
   * Check if an agent is registered
   * @param agentType - Agent type to check
   * @returns true if agent exists
   */
  hasAgent(agentType: AgentType): boolean {
    return this.agents.has(agentType);
  }

  /**
   * Get all registered agent types
   * @returns Array of agent types
   */
  getRegisteredAgentTypes(): AgentType[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Get count of registered agents
   * @returns Number of agents
   */
  getAgentCount(): number {
    return this.agents.size;
  }

  /**
   * Unregister an agent (for testing or dynamic management)
   * @param agentType - Type of agent to remove
   * @returns true if agent was removed
   */
  unregisterAgent(agentType: AgentType): boolean {
    const removed = this.agents.delete(agentType);
    if (removed) {
      this.logger.log(`Unregistered agent: ${agentType}`);
    }
    return removed;
  }

  /**
   * Clear all registered agents (primarily for testing)
   * ⚠️ Use with caution in production
   */
  clearAll(): void {
    this.agents.clear();
    this.logger.warn('All agents cleared from registry');
  }

  /**
   * Get agent metadata for all registered agents
   * Useful for API endpoints that list available agents
   *
   * @returns Array of agent metadata
   */
  getAllAgentMetadata(): Array<{ type: AgentType; id: string }> {
    return Array.from(this.agents.values()).map((agent) =>
      agent.getMetadata(),
    );
  }
}
