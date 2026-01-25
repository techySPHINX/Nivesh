import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ToolRegistry } from '../services/tool-registry.service';
import {
  calculateEMITool,
  calculateSavingsRateTool,
  calculateReturnsTool,
  runMonteCarloSimulationTool,
  queryFinancialGraphTool,
  generateLLMResponseTool,
} from '../tools';

/**
 * Tool Bootstrap Service
 * Registers all financial tools with the ToolRegistry on module initialization.
 *
 * Tools Registered:
 * 1. calculate_emi - Loan EMI calculation with amortization
 * 2. calculate_savings_rate - Monthly savings for goals
 * 3. calculate_returns - Investment return projections
 * 4. run_monte_carlo_simulation - Probabilistic outcome modeling
 * 5. query_financial_graph - Neo4j graph queries
 * 6. generate_llm_response - Gemini AI integration
 *
 * This service ensures all tools are available when agents start executing.
 *
 * @Injectable
 */
@Injectable()
export class ToolBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(ToolBootstrapService.name);

  constructor(private readonly toolRegistry: ToolRegistry) {}

  /**
   * Called when the module is initialized
   * Registers all tools with the ToolRegistry
   */
  async onModuleInit() {
    this.logger.log('Bootstrapping financial calculation tools...');

    try {
      // Register all tools
      this.toolRegistry.registerTool(calculateEMITool);
      this.logger.log('✓ Registered: calculate_emi');

      this.toolRegistry.registerTool(calculateSavingsRateTool);
      this.logger.log('✓ Registered: calculate_savings_rate');

      this.toolRegistry.registerTool(calculateReturnsTool);
      this.logger.log('✓ Registered: calculate_returns');

      this.toolRegistry.registerTool(runMonteCarloSimulationTool);
      this.logger.log('✓ Registered: run_monte_carlo_simulation');

      this.toolRegistry.registerTool(queryFinancialGraphTool);
      this.logger.log('✓ Registered: query_financial_graph');

      this.toolRegistry.registerTool(generateLLMResponseTool);
      this.logger.log('✓ Registered: generate_llm_response');

      this.logger.log('Tool bootstrap complete - 6 tools registered');
    } catch (error) {
      this.logger.error('Tool bootstrap failed', error.stack);
      throw error;
    }
  }

  /**
   * Get list of all registered tools
   */
  getRegisteredTools(): string[] {
    return [
      'calculate_emi',
      'calculate_savings_rate',
      'calculate_returns',
      'run_monte_carlo_simulation',
      'query_financial_graph',
      'generate_llm_response',
    ];
  }
}
