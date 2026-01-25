/**
 * Agent Type Enumeration
 * Defines all available agent types in the multi-agent orchestration system
 */
export enum AgentType {
  ORCHESTRATOR = "orchestrator",
  FINANCIAL_PLANNING = "financial_planning",
  RISK_ASSESSMENT = "risk_assessment",
  INVESTMENT_ADVISOR = "investment_advisor",
  SIMULATION = "simulation",
  FINANCIAL_GRAPH = "financial_graph",
  ACTION_EXECUTION = "action_execution",
  MONITORING_ALERTING = "monitoring_alerting",
}

/**
 * Agent Message Interface
 * Represents communication between agents following message-passing pattern
 *
 * @property id - Unique identifier for this message
 * @property from - Originating agent type
 * @property to - Target agent type(s) for routing
 * @property type - Message classification for handling logic
 * @property payload - Message content with task details and context
 * @property timestamp - When this message was created
 * @property parentMessageId - Optional reference to parent message for threading
 */
export interface AgentMessage {
  id: string;
  from: AgentType;
  to: AgentType[];
  type: "request" | "response" | "notification";
  payload: {
    task: string;
    context: Record<string, any>;
    constraints?: Record<string, any>;
  };
  timestamp: Date;
  parentMessageId?: string;
}

/**
 * Agent Response Interface
 * Standardized response format from any agent execution
 *
 * @property success - Whether the agent successfully completed its task
 * @property result - The actual output/data produced by the agent
 * @property reasoning - Step-by-step explanation of agent's decision process
 * @property confidence - Agent's confidence score (0-1) in its result
 * @property toolsUsed - List of tools/functions called during execution
 * @property nextActions - Optional suggestions for subsequent agent actions
 * @property error - Optional error details if execution failed
 */
export interface AgentResponse {
  success: boolean;
  result: any;
  reasoning: string[];
  confidence: number;
  toolsUsed: string[];
  nextActions?: string[];
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Tool Schema Interface
 * JSON Schema definition for validating tool arguments
 */
export interface ToolSchema {
  type: "object";
  properties: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
}

/**
 * Tool Interface
 * Defines a callable function/tool that agents can invoke
 *
 * @property name - Unique identifier for this tool
 * @property description - Human-readable explanation of tool's purpose
 * @property schema - JSON Schema for validating arguments
 * @property handler - Async function that executes the tool logic
 */
export interface Tool {
  name: string;
  description: string;
  schema: ToolSchema;
  handler: (args: any) => Promise<any>;
}

/**
 * Tool Metadata Interface
 * Lightweight tool information without the handler function
 */
export interface ToolMetadata {
  name: string;
  description: string;
  schema: ToolSchema;
}

/**
 * Execution Step Interface
 * Defines a single step in an agent execution plan
 *
 * @property stepId - Unique identifier for this execution step
 * @property agentType - The agent type to execute
 * @property task - Description of the task for this agent
 * @property dependencies - IDs of steps that must complete before this one
 * @property parallel - Whether this step can run concurrently with others
 * @property timeout - Maximum execution time in milliseconds
 * @property retryOnFailure - Whether to retry this step if it fails
 * @property maxRetries - Maximum number of retry attempts
 * @property condition - Optional condition that must be met to execute this step
 */
export interface ExecutionStep {
  stepId: string;
  agentType: AgentType;
  task: string;
  dependencies: string[];
  parallel: boolean;
  timeout?: number;
  retryOnFailure?: boolean;
  maxRetries?: number;
  condition?: (context: Record<string, any>) => boolean;
}

/**
 * Execution Plan Interface
 * Complete workflow definition for orchestrating multiple agents
 *
 * @property steps - Ordered list of execution steps
 * @property context - Initial context data for the workflow
 * @property metadata - Optional workflow metadata (name, version, etc.)
 */
export interface ExecutionPlan {
  steps: ExecutionStep[];
  context: Record<string, any>;
  metadata?: {
    name: string;
    version?: string;
    description?: string;
  };
}

/**
 * Agent Capability Interface
 * Describes what an agent can do
 */
export interface AgentCapability {
  name: string;
  description: string;
  requiredTools?: string[];
  estimatedDuration?: number; // in milliseconds
}

/**
 * Agent Metadata Interface
 * Comprehensive agent information
 */
export interface AgentMetadata {
  type: AgentType;
  name: string;
  description: string;
  capabilities: AgentCapability[];
  version: string;
}

/**
 * Decision Trace Step Interface
 * Records one step in agent execution for observability
 */
export interface DecisionTraceStep {
  agent: AgentType;
  input: any;
  output: any;
  reasoning: string[];
  toolsUsed: string[];
  duration: number; // milliseconds
  timestamp: Date;
  error?: string;
}

/**
 * Decision Trace Interface
 * Complete execution trace for a multi-agent workflow
 */
export interface DecisionTrace {
  traceId: string;
  userId: string;
  query: string;
  steps: DecisionTraceStep[];
  finalResult: any;
  totalDuration: number;
  success: boolean;
  createdAt: Date;
}

/**
 * Agent Execution Error
 * Custom error type for agent execution failures
 */
export class AgentExecutionError extends Error {
  constructor(
    message: string,
    public readonly agentType: AgentType,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = "AgentExecutionError";
    Object.setPrototypeOf(this, AgentExecutionError.prototype);
  }
}

/**
 * Tool Execution Error
 * Custom error type for tool execution failures
 */
export class ToolExecutionError extends Error {
  constructor(
    message: string,
    public readonly toolName: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = "ToolExecutionError";
    Object.setPrototypeOf(this, ToolExecutionError.prototype);
  }
}

/**
 * Tool Not Found Error
 * Thrown when attempting to use an unregistered tool
 */
export class ToolNotFoundError extends Error {
  constructor(public readonly toolName: string) {
    super(`Tool '${toolName}' not found in registry`);
    this.name = "ToolNotFoundError";
    Object.setPrototypeOf(this, ToolNotFoundError.prototype);
  }
}

/**
 * Tool Timeout Error
 * Thrown when tool execution exceeds time limit
 */
export class ToolTimeoutError extends Error {
  constructor(
    public readonly toolName: string,
    public readonly timeoutMs: number,
  ) {
    super(`Tool '${toolName}' timed out after ${timeoutMs}ms`);
    this.name = "ToolTimeoutError";
    Object.setPrototypeOf(this, ToolTimeoutError.prototype);
  }
}

/**
 * Tool Validation Error
 * Thrown when tool arguments fail schema validation
 */
export class ToolValidationError extends Error {
  constructor(
    public readonly toolName: string,
    public readonly validationErrors: any[],
  ) {
    super(
      `Tool '${toolName}' arguments failed validation: ${JSON.stringify(validationErrors)}`,
    );
    this.name = "ToolValidationError";
    Object.setPrototypeOf(this, ToolValidationError.prototype);
  }
}
