import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { StreamingResponseService } from '../../infrastructure/services/streaming-response.service';
import { PromptManagementService } from '../../infrastructure/services/prompt-management.service';
import { SafetyGuardrailsService } from '../../infrastructure/services/safety-guardrails.service';
import { PrismaService } from '../../../../core/database/postgres/prisma.service';

interface QueryPayload {
  query: string;
  userId: string;
  promptName?: string;
  sessionId?: string;
}

/**
 * AI Chat WebSocket Gateway
 * 
 * Handles:
 * - Real-time streaming responses
 * - Connection lifecycle management
 * - Rate limiting per socket
 * - Error recovery
 */
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/ai-chat',
})
export class AIChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AIChatGateway.name);
  private activeStreams = new Map<string, boolean>(); // socketId -> isStreaming

  constructor(
    private readonly streamingService: StreamingResponseService,
    private readonly promptMgmt: PromptManagementService,
    private readonly safetyService: SafetyGuardrailsService,
    private readonly prisma: PrismaService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    
    // Send welcome message
    client.emit('connection_established', {
      message: 'Connected to AI Chat',
      socketId: client.id,
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Clean up active streams
    this.activeStreams.delete(client.id);
  }

  @SubscribeMessage('query')
  async handleQuery(
    @MessageBody() data: QueryPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const startTime = Date.now();
    const traceId = `${client.id}_${Date.now()}`;
    
    try {
      // Check if already streaming
      if (this.activeStreams.get(client.id)) {
        client.emit('error', {
          message: 'Already processing a query. Please wait.',
        });
        return;
      }

      this.activeStreams.set(client.id, true);

      // 1. Safety check on input
      const inputSafety = await this.safetyService.checkInputSafety(
        data.query,
        data.userId,
      );

      if (!inputSafety.safe) {
        client.emit('safety_blocked', {
          reason: inputSafety.reason,
          category: inputSafety.category,
        });
        this.activeStreams.delete(client.id);
        return;
      }

      // 2. Get prompt configuration
      const promptConfig = await this.promptMgmt.getPromptForUser(
        data.userId,
        data.promptName || 'default_financial_advisor',
      );

      // 3. Build prompt with system instruction
      const fullPrompt = this.buildPrompt(data.query, promptConfig.systemInstruction);

      // 4. Stream response
      client.emit('stream_started', { traceId });

      let fullResponse = '';
      let tokenCount = 0;

      try {
        const stream = this.streamingService.streamResponse(fullPrompt, {
          model: promptConfig.model,
          temperature: promptConfig.temperature,
          topP: promptConfig.topP,
          topK: promptConfig.topK,
          maxOutputTokens: promptConfig.maxTokens,
        });

        for await (const chunk of stream) {
          fullResponse += chunk;
          client.emit('response_chunk', { text: chunk, traceId });
        }

        // 5. Post-stream safety check
        const outputSafety = await this.safetyService.checkOutputSafety(
          fullResponse,
          undefined,
          data.query,
        );

        // Apply modifications if needed (e.g., disclaimer injection)
        if (outputSafety.modifiedResponse) {
          const disclaimerChunk = outputSafety.modifiedResponse.substring(fullResponse.length);
          client.emit('response_chunk', { text: disclaimerChunk, traceId });
          fullResponse = outputSafety.modifiedResponse;
        }

        // 6. Complete stream
        const latencyMs = Date.now() - startTime;
        
        client.emit('stream_complete', {
          traceId,
          latencyMs,
          tokenCount: Math.ceil(fullResponse.length / 4), // Rough estimate
        });

        // 7. Log execution for metrics
        await this.logExecution({
          promptId: promptConfig.id,
          userId: data.userId,
          inputText: data.query,
          outputText: fullResponse,
          tokensUsed: tokenCount,
          latencyMs,
          traceId,
          safetyTriggered: !outputSafety.safe,
          safetyReason: outputSafety.reason,
        });

        this.logger.log(
          `Query processed successfully. TraceId: ${traceId}, Latency: ${latencyMs}ms`,
        );
      } catch (streamError) {
        this.logger.error('Streaming error:', streamError);
        client.emit('error', {
          message: 'Failed to generate response',
          traceId,
        });
      }
    } catch (error) {
      this.logger.error('Query handling error:', error);
      client.emit('error', {
        message: 'An error occurred processing your query',
      });
    } finally {
      this.activeStreams.delete(client.id);
    }
  }

  @SubscribeMessage('cancel_stream')
  handleCancelStream(@ConnectedSocket() client: Socket) {
    this.logger.log(`Stream cancellation requested: ${client.id}`);
    this.activeStreams.delete(client.id);
    client.emit('stream_cancelled');
  }

  @SubscribeMessage('feedback')
  async handleFeedback(
    @MessageBody() data: { traceId: string; feedback: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Update execution with user feedback
      await this.prisma.promptExecution.updateMany({
        where: { traceId: data.traceId },
        data: { userFeedback: data.feedback },
      });

      client.emit('feedback_received', { traceId: data.traceId });
      
      this.logger.debug(`Feedback received for trace ${data.traceId}: ${data.feedback}`);
    } catch (error) {
      this.logger.error('Failed to save feedback:', error);
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: Date.now() });
  }

  private buildPrompt(userQuery: string, systemInstruction?: string): string {
    const defaultInstruction = `You are a helpful financial advisor AI for Nivesh, an AI-native financial planning platform.

Your role:
- Provide personalized financial advice based on user's data
- Be clear, concise, and actionable
- Always cite sources when using retrieved context
- If uncertain, clearly state assumptions
- Never guarantee investment returns
- Always include appropriate disclaimers`;

    const instruction = systemInstruction || defaultInstruction;

    return `${instruction}\n\nUser Question: ${userQuery}`;
  }

  private async logExecution(data: {
    promptId: string;
    userId: string;
    inputText: string;
    outputText: string;
    tokensUsed: number;
    latencyMs: number;
    traceId: string;
    safetyTriggered: boolean;
    safetyReason?: string;
  }): Promise<void> {
    try {
      await this.prisma.promptExecution.create({
        data: {
          promptId: data.promptId,
          userId: data.userId,
          inputText: data.inputText,
          outputText: data.outputText,
          tokensUsed: data.tokensUsed,
          latencyMs: data.latencyMs,
          traceId: data.traceId,
          safetyTriggered: data.safetyTriggered,
          safetyReason: data.safetyReason,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log execution:', error);
      // Don't throw - logging failure shouldn't break the flow
    }
  }
}
