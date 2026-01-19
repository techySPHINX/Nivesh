import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';

export interface GeminiConfig {
  model: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
}

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: string;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  private defaultModel: GenerativeModel;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not configured. AI features will be disabled.');
      return;
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.defaultModel = this.genAI.getGenerativeModel({
      model: 'gemini-pro',
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
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      this.logger.debug(`Generated text for prompt (${prompt.length} chars)`);

      return text;
    } catch (error) {
      this.logger.error('Failed to generate text', error);
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

    return this.genAI.getGenerativeModel({
      model: config.model || 'gemini-pro',
      generationConfig: {
        temperature: config.temperature,
        topP: config.topP,
        topK: config.topK,
        maxOutputTokens: config.maxOutputTokens,
      },
    });
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
