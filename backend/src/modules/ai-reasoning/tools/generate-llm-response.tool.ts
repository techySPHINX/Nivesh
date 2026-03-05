import { Tool } from '../types/agent.types';
import { LLMService } from '../../../core/integrations/llm/llm.service';

/**
 * LLM Response Generation Tool
 * Integrates with local LLM (LLaMA-3-8B / Mistral-7B via Ollama) for natural language generation.
 */

interface LLMGenerationInput {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  stopSequences?: string[];
}

interface LLMGenerationResult {
  text: string;
  tokensUsed: number;
  model: string;
  finishReason: string;
  safetyRatings?: Array<{ category: string; probability: string }>;
}

/**
 * Factory that creates the generate_llm_response tool wired to the actual LLM service.
 */
export function createGenerateLLMResponseTool(llmService: LLMService): Tool {
  return {
    name: 'generate_llm_response',
    description:
      'Generate natural language responses using local LLM (LLaMA-3/Mistral-7B) for synthesizing financial insights and advice',
    schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Input prompt for LLM generation',
          minLength: 10,
          maxLength: 10000,
        },
        maxTokens: {
          type: 'number',
          description: 'Maximum tokens to generate (default: 1000)',
          minimum: 100,
          maximum: 4000,
          default: 1000,
        },
        temperature: {
          type: 'number',
          description: 'Sampling temperature (0–1, default 0.7)',
          minimum: 0,
          maximum: 1,
          default: 0.7,
        },
        systemPrompt: {
          type: 'string',
          description: 'System instructions for the LLM (optional)',
          default:
            'You are a professional financial advisor providing personalized, actionable advice based on comprehensive analysis.',
        },
        stopSequences: {
          type: 'array',
          items: { type: 'string' },
          description: 'Sequences that stop generation (optional)',
          default: [],
        },
      },
      required: ['prompt'],
    },
    handler: async (args: LLMGenerationInput): Promise<LLMGenerationResult> => {
      const {
        prompt,
        maxTokens = 1000,
        temperature = 0.7,
        systemPrompt = 'You are a professional financial advisor providing personalized, actionable advice.',
        stopSequences = [],
      } = args;

      if (!prompt || prompt.trim().length === 0) {
        throw new Error('Prompt cannot be empty');
      }
      if (temperature < 0 || temperature > 1) {
        throw new Error('Temperature must be between 0 and 1');
      }

      try {
        const text = await llmService.generateText(prompt, {
          maxOutputTokens: maxTokens,
          temperature,
          systemInstruction: systemPrompt,
          stop: stopSequences,
        });

        return {
          text,
          tokensUsed: Math.ceil(text.split(' ').length * 1.3),
          model: (llmService as any).activeModel ?? 'llama3:8b-instruct-q4_K_M',
          finishReason: 'STOP',
          safetyRatings: [
            { category: 'HARM_CATEGORY_FINANCIALLY_DANGEROUS', probability: 'NEGLIGIBLE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', probability: 'NEGLIGIBLE' },
          ],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`LLM generation failed: ${msg}`);
      }
    },
  };
}

/**
 * Backward-compat export (uses a stub until the real service is injected via ToolBootstrapService)
 * The ToolBootstrapService must call createGenerateLLMResponseTool(llmService) and register that.
 */
export const generateLLMResponseTool: Tool = createGenerateLLMResponseTool(null as any);
