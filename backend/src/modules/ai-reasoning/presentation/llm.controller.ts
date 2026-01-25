import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GeminiService } from '../../../core/integrations/gemini/gemini.service';
import { PromptManagementService, CreatePromptDto } from '../infrastructure/services/prompt-management.service';
import { SafetyGuardrailsService } from '../infrastructure/services/safety-guardrails.service';
import { FunctionExecutorService } from '../domain/services/function-executor.service';
import { FunctionRegistry } from '../domain/services/function-registry.service';
import { z } from 'zod';

// DTOs
class GenerateRequestDto {
  query: string;
  userId: string;
  promptName?: string;
  stream?: boolean;
}

class StructuredGenerateRequestDto {
  query: string;
  userId: string;
  schema: any;
}

class SafetyCheckRequestDto {
  text: string;
  type: 'input' | 'output';
  userId?: string;
  ragContext?: string[];
}

class UpdatePromptStatusDto {
  status: 'draft' | 'testing' | 'canary' | 'production' | 'deprecated';
}

class RollbackPromptDto {
  targetVersion: string;
  reason: string;
}

class CreateABTestDto {
  testName: string;
  controlPromptId: string;
  treatmentPromptId: string;
  trafficSplit: number;
}

class ConcludeABTestDto {
  winner: 'control' | 'treatment';
}

/**
 * LLM Operations Controller
 * 
 * Provides REST endpoints for:
 * - Content generation
 * - Prompt management
 * - A/B testing
 * - Safety checks
 */
@ApiTags('AI/LLM')
@Controller('api/v1/ai')
export class LLMController {
  private readonly logger = new Logger(LLMController.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly promptMgmt: PromptManagementService,
    private readonly safetyService: SafetyGuardrailsService,
    private readonly functionExecutor: FunctionExecutorService,
    private readonly functionRegistry: FunctionRegistry,
  ) {}

  // ==========================================
  // Content Generation Endpoints
  // ==========================================

  @Post('generate')
  @ApiOperation({ summary: 'Generate AI response' })
  @ApiResponse({ status: 200, description: 'Response generated successfully' })
  async generate(@Body() dto: GenerateRequestDto) {
    const startTime = Date.now();

    try {
      // Safety check
      const inputSafety = await this.safetyService.checkInputSafety(
        dto.query,
        dto.userId,
      );

      if (!inputSafety.safe) {
        return {
          success: false,
          error: 'Safety check failed',
          reason: inputSafety.reason,
          category: inputSafety.category,
        };
      }

      // Get prompt config
      const promptConfig = await this.promptMgmt.getPromptForUser(
        dto.userId,
        dto.promptName || 'default_financial_advisor',
      );

      // Generate response
      const response = await this.geminiService.generateText(
        dto.query,
        {
          model: promptConfig.model,
          temperature: promptConfig.temperature,
          topP: promptConfig.topP,
          topK: promptConfig.topK,
          maxOutputTokens: promptConfig.maxTokens,
          systemInstruction: promptConfig.systemInstruction,
        },
      );

      // Output safety check
      const outputSafety = await this.safetyService.checkOutputSafety(response);
      const finalResponse = outputSafety.modifiedResponse || response;

      const latency = Date.now() - startTime;

      return {
        success: true,
        response: finalResponse,
        confidence: 0.85, // TODO: Calculate actual confidence
        latencyMs: latency,
        promptVersion: promptConfig.version,
      };
    } catch (error) {
      this.logger.error('Generate error:', error);
      return {
        success: false,
        error: 'Failed to generate response',
      };
    }
  }

  @Post('generate/structured')
  @ApiOperation({ summary: 'Generate structured JSON output' })
  async generateStructured(@Body() dto: StructuredGenerateRequestDto) {
    try {
      // Convert plain object to Zod schema
      const zodSchema = z.object(dto.schema);

      const result = await this.geminiService.generateStructuredOutput(
        dto.query,
        zodSchema,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Structured generation error:', error);
      return {
        success: false,
        error: 'Failed to generate structured output',
      };
    }
  }

  @Post('generate/with-tools')
  @ApiOperation({ summary: 'Generate with function calling' })
  async generateWithTools(@Body() dto: GenerateRequestDto) {
    try {
      const tools = this.functionRegistry.getAllFunctions();

      const result = await this.geminiService.generateWithFunctionCalling(
        dto.query,
        tools,
      );

      // Execute function calls if present
      if (result.functionCalls && result.functionCalls.length > 0) {
        const functionResults = [];

        for (const call of result.functionCalls) {
          const fnResult = await this.functionExecutor.executeFunction(
            call.name,
            call.args,
            dto.userId,
          );
          functionResults.push({
            function: call.name,
            result: fnResult,
          });
        }

        return {
          success: true,
          response: result.text,
          functionCalls: functionResults,
          usageMetadata: result.usageMetadata,
        };
      }

      return {
        success: true,
        response: result.text,
        usageMetadata: result.usageMetadata,
      };
    } catch (error) {
      this.logger.error('Tool generation error:', error);
      return {
        success: false,
        error: 'Failed to generate with tools',
      };
    }
  }

  // ==========================================
  // Prompt Management Endpoints
  // ==========================================

  @Get('prompts')
  @ApiOperation({ summary: 'List all prompts' })
  async listPrompts(
    @Query('status') status?: string,
    @Query('promptName') promptName?: string,
  ) {
    const prompts = await this.promptMgmt.listPrompts({
      status,
      promptName,
    });

    return {
      success: true,
      prompts,
    };
  }

  @Post('prompts')
  @ApiOperation({ summary: 'Create new prompt version' })
  async createPrompt(@Body() dto: CreatePromptDto) {
    try {
      const promptId = await this.promptMgmt.createPromptVersion(dto);

      return {
        success: true,
        promptId,
      };
    } catch (error) {
      this.logger.error('Create prompt error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Put('prompts/:promptId/status')
  @ApiOperation({ summary: 'Update prompt status' })
  async updatePromptStatus(
    @Param('promptId') promptId: string,
    @Body() dto: UpdatePromptStatusDto,
  ) {
    try {
      await this.promptMgmt.updatePromptStatus(promptId, dto.status);

      return {
        success: true,
        message: `Prompt status updated to ${dto.status}`,
      };
    } catch (error) {
      this.logger.error('Update status error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('prompts/:promptName/rollback')
  @ApiOperation({ summary: 'Rollback to previous version' })
  async rollbackPrompt(
    @Param('promptName') promptName: string,
    @Body() dto: RollbackPromptDto,
  ) {
    try {
      await this.promptMgmt.rollback(
        promptName,
        dto.targetVersion,
        dto.reason,
      );

      return {
        success: true,
        message: `Rolled back to version ${dto.targetVersion}`,
      };
    } catch (error) {
      this.logger.error('Rollback error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================
  // A/B Testing Endpoints
  // ==========================================

  @Post('prompts/ab-tests')
  @ApiOperation({ summary: 'Start A/B test' })
  async startABTest(@Body() dto: CreateABTestDto) {
    try {
      const testId = await this.promptMgmt.startABTest(
        dto.testName,
        dto.controlPromptId,
        dto.treatmentPromptId,
        dto.trafficSplit,
      );

      return {
        success: true,
        testId,
      };
    } catch (error) {
      this.logger.error('Start A/B test error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('prompts/ab-tests/:testId')
  @ApiOperation({ summary: 'Get A/B test results' })
  async getABTestResults(@Param('testId') testId: string) {
    try {
      const results = await this.promptMgmt.getABTestResults(testId);

      return {
        success: true,
        results,
      };
    } catch (error) {
      this.logger.error('Get A/B test error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('prompts/ab-tests/:testId/conclude')
  @ApiOperation({ summary: 'Conclude A/B test' })
  async concludeABTest(
    @Param('testId') testId: string,
    @Body() dto: ConcludeABTestDto,
  ) {
    try {
      await this.promptMgmt.concludeABTest(testId, dto.winner);

      return {
        success: true,
        message: `A/B test concluded. Winner: ${dto.winner}`,
      };
    } catch (error) {
      this.logger.error('Conclude A/B test error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================
  // Safety & Monitoring Endpoints
  // ==========================================

  @Post('safety-check')
  @ApiOperation({ summary: 'Check content safety' })
  async safetyCheck(@Body() dto: SafetyCheckRequestDto) {
    let result;

    if (dto.type === 'input') {
      result = await this.safetyService.checkInputSafety(dto.text, dto.userId);
    } else {
      result = await this.safetyService.checkOutputSafety(
        dto.text,
        dto.ragContext,
      );
    }

    return {
      success: true,
      safe: result.safe,
      reason: result.reason,
      category: result.category,
      confidence: result.confidence,
    };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get LLM metrics' })
  async getMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // TODO: Implement metrics aggregation
    return {
      success: true,
      message: 'Metrics endpoint - implementation pending',
    };
  }

  @Get('functions')
  @ApiOperation({ summary: 'List available functions' })
  async listFunctions() {
    const functions = this.functionRegistry.getAllFunctions();

    return {
      success: true,
      functions: functions.map((f) => ({
        name: f.name,
        description: f.description,
        parameters: f.parameters,
      })),
    };
  }
}
