import { Injectable, Logger } from '@nestjs/common';

export interface SafetyCheckResult {
  safe: boolean;
  reason?: string;
  blockedTerms?: string[];
  category?: string;
  action?: string;
  modifiedResponse?: string;
  confidence?: number;
}

/**
 * Safety & Guardrails Service
 * 
 * Multi-layer safety system:
 * - Pre-LLM: PII detection, harmful intent, consent verification
 * - Post-LLM: Fact verification, hallucination detection, disclaimer injection
 */
@Injectable()
export class SafetyGuardrailsService {
  private readonly logger = new Logger(SafetyGuardrailsService.name);

  // Harmful financial terms that should trigger blocking
  private readonly harmfulTerms = [
    'guaranteed returns',
    'risk-free investment',
    'get rich quick',
    'insider trading',
    'pump and dump',
    'ponzi',
    'pyramid scheme',
    'tax evasion',
    'money laundering',
  ];

  // PII patterns to detect
  private readonly piiPatterns = {
    panCard: /[A-Z]{5}[0-9]{4}[A-Z]{1}/g,
    aadhaar: /\b\d{4}\s\d{4}\s\d{4}\b/g,
    creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone: /\b(\+91[\s-]?)?[6-9]\d{9}\b/g,
  };

  // Financial disclaimer template
  private readonly disclaimer = `\n\n**Important Disclaimer:** This is AI-generated financial information for educational purposes only. It is not professional financial advice. Please consult with a certified financial advisor before making any investment decisions. Past performance does not guarantee future results.`;

  /**
   * Pre-LLM safety checks
   */
  async checkInputSafety(
    userQuery: string,
    userId?: string,
  ): Promise<SafetyCheckResult> {
    // 1. Check for PII
    const piiCheck = this.detectPII(userQuery);
    if (!piiCheck.safe) {
      this.logger.warn(`PII detected in user query for user ${userId}`);
      return piiCheck;
    }

    // 2. Check for harmful intent
    const harmfulCheck = this.detectHarmfulIntent(userQuery);
    if (!harmfulCheck.safe) {
      this.logger.warn(`Harmful intent detected for user ${userId}: ${harmfulCheck.reason}`);
      return harmfulCheck;
    }

    // 3. Check input length (prevent token overflow)
    const lengthCheck = this.checkInputLength(userQuery);
    if (!lengthCheck.safe) {
      return lengthCheck;
    }

    // 4. Check for sensitive operations requiring consent
    const consentCheck = await this.checkConsentRequirements(userQuery, userId);
    if (!consentCheck.safe) {
      return consentCheck;
    }

    return { safe: true };
  }

  /**
   * Post-LLM safety checks
   */
  async checkOutputSafety(
    llmResponse: string,
    ragContext?: string[],
    userQuery?: string,
  ): Promise<SafetyCheckResult> {
    // 1. Fact verification against RAG context
    if (ragContext && ragContext.length > 0) {
      const factCheck = this.verifyFacts(llmResponse, ragContext);
      if (!factCheck.safe) {
        this.logger.warn('Fact verification failed');
        return factCheck;
      }
    }

    // 2. Check for hallucinations (unsupported claims)
    const hallucinationCheck = this.detectHallucination(llmResponse, ragContext);
    if (!hallucinationCheck.safe) {
      this.logger.warn('Potential hallucination detected');
      return hallucinationCheck;
    }

    // 3. Check for harmful financial advice
    const harmfulAdviceCheck = this.detectHarmfulAdvice(llmResponse);
    if (!harmfulAdviceCheck.safe) {
      this.logger.warn('Harmful financial advice detected');
      return harmfulAdviceCheck;
    }

    // 4. Ensure disclaimer is present
    const disclaimerCheck = this.checkDisclaimer(llmResponse);
    if (!disclaimerCheck.safe) {
      // Auto-inject disclaimer
      return {
        safe: true,
        modifiedResponse: this.injectDisclaimer(llmResponse),
      };
    }

    return { safe: true };
  }

  /**
   * Detect PII in text
   */
  private detectPII(text: string): SafetyCheckResult {
    const detectedPII: string[] = [];

    for (const [type, pattern] of Object.entries(this.piiPatterns)) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        detectedPII.push(type);
      }
    }

    if (detectedPII.length > 0) {
      return {
        safe: false,
        reason: 'PII_DETECTED',
        blockedTerms: detectedPII,
        category: 'privacy_violation',
      };
    }

    return { safe: true };
  }

  /**
   * Detect harmful financial intent
   */
  private detectHarmfulIntent(text: string): SafetyCheckResult {
    const lowerText = text.toLowerCase();
    const detected: string[] = [];

    for (const term of this.harmfulTerms) {
      if (lowerText.includes(term)) {
        detected.push(term);
      }
    }

    if (detected.length > 0) {
      return {
        safe: false,
        reason: 'HARMFUL_INTENT',
        blockedTerms: detected,
        category: 'financial_fraud',
      };
    }

    // Check for scam-related patterns
    if (
      lowerText.includes('guaranteed') &&
      (lowerText.includes('profit') || lowerText.includes('return'))
    ) {
      return {
        safe: false,
        reason: 'HARMFUL_INTENT',
        category: 'unrealistic_promises',
      };
    }

    return { safe: true };
  }

  /**
   * Check input length to prevent token overflow
   */
  private checkInputLength(text: string): SafetyCheckResult {
    const maxLength = 10000; // ~2500 tokens
    const tokenEstimate = text.length / 4; // Rough estimate

    if (text.length > maxLength) {
      return {
        safe: false,
        reason: 'INPUT_TOO_LONG',
        category: 'validation_error',
      };
    }

    return { safe: true };
  }

  /**
   * Check if operation requires user consent
   */
  private async checkConsentRequirements(
    query: string,
    userId?: string,
  ): Promise<SafetyCheckResult> {
    const lowerQuery = query.toLowerCase();
    
    // Operations requiring consent
    const sensitiveOperations = [
      { keywords: ['delete', 'remove', 'close account'], action: 'account_deletion' },
      { keywords: ['transfer', 'send money', 'payment'], action: 'financial_transaction' },
      { keywords: ['share', 'export', 'download data'], action: 'data_export' },
    ];

    for (const op of sensitiveOperations) {
      if (op.keywords.some((kw) => lowerQuery.includes(kw))) {
        // In production, check actual user consent from database
        // For now, just flag it
        return {
          safe: false,
          reason: 'CONSENT_REQUIRED',
          action: op.action,
          category: 'consent_verification',
        };
      }
    }

    return { safe: true };
  }

  /**
   * Verify facts against retrieved context
   */
  private verifyFacts(
    llmResponse: string,
    ragContext: string[],
  ): SafetyCheckResult {
    // Simple fact verification - check if key claims are supported by context
    // In production, use semantic similarity or entailment model
    
    const contextText = ragContext.join(' ').toLowerCase();
    const responseText = llmResponse.toLowerCase();

    // Extract numerical claims (e.g., "25%", "₹50,000")
    const numericalClaims = llmResponse.match(/\d+[.,]?\d*%|\₹\s*\d+[.,]?\d*/g);

    if (numericalClaims && numericalClaims.length > 0) {
      // Check if at least some numerical claims appear in context
      const supportedClaims = numericalClaims.filter((claim) =>
        contextText.includes(claim.toLowerCase()),
      );

      const supportRatio = supportedClaims.length / numericalClaims.length;

      if (supportRatio < 0.3) {
        this.logger.warn(
          `Low fact support ratio: ${supportRatio}. Claims: ${numericalClaims.join(', ')}`,
        );
        // Don't block, but flag for review
      }
    }

    return { safe: true };
  }

  /**
   * Detect hallucinations (unsupported claims)
   */
  private detectHallucination(
    llmResponse: string,
    ragContext?: string[],
  ): SafetyCheckResult {
    // Check for absolute statements without context support
    const absoluteStatements = [
      /you will (definitely|certainly|surely)/gi,
      /this will guarantee/gi,
      /there is no risk/gi,
      /100% (safe|secure|guaranteed)/gi,
    ];

    for (const pattern of absoluteStatements) {
      if (pattern.test(llmResponse)) {
        return {
          safe: false,
          reason: 'HALLUCINATION_DETECTED',
          category: 'unsupported_claim',
          confidence: 0.7,
        };
      }
    }

    return { safe: true };
  }

  /**
   * Detect harmful financial advice
   */
  private detectHarmfulAdvice(llmResponse: string): SafetyCheckResult {
    const lowerResponse = llmResponse.toLowerCase();

    // Check for harmful patterns
    const harmfulPatterns = [
      { pattern: /put all (your|the) money/i, reason: 'Advising to put all money in one investment' },
      { pattern: /borrow (money|funds) to invest/i, reason: 'Advising to borrow for investment' },
      { pattern: /skip (emergency fund|insurance)/i, reason: 'Advising to skip safety net' },
      { pattern: /invest in (penny stocks|crypto only)/i, reason: 'Risky single asset class advice' },
    ];

    for (const { pattern, reason } of harmfulPatterns) {
      if (pattern.test(llmResponse)) {
        return {
          safe: false,
          reason: 'HARMFUL_ADVICE',
          category: 'risky_recommendation',
          blockedTerms: [reason],
        };
      }
    }

    return { safe: true };
  }

  /**
   * Check if disclaimer is present
   */
  private checkDisclaimer(llmResponse: string): SafetyCheckResult {
    const hasDisclaimer =
      llmResponse.includes('disclaimer') ||
      llmResponse.includes('not financial advice') ||
      llmResponse.includes('consult');

    if (!hasDisclaimer) {
      return {
        safe: false,
        reason: 'MISSING_DISCLAIMER',
      };
    }

    return { safe: true };
  }

  /**
   * Inject disclaimer into response
   */
  private injectDisclaimer(llmResponse: string): string {
    return llmResponse + this.disclaimer;
  }

  /**
   * Sanitize PII from text (for logging)
   */
  sanitizePII(text: string): string {
    let sanitized = text;

    for (const pattern of Object.values(this.piiPatterns)) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    return sanitized;
  }

  /**
   * Calculate overall safety score
   */
  calculateSafetyScore(
    inputCheck: SafetyCheckResult,
    outputCheck: SafetyCheckResult,
  ): number {
    let score = 1.0;

    if (!inputCheck.safe) score -= 0.5;
    if (!outputCheck.safe) score -= 0.5;

    if (outputCheck.confidence) {
      score *= outputCheck.confidence;
    }

    return Math.max(0, Math.min(1, score));
  }
}
