import { Injectable, Logger } from '@nestjs/common';
import Ajv, { ValidateFunction } from 'ajv';
import {
  Tool,
  ToolMetadata,
  ToolNotFoundError,
  ToolExecutionError,
  ToolTimeoutError,
  ToolValidationError,
} from '../types/agent.types';

/**
 * ToolRegistry Service
 * Central registry for all tools (functions) that agents can invoke.
 *
 * Responsibilities:
 * - Register and manage available tools
 * - Validate tool arguments against JSON schemas using AJV
 * - Execute tools with timeout protection
 * - Implement retry logic with exponential backoff
 * - Provide tool metadata for agent discovery
 *
 * Design Pattern: Registry Pattern
 * - Tools are registered once at startup
 * - Agents query the registry to execute tools by name
 *
 * Error Handling Strategy:
 * - Validation errors: Fail immediately with clear error messages
 * - Execution errors: Retry with exponential backoff (3 attempts)
 * - Timeout errors: Cancel execution and throw timeout error
 *
 * @Injectable
 */
@Injectable()
export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name);
  private readonly tools: Map<string, Tool> = new Map();
  private readonly validators: Map<string, ValidateFunction> = new Map();
  private readonly ajv: Ajv;

  // Configuration constants
  private readonly DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly BASE_RETRY_DELAY_MS = 1000; // 1 second

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      strict: false,
      coerceTypes: true, // Automatically coerce types when possible
    });

    this.logger.log('ToolRegistry initialized');
  }

  /**
   * Register a new tool in the registry
   * Compiles JSON schema for validation on registration
   *
   * @param tool - Tool definition with name, description, schema, and handler
   * @throws Error if tool with same name already exists
   *
   * @example
   * ```typescript
   * toolRegistry.registerTool({
   *   name: 'calculate_emi',
   *   description: 'Calculate EMI for a loan',
   *   schema: {
   *     type: 'object',
   *     properties: {
   *       principal: { type: 'number' },
   *       rate: { type: 'number' },
   *       tenure: { type: 'number' }
   *     },
   *     required: ['principal', 'rate', 'tenure']
   *   },
   *   handler: async (args) => calculateEMI(args)
   * });
   * ```
   */
  registerTool(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(
        `Tool '${tool.name}' is already registered. Use a unique name.`,
      );
    }

    // Compile schema for efficient validation
    const validator = this.ajv.compile(tool.schema);
    this.validators.set(tool.name, validator);

    this.tools.set(tool.name, tool);
    this.logger.log(`Registered tool: ${tool.name}`);
  }

  /**
   * Register multiple tools at once
   * Convenience method for bulk registration
   *
   * @param tools - Array of tool definitions
   */
  registerTools(tools: Tool[]): void {
    tools.forEach((tool) => this.registerTool(tool));
    this.logger.log(`Registered ${tools.length} tools`);
  }

  /**
   * Execute a tool by name with validation, timeout, and retry logic
   *
   * Execution Flow:
   * 1. Validate tool exists
   * 2. Validate arguments against schema
   * 3. Execute with timeout protection
   * 4. Retry on failure (up to MAX_RETRY_ATTEMPTS)
   * 5. Return result or throw error
   *
   * @param toolName - Name of the tool to execute
   * @param args - Arguments to pass to the tool
   * @returns Promise resolving to tool execution result
   * @throws ToolNotFoundError if tool doesn't exist
   * @throws ToolValidationError if arguments invalid
   * @throws ToolTimeoutError if execution exceeds timeout
   * @throws ToolExecutionError if all retry attempts fail
   */
  async execute(toolName: string, args: any): Promise<any> {
    this.logger.debug(
      `Executing tool: ${toolName} with args: ${JSON.stringify(args)}`,
    );

    // 1. Check tool exists
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new ToolNotFoundError(toolName);
    }

    // 2. Validate arguments
    this.validateArguments(toolName, args);

    // 3. Execute with retry logic
    return this.executeWithRetry(tool, args);
  }

  /**
   * Validate tool arguments against compiled JSON schema
   *
   * @param toolName - Name of the tool
   * @param args - Arguments to validate
   * @throws ToolValidationError if validation fails
   * @private
   */
  private validateArguments(toolName: string, args: any): void {
    const validator = this.validators.get(toolName);
    if (!validator) {
      throw new Error(`Validator not found for tool: ${toolName}`);
    }

    const valid = validator(args);

    if (!valid) {
      const errors = validator.errors || [];
      this.logger.error(
        `Validation failed for tool ${toolName}: ${JSON.stringify(errors)}`,
      );

      throw new ToolValidationError(toolName, errors);
    }

    this.logger.debug(`Arguments validated successfully for tool: ${toolName}`);
  }

  /**
   * Execute tool with retry logic and exponential backoff
   *
   * Retry Strategy:
   * - Attempt 1: Immediate execution
   * - Attempt 2: Wait 1 second (2^1 * 1000ms)
   * - Attempt 3: Wait 2 seconds (2^2 * 1000ms)
   *
   * @param tool - Tool to execute
   * @param args - Validated arguments
   * @returns Promise resolving to execution result
   * @throws ToolExecutionError after all retries exhausted
   * @private
   */
  private async executeWithRetry(tool: Tool, args: any): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        this.logger.debug(
          `Attempt ${attempt}/${this.MAX_RETRY_ATTEMPTS} for tool: ${tool.name}`,
        );

        // Execute with timeout protection
        const result = await this.executeWithTimeout(tool, args);

        this.logger.log(
          `Tool ${tool.name} executed successfully on attempt ${attempt}`,
        );

        return result;
      } catch (error) {
        lastError = error;

        this.logger.warn(
          `Tool ${tool.name} failed on attempt ${attempt}: ${error.message}`,
        );

        // Don't retry validation errors or timeouts
        if (
          error instanceof ToolValidationError ||
          error instanceof ToolTimeoutError
        ) {
          throw error;
        }

        // If more attempts remain, wait before retrying
        if (attempt < this.MAX_RETRY_ATTEMPTS) {
          const delay = Math.pow(2, attempt) * this.BASE_RETRY_DELAY_MS;
          this.logger.debug(`Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    throw new ToolExecutionError(
      `Tool '${tool.name}' failed after ${this.MAX_RETRY_ATTEMPTS} attempts: ${lastError?.message}`,
      tool.name,
      lastError,
    );
  }

  /**
   * Execute tool with timeout protection
   * Uses Promise.race to cancel long-running operations
   *
   * @param tool - Tool to execute
   * @param args - Arguments
   * @returns Promise resolving to result
   * @throws ToolTimeoutError if execution exceeds timeout
   * @private
   */
  private async executeWithTimeout(tool: Tool, args: any): Promise<any> {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new ToolTimeoutError(tool.name, this.DEFAULT_TIMEOUT_MS));
      }, this.DEFAULT_TIMEOUT_MS);
    });

    try {
      const result = await Promise.race([tool.handler(args), timeoutPromise]);
      return result;
    } catch (error) {
      if (error instanceof ToolTimeoutError) {
        this.logger.error(
          `Tool ${tool.name} timed out after ${this.DEFAULT_TIMEOUT_MS}ms`,
        );
      }
      throw error;
    }
  }

  /**
   * Utility: Sleep for specified milliseconds
   * @param ms - Milliseconds to sleep
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get metadata for a specific tool
   * @param toolName - Name of the tool
   * @returns Tool metadata (without handler function)
   * @throws ToolNotFoundError if tool doesn't exist
   */
  getToolMetadata(toolName: string): ToolMetadata {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new ToolNotFoundError(toolName);
    }

    return {
      name: tool.name,
      description: tool.description,
      schema: tool.schema,
    };
  }

  /**
   * List all registered tools
   * Returns metadata for all tools (useful for agent discovery)
   *
   * @returns Array of tool metadata
   */
  listTools(): ToolMetadata[] {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      schema: tool.schema,
    }));
  }

  /**
   * Check if a tool exists in the registry
   * @param toolName - Name to check
   * @returns true if tool exists
   */
  hasTool(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * Unregister a tool (for testing or dynamic management)
   * @param toolName - Name of tool to remove
   * @returns true if tool was removed
   */
  unregisterTool(toolName: string): boolean {
    const removed = this.tools.delete(toolName);
    if (removed) {
      this.validators.delete(toolName);
      this.logger.log(`Unregistered tool: ${toolName}`);
    }
    return removed;
  }

  /**
   * Get total count of registered tools
   * @returns Number of tools
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Clear all registered tools (primarily for testing)
   * ⚠️ Use with caution in production
   */
  clearAll(): void {
    this.tools.clear();
    this.validators.clear();
    this.logger.warn('All tools cleared from registry');
  }
}
