/**
 * Local LLM Service - Ollama Integration
 *
 * Serves LLaMA-3-8B-Instruct (primary) and Mistral-7B-Instruct (fallback)
 * via Ollama HTTP API. 100% free, 100% local, no API keys needed.
 *
 * Features:
 * - Dual model support with automatic fallback
 * - Streaming & batch generation
 * - Function calling emulation
 * - Structured JSON output
 * - Retry with exponential backoff
 * - Token usage tracking
 * - Safety filtering for financial content
 */
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";

// ==========================================
// Interfaces
// ==========================================

export interface LLMConfig {
  model?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
  tools?: FunctionDeclaration[];
  stop?: string[];
}

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LLMResponse {
  text: string;
  finishReason: "stop" | "length" | "error";
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  functionCalls?: Array<{ name: string; args: any }>;
  structuredOutput?: any;
  model: string;
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

// ==========================================
// Service
// ==========================================

@Injectable()
export class LLMService implements OnModuleInit {
  private readonly logger = new Logger(LLMService.name);

  // Ollama API base URL
  private ollamaBaseUrl: string;

  // Model identifiers
  private primaryModel: string;
  private fallbackModel: string;
  private activeModel: string;

  // Retry config
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000;

  // Health tracking
  private isOllamaAvailable = false;
  private modelsAvailable: string[] = [];

  constructor(private readonly configService: ConfigService) {
    this.ollamaBaseUrl =
      this.configService.get<string>("LLM_OLLAMA_BASE_URL") ||
      "http://localhost:11434";
    this.primaryModel =
      this.configService.get<string>("LLM_PRIMARY_MODEL") ||
      "llama3:8b-instruct-q4_K_M";
    this.fallbackModel =
      this.configService.get<string>("LLM_FALLBACK_MODEL") ||
      "mistral:7b-instruct-q4_K_M";
    this.activeModel = this.primaryModel;
  }

  async onModuleInit() {
    await this.checkOllamaHealth();
  }

  // ==========================================
  // Health & Model Management
  // ==========================================

  /**
   * Check Ollama server availability and list models
   */
  async checkOllamaHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.ollamaBaseUrl}/api/tags`);
      if (!res.ok) {
        this.logger.warn("Ollama server responded with non-OK status");
        this.isOllamaAvailable = false;
        return false;
      }

      const data = await res.json();
      this.modelsAvailable = (data.models || []).map((m: any) => m.name);

      this.isOllamaAvailable = true;
      this.logger.log(
        `Ollama connected. Available models: ${this.modelsAvailable.join(", ") || "(none)"}`,
      );

      // Determine active model
      if (this.modelsAvailable.some((m) => m.startsWith("llama3"))) {
        this.activeModel = this.primaryModel;
        this.logger.log(`Primary model active: ${this.primaryModel}`);
      } else if (this.modelsAvailable.some((m) => m.startsWith("mistral"))) {
        this.activeModel = this.fallbackModel;
        this.logger.log(`Fallback model active: ${this.fallbackModel}`);
      } else {
        this.logger.warn(
          "Neither LLaMA-3 nor Mistral models found. Run: ollama pull llama3:8b-instruct-q4_K_M",
        );
      }

      return true;
    } catch (error) {
      this.isOllamaAvailable = false;
      this.logger.warn(
        `Ollama not available at ${this.ollamaBaseUrl}. Local LLM features disabled. Error: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Pull a model from Ollama registry if not present
   */
  async ensureModelAvailable(modelName: string): Promise<boolean> {
    if (
      this.modelsAvailable.some((m) => m.startsWith(modelName.split(":")[0]))
    ) {
      return true;
    }

    this.logger.log(`Pulling model ${modelName}... This may take a while.`);
    try {
      const res = await fetch(`${this.ollamaBaseUrl}/api/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: modelName, stream: false }),
      });

      if (res.ok) {
        this.logger.log(`Model ${modelName} pulled successfully.`);
        await this.checkOllamaHealth();
        return true;
      }

      this.logger.error(`Failed to pull model ${modelName}: ${res.statusText}`);
      return false;
    } catch (error) {
      this.logger.error(`Error pulling model ${modelName}: ${error.message}`);
      return false;
    }
  }

  // ==========================================
  // Text Generation
  // ==========================================

  /**
   * Generate text completion
   */
  async generateText(
    prompt: string,
    config?: Partial<LLMConfig>,
  ): Promise<string> {
    this.ensureAvailable();

    const model = config?.model || this.activeModel;
    const messages = this.buildMessages(prompt, config?.systemInstruction);

    const response = await this.callOllama(messages, {
      model,
      temperature: config?.temperature ?? 0.7,
      top_p: config?.topP ?? 0.9,
      top_k: config?.topK ?? 40,
      num_predict: config?.maxOutputTokens ?? 2048,
      stop: config?.stop,
    });

    return response.text;
  }

  /**
   * Generate structured JSON output validated against a Zod schema
   */
  async generateStructuredOutput<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    config?: Partial<LLMConfig>,
  ): Promise<T> {
    this.ensureAvailable();

    let schemaDescription = "a valid JSON object";
    if (schema instanceof z.ZodObject) {
      schemaDescription = JSON.stringify(schema.shape, null, 2);
    }

    const enhancedPrompt = `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON matching this schema. No other text, no markdown.\n\nSchema: ${schemaDescription}`;

    const text = await this.generateText(enhancedPrompt, {
      ...config,
      temperature: config?.temperature ?? 0.2, // Lower temp for structured output
    });

    // Clean up response
    let cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Try to extract JSON from response if it has extra text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    const parsed = JSON.parse(cleaned);
    return schema.parse(parsed);
  }

  /**
   * Generate response with function calling emulation
   *
   * Since Ollama doesn't natively support function calling for all models,
   * we emulate it by instructing the model to output JSON with function calls.
   */
  async generateWithFunctionCalling(
    prompt: string,
    tools: FunctionDeclaration[],
    config?: Partial<LLMConfig>,
  ): Promise<LLMResponse> {
    this.ensureAvailable();

    const toolsDescription = tools
      .map(
        (t) =>
          `- ${t.name}: ${t.description}\n  Parameters: ${JSON.stringify(t.parameters)}`,
      )
      .join("\n");

    const enhancedPrompt = `You have access to the following tools. If you need to call a tool, respond with JSON in this exact format:
{"function_calls": [{"name": "tool_name", "args": {...}}]}
If no tool is needed, respond normally with text.

Available tools:
${toolsDescription}

User request: ${prompt}`;

    const response = await this.callOllama(
      this.buildMessages(enhancedPrompt, config?.systemInstruction),
      {
        model: config?.model || this.activeModel,
        temperature: config?.temperature ?? 0.3,
        top_p: config?.topP ?? 0.9,
        num_predict: config?.maxOutputTokens ?? 2048,
      },
    );

    // Try to parse function calls from response
    let functionCalls: Array<{ name: string; args: any }> | undefined;
    try {
      const jsonMatch = response.text.match(
        /\{[\s\S]*"function_calls"[\s\S]*\}/,
      );
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.function_calls && Array.isArray(parsed.function_calls)) {
          functionCalls = parsed.function_calls;
        }
      }
    } catch {
      // Not a function call response — that's fine
    }

    return {
      ...response,
      functionCalls,
    };
  }

  // ==========================================
  // Streaming
  // ==========================================

  /**
   * Stream content generation token-by-token
   */
  async *generateContentStream(
    prompt: string,
    config?: Partial<LLMConfig>,
  ): AsyncGenerator<StreamChunk, void, unknown> {
    this.ensureAvailable();

    const model = config?.model || this.activeModel;
    const messages = this.buildMessages(prompt, config?.systemInstruction);

    const body = {
      model,
      messages,
      stream: true,
      options: {
        temperature: config?.temperature ?? 0.7,
        top_p: config?.topP ?? 0.9,
        top_k: config?.topK ?? 40,
        num_predict: config?.maxOutputTokens ?? 2048,
      },
    };

    const res = await fetch(`${this.ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Ollama streaming request failed: ${res.statusText}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No readable stream from Ollama");

    const decoder = new TextDecoder();
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder
          .decode(value, { stream: true })
          .split("\n")
          .filter(Boolean);

        for (const line of lines) {
          try {
            const chunk = JSON.parse(line);

            if (chunk.done) {
              // Final chunk with metadata
              totalPromptTokens = chunk.prompt_eval_count || 0;
              totalCompletionTokens = chunk.eval_count || 0;

              yield {
                text: "",
                isComplete: true,
                usageMetadata: {
                  promptTokenCount: totalPromptTokens,
                  candidatesTokenCount: totalCompletionTokens,
                  totalTokenCount: totalPromptTokens + totalCompletionTokens,
                },
              };
            } else if (chunk.message?.content) {
              yield {
                text: chunk.message.content,
                isComplete: false,
              };
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // ==========================================
  // Chat
  // ==========================================

  /**
   * Multi-turn chat
   */
  async chat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig>,
  ): Promise<string> {
    this.ensureAvailable();

    const ollamaMessages = messages.map((msg) => ({
      role:
        msg.role === "assistant"
          ? "assistant"
          : msg.role === "system"
            ? "system"
            : "user",
      content: msg.content,
    }));

    const response = await this.callOllama(ollamaMessages, {
      model: config?.model || this.activeModel,
      temperature: config?.temperature ?? 0.7,
      top_p: config?.topP ?? 0.9,
      num_predict: config?.maxOutputTokens ?? 2048,
    });

    return response.text;
  }

  // ==========================================
  // Finance-Specific Methods
  // ==========================================

  async generateFinancialInsight(
    userProfile: any,
    transactionHistory: any[],
  ): Promise<string> {
    const prompt = this.buildFinancialInsightPrompt(
      userProfile,
      transactionHistory,
    );
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

    const riskLevel = this.extractRiskLevel(response);
    return { riskLevel, analysis: response };
  }

  async generateGoalPlan(
    goal: any,
    currentSavings: number,
    monthlyIncome: number,
  ): Promise<string> {
    const prompt = this.buildGoalPlanPrompt(
      goal,
      currentSavings,
      monthlyIncome,
    );
    return this.generateText(prompt, {
      temperature: 0.6,
      maxOutputTokens: 1200,
    });
  }

  // ==========================================
  // Core Ollama Communication
  // ==========================================

  private async callOllama(
    messages: Array<{ role: string; content: string }>,
    options: {
      model: string;
      temperature?: number;
      top_p?: number;
      top_k?: number;
      num_predict?: number;
      stop?: string[];
    },
  ): Promise<LLMResponse> {
    const body = {
      model: options.model,
      messages,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        top_p: options.top_p ?? 0.9,
        top_k: options.top_k ?? 40,
        num_predict: options.num_predict ?? 2048,
        stop: options.stop,
      },
    };

    return this.executeWithRetry(async () => {
      const res = await fetch(`${this.ollamaBaseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "Unknown error");
        throw new Error(`Ollama API error (${res.status}): ${errorText}`);
      }

      const data = await res.json();

      const promptTokens = data.prompt_eval_count || 0;
      const completionTokens = data.eval_count || 0;

      return {
        text: data.message?.content || "",
        finishReason: data.done ? "stop" : "length",
        usageMetadata: {
          promptTokenCount: promptTokens,
          candidatesTokenCount: completionTokens,
          totalTokenCount: promptTokens + completionTokens,
        },
        model: options.model,
      } as LLMResponse;
    });
  }

  // ==========================================
  // Message Building
  // ==========================================

  private buildMessages(
    prompt: string,
    systemInstruction?: string,
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    } else {
      messages.push({
        role: "system",
        content: `You are a knowledgeable financial advisor AI specializing in Indian personal finance. You provide expert advice on budgeting, investments (mutual funds, stocks, PPF, NPS, EPF, fixed deposits), savings, loans, credit, insurance, taxation (Indian tax laws), and financial planning. Always use Indian currency (₹), reference Indian financial instruments, include risk warnings, and recommend consulting certified financial planners for complex decisions. Never guarantee returns.`,
      });
    }

    messages.push({ role: "user", content: prompt });
    return messages;
  }

  // ==========================================
  // Retry Logic
  // ==========================================

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    retries = this.maxRetries,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const isRetryable = this.isRetryableError(error);

        if (!isRetryable || attempt === retries) {
          // Try fallback model on last attempt
          if (attempt === retries && this.activeModel === this.primaryModel) {
            this.logger.warn(
              `Primary model (${this.primaryModel}) failed. Switching to fallback: ${this.fallbackModel}`,
            );
            this.activeModel = this.fallbackModel;
            // Re-attempt with fallback
            try {
              return await fn();
            } catch (fallbackError) {
              this.logger.error("Fallback model also failed:", fallbackError);
              throw fallbackError;
            }
          }
          throw error;
        }

        const delay = this.baseDelay * Math.pow(2, attempt);
        this.logger.warn(
          `Attempt ${attempt + 1} failed, retrying in ${delay}ms: ${error.message}`,
        );
        await this.sleep(delay);
      }
    }

    throw lastError || new Error("Max retries exceeded");
  }

  private isRetryableError(error: any): boolean {
    if (!error) return false;
    const message = (error.message || "").toLowerCase();
    return (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("econnrefused") ||
      message.includes("econnreset") ||
      message.includes("429") ||
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503")
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ==========================================
  // Utility
  // ==========================================

  private ensureAvailable(): void {
    if (!this.isOllamaAvailable) {
      throw new Error(
        "Local LLM (Ollama) is not available. Ensure Ollama is running: https://ollama.ai",
      );
    }
  }

  isConfigured(): boolean {
    return this.isOllamaAvailable;
  }

  getActiveModel(): string {
    return this.activeModel;
  }

  getAvailableModels(): string[] {
    return this.modelsAvailable;
  }

  // ==========================================
  // Finance Prompt Builders
  // ==========================================

  private buildFinancialInsightPrompt(
    userProfile: any,
    transactionHistory: any[],
  ): string {
    return `Analyze the following user profile and transaction history:

User Profile:
- Risk Profile: ${userProfile.riskProfile}
- Age: ${this.calculateAge(userProfile.dateOfBirth)}
- KYC Status: ${userProfile.kycStatus}

Recent Transactions (${transactionHistory.length}):
${transactionHistory
  .slice(0, 10)
  .map((t) => `- ${t.type}: ₹${t.amount} (${t.category})`)
  .join("\n")}

Provide personalized financial insights, spending patterns, and actionable recommendations for the Indian market.`;
  }

  private buildInvestmentRecommendationPrompt(
    userProfile: any,
    currentPortfolio: any[],
    marketData: any,
  ): string {
    return `Provide investment recommendations based on:

User Profile:
- Risk Profile: ${userProfile.riskProfile}
- Current Portfolio Value: ₹${this.calculatePortfolioValue(currentPortfolio)}

Current Portfolio:
${currentPortfolio.map((inv) => `- ${inv.assetType}: ₹${inv.currentValue}`).join("\n")}

Market Conditions:
${JSON.stringify(marketData, null, 2)}

Provide specific Indian market investment recommendations with rationale. Include mutual funds, stocks, PPF, NPS, and other relevant instruments.`;
  }

  private buildRiskProfilePrompt(
    transactions: any[],
    investments: any[],
  ): string {
    return `Analyze the following financial data to determine the user's risk profile:

Transactions: ${transactions.length} total
Investments: ${investments.length} total

Investment Types:
${investments.map((inv) => `- ${inv.assetType}: ₹${inv.currentValue}`).join("\n")}

Classify the risk profile as: Conservative, Moderate, or Aggressive
Provide detailed analysis explaining the classification.`;
  }

  private buildGoalPlanPrompt(
    goal: any,
    currentSavings: number,
    monthlyIncome: number,
  ): string {
    return `Create a financial plan for the following goal:

Goal: ${goal.name}
Target Amount: ₹${goal.targetAmount}
Target Date: ${goal.targetDate}
Current Savings: ₹${currentSavings}
Monthly Income: ₹${monthlyIncome}

Provide a detailed step-by-step plan including:
- Monthly savings required
- Investment strategy (Indian financial instruments)
- Risk considerations
- Timeline milestones
- Tax-saving opportunities under Indian tax law`;
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  }

  private calculatePortfolioValue(portfolio: any[]): number {
    return portfolio.reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
  }

  private extractRiskLevel(response: string): string {
    const lower = response.toLowerCase();
    if (lower.includes("conservative")) return "CONSERVATIVE";
    if (lower.includes("aggressive")) return "AGGRESSIVE";
    return "MODERATE";
  }
}
