import { Tool } from '../types/agent.types';

/**
 * LLM Response Generation Tool
 * Integrates with Gemini AI for natural language generation.
 *
 * Use Cases:
 * - Synthesizing multi-agent results into cohesive narrative
 * - Generating personalized financial advice
 * - Creating user-friendly summaries
 * - Answering complex financial questions
 *
 * Example:
 * Input: Agent results from 5 specialized agents
 * Output: "Based on analysis, you need to save ₹65K/month with 78% success
 *         probability. Your current risk level is MEDIUM - consider building
 *         emergency fund. Recommended allocation: 50% equity, 35% debt..."
 *
 * @tool generate_llm_response
 */

interface LLMGenerationInput {
  prompt: string;              // Input prompt for LLM
  maxTokens?: number;          // Max response length (default: 1000)
  temperature?: number;        // Creativity (0-1, default: 0.7)
  systemPrompt?: string;       // System instructions
  stopSequences?: string[];    // Stop generation at these strings
}

interface LLMGenerationResult {
  text: string;                    // Generated text
  tokensUsed: number;              // Tokens consumed
  model: string;                   // Model used
  finishReason: string;            // Why generation stopped
  safetyRatings?: Array<{
    category: string;
    probability: string;
  }>;
}

/**
 * Mock Gemini Service
 * TODO: Replace with actual Gemini AI integration
 */
class MockGeminiService {
  async generateContent(
    prompt: string,
    options: {
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    },
  ): Promise<any> {
    // This is a mock implementation
    // In production, replace with actual Gemini API call:
    // return await this.geminiClient.generateContent({ prompt, ...options });

    // Generate mock response based on prompt keywords
    let mockResponse = '';

    if (prompt.includes('goal') || prompt.includes('house') || prompt.includes('save')) {
      mockResponse = `Based on comprehensive financial analysis, here's your personalized plan:

**Savings Strategy**: You need to save ₹65,000 per month to achieve your house purchase goal of ₹50 lakhs in 5 years. This represents 43% of your monthly income, which is feasible but requires discipline.

**Investment Allocation**: A moderate risk profile is recommended with 50% equity, 35% debt, and 15% in gold/cash. This balanced approach offers growth potential while managing volatility.

**Success Probability**: Monte Carlo simulation shows a 78% probability of meeting your goal. The median outcome is ₹55 lakhs, giving you a comfortable buffer.

**Risk Management**: Your current risk level is MEDIUM. Priority actions:
1. Build emergency fund to 6 months (currently at 4 months)
2. Reduce debt-to-income ratio from 35% to below 30%
3. Set up automated SIPs to ensure consistent investing

**Tax Optimization**: By investing ₹1.5L annually in ELSS and PPF, you'll save ₹45,000 in taxes under Section 80C.

**Action Plan**:
- Start SIPs immediately: ₹30K equity MF, ₹25K debt funds, ₹10K PPF
- Set budget alerts at 80% for top spending categories
- Review portfolio quarterly for rebalancing
- Monitor goal progress monthly

Stay disciplined with your savings plan, and you'll achieve your dream home on schedule!`;
    } else if (prompt.includes('portfolio') || prompt.includes('investment')) {
      mockResponse = `**Portfolio Health Check**:

Your current investment portfolio shows a 65% equity allocation, which is slightly aggressive for your risk profile. Here's the analysis:

**Asset Allocation**: Current vs Recommended
- Equity: 65% → 50% (reduce by ₹3L)
- Debt: 25% → 35% (increase by ₹2L)
- Gold: 5% → 10% (increase by ₹1L)
- Cash: 5% → 5% (maintain)

**Performance**: Your portfolio has generated 14.2% returns in the last year, outperforming the benchmark by 2.1%. However, volatility is higher than optimal for your risk appetite.

**Rebalancing Recommendation**: Shift ₹3 lakhs from equity to debt funds to align with moderate risk profile. This will reduce portfolio volatility by ~25% while maintaining healthy returns.

**Next Steps**: Execute rebalancing within this month to lock in equity gains and reduce downside risk.`;
    } else {
      mockResponse = `Based on the financial analysis provided, here are the key insights and recommendations tailored to your situation. Your financial health shows promise, with opportunities for optimization through strategic planning and disciplined execution. Focus on maintaining consistency in savings, diversifying investments appropriately, and monitoring progress regularly. Specific action items have been identified to help you achieve your financial goals within the desired timeline.`;
    }

    return {
      text: mockResponse,
      tokensUsed: Math.floor(mockResponse.split(' ').length * 1.3), // Rough estimate
      model: 'gemini-pro',
      finishReason: 'STOP',
    };
  }
}

const mockGeminiService = new MockGeminiService();

export const generateLLMResponseTool: Tool = {
  name: 'generate_llm_response',
  description:
    'Generate natural language responses using Gemini AI for synthesizing financial insights and advice',
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
        description: 'Sampling temperature for creativity (0-1, default: 0.7)',
        minimum: 0,
        maximum: 1,
        default: 0.7,
      },
      systemPrompt: {
        type: 'string',
        description: 'System instructions for LLM behavior (optional)',
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

    // Validate inputs
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    if (temperature < 0 || temperature > 1) {
      throw new Error('Temperature must be between 0 and 1');
    }

    try {
      // Call Gemini AI
      // TODO: Replace with actual Gemini integration
      const result = await mockGeminiService.generateContent(prompt, {
        maxTokens,
        temperature,
        systemPrompt,
      });

      return {
        text: result.text,
        tokensUsed: result.tokensUsed,
        model: result.model,
        finishReason: result.finishReason,
        safetyRatings: [
          {
            category: 'HARM_CATEGORY_FINANCIALLY_DANGEROUS',
            probability: 'NEGLIGIBLE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            probability: 'NEGLIGIBLE',
          },
        ],
      };
    } catch (error) {
      throw new Error(`LLM generation failed: ${error.message}`);
    }
  },
};
