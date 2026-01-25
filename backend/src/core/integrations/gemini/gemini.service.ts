import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  GoogleGenerativeAI, 
  GenerativeModel, 
  ChatSession,
  GenerateContentResult,
  FunctionDeclaration,
  FunctionDeclarationSchema,
  SafetySetting,
  HarmCategory,
  HarmBlockThreshold,
  Content,
  Part
} from '@google/generative-ai';
import { z } from 'zod';

export interface GeminiConfig {
  model: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  safetySettings?: SafetySetting[];
  tools?: FunctionDeclaration[];
  systemInstruction?: string;
}

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: string;
}

export interface GeminiResponse {
  text: string;
  finishReason: 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | 'OTHER';
  safetyRatings?: any[];
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  functionCalls?: Array<{
    name: string;
    args: any;
  }>;
  structuredOutput?: any;
}

export interface StreamChunk {
  text: string;
  isComplete: boolean;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  private defaultModel: GenerativeModel;
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000; // 1 second

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not configured. AI features will be disabled.');
      return;
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.defaultModel = this.genAI.getGenerativeModel({
      model: this.configService.get<string>('GEMINI_MODEL') || 'gemini-1.5-pro',
      safetySettings: this.getDefaultSafetySettings(),
    });

    this.logger.log('Gemini AI service initialized');
  }

  async generateText(
    prompt: string,
    config?: Partial<GeminiConfig>,
  ): Promise<string> {
    if (!this.genAI) {
      throw new Error('Gemini AI is not configured');
    }

    try {
      const model = this.getModel(config);
      const result = await this.executeWithRetry(() => model.generateContent(prompt));
      const response = await result.response;
      const text = response.text();

      this.logger.debug(`Generated text for prompt (${prompt.length} chars)`);

      return text;
    } catch (error) {
      this.logger.error('Failed to generate text', error);
      throw error;
    }
  }

  /**
   * Generate content with structured JSON output
   */
  async generateStructuredOutput<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    config?: Partial<GeminiConfig>,
  ): Promise<T> {
    if (!this.genAI) {
      throw new Error('Gemini AI is not configured');
    }

    try {
      // Generate a simple schema description instead of using .shape
      let schemaDescription = 'a valid JSON object';
      if (schema instanceof z.ZodObject) {
        schemaDescription = JSON.stringify(schema.shape, null, 2);
      }
      
      const enhancedPrompt = `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON matching this schema. No other text.\n\nSchema: ${schemaDescription}`;
      
      const model = this.getModel({
        ...config,
        temperature: config?.temperature ?? 0.3, // Lower temp for structured output
      });

      const result = await this.executeWithRetry(() => model.generateContent(enhancedPrompt));
      const response = await result.response;
      let text = response.text();

      // Clean up response - remove markdown code blocks if present
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      // Parse and validate JSON
      const parsed = JSON.parse(text);
      const validated = schema.parse(parsed);

      this.logger.debug('Generated and validated structured output');

      return validated;
    } catch (error) {
      this.logger.error('Failed to generate structured output', error);
      throw error;
    }
  }

  /**
   * Generate content with function calling capability
   */
  async generateWithFunctionCalling(
    prompt: string,
    tools: FunctionDeclaration[],
    config?: Partial<GeminiConfig>,
  ): Promise<GeminiResponse> {
    if (!this.genAI) {
      throw new Error('Gemini AI is not configured');
    }

    try {
      const model = this.getModel({
        ...config,
        tools,
      });

      const result = await this.executeWithRetry(() => model.generateContent(prompt));
      const response = await result.response;

      // Extract function calls if present
      const functionCalls = this.extractFunctionCalls(response);

      return {
        text: response.text(),
        finishReason: this.mapFinishReason(response),
        safetyRatings: response.candidates?.[0]?.safetyRatings,
        usageMetadata: {
          promptTokenCount: response.usageMetadata?.promptTokenCount || 0,
          candidatesTokenCount: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokenCount: response.usageMetadata?.totalTokenCount || 0,
        },
        functionCalls,
      };
    } catch (error) {
      this.logger.error('Failed to generate with function calling', error);
      throw error;
    }
  }

  /**
   * Stream content generation
   */
  async *generateContentStream(
    prompt: string,
    config?: Partial<GeminiConfig>,
  ): AsyncGenerator<StreamChunk, void, unknown> {
    if (!this.genAI) {
      throw new Error('Gemini AI is not configured');
    }

    try {
      const model = this.getModel(config);
      const result = await this.executeWithRetry(() => model.generateContentStream(prompt));

      for await (const chunk of result.stream) {
        const text = chunk.text();
        yield {
          text,
          isComplete: false,
        };
      }

      // Get final metadata
      const finalResponse = await result.response;
      yield {
        text: '',
        isComplete: true,
        usageMetadata: {
          promptTokenCount: finalResponse.usageMetadata?.promptTokenCount || 0,
          candidatesTokenCount: finalResponse.usageMetadata?.candidatesTokenCount || 0,
          totalTokenCount: finalResponse.usageMetadata?.totalTokenCount || 0,
        },
      };
    } catch (error) {
      this.logger.error('Failed to stream content', error);
      throw error;
    }
  }

  async chat(
    messages: GeminiMessage[],
    config?: Partial<GeminiConfig>,
  ): Promise<string> {
    if (!this.genAI) {
      throw new Error('Gemini AI is not configured');
    }

    try {
      const model = this.getModel(config);
      const chat = model.startChat({
        history: messages.map((msg) => ({
          role: msg.role,
          parts: [{ text: msg.parts }],
        })),
      });

      const lastMessage = messages[messages.length - 1];
      const result = await chat.sendMessage(lastMessage.parts);
      const response = await result.response;
      const text = response.text();

      this.logger.debug(`Chat response generated`);

      return text;
    } catch (error) {
      this.logger.error('Failed to generate chat response', error);
      throw error;
    }
  }

  async generateFinancialInsight(
    userProfile: any,
    transactionHistory: any[],
  ): Promise<string> {
    const prompt = this.buildFinancialInsightPrompt(userProfile, transactionHistory);
    return this.generateText(prompt, {
      temperature: 0.7,
      maxOutputTokens: 1000,
    });
  }

  async generateInvestmentRecommendation(
    userProfile: any,
    currentPortfolio: any[],
    marketData: any,
  ): Promise<string> {
    const prompt = this.buildInvestmentRecommendationPrompt(
      userProfile,
      currentPortfolio,
      marketData,
    );
    return this.generateText(prompt, {
      temperature: 0.5,
      maxOutputTokens: 1500,
    });
  }

  async analyzeRiskProfile(
    transactions: any[],
    investments: any[],
  ): Promise<{ riskLevel: string; analysis: string }> {
    const prompt = this.buildRiskProfilePrompt(transactions, investments);
    const response = await this.generateText(prompt, {
      temperature: 0.3,
      maxOutputTokens: 800,
    });

    // Parse the response to extract risk level and analysis
    // This is a simplified version - in production, use structured output
    const riskLevel = this.extractRiskLevel(response);

    return {
      riskLevel,
      analysis: response,
    };
  }

  async generateGoalPlan(
    goal: any,
    currentSavings: number,
    monthlyIncome: number,
  ): Promise<string> {
    const prompt = this.buildGoalPlanPrompt(goal, currentSavings, monthlyIncome);
    return this.generateText(prompt, {
      temperature: 0.6,
      maxOutputTokens: 1200,
    });
  }

  private getModel(config?: Partial<GeminiConfig>): GenerativeModel {
    if (!config) {
      return this.defaultModel;
    }

    const modelConfig: any = {
      model: config.model || this.configService.get<string>('GEMINI_MODEL') || 'gemini-1.5-pro',
      generationConfig: {
        temperature: config.temperature,
        topP: config.topP,
        topK: config.topK,
        maxOutputTokens: config.maxOutputTokens,
      },
    };

    if (config.safetySettings) {
      modelConfig.safetySettings = config.safetySettings;
    } else {
      modelConfig.safetySettings = this.getDefaultSafetySettings();
    }

    if (config.tools && config.tools.length > 0) {
      modelConfig.tools = [{ functionDeclarations: config.tools }];
    }

    if (config.systemInstruction) {
      modelConfig.systemInstruction = config.systemInstruction;
    }

    return this.genAI.getGenerativeModel(modelConfig);
  }

  /**
   * Exponential backoff retry logic
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    retries = this.maxRetries,
  ): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        const isLastAttempt = attempt === retries;
        
        // Check if error is retryable
        const isRetryable = this.isRetryableError(error);
        
        if (!isRetryable || isLastAttempt) {
          throw error;
        }

        // Calculate exponential backoff delay
        const delay = this.baseDelay * Math.pow(2, attempt);
        this.logger.warn(
          `Attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
          error.message,
        );

        await this.sleep(delay);
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Check if error is retryable (rate limit, network issues, etc.)
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;

    const message = error.message?.toLowerCase() || '';
    const statusCode = error.status || error.statusCode;

    // Rate limit errors
    if (statusCode === 429 || message.includes('rate limit')) {
      return true;
    }

    // Server errors
    if (statusCode >= 500 && statusCode < 600) {
      return true;
    }

    // Network errors
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnrefused')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Get default safety settings
   */
  private getDefaultSafetySettings(): SafetySetting[] {
    return [
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];
  }

  /**
   * Extract function calls from response
   */
  private extractFunctionCalls(response: any): Array<{ name: string; args: any }> | undefined {
    const functionCalls: Array<{ name: string; args: any }> = [];

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.functionCall) {
          functionCalls.push({
            name: part.functionCall.name,
            args: part.functionCall.args,
          });
        }
      }
    }

    return functionCalls.length > 0 ? functionCalls : undefined;
  }

  /**
   * Map finish reason from API to enum
   */
  private mapFinishReason(response: any): 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | 'OTHER' {
    const reason = response.candidates?.[0]?.finishReason;
    
    if (!reason) return 'OTHER';
    
    switch (reason) {
      case 'STOP':
        return 'STOP';
      case 'MAX_TOKENS':
        return 'MAX_TOKENS';
      case 'SAFETY':
        return 'SAFETY';
      case 'RECITATION':
        return 'RECITATION';
      default:
        return 'OTHER';
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private buildFinancialInsightPrompt(
    userProfile: any,
    transactionHistory: any[],
  ): string {
    return `
You are a financial advisor AI. Analyze the following user profile and transaction history:

User Profile:
- Risk Profile: ${userProfile.riskProfile}
- Age: ${this.calculateAge(userProfile.dateOfBirth)}
- KYC Status: ${userProfile.kycStatus}

Recent Transactions (${transactionHistory.length}):
${transactionHistory.slice(0, 10).map((t) => `- ${t.type}: ₹${t.amount} (${t.category})`).join('\n')}

Provide personalized financial insights, spending patterns, and recommendations.
`;
  }

  private buildInvestmentRecommendationPrompt(
    userProfile: any,
    currentPortfolio: any[],
    marketData: any,
  ): string {
    return `
You are an investment advisor AI. Provide investment recommendations based on:

User Profile:
- Risk Profile: ${userProfile.riskProfile}
- Current Portfolio Value: ₹${this.calculatePortfolioValue(currentPortfolio)}

Current Portfolio:
${currentPortfolio.map((inv) => `- ${inv.assetType}: ₹${inv.currentValue}`).join('\n')}

Market Conditions:
${JSON.stringify(marketData, null, 2)}

Provide specific investment recommendations with rationale.
`;
  }

  private buildRiskProfilePrompt(transactions: any[], investments: any[]): string {
    return `
Analyze the following financial data to determine the user's risk profile:

Transactions: ${transactions.length} total
Investments: ${investments.length} total

Investment Types:
${investments.map((inv) => `- ${inv.assetType}: ₹${inv.currentValue}`).join('\n')}

Classify the risk profile as: Conservative, Moderate, or Aggressive
Provide detailed analysis explaining the classification.
`;
  }

  private buildGoalPlanPrompt(
    goal: any,
    currentSavings: number,
    monthlyIncome: number,
  ): string {
    return `
Create a financial plan for the following goal:

Goal: ${goal.name}
Target Amount: ₹${goal.targetAmount}
Target Date: ${goal.targetDate}
Current Savings: ₹${currentSavings}
Monthly Income: ₹${monthlyIncome}

Provide a detailed step-by-step plan to achieve this goal, including:
- Monthly savings required
- Investment strategy
- Risk considerations
- Timeline milestones
`;
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  private calculatePortfolioValue(portfolio: any[]): number {
    return portfolio.reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
  }

  private extractRiskLevel(response: string): string {
    const lowerResponse = response.toLowerCase();

    if (lowerResponse.includes('conservative')) return 'CONSERVATIVE';
    if (lowerResponse.includes('aggressive')) return 'AGGRESSIVE';
    if (lowerResponse.includes('moderate')) return 'MODERATE';

    return 'MODERATE'; // default
  }

  isConfigured(): boolean {
    return !!this.genAI;
  }
}
