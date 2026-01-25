import { Logger } from '@nestjs/common';
import {
  AgentMessage,
  AgentResponse,
  AgentType,
  AgentExecutionError,
} from '../types/agent.types';
import { ToolRegistry } from '../services/tool-registry.service';
import { DecisionTraceService } from '../services/decision-trace.service';

/**
 * BaseAgent Abstract Class
 * Foundation for all specialized agents in the multi-agent orchestration system.
 *
 * Responsibilities:
 * - Define contract for agent execution (execute method)
 * - Provide tool calling capability with error handling
 * - Enable decision reasoning tracing
 * - Implement standardized error handling with retry logic
 *
 * Design Pattern: Template Method Pattern
 * - execute() is the abstract method each agent must implement
 * - Protected helper methods provide common functionality
 *
 * @abstract
 */
export abstract class BaseAgent {
  protected readonly logger: Logger;
  protected readonly agentId: string;
  protected readonly agentType: AgentType;

  /**
   * Constructor
   * @param agentType - The type of agent (from AgentType enum)
   * @param toolRegistry - Injected tool registry for function calling
   * @param decisionTraceService - Injected service for logging decisions
   */
  constructor(
    agentType: AgentType,
    protected readonly toolRegistry: ToolRegistry,
    protected readonly decisionTraceService: DecisionTraceService,
  ) {
    this.agentType = agentType;
    this.agentId = `${agentType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Execute the agent's primary task
   * Each specialized agent must implement this method with its specific logic
   *
   * @param message - Incoming agent message containing task and context
   * @returns Promise resolving to structured agent response
   * @throws AgentExecutionError if execution fails critically
   * @abstract
   */
  abstract execute(message: AgentMessage): Promise<AgentResponse>;

  /**
   * Call a registered tool by name with arguments
   * Includes automatic error handling and logging
   *
   * @param toolName - Name of the tool to execute
   * @param args - Arguments to pass to the tool (must match tool schema)
   * @param traceId - Optional trace ID for decision logging
   * @returns Promise resolving to tool execution result
   * @throws ToolExecutionError if tool fails after retries
   * @protected
   *
   * @example
   * ```typescript
   * const savingsRate = await this.callTool('calculate_savings_rate', {
   *   targetAmount: 5000000,
   *   currentSavings: 100000,
   *   timelineYears: 5,
   *   expectedReturns: 0.12
   * });
   * ```
   */
  protected async callTool(
    toolName: string,
    args: any,
    traceId?: string,
  ): Promise<any> {
    this.logger.debug(
      `Agent ${this.agentType} calling tool: ${toolName} with args: ${JSON.stringify(args)}`,
    );

    try {
      const result = await this.toolRegistry.execute(toolName, args);

      this.logger.debug(
        `Tool ${toolName} executed successfully: ${JSON.stringify(result)}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Tool ${toolName} execution failed: ${error.message}`,
        error.stack,
      );

      // Log error to decision trace if traceId provided
      if (traceId) {
        await this.decisionTraceService.logError(traceId, {
          agent: this.agentType,
          tool: toolName,
          error: error.message,
          args,
        });
      }

      throw error;
    }
  }

  /**
   * Record a reasoning step for transparency and observability
   * Logs the agent's decision-making process for later analysis
   *
   * @param step - Human-readable description of the reasoning step
   * @param traceId - Optional trace ID for persistent logging
   * @protected
   *
   * @example
   * ```typescript
   * await this.recordReasoning(
   *   'Calculated monthly savings required: ₹83,333',
   *   traceId
   * );
   * await this.recordReasoning(
   *   'Savings rate is 41.67% of income - within feasible limit',
   *   traceId
   * );
   * ```
   */
  protected async recordReasoning(
    step: string,
    traceId?: string,
  ): Promise<void> {
    this.logger.log(`[REASONING] ${this.agentType}: ${step}`);

    if (traceId) {
      await this.decisionTraceService.logReasoning(traceId, {
        agent: this.agentType,
        step,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Handle errors with structured error responses
   * Implements graceful degradation and provides actionable error information
   *
   * @param error - The error that occurred
   * @param context - Additional context about what was being attempted
   * @returns AgentResponse with error details and suggested recovery actions
   * @protected
   *
   * Error Handling Strategy:
   * 1. Log error with full stack trace
   * 2. Determine if error is recoverable
   * 3. Provide helpful error message and recovery suggestions
   * 4. Return structured response (not throwing exception)
   */
  protected async handleError(
    error: Error,
    context: Record<string, any>,
  ): Promise<AgentResponse> {
    this.logger.error(
      `Agent ${this.agentType} encountered error: ${error.message}`,
      error.stack,
    );

    // Determine error type and severity
    const isRecoverable = this.isRecoverableError(error);
    const errorCode = this.getErrorCode(error);

    return {
      success: false,
      result: null,
      reasoning: [
        `Agent ${this.agentType} encountered an error during execution`,
        `Error type: ${errorCode}`,
        `Recoverable: ${isRecoverable ? 'Yes' : 'No'}`,
        `Context: ${JSON.stringify(context)}`,
      ],
      confidence: 0,
      toolsUsed: [],
      error: {
        code: errorCode,
        message: error.message,
        details: {
          agentType: this.agentType,
          context,
          isRecoverable,
          stack: error.stack,
        },
      },
      nextActions: isRecoverable
        ? this.suggestRecoveryActions(error, context)
        : ['Contact system administrator', 'Review error logs'],
    };
  }

  /**
   * Determine if an error is recoverable
   * @param error - The error to evaluate
   * @returns true if error can potentially be recovered from
   * @private
   */
  private isRecoverableError(error: Error): boolean {
    // Network errors, timeouts, and temporary failures are recoverable
    const recoverableErrors = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ToolTimeoutError',
      'ValidationError',
    ];

    return recoverableErrors.some((type) => error.message.includes(type));
  }

  /**
   * Get standardized error code from error
   * @param error - The error to classify
   * @returns Error code string
   * @private
   */
  private getErrorCode(error: Error): string {
    if (error.name === 'ToolExecutionError') return 'TOOL_EXECUTION_FAILED';
    if (error.name === 'ToolNotFoundError') return 'TOOL_NOT_FOUND';
    if (error.name === 'ToolTimeoutError') return 'TOOL_TIMEOUT';
    if (error.name === 'ToolValidationError') return 'INVALID_ARGUMENTS';
    if (error.name === 'AgentExecutionError') return 'AGENT_EXECUTION_FAILED';

    return 'UNKNOWN_ERROR';
  }

  /**
   * Suggest recovery actions based on error type
   * @param error - The error that occurred
   * @param context - Execution context
   * @returns Array of suggested recovery actions
   * @private
   */
  private suggestRecoveryActions(
    error: Error,
    context: Record<string, any>,
  ): string[] {
    const actions: string[] = [];

    if (error.name === 'ToolTimeoutError') {
      actions.push('Retry with increased timeout');
      actions.push('Check external service availability');
    }

    if (error.name === 'ToolValidationError') {
      actions.push('Verify input arguments match tool schema');
      actions.push('Check for missing required fields');
    }

    if (error.message.includes('ECONNREFUSED')) {
      actions.push('Verify service is running');
      actions.push('Check network connectivity');
    }

    if (actions.length === 0) {
      actions.push('Retry operation');
      actions.push('Review agent configuration');
    }

    return actions;
  }

  /**
   * Create a success response with standard formatting
   * Helper method to ensure consistent response structure
   *
   * @param result - The successful result data
   * @param reasoning - Array of reasoning steps
   * @param toolsUsed - Array of tool names used
   * @param confidence - Confidence score (0-1)
   * @param nextActions - Optional next action suggestions
   * @returns Formatted AgentResponse
   * @protected
   */
  protected createSuccessResponse(
    result: any,
    reasoning: string[],
    toolsUsed: string[],
    confidence: number,
    nextActions?: string[],
  ): AgentResponse {
    return {
      success: true,
      result,
      reasoning,
      confidence: Math.min(1, Math.max(0, confidence)), // Clamp to [0,1]
      toolsUsed,
      nextActions,
    };
  }

  /**
   * Get agent metadata
   * @returns Agent type and ID
   */
  getMetadata(): { type: AgentType; id: string } {
    return {
      type: this.agentType,
      id: this.agentId,
    };
  }
}
