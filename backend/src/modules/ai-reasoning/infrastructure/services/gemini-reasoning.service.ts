import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';

export interface GeminiRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GeminiResponse {
  content: string;
  tokensUsed: number;
  success: boolean;
  error?: string;
}

/**
 * Gemini Pro Integration Service
 * Handles all communication with Google Gemini Pro API
 * 
 * Features:
 * - Automatic retry with exponential backoff
 * - Rate limiting awareness
 * - Token usage tracking
 * - Error handling and fallbacks
 * - Request/response logging
 */
@Injectable()
export class GeminiReasoningService {
  private readonly logger = new Logger(GeminiReasoningService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: GenerativeModel;
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000; // 1 second

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('gemini.apiKey');
    if (!apiKey) {
      this.logger.error('Gemini API key not configured');
      throw new Error('GEMINI_API_KEY is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-pro',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });
  }

  /**
   * Send a request to Gemini Pro with retry logic
   */
  async generateResponse(request: GeminiRequest): Promise<GeminiResponse> {
    this.logger.debug(`Generating AI response with temperature: ${request.temperature || 0.7}`);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const startTime = Date.now();

        // Construct the full prompt
        const fullPrompt = this.constructPrompt(request.systemPrompt, request.userPrompt);

        // Generate content
        const result = await this.model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        const duration = Date.now() - startTime;

        // Estimate token usage (rough approximation: 1 token ≈ 4 characters)
        const tokensUsed = Math.ceil((fullPrompt.length + text.length) / 4);

        this.logger.log(
          `Gemini response generated successfully (attempt ${attempt}/${this.maxRetries}, ${duration}ms, ~${tokensUsed} tokens)`,
        );

        return {
          content: text,
          tokensUsed,
          success: true,
        };
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Gemini API request failed (attempt ${attempt}/${this.maxRetries}): ${error.message}`,
        );

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          this.logger.error(`Non-retryable error encountered: ${error.message}`);
          break;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < this.maxRetries) {
          const delay = this.calculateBackoff(attempt);
          this.logger.debug(`Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    this.logger.error(`All retry attempts exhausted. Last error: ${lastError?.message}`);
    return {
      content: '',
      tokensUsed: 0,
      success: false,
      error: lastError?.message || 'Unknown error occurred',
    };
  }

  /**
   * Validate response for safety and quality
   */
  validateResponse(content: string): { valid: boolean; reason?: string } {
    // Check for empty response
    if (!content || content.trim().length === 0) {
      return { valid: false, reason: 'Empty response' };
    }

    // Check minimum length
    if (content.length < 20) {
      return { valid: false, reason: 'Response too short' };
    }

    // Check for blocked content indicators
    const blockedPhrases = [
      'I cannot assist',
      'I\'m unable to help',
      'I don\'t have access',
      'blocked by safety',
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
      'risk',
      'volatile',
      'consult',
      'advisor',
      'not guaranteed',
      'past performance',
      'investment risk',
    ];

    const lowerContent = content.toLowerCase();
    return warningKeywords.some((keyword) => lowerContent.includes(keyword));
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  private constructPrompt(systemPrompt: string, userPrompt: string): string {
    return `${systemPrompt}\n\n---\n\n${userPrompt}`;
  }

  private isRetryableError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || '';

    // Retryable errors
    const retryablePatterns = [
      'rate limit',
      'timeout',
      'network',
      'service unavailable',
      'internal error',
      'quota exceeded',
      '429',
      '500',
      '502',
      '503',
      '504',
    ];

    return retryablePatterns.some((pattern) => errorMessage.includes(pattern));
  }

  private calculateBackoff(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s...
    return this.baseDelay * Math.pow(2, attempt - 1);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
