import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  AgentType,
  DecisionTrace,
  DecisionTraceStep,
} from '../types/agent.types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Agent Execution Log Interface
 * Represents a single agent execution record in the database
 */
interface AgentExecutionLog {
  id: string;
  traceId: string;
  agentType: string;
  inputPayload: any;
  outputPayload: any | null;
  reasoning: string[];
  toolsUsed: string[];
  confidence: number | null;
  durationMs: number | null;
  success: boolean;
  errorMessage: string | null;
  createdAt: Date;
}

/**
 * DecisionTraceService
 * Centralized service for logging and retrieving agent execution traces.
 *
 * Responsibilities:
 * - Create unique trace IDs for multi-agent workflows
 * - Log agent execution starts, completions, and errors
 * - Log reasoning steps for transparency
 * - Retrieve complete execution traces for debugging
 * - Provide analytics on agent performance
 *
 * Database Schema:
 * - agent_executions: Stores each agent execution step
 * - Includes traceId for correlating multi-agent workflows
 *
 * Design Pattern: Repository Pattern
 * - Abstracts database operations behind service interface
 * - Allows easy testing with mocked PrismaService
 *
 * @Injectable
 */
@Injectable()
export class DecisionTraceService {
  private readonly logger = new Logger(DecisionTraceService.name);

  constructor(private readonly prisma: PrismaService) {
    this.logger.log('DecisionTraceService initialized');
  }

  /**
   * Generate a new unique trace ID
   * Used to track multi-agent workflows from start to finish
   *
   * @returns UUID v4 trace ID
   *
   * @example
   * ```typescript
   * const traceId = decisionTraceService.generateTraceId();
   * // Returns: '550e8400-e29b-41d4-a716-446655440000'
   * ```
   */
  generateTraceId(): string {
    return uuidv4();
  }

  /**
   * Log the start of an agent execution
   * Records input payload and timestamp
   *
   * @param traceId - Trace ID for this workflow
   * @param data - Agent execution start data
   * @returns Promise resolving when logged
   *
   * @example
   * ```typescript
   * await decisionTraceService.logAgentExecution(traceId, {
   *   agent: AgentType.FINANCIAL_PLANNING,
   *   input: {
   *     task: 'create_savings_plan',
   *     context: { userId: '123', goal: {...} }
   *   }
   * });
   * ```
   */
  async logAgentExecution(
    traceId: string,
    data: {
      agent: AgentType;
      input: any;
    },
  ): Promise<void> {
    try {
      await this.prisma.agentExecution.create({
        data: {
          id: uuidv4(),
          traceId,
          agentType: data.agent,
          inputPayload: data.input,
          success: false, // Will be updated when result is logged
          reasoning: [],
          toolsUsed: [],
        },
      });

      this.logger.debug(
        `Logged execution start for agent ${data.agent} (trace: ${traceId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to log agent execution: ${error.message}`,
        error.stack,
      );
      // Don't throw - logging failures shouldn't break agent execution
    }
  }

  /**
   * Log the completion of an agent execution
   * Updates the execution record with output and metrics
   *
   * @param traceId - Trace ID for this workflow
   * @param data - Agent execution result data
   * @returns Promise resolving when logged
   *
   * @example
   * ```typescript
   * await decisionTraceService.logAgentResult(traceId, {
   *   agent: AgentType.FINANCIAL_PLANNING,
   *   output: {
   *     success: true,
   *     result: { plan: {...}, monthlySavings: 83333 },
   *     reasoning: ['Step 1...', 'Step 2...'],
   *     confidence: 0.85,
   *     toolsUsed: ['calculate_savings_rate']
   *   }
   * });
   * ```
   */
  async logAgentResult(
    traceId: string,
    data: {
      agent: AgentType;
      output: any;
      duration?: number;
    },
  ): Promise<void> {
    try {
      // Find the most recent execution for this agent in this trace
      const execution = await this.prisma.agentExecution.findFirst({
        where: {
          traceId,
          agentType: data.agent,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!execution) {
        this.logger.warn(
          `No execution found for agent ${data.agent} in trace ${traceId}`,
        );
        return;
      }

      // Update with result
      await this.prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          outputPayload: data.output.result,
          success: data.output.success,
          reasoning: data.output.reasoning || [],
          toolsUsed: data.output.toolsUsed || [],
          confidence: data.output.confidence,
          durationMs: data.duration,
          errorMessage: data.output.error?.message || null,
        },
      });

      this.logger.debug(
        `Logged result for agent ${data.agent} (trace: ${traceId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to log agent result: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Log an error that occurred during agent execution
   *
   * @param traceId - Trace ID for this workflow
   * @param data - Error data
   * @returns Promise resolving when logged
   *
   * @example
   * ```typescript
   * await decisionTraceService.logError(traceId, {
   *   agent: AgentType.SIMULATION,
   *   error: 'Tool execution timeout',
   *   tool: 'run_monte_carlo_simulation'
   * });
   * ```
   */
  async logError(
    traceId: string,
    data: {
      agent: AgentType;
      error: string;
      tool?: string;
      args?: any;
    },
  ): Promise<void> {
    try {
      // Find the most recent execution for this agent
      const execution = await this.prisma.agentExecution.findFirst({
        where: {
          traceId,
          agentType: data.agent,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (execution) {
        await this.prisma.agentExecution.update({
          where: { id: execution.id },
          data: {
            success: false,
            errorMessage: data.error,
          },
        });
      } else {
        // Create new error record if no execution found
        await this.prisma.agentExecution.create({
          data: {
            id: uuidv4(),
            traceId,
            agentType: data.agent,
            inputPayload: data.args || {},
            success: false,
            errorMessage: data.error,
            reasoning: [],
            toolsUsed: data.tool ? [data.tool] : [],
          },
        });
      }

      this.logger.debug(
        `Logged error for agent ${data.agent} (trace: ${traceId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to log agent error: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Log a reasoning step for an agent
   * Appends to the reasoning array in the execution record
   *
   * @param traceId - Trace ID for this workflow
   * @param data - Reasoning step data
   * @returns Promise resolving when logged
   */
  async logReasoning(
    traceId: string,
    data: {
      agent: AgentType;
      step: string;
      timestamp: Date;
    },
  ): Promise<void> {
    try {
      const execution = await this.prisma.agentExecution.findFirst({
        where: {
          traceId,
          agentType: data.agent,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (execution) {
        const updatedReasoning = [...execution.reasoning, data.step];

        await this.prisma.agentExecution.update({
          where: { id: execution.id },
          data: {
            reasoning: updatedReasoning,
          },
        });

        this.logger.debug(`Logged reasoning step for agent ${data.agent}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to log reasoning: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Retrieve complete execution trace for a workflow
   * Returns all agent executions in chronological order
   *
   * @param traceId - Trace ID to retrieve
   * @returns Promise resolving to decision trace with all steps
   *
   * @example
   * ```typescript
   * const trace = await decisionTraceService.getTrace(traceId);
   * console.log(`Total duration: ${trace.totalDuration}ms`);
   * console.log(`Success: ${trace.success}`);
   * trace.steps.forEach(step => {
   *   console.log(`${step.agent}: ${step.duration}ms`);
   * });
   * ```
   */
  async getTrace(traceId: string): Promise<DecisionTrace | null> {
    try {
      const executions = await this.prisma.agentExecution.findMany({
        where: { traceId },
        orderBy: { createdAt: 'asc' },
      });

      if (executions.length === 0) {
        this.logger.warn(`No executions found for trace: ${traceId}`);
        return null;
      }

      // Convert database records to DecisionTraceStep format
      const steps: DecisionTraceStep[] = executions.map((exec) => ({
        agent: exec.agentType as AgentType,
        input: exec.inputPayload,
        output: exec.outputPayload,
        reasoning: exec.reasoning,
        toolsUsed: exec.toolsUsed,
        duration: exec.durationMs || 0,
        timestamp: exec.createdAt,
        error: exec.errorMessage || undefined,
      }));

      const totalDuration = steps.reduce(
        (sum, step) => sum + step.duration,
        0,
      );
      const success = executions.every((exec) => exec.success);
      const lastExecution = executions[executions.length - 1];

      const trace: DecisionTrace = {
        traceId,
        userId: '', // Will be populated from context if available
        query: '', // Will be populated from context if available
        steps,
        finalResult: lastExecution.outputPayload,
        totalDuration,
        success,
        createdAt: executions[0].createdAt,
      };

      this.logger.debug(`Retrieved trace ${traceId} with ${steps.length} steps`);

      return trace;
    } catch (error) {
      this.logger.error(`Failed to get trace: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get recent traces for a user
   * Useful for debugging or showing execution history
   *
   * @param userId - User ID to filter by
   * @param limit - Maximum number of traces to return
   * @returns Promise resolving to array of trace IDs
   */
  async getRecentTraces(
    userId: string,
    limit: number = 10,
  ): Promise<string[]> {
    try {
      const executions = await this.prisma.agentExecution.findMany({
        where: {
          inputPayload: {
            path: ['context', 'userId'],
            equals: userId,
          },
        },
        select: { traceId: true },
        distinct: ['traceId'],
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return executions.map((exec) => exec.traceId);
    } catch (error) {
      this.logger.error(
        `Failed to get recent traces: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Get agent performance metrics
   * Aggregates statistics for a specific agent type
   *
   * @param agentType - Agent type to analyze
   * @returns Promise resolving to performance metrics
   */
  async getAgentMetrics(agentType: AgentType): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    averageConfidence: number;
    averageDuration: number;
  }> {
    try {
      const executions = await this.prisma.agentExecution.findMany({
        where: { agentType },
      });

      const totalExecutions = executions.length;
      const successfulExecutions = executions.filter(
        (exec) => exec.success,
      ).length;

      const confidences = executions
        .filter((exec) => exec.confidence !== null)
        .map((exec) => exec.confidence as number);

      const durations = executions
        .filter((exec) => exec.durationMs !== null)
        .map((exec) => exec.durationMs as number);

      const averageConfidence =
        confidences.length > 0
          ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
          : 0;

      const averageDuration =
        durations.length > 0
          ? durations.reduce((sum, d) => sum + d, 0) / durations.length
          : 0;

      return {
        totalExecutions,
        successfulExecutions,
        averageConfidence,
        averageDuration,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get agent metrics: ${error.message}`,
        error.stack,
      );

      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        averageConfidence: 0,
        averageDuration: 0,
      };
    }
  }

  /**
   * Delete old traces (cleanup operation)
   * Removes traces older than specified days
   *
   * @param daysOld - Delete traces older than this many days
   * @returns Promise resolving to number of deleted records
   */
  async deleteOldTraces(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.prisma.agentExecution.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.log(
        `Deleted ${result.count} agent execution records older than ${daysOld} days`,
      );

      return result.count;
    } catch (error) {
      this.logger.error(
        `Failed to delete old traces: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }
}
