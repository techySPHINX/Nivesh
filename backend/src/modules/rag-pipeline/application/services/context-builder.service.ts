import { Injectable, Logger } from '@nestjs/common';
import { RetrievalResult } from '../../domain/entities/retrieval-result.entity';

/**
 * Context Builder Service
 * 
 * Builds enriched prompts from retrieved vectors for LLM generation
 * - Formats context in structured way
 * - Adds source citations
 * - Handles context window limits
 * - Provides instructions for grounded generation
 */
@Injectable()
export class ContextBuilderService {
  private readonly logger = new Logger(ContextBuilderService.name);
  private readonly MAX_CONTEXT_LENGTH = 8000; // tokens (approximate)

  /**
   * Build enriched prompt with retrieved context
   */
  buildPromptWithContext(
    query: string,
    retrievedDocs: RetrievalResult[],
    systemInstructions?: string,
  ): string {
    if (retrievedDocs.length === 0) {
      return this.buildPromptWithoutContext(query, systemInstructions);
    }

    // Group by collection for better organization
    const grouped = this.groupByCollection(retrievedDocs);

    let contextSection = this.buildContextSection(grouped);
    
    // Truncate if too long
    contextSection = this.truncateContext(contextSection);

    const instructions = systemInstructions || this.getDefaultInstructions();

    return `${instructions}

User Query: ${query}

${contextSection}

Instructions for Response:
- Use the above context to answer the user's question
- If the context is insufficient, clearly state what assumptions you're making
- Cite sources using [1], [2], etc. format
- Do not make up information not present in the context
- If you're unsure, say so explicitly
- Prioritize recent information over older data
- Consider user's financial situation from their transaction history

Generate a helpful, accurate, and well-cited response:`;
  }

  /**
   * Build prompt when no context is available
   */
  private buildPromptWithoutContext(
    query: string,
    systemInstructions?: string,
  ): string {
    const instructions = systemInstructions || this.getDefaultInstructions();

    return `${instructions}

User Query: ${query}

Note: No specific context was retrieved for this query. Provide a general response based on your knowledge of personal finance in India.

Important:
- Clearly state that this is general advice
- Recommend user provide more specific information
- Suggest what additional context would be helpful
- Do not make specific recommendations without user's financial data

Generate a helpful response:`;
  }

  /**
   * Build context section from grouped results
   */
  private buildContextSection(
    grouped: Map<string, RetrievalResult[]>,
  ): string {
    let contextSection = 'Relevant Context Retrieved:\n\n';
    let sourceIndex = 1;

    // User's financial context (highest priority)
    if (grouped.has('user_context')) {
      contextSection += '📊 Your Financial Data:\n';
      const userDocs = grouped.get('user_context')!;
      
      userDocs.forEach(doc => {
        contextSection += `[${sourceIndex}] ${doc.text}\n`;
        contextSection += `   (Relevance: ${(doc.score * 100).toFixed(0)}%, ${this.formatMetadata(doc.metadata)})\n\n`;
        sourceIndex++;
      });
    }

    // Financial knowledge base
    if (grouped.has('knowledge')) {
      contextSection += '📚 Financial Knowledge:\n';
      const knowledgeDocs = grouped.get('knowledge')!;
      
      knowledgeDocs.forEach(doc => {
        contextSection += `[${sourceIndex}] ${doc.text}\n`;
        contextSection += `   (Source: ${doc.metadata.source || 'Knowledge Base'}, Relevance: ${(doc.score * 100).toFixed(0)}%)\n\n`;
        sourceIndex++;
      });
    }

    // Conversation history (for context continuity)
    if (grouped.has('conversation')) {
      contextSection += '💬 Previous Conversations:\n';
      const conversationDocs = grouped.get('conversation')!;
      
      conversationDocs.forEach(doc => {
        contextSection += `[${sourceIndex}] ${doc.text}\n`;
        contextSection += `   (Previous interaction, Relevance: ${(doc.score * 100).toFixed(0)}%)\n\n`;
        sourceIndex++;
      });
    }

    return contextSection;
  }

  /**
   * Group results by collection
   */
  private groupByCollection(
    results: RetrievalResult[],
  ): Map<string, RetrievalResult[]> {
    const grouped = new Map<string, RetrievalResult[]>();

    results.forEach(result => {
      if (!grouped.has(result.collection)) {
        grouped.set(result.collection, []);
      }
      grouped.get(result.collection)!.push(result);
    });

    return grouped;
  }

  /**
   * Format metadata for display
   */
  private formatMetadata(metadata: Record<string, any>): string {
    const parts: string[] = [];

    if (metadata.contextType) {
      parts.push(`Type: ${metadata.contextType}`);
    }

    if (metadata.date) {
      const date = new Date(metadata.date);
      parts.push(`Date: ${date.toLocaleDateString('en-IN')}`);
    }

    if (metadata.amount) {
      parts.push(`Amount: ₹${metadata.amount.toLocaleString('en-IN')}`);
    }

    if (metadata.category) {
      parts.push(`Category: ${metadata.category}`);
    }

    return parts.join(', ');
  }

  /**
   * Truncate context if it exceeds max length
   * Uses rough token estimation (1 token ≈ 4 characters)
   */
  private truncateContext(context: string): string {
    const maxChars = this.MAX_CONTEXT_LENGTH * 4;
    
    if (context.length <= maxChars) {
      return context;
    }

    this.logger.warn(
      `Context truncated from ${context.length} to ${maxChars} characters`,
    );

    return context.substring(0, maxChars) + '\n\n[Context truncated due to length...]';
  }

  /**
   * Get default system instructions
   */
  private getDefaultInstructions(): string {
    return `You are Nivesh AI, an expert financial advisor specializing in personal finance for Indian users.

Your role:
- Provide accurate, personalized financial advice
- Ground responses in user's actual financial data when available
- Cite all sources using numbered references
- Be transparent about limitations and assumptions
- Follow Indian financial regulations (RBI, SEBI guidelines)
- Use Indian Rupee (₹) for all monetary values
- Consider Indian tax laws and investment options

Quality standards:
- Factual accuracy over speculation
- Source attribution for all claims
- Clear uncertainty markers ("likely", "may", "generally")
- No hallucinated data or fake statistics`;
  }

  /**
   * Build conversation context for follow-up queries
   */
  buildConversationContext(
    currentQuery: string,
    previousExchanges: Array<{ query: string; response: string }>,
  ): string {
    if (previousExchanges.length === 0) {
      return currentQuery;
    }

    let conversationContext = 'Previous Conversation:\n';
    
    previousExchanges.slice(-3).forEach((exchange, index) => {
      conversationContext += `\nUser: ${exchange.query}\n`;
      conversationContext += `Assistant: ${exchange.response}\n`;
    });

    conversationContext += `\nCurrent Query: ${currentQuery}`;

    return conversationContext;
  }

  /**
   * Extract key entities from query for better retrieval
   */
  extractKeyEntities(query: string): {
    amounts: number[];
    dates: string[];
    categories: string[];
  } {
    const amounts: number[] = [];
    const dates: string[] = [];
    const categories: string[] = [];

    // Extract amounts (₹50000, Rs 1 lakh, etc.)
    const amountRegex = /₹?(\d+(?:,\d+)*(?:\.\d+)?)\s*(lakh|crore|thousand|k)?/gi;
    let match;
    
    while ((match = amountRegex.exec(query)) !== null) {
      let amount = parseFloat(match[1].replace(/,/g, ''));
      const unit = match[2]?.toLowerCase();
      
      if (unit === 'lakh') amount *= 100000;
      else if (unit === 'crore') amount *= 10000000;
      else if (unit === 'thousand' || unit === 'k') amount *= 1000;
      
      amounts.push(amount);
    }

    // Extract dates (would need more sophisticated NLP in production)
    const monthRegex = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi;
    const matches = query.match(monthRegex);
    if (matches) {
      dates.push(...matches);
    }

    // Extract common categories (simplified)
    const categoryKeywords = [
      'food', 'transport', 'housing', 'entertainment', 'utilities',
      'healthcare', 'education', 'shopping', 'investment', 'savings',
    ];
    
    categoryKeywords.forEach(keyword => {
      if (query.toLowerCase().includes(keyword)) {
        categories.push(keyword);
      }
    });

    return { amounts, dates, categories };
  }

  /**
   * Build metadata filters from query entities
   */
  buildFiltersFromQuery(query: string): Record<string, any> {
    const entities = this.extractKeyEntities(query);
    const filters: Record<string, any> = {};

    if (entities.amounts.length > 0) {
      filters.minAmount = Math.min(...entities.amounts) * 0.8;
      filters.maxAmount = Math.max(...entities.amounts) * 1.2;
    }

    if (entities.categories.length > 0) {
      filters.categories = entities.categories;
    }

    return filters;
  }
}
