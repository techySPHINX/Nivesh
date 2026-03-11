/**
 * Local LLM Reasoning Service
 *
 * Handles all communication with local LLM models (LLaMA-3-8B / Mistral-7B)
 * via Ollama for the AI reasoning pipeline.
 *
 * Features:
 * - Retry with exponential backoff delegated to LLMService.executeWithRetry
 * - Automatic model fallback (primary → fallback) is handled by LLMService
 * - Token usage estimation
 * - Error handling and structured response wrapping
 * - Request/response logging
 */
import { Injectable, Logger } from "@nestjs/common";
import { LLMService } from "../../../../core/integrations/llm/llm.service";

export interface LLMReasoningRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMReasoningResponse {
  content: string;
  tokensUsed: number;
  success: boolean;
  error?: string;
  model?: string;
}

@Injectable()
export class LLMReasoningService {
  private readonly logger = new Logger(LLMReasoningService.name);

  constructor(private readonly llmService: LLMService) {}

  /**
   * Send a request to the local LLM.
   *
   * Retry/backoff and primary→fallback model switching are handled internally
   * by `LLMService` (via `executeWithRetry` in `callOllama`).
   */
  async generateResponse(
    request: LLMReasoningRequest,
  ): Promise<LLMReasoningResponse> {
    this.logger.debug(
      `Generating AI response with temperature: ${request.temperature || 0.7}`,
    );

    try {
      const startTime = Date.now();

      const response = await this.llmService.generateText(request.userPrompt, {
        systemInstruction: request.systemPrompt,
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 2048,
      });

      const duration = Date.now() - startTime;
      const tokensUsed = Math.ceil(
        (request.systemPrompt.length +
          request.userPrompt.length +
          response.length) /
          4,
      );

      this.logger.log(
        `LLM response generated successfully (${duration}ms, ~${tokensUsed} tokens, model: ${this.llmService.getActiveModel()})`,
      );

      return {
        content: response,
        tokensUsed,
        success: true,
        model: this.llmService.getActiveModel(),
      };
    } catch (error) {
      this.logger.error(`LLM reasoning failed: ${error.message}`);
      return {
        content: "",
        tokensUsed: 0,
        success: false,
        error: error.message || "Unknown error occurred",
      };
    }
  }

  /**
   * Validate response for safety and quality
   */
  validateResponse(content: string): { valid: boolean; reason?: string } {
    if (!content || content.trim().length === 0) {
      return { valid: false, reason: "Empty response" };
    }

    if (content.length < 20) {
      return { valid: false, reason: "Response too short" };
    }

    const blockedPhrases = [
      "I cannot assist",
      "I'm unable to help",
      "I don't have access",
      "blocked by safety",
    ];

    for (const phrase of blockedPhrases) {
      if (content.toLowerCase().includes(phrase.toLowerCase())) {
        return { valid: false, reason: `Content blocked: ${phrase}` };
      }
    }

    return { valid: true };
  }

  /**
   * Check if response contains financial advice warnings
   */
  hasFinancialWarnings(content: string): boolean {
    const warningKeywords = [
      "risk",
      "volatile",
      "consult",
      "advisor",
      "not guaranteed",
      "past performance",
      "investment risk",
    ];

    const lowerContent = content.toLowerCase();
    return warningKeywords.some((keyword) => lowerContent.includes(keyword));
  }
}
