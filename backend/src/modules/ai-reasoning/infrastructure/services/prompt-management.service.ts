import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../../core/database/postgres/prisma.service';
import { createHash } from 'crypto';

export interface PromptConfig {
  id: string;
  promptName: string;
  version: string;
  promptText: string;
  systemInstruction?: string;
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
  model: string;
  status: string;
  rolloutPercentage: number;
}

export interface CreatePromptDto {
  promptName: string;
  version: string;
  promptText: string;
  systemInstruction?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  model?: string;
  createdBy?: string;
}

export interface ABTestMetrics {
  control: {
    avgConfidence: number;
    refusalRate: number;
    avgLatency: number;
    satisfaction: number;
    totalExecutions: number;
  };
  treatment: {
    avgConfidence: number;
    refusalRate: number;
    avgLatency: number;
    satisfaction: number;
    totalExecutions: number;
  };
  statisticalSignificance?: number;
}

/**
 * Prompt Management Service
 * 
 * Handles:
 * - Prompt versioning and lifecycle
 * - A/B testing infrastructure
 * - Prompt selection for users
 * - Rollback capabilities
 */
@Injectable()
export class PromptManagementService {
  private readonly logger = new Logger(PromptManagementService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get active prompt for user (handles A/B testing)
   */
  async getPromptForUser(
    userId: string,
    promptName: string,
  ): Promise<PromptConfig> {
    // Check if user is in active A/B test
    const activeTest = await this.getActiveABTest(promptName);
    
    if (activeTest) {
      const userHash = this.hashUserId(userId);
      const inTreatment = userHash % 100 < activeTest.trafficSplitPercentage;
      
      const promptId = inTreatment 
        ? activeTest.treatmentPromptId 
        : activeTest.controlPromptId;
      
      const prompt = await this.prisma.promptRegistry.findUnique({
        where: { id: promptId },
      });

      if (prompt) {
        this.logger.debug(
          `User ${userId} assigned to ${inTreatment ? 'treatment' : 'control'} for test ${activeTest.testName}`,
        );
        return this.mapToPromptConfig(prompt);
      }
    }

    // Return production prompt
    return this.getProductionPrompt(promptName);
  }

  /**
   * Get production prompt by name
   */
  async getProductionPrompt(promptName: string): Promise<PromptConfig> {
    const prompt = await this.prisma.promptRegistry.findFirst({
      where: {
        promptName,
        status: 'production',
      },
      orderBy: {
        deployedAt: 'desc',
      },
    });

    if (!prompt) {
      throw new NotFoundException(
        `No production prompt found for: ${promptName}`,
      );
    }

    return this.mapToPromptConfig(prompt);
  }

  /**
   * Create new prompt version
   */
  async createPromptVersion(dto: CreatePromptDto): Promise<string> {
    // Check if version already exists
    const existing = await this.prisma.promptRegistry.findUnique({
      where: {
        promptName_version: {
          promptName: dto.promptName,
          version: dto.version,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Prompt ${dto.promptName} version ${dto.version} already exists`,
      );
    }

    // Validate semantic versioning
    if (!this.isValidSemanticVersion(dto.version)) {
      throw new ConflictException(
        `Invalid version format: ${dto.version}. Use semantic versioning (e.g., 1.0.0)`,
      );
    }

    const prompt = await this.prisma.promptRegistry.create({
      data: {
        promptName: dto.promptName,
        version: dto.version,
        promptText: dto.promptText,
        systemInstruction: dto.systemInstruction,
        temperature: dto.temperature ?? 0.3,
        topP: dto.topP ?? 0.9,
        topK: dto.topK ?? 40,
        maxTokens: dto.maxTokens ?? 2048,
        model: dto.model ?? 'gemini-1.5-pro',
        status: 'draft',
        createdBy: dto.createdBy,
      },
    });

    this.logger.log(
      `Created prompt ${dto.promptName} version ${dto.version} with ID ${prompt.id}`,
    );

    return prompt.id;
  }

  /**
   * Update prompt status
   */
  async updatePromptStatus(
    promptId: string,
    status: 'draft' | 'testing' | 'canary' | 'production' | 'deprecated',
  ): Promise<void> {
    const prompt = await this.prisma.promptRegistry.findUnique({
      where: { id: promptId },
    });

    if (!prompt) {
      throw new NotFoundException(`Prompt not found: ${promptId}`);
    }

    // Validate state transitions
    this.validateStatusTransition(prompt.status, status);

    const updateData: any = { status };

    // Set rollout percentage based on status
    if (status === 'canary') {
      updateData.rolloutPercentage = 5;
    } else if (status === 'production') {
      updateData.rolloutPercentage = 100;
      updateData.deployedAt = new Date();
      
      // Deprecate previous production version
      await this.deprecatePreviousProduction(prompt.promptName, promptId);
    } else if (status === 'deprecated') {
      updateData.deprecatedAt = new Date();
    }

    await this.prisma.promptRegistry.update({
      where: { id: promptId },
      data: updateData,
    });

    this.logger.log(
      `Updated prompt ${promptId} status to ${status}`,
    );
  }

  /**
   * Deploy prompt to canary (5% traffic)
   */
  async deployCanary(promptId: string): Promise<void> {
    await this.updatePromptStatus(promptId, 'canary');
  }

  /**
   * Promote canary to production
   */
  async promoteToProduction(promptId: string): Promise<void> {
    await this.updatePromptStatus(promptId, 'production');
  }

  /**
   * Rollback to previous version
   */
  async rollback(
    promptName: string,
    targetVersion: string,
    reason: string,
  ): Promise<void> {
    // Find target version
    const targetPrompt = await this.prisma.promptRegistry.findUnique({
      where: {
        promptName_version: {
          promptName,
          version: targetVersion,
        },
      },
    });

    if (!targetPrompt) {
      throw new NotFoundException(
        `Target version ${targetVersion} not found for ${promptName}`,
      );
    }

    // Get current production prompt
    const currentProduction = await this.prisma.promptRegistry.findFirst({
      where: {
        promptName,
        status: 'production',
      },
    });

    // Deprecate current production
    if (currentProduction) {
      await this.prisma.promptRegistry.update({
        where: { id: currentProduction.id },
        data: {
          status: 'deprecated',
          deprecatedAt: new Date(),
          rollbackTrigger: reason,
        },
      });
    }

    // Promote target to production
    await this.prisma.promptRegistry.update({
      where: { id: targetPrompt.id },
      data: {
        status: 'production',
        deployedAt: new Date(),
        rolloutPercentage: 100,
      },
    });

    this.logger.warn(
      `Rolled back ${promptName} to version ${targetVersion}. Reason: ${reason}`,
    );
  }

  /**
   * Start A/B test
   */
  async startABTest(
    testName: string,
    controlPromptId: string,
    treatmentPromptId: string,
    trafficSplit: number = 50,
  ): Promise<string> {
    // Validate prompts exist
    const [control, treatment] = await Promise.all([
      this.prisma.promptRegistry.findUnique({ where: { id: controlPromptId } }),
      this.prisma.promptRegistry.findUnique({ where: { id: treatmentPromptId } }),
    ]);

    if (!control || !treatment) {
      throw new NotFoundException('One or both prompts not found');
    }

    if (control.promptName !== treatment.promptName) {
      throw new ConflictException('Prompts must have the same name');
    }

    // Check for existing active test
    const existingTest = await this.prisma.promptABTest.findFirst({
      where: {
        testName,
        status: 'running',
      },
    });

    if (existingTest) {
      throw new ConflictException(`Active test with name ${testName} already exists`);
    }

    // Create test
    const test = await this.prisma.promptABTest.create({
      data: {
        testName,
        controlPromptId,
        treatmentPromptId,
        trafficSplitPercentage: trafficSplit,
        status: 'running',
      },
    });

    this.logger.log(
      `Started A/B test ${testName}: ${control.version} vs ${treatment.version} (${trafficSplit}% to treatment)`,
    );

    return test.id;
  }

  /**
   * Get A/B test results
   */
  async getABTestResults(testId: string): Promise<ABTestMetrics> {
    const test = await this.prisma.promptABTest.findUnique({
      where: { id: testId },
      include: {
        controlPrompt: {
          include: {
            executions: {
              where: {
                createdAt: {
                  gte: (await this.prisma.promptABTest.findUnique({
                    where: { id: testId },
                    select: { startDate: true },
                  }))?.startDate,
                },
              },
            },
          },
        },
        treatmentPrompt: {
          include: {
            executions: {
              where: {
                createdAt: {
                  gte: (await this.prisma.promptABTest.findUnique({
                    where: { id: testId },
                    select: { startDate: true },
                  }))?.startDate,
                },
              },
            },
          },
        },
      },
    });

    if (!test) {
      throw new NotFoundException(`A/B test not found: ${testId}`);
    }

    const controlMetrics = this.calculateMetrics(test.controlPrompt.executions);
    const treatmentMetrics = this.calculateMetrics(test.treatmentPrompt.executions);

    // Calculate statistical significance (Chi-square test for satisfaction)
    const statisticalSignificance = this.calculateChiSquare(
      controlMetrics,
      treatmentMetrics,
    );

    return {
      control: controlMetrics,
      treatment: treatmentMetrics,
      statisticalSignificance,
    };
  }

  /**
   * Conclude A/B test
   */
  async concludeABTest(
    testId: string,
    winner: 'control' | 'treatment',
  ): Promise<void> {
    const test = await this.prisma.promptABTest.findUnique({
      where: { id: testId },
    });

    if (!test) {
      throw new NotFoundException(`A/B test not found: ${testId}`);
    }

    // Update test status
    await this.prisma.promptABTest.update({
      where: { id: testId },
      data: {
        status: 'completed',
        endDate: new Date(),
        winner,
      },
    });

    // Promote winner to production
    const winnerPromptId = winner === 'control' 
      ? test.controlPromptId 
      : test.treatmentPromptId;
    
    await this.promoteToProduction(winnerPromptId);

    this.logger.log(
      `Concluded A/B test ${test.testName}. Winner: ${winner}`,
    );
  }

  /**
   * List all prompts with filtering
   */
  async listPrompts(filters?: {
    status?: string;
    promptName?: string;
  }): Promise<PromptConfig[]> {
    const prompts = await this.prisma.promptRegistry.findMany({
      where: {
        status: filters?.status,
        promptName: filters?.promptName,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return prompts.map((p) => this.mapToPromptConfig(p));
  }

  // ==========================================
  // Private Helper Methods
  // ==========================================

  private async getActiveABTest(promptName: string) {
    return this.prisma.promptABTest.findFirst({
      where: {
        status: 'running',
        controlPrompt: {
          promptName,
        },
      },
    });
  }

  private hashUserId(userId: string): number {
    const hash = createHash('sha256').update(userId).digest('hex');
    return parseInt(hash.substring(0, 8), 16);
  }

  private mapToPromptConfig(prompt: any): PromptConfig {
    return {
      id: prompt.id,
      promptName: prompt.promptName,
      version: prompt.version,
      promptText: prompt.promptText,
      systemInstruction: prompt.systemInstruction,
      temperature: prompt.temperature,
      topP: prompt.topP,
      topK: prompt.topK,
      maxTokens: prompt.maxTokens,
      model: prompt.model,
      status: prompt.status,
      rolloutPercentage: prompt.rolloutPercentage,
    };
  }

  private isValidSemanticVersion(version: string): boolean {
    const semverRegex = /^\d+\.\d+\.\d+$/;
    return semverRegex.test(version);
  }

  private validateStatusTransition(
    currentStatus: string,
    newStatus: string,
  ): void {
    const allowedTransitions: Record<string, string[]> = {
      draft: ['testing', 'deprecated'],
      testing: ['canary', 'draft', 'deprecated'],
      canary: ['production', 'deprecated'],
      production: ['deprecated'],
      deprecated: [],
    };

    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      throw new ConflictException(
        `Invalid status transition: ${currentStatus} -> ${newStatus}`,
      );
    }
  }

  private async deprecatePreviousProduction(
    promptName: string,
    excludeId: string,
  ): Promise<void> {
    await this.prisma.promptRegistry.updateMany({
      where: {
        promptName,
        status: 'production',
        id: { not: excludeId },
      },
      data: {
        status: 'deprecated',
        deprecatedAt: new Date(),
      },
    });
  }

  private calculateMetrics(executions: any[]): any {
    if (executions.length === 0) {
      return {
        avgConfidence: 0,
        refusalRate: 0,
        avgLatency: 0,
        satisfaction: 0,
        totalExecutions: 0,
      };
    }

    const validConfidence = executions.filter((e) => e.confidenceScore !== null);
    const validLatency = executions.filter((e) => e.latencyMs !== null);
    const feedbackExecutions = executions.filter((e) => e.userFeedback !== 0);

    return {
      avgConfidence:
        validConfidence.reduce((sum, e) => sum + (e.confidenceScore || 0), 0) /
        (validConfidence.length || 1),
      refusalRate:
        executions.filter((e) => e.safetyTriggered).length / executions.length,
      avgLatency:
        validLatency.reduce((sum, e) => sum + (e.latencyMs || 0), 0) /
        (validLatency.length || 1),
      satisfaction:
        feedbackExecutions.filter((e) => e.userFeedback === 1).length /
        (feedbackExecutions.length || 1),
      totalExecutions: executions.length,
    };
  }

  private calculateChiSquare(control: any, treatment: any): number {
    // Simplified Chi-square test for satisfaction difference
    const n1 = control.totalExecutions;
    const n2 = treatment.totalExecutions;
    
    if (n1 === 0 || n2 === 0) return 0;

    const p1 = control.satisfaction;
    const p2 = treatment.satisfaction;

    const pPooled = (p1 * n1 + p2 * n2) / (n1 + n2);
    const standardError = Math.sqrt(pPooled * (1 - pPooled) * (1 / n1 + 1 / n2));

    if (standardError === 0) return 0;

    const zScore = (p2 - p1) / standardError;
    
    // Return p-value approximation (two-tailed test)
    return Math.abs(zScore);
  }
}
