import { Injectable, Logger } from '@nestjs/common';
import { GeminiService, StreamChunk } from '../../../../core/integrations/gemini/gemini.service';

export interface StreamOptions {
  userId: string;
  onChunk?: (chunk: string) => void;
  onComplete?: (metadata: any) => void;
  onError?: (error: Error) => void;
}

/**
 * Streaming Response Service
 * 
 * Handles:
 * - Real-time streaming from Gemini
 * - Sentence-based chunking for smooth UX
 * - Buffer management and error recovery
 */
@Injectable()
export class StreamingResponseService {
  private readonly logger = new Logger(StreamingResponseService.name);

  constructor(private readonly geminiService: GeminiService) {}

  /**
   * Stream Gemini response with sentence-based chunking
   */
  async *streamResponse(
    prompt: string,
    config?: any,
  ): AsyncGenerator<string, void, unknown> {
    try {
      const stream = this.geminiService.generateContentStream(prompt, config);

      let buffer = '';
      let chunkCount = 0;

      for await (const chunk of stream) {
        if (chunk.isComplete) {
          // Yield remaining buffer
          if (buffer) {
            yield buffer;
            chunkCount++;
          }

          this.logger.debug(
            `Stream completed. Total chunks: ${chunkCount}, Tokens: ${chunk.usageMetadata?.totalTokenCount}`,
          );
          break;
        }

        buffer += chunk.text;

        // Yield complete sentences for smooth display
        const sentences = this.extractCompleteSentences(buffer);
        for (const sentence of sentences) {
          yield sentence;
          chunkCount++;
          buffer = buffer.substring(sentence.length);
        }
      }
    } catch (error) {
      this.logger.error('Streaming error:', error);
      throw error;
    }
  }

  /**
   * Extract complete sentences from buffer
   */
  private extractCompleteSentences(buffer: string): string[] {
    const sentences: string[] = [];
    
    // Match sentences ending with . ! ? followed by space or newline
    const sentencePattern = /[^.!?\n]+[.!?]+(?:\s|\n|$)/g;
    let match;

    while ((match = sentencePattern.exec(buffer)) !== null) {
      sentences.push(match[0]);
    }

    return sentences;
  }

  /**
   * Stream with backpressure handling
   */
  async streamWithBackpressure(
    prompt: string,
    config: any,
    maxBufferSize: number = 5,
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const queue: string[] = [];
    let isStreamComplete = false;
    let error: Error | null = null;

    // Start streaming in background
    (async () => {
      try {
        for await (const chunk of this.streamResponse(prompt, config)) {
          // Wait if queue is full (backpressure)
          while (queue.length >= maxBufferSize) {
            await this.sleep(10);
          }
          queue.push(chunk);
        }
        isStreamComplete = true;
      } catch (err) {
        error = err as Error;
      }
    })();

    // Generator that consumes the queue
    const generator = async function* () {
      while (!isStreamComplete || queue.length > 0) {
        if (error) throw error;

        if (queue.length > 0) {
          yield queue.shift()!;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
    };

    return generator();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
