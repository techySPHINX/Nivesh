import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ProcessQueryCommand } from '../commands/process-query.command';
import { FinancialContextBuilderService } from '../../domain/services/context-builder.service';
import { DecisionEngineService } from '../../domain/services/decision-engine.service';
import { GeminiReasoningService } from '../../infrastructure/services/gemini-reasoning.service';
import { PromptTemplateService } from '../../infrastructure/services/prompt-template.service';
import { Decision, ConfidenceLevel } from '../../domain/value-objects/decision.vo';
import {
  IAccountRepository,
  ACCOUNT_REPOSITORY
} from '../../../financial-data/domain/repositories/account.repository.interface';
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY
} from '../../../financial-data/domain/repositories/transaction.repository.interface';

/**
 * Process Query Handler
 * Orchestrates AI reasoning for user financial queries
 * 
 * Flow:
 * 1. Build financial context from user data
 * 2. Check if rule-based engine can handle (simple cases)
 * 3. If complex, use AI reasoning with prompts
 * 4. Validate and return decision with reasoning
 */
@CommandHandler(ProcessQueryCommand)
export class ProcessQueryHandler implements ICommandHandler<ProcessQueryCommand> {
  private readonly logger = new Logger(ProcessQueryHandler.name);

  constructor(
    private readonly contextBuilder: FinancialContextBuilderService,
    private readonly decisionEngine: DecisionEngineService,
    private readonly geminiService: GeminiReasoningService,
    private readonly promptService: PromptTemplateService,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    @Inject(TRANSACTION_REPOSITORY) private readonly transactionRepository: ITransactionRepository,
  ) { }

  async execute(command: ProcessQueryCommand): Promise<Decision> {
    const { userId, query, queryType, context } = command;

    this.logger.log(`Processing query for user ${userId}: ${queryType}`);

    try {
      // Step 1: Build financial context from actual data
      const [accounts, recentTransactions] = await Promise.all([
        this.accountRepository.findByUserId(userId),
        this.transactionRepository.getRecentTransactions(userId, 90),
      ]);

      const accountsData = accounts.map(acc => ({
        id: acc.Id,
        userId: acc.UserId,
        accountType: acc.AccountType,
        balance: acc.Balance.getAmount(),
        currency: acc.Balance.getCurrency(),
        status: acc.Status,
      }));

      const transactionsData = recentTransactions.map(txn => ({
        id: txn.Id,
        userId: txn.UserId,
        accountId: txn.AccountId,
        amount: txn.Amount.getAmount(),
        type: txn.Type,
        category: txn.Category,
        transactionDate: txn.TransactionDate,
        description: txn.Description,
      }));

      const financialContext = await this.contextBuilder.buildContext({
        userId,
        accountsData,
        transactionsData,
        goalsData: [], // Goals will be fetched when GoalManagement module is enabled
      });

      // Step 2: Check if rule-based engine can handle
      if (queryType === 'affordability' && context?.amount && context?.frequency) {
        this.logger.debug('Using rule-based affordability engine');
        return this.decisionEngine.evaluateAffordability(financialContext, {
          amount: context.amount,
          frequency: context.frequency === 'one-time' ? 'once' : 'monthly',
          description: context.description || 'Expense',
        });
      }

      if (queryType === 'goal_projection' && context?.goalName) {
        this.logger.debug('Using rule-based goal projection engine');
        return this.decisionEngine.projectGoal(financialContext, {
          targetAmount: context.targetAmount || 0,
          currentAmount: context.currentAmount || 0,
          monthlyContribution: context.monthlyContribution || 0,
        });
      }

      // Step 3: Use AI for complex queries
      this.logger.debug('Using AI reasoning for complex query');
      return await this.processWithAI(financialContext, query, queryType, context);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to process query: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  private async processWithAI(
    financialContext: any,
    query: string,
    queryType: string,
    context?: Record<string, any>,
  ): Promise<Decision> {
    // Build appropriate prompt based on query type
    let userPrompt: string;

    switch (queryType) {
      case 'affordability':
        userPrompt = this.promptService.buildAffordabilityPrompt({
          context: financialContext,
          expenseDescription: context?.description || query,
          amount: context?.amount || 0,
          frequency: context?.frequency || 'monthly',
        });
        break;

      case 'goal_projection':
        userPrompt = this.promptService.buildGoalProjectionPrompt({
          context: financialContext,
          goalName: context?.goalName || query,
          targetAmount: context?.targetAmount || 0,
          currentAmount: context?.currentAmount || 0,
          monthlyContribution: context?.monthlyContribution || 0,
        });
        break;

      case 'budget_optimization':
        userPrompt = this.promptService.buildBudgetOptimizationPrompt({
          context: financialContext,
          targetSavingsRate: context?.targetSavingsRate || 20,
        });
        break;

      default:
        userPrompt = this.promptService.buildGeneralAdvicePrompt({
          context: financialContext,
          question: query,
        });
    }

    // Get system prompt
    const systemPrompt = this.promptService.getSystemPrompt();

    // Call Gemini API
    const response = await this.geminiService.generateResponse({
      systemPrompt,
      userPrompt,
      temperature: 0.7,
    });

    if (!response.success) {
      throw new Error(`AI reasoning failed: ${response.error}`);
    }

    // Validate response
    const validation = this.geminiService.validateResponse(response.content);
    if (!validation.valid) {
      throw new Error(`Invalid AI response: ${validation.reason}`);
    }

    // Check for financial warnings
    const hasWarnings = this.geminiService.hasFinancialWarnings(response.content);

    // Parse AI response into Decision structure
    return Decision.createFromAI({
      query,
      queryType: queryType as any,
      answer: this.extractAnswer(response.content),
      reasoning: this.extractReasoning(response.content),
      recommendations: this.extractRecommendations(response.content),
      warnings: hasWarnings ? this.extractWarnings(response.content) : [],
      confidence: this.determineConfidence(response.content),
      dataCitations: [`Based on user's financial snapshot as of ${new Date().toLocaleDateString('en-IN')}`],
    });
  }

  private extractAnswer(content: string): string {
    // Extract first paragraph or sentence as the direct answer
    const lines = content.split('\n').filter((line) => line.trim().length > 0);
    return lines[0] || content.substring(0, 200);
  }

  private extractReasoning(content: string): Array<{ step: string; data: string }> {
    // Parse numbered steps or bullet points
    const steps: Array<{ step: string; data: string }> = [];
    const lines = content.split('\n');

    let currentStep = '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^\d+\./)) {
        if (currentStep) {
          steps.push({ step: currentStep, data: '' });
        }
        currentStep = trimmed;
      } else if (trimmed.startsWith('-')) {
        if (currentStep) {
          steps.push({ step: currentStep, data: '' });
        }
        currentStep = trimmed.substring(1).trim();
      }
    }

    if (currentStep) {
      steps.push({ step: currentStep, data: '' });
    }

    return steps.length > 0 ? steps : [{ step: content, data: '' }];
  }

  private extractRecommendations(content: string): string[] {
    // Look for recommendation sections
    const recommendations: string[] = [];
    const lines = content.split('\n');

    let inRecommendationSection = false;
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('recommend') || lower.includes('suggest') || lower.includes('advice')) {
        inRecommendationSection = true;
      }

      if (inRecommendationSection && (line.startsWith('-') || line.match(/^\d+\./))) {
        recommendations.push(line.trim());
      }
    }

    return recommendations.length > 0 ? recommendations : ['Review the detailed analysis above'];
  }

  private extractWarnings(content: string): string[] {
    const warnings: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (
        lower.includes('warning') ||
        lower.includes('risk') ||
        lower.includes('caution') ||
        lower.includes('note:')
      ) {
        warnings.push(line.trim());
      }
    }

    return warnings;
  }

  private determineConfidence(content: string): ConfidenceLevel {
    const lower = content.toLowerCase();

    if (lower.includes('strongly recommend') || lower.includes('definitely')) {
      return ConfidenceLevel.HIGH;
    }

    if (lower.includes('might') || lower.includes('possibly') || lower.includes('uncertain')) {
      return ConfidenceLevel.LOW;
    }

    return ConfidenceLevel.MEDIUM;
  }
}
