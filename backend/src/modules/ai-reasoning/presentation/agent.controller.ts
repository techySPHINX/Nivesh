import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AgentRequestDto, AgentFeedbackDto } from './dto/agent.dto';
import { OrchestratorAgent } from '../agents/orchestrator.agent';
import { DecisionTraceService } from '../services/decision-trace.service';
import { AgentMemoryService } from '../services/agent-memory.service';
import { AgentLearningService } from '../services/agent-learning.service';

/**
 * Agent Orchestration Controller
 * 
 * Provides API endpoints for multi-agent system:
 * - POST /orchestrate: Execute agent workflows
 * - GET /trace/:traceId: Retrieve decision traces
 * - POST /feedback/:traceId: Submit user feedback
 * - GET /performance: Get agent performance metrics
 * - GET /insights: Generate learning insights
 * 
 * Example:
 * POST /api/v1/agents/orchestrate
 * {
 *   "query": "I want to save ₹50 lakhs for my child's education in 10 years",
 *   "userContext": {
 *     "userId": "user123",
 *     "riskTolerance": "moderate",
 *     "investmentStyle": "balanced"
 *   }
 * }
 * 
 * Response:
 * {
 *   "traceId": "trace_abc123",
 *   "executionPlan": [...],
 *   "result": {
 *     "summary": "Based on your goal...",
 *     "recommendations": [...],
 *     "monthlySavingsRequired": 32500
 *   },
 *   "confidence": 0.85
 * }
 */
@ApiTags('AI Agents')
@Controller('agents')
// @ApiBearerAuth() // Uncomment when auth is implemented
export class AgentController {
  private readonly logger = new Logger(AgentController.name);

  constructor(
    private readonly orchestrator: OrchestratorAgent,
    private readonly decisionTrace: DecisionTraceService,
    private readonly memory: AgentMemoryService,
    private readonly learning: AgentLearningService,
  ) {}

  /**
   * Execute multi-agent orchestration
   */
  @Post('orchestrate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Execute multi-agent financial reasoning',
    description:
      'Processes user query through multi-agent system. Automatically selects and coordinates specialized agents based on query type.',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent orchestration completed successfully',
    schema: {
      type: 'object',
      properties: {
        traceId: { type: 'string', example: 'trace_abc123' },
        executionPlan: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              agentType: { type: 'string', example: 'financial_planning' },
              task: { type: 'string', example: 'Calculate savings rate' },
              estimatedDuration: { type: 'number', example: 2000 },
            },
          },
        },
        result: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            recommendations: { type: 'array', items: { type: 'object' } },
            data: { type: 'object' },
          },
        },
        confidence: { type: 'number', example: 0.85 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @ApiResponse({ status: 500, description: 'Agent execution failed' })
  async orchestrate(@Body() request: AgentRequestDto) {
    this.logger.log(`Orchestration request: ${request.query}`);

    try {
      // Store user message in memory
      const conversationId =
        request.conversationId || `conv_${Date.now()}_${request.userContext.userId}`;

      await this.memory.storeMessage(
        conversationId,
        request.userContext.userId,
        request.query,
      );

      // Execute orchestration
      const response = await this.orchestrator.execute({
        query: request.query,
        userContext: request.userContext,
        additionalContext: request.additionalContext,
      });

      // Store agent response in memory
      await this.memory.storeResponse(conversationId, {
        agentType: 'orchestrator',
        result: response.result,
        confidence: response.confidence || 0,
        timestamp: new Date(),
      });

      return {
        traceId: response.metadata?.traceId || 'unknown',
        conversationId,
        executionPlan: response.metadata?.executionPlan || [],
        result: response.result,
        confidence: response.confidence,
        reasoning: response.reasoning,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Orchestration failed', error.stack);
      throw error;
    }
  }

  /**
   * Get decision trace details
   */
  @Get('trace/:traceId')
  @ApiOperation({
    summary: 'Get decision trace details',
    description:
      'Retrieves complete execution trace for transparency and debugging.',
  })
  @ApiParam({ name: 'traceId', description: 'Trace ID from orchestration response' })
  @ApiResponse({
    status: 200,
    description: 'Decision trace retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        traceId: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed'] },
        executions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              agentType: { type: 'string' },
              inputPayload: { type: 'object' },
              outputPayload: { type: 'object' },
              reasoning: { type: 'array', items: { type: 'string' } },
              toolsUsed: { type: 'array', items: { type: 'string' } },
              confidence: { type: 'number' },
              durationMs: { type: 'number' },
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Trace not found' })
  async getTrace(@Param('traceId') traceId: string) {
    this.logger.log(`Fetching trace: ${traceId}`);

    try {
      const trace = await this.decisionTrace.getTrace(traceId);

      if (!trace) {
        return {
          error: 'Trace not found',
          traceId,
        };
      }

      return trace;
    } catch (error) {
      this.logger.error('Failed to fetch trace', error.stack);
      throw error;
    }
  }

  /**
   * Submit user feedback
   */
  @Post('feedback/:traceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit user feedback',
    description:
      'Collects user feedback on agent responses for continuous learning.',
  })
  @ApiParam({ name: 'traceId', description: 'Trace ID to provide feedback for' })
  @ApiResponse({
    status: 200,
    description: 'Feedback submitted successfully',
  })
  @ApiResponse({ status: 404, description: 'Trace not found' })
  async submitFeedback(
    @Param('traceId') traceId: string,
    @Body() feedback: AgentFeedbackDto,
  ) {
    this.logger.log(
      `Feedback received for trace ${traceId}: ${feedback.feedback}`,
    );

    try {
      // Get trace to extract userId
      const trace = await this.decisionTrace.getTrace(traceId);

      if (!trace) {
        return {
          error: 'Trace not found',
          traceId,
        };
      }

      // Extract userId from first execution
      const userId =
        trace.executions?.[0]?.inputPayload?.userContext?.userId || 'unknown';

      // Record feedback
      await this.learning.recordFeedback({
        traceId,
        userId,
        feedback: feedback.feedback,
        rating: feedback.rating || 0,
        comment: feedback.comment,
        timestamp: new Date(),
      });

      return {
        success: true,
        message: 'Feedback recorded successfully',
        traceId,
      };
    } catch (error) {
      this.logger.error('Failed to submit feedback', error.stack);
      throw error;
    }
  }

  /**
   * Get agent performance metrics
   */
  @Get('performance')
  @ApiOperation({
    summary: 'Get agent performance metrics',
    description: 'Retrieves performance metrics for all agents.',
  })
  @ApiResponse({
    status: 200,
    description: 'Performance metrics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        agents: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              agentType: { type: 'string' },
              totalExecutions: { type: 'number' },
              successRate: { type: 'number' },
              averageConfidence: { type: 'number' },
              averageDuration: { type: 'number' },
              positiveFeedbackRate: { type: 'number' },
              improvementScore: { type: 'number' },
            },
          },
        },
        agentWeights: { type: 'object' },
      },
    },
  })
  async getPerformance() {
    this.logger.log('Fetching agent performance metrics');

    try {
      const agentTypes = [
        'orchestrator',
        'financial_planning',
        'risk_assessment',
        'investment_advisor',
        'simulation',
        'financial_graph',
        'action_execution',
        'monitoring',
      ];

      const metrics = await Promise.all(
        agentTypes.map(async (agentType) => {
          const performance = await this.learning.getAgentPerformance(
            agentType as any,
          );
          return performance;
        }),
      );

      const agentWeights = this.learning.getAllAgentWeights();

      return {
        agents: metrics.filter((m) => m !== null),
        agentWeights,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to fetch performance metrics', error.stack);
      throw error;
    }
  }

  /**
   * Get learning insights
   */
  @Get('insights')
  @ApiOperation({
    summary: 'Get AI learning insights',
    description:
      'Generates insights from agent execution patterns and user behavior.',
  })
  @ApiResponse({
    status: 200,
    description: 'Insights generated successfully',
    schema: {
      type: 'object',
      properties: {
        patterns: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              pattern: { type: 'string' },
              frequency: { type: 'number' },
              successRate: { type: 'number' },
            },
          },
        },
        improvements: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              area: { type: 'string' },
              suggestion: { type: 'string' },
              impact: { type: 'string', enum: ['high', 'medium', 'low'] },
            },
          },
        },
        userBehavior: {
          type: 'object',
          properties: {
            preferredWorkflows: { type: 'array', items: { type: 'string' } },
            peakUsageHours: { type: 'array', items: { type: 'number' } },
            averageSessionDuration: { type: 'number' },
          },
        },
      },
    },
  })
  async getInsights() {
    this.logger.log('Generating learning insights');

    try {
      const insights = await this.learning.generateLearningInsights();

      return {
        ...insights,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to generate insights', error.stack);
      throw error;
    }
  }
}
