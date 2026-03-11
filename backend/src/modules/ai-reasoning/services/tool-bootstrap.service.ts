import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ToolRegistry } from "../services/tool-registry.service";
import {
  calculateEMITool,
  calculateSavingsRateTool,
  calculateReturnsTool,
  runMonteCarloSimulationTool,
} from "../tools";
import { createQueryFinancialGraphTool } from "../tools/query-financial-graph.tool";
import { createGenerateLLMResponseTool } from "../tools/generate-llm-response.tool";
import { LLMService } from "../../../core/integrations/llm/llm.service";
import { Neo4jService } from "../../../core/database/neo4j/neo4j.service";

/**
 * Tool Bootstrap Service
 * Registers all financial tools with the ToolRegistry on module initialization.
 */
@Injectable()
export class ToolBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(ToolBootstrapService.name);

  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly llmService: LLMService,
    private readonly neo4jService: Neo4jService,
  ) {}

  async onModuleInit() {
    this.logger.log("Bootstrapping financial calculation tools...");

    try {
      this.toolRegistry.registerTool(calculateEMITool);
      this.logger.log("✓ Registered: calculate_emi");

      this.toolRegistry.registerTool(calculateSavingsRateTool);
      this.logger.log("✓ Registered: calculate_savings_rate");

      this.toolRegistry.registerTool(calculateReturnsTool);
      this.logger.log("✓ Registered: calculate_returns");

      this.toolRegistry.registerTool(runMonteCarloSimulationTool);
      this.logger.log("✓ Registered: run_monte_carlo_simulation");

      // Wire real Neo4j service into graph query tool
      this.toolRegistry.registerTool(
        createQueryFinancialGraphTool(this.neo4jService),
      );
      this.logger.log("✓ Registered: query_financial_graph (Neo4j-backed)");

      // Wire real LLM service into generation tool
      this.toolRegistry.registerTool(
        createGenerateLLMResponseTool(this.llmService),
      );
      this.logger.log("✓ Registered: generate_llm_response (Ollama-backed)");

      this.logger.log("Tool bootstrap complete — 6 tools registered");
    } catch (error) {
      this.logger.error("Tool bootstrap failed", error.stack);
      throw error;
    }
  }

  getRegisteredTools(): string[] {
    return [
      "calculate_emi",
      "calculate_savings_rate",
      "calculate_returns",
      "run_monte_carlo_simulation",
      "query_financial_graph",
      "generate_llm_response",
    ];
  }
}
