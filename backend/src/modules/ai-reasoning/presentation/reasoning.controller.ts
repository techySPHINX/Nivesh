import { Controller, Post, Body, UseGuards, Req, HttpStatus, HttpCode, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../../../core/security/auth/guards/jwt-auth.guard';
import { ProcessQueryCommand } from '../application/commands/process-query.command';
import { SimulateScenarioCommand } from '../application/commands/simulate-scenario.command';

/**
 * AI Reasoning Controller
 * RESTful API for AI-powered financial decision-making
 * 
 * Endpoints:
 * - POST /api/v1/reasoning/ask - Ask financial questions
 * - POST /api/v1/reasoning/simulate - Run what-if scenarios
 */
@Controller('reasoning')
@UseGuards(JwtAuthGuard)
export class ReasoningController {
  private readonly logger = new Logger(ReasoningController.name);

  constructor(private readonly commandBus: CommandBus) { }

  /**
   * Ask a financial question
   * @example
   * POST /api/v1/reasoning/ask
   * {
   *   "query": "Can I afford a new car?",
   *   "queryType": "affordability",
   *   "context": {
   *     "description": "New Honda City",
   *     "amount": 1500000,
   *     "frequency": "one-time"
   *   }
   * }
   */
  @Post('ask')
  @HttpCode(HttpStatus.OK)
  async ask(
    @Req() req: any,
    @Body() body: { query: string; queryType: string; context?: Record<string, any> },
  ) {
    const userId = req.user.id;

    this.logger.log(`User ${userId} asking: ${body.query}`);

    const command = new ProcessQueryCommand(
      userId,
      body.query,
      body.queryType as any,
      body.context,
    );

    const decision = await this.commandBus.execute(command);

    return {
      success: true,
      data: decision.toResponse(),
    };
  }

  /**
   * Simulate a what-if scenario
   * @example
   * POST /api/v1/reasoning/simulate
   * {
   *   "scenarioType": "expense",
   *   "parameters": {
   *     "category": "ENTERTAINMENT",
   *     "monthlyIncrease": 5000
   *   }
   * }
   */
  @Post('simulate')
  @HttpCode(HttpStatus.OK)
  async simulate(
    @Req() req: any,
    @Body() body: { scenarioType: string; parameters: Record<string, any> },
  ) {
    const userId = req.user.id;

    this.logger.log(`User ${userId} simulating: ${body.scenarioType}`);

    const command = new SimulateScenarioCommand(
      userId,
      body.scenarioType as any,
      body.parameters,
    );

    const result = await this.commandBus.execute(command);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Health check for AI services
   */
  @Post('health')
  @HttpCode(HttpStatus.OK)
  async health() {
    return {
      success: true,
      service: 'ai-reasoning',
      status: 'operational',
      timestamp: new Date().toISOString(),
    };
  }
}
