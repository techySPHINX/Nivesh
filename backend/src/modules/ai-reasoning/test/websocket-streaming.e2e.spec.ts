// @ts-nocheck
/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../../../app.module';

describe('WebSocket Streaming E2E Tests', () => {
  let app: INestApplication;
  let clientSocket: Socket;
  const testUserId = 'websocket-test-user';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(3001); // Start on port 3001
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach((done: jest.DoneCallback) => {
    clientSocket = io('http://localhost:3001/ai-chat', {
      transports: ['websocket'],
      reconnection: false,
    });
    clientSocket.on('connect', done);
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Connection Lifecycle', () => {
    it('should connect successfully', (done: jest.DoneCallback) => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    it('should receive connection event', (done: jest.DoneCallback) => {
      clientSocket.on('connected', (data: any) => {
        expect(data.message).toContain('Connected to AI Chat');
        done();
      });
    });

    it('should disconnect gracefully', (done: jest.DoneCallback) => {
      clientSocket.on('disconnect', () => {
        expect(clientSocket.connected).toBe(false);
        done();
      });
      clientSocket.disconnect();
    });
  });

  describe('Streaming Responses', () => {
    it('should stream response chunks', (done: jest.DoneCallback) => {
      const chunks: string[] = [];
      let streamStarted = false;

      clientSocket.on('stream_started', (data: any) => {
        expect(data.traceId).toBeTruthy();
        streamStarted = true;
      });

      clientSocket.on('response_chunk', (data: any) => {
        expect(data.chunk).toBeTruthy();
        expect(data.isComplete).toBeDefined();
        chunks.push(data.chunk);
      });

      clientSocket.on('stream_complete', (data: any) => {
        expect(streamStarted).toBe(true);
        expect(chunks.length).toBeGreaterThan(0);
        expect(data.fullText).toBeTruthy();
        expect(data.metadata).toHaveProperty('tokensUsed');
        expect(data.metadata).toHaveProperty('latencyMs');
        done();
      });

      clientSocket.on('error', (error: any) => {
        done(error);
      });

      clientSocket.emit('query', {
        prompt: 'Explain the power of compounding in simple terms',
        userId: testUserId,
        temperature: 0.7,
      });
    }, 30000); // 30s timeout for streaming

    it('should handle function calling in streaming mode', (done: jest.DoneCallback) => {
      const chunks: string[] = [];

      clientSocket.on('stream_started', (data: any) => {
        expect(data.traceId).toBeTruthy();
      });

      clientSocket.on('response_chunk', (data: any) => {
        chunks.push(data.chunk);
      });

      clientSocket.on('stream_complete', (data: any) => {
        expect(data.fullText).toBeTruthy();
        expect(data.functionCalls).toBeDefined();
        expect(data.functionCalls.length).toBeGreaterThan(0);
        
        const emiCall = data.functionCalls.find(
          (call: any) => call.name === 'calculate_emi'
        );
        expect(emiCall).toBeDefined();
        done();
      });

      clientSocket.emit('query', {
        prompt: 'Calculate EMI for ₹25 lakh loan at 9% for 20 years',
        userId: testUserId,
        enableFunctions: true,
      });
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle PII detection in streaming', (done: jest.DoneCallback) => {
      clientSocket.on('error', (error: any) => {
        expect(error.message).toContain('PII detected');
        done();
      });

      clientSocket.emit('query', {
        prompt: 'My PAN is ABCDE1234F, should I invest?',
        userId: testUserId,
      });
    });

    it('should handle harmful intent in streaming', (done: jest.DoneCallback) => {
      clientSocket.on('error', (error: any) => {
        expect(error.message).toContain('harmful intent');
        done();
      });

      clientSocket.emit('query', {
        prompt: 'How to manipulate stock prices?',
        userId: testUserId,
      });
    });

    it('should handle empty prompt', (done: jest.DoneCallback) => {
      clientSocket.on('error', (error: any) => {
        expect(error.message).toContain('Prompt is required');
        done();
      });

      clientSocket.emit('query', {
        prompt: '',
        userId: testUserId,
      });
    });
  });

  describe('User Feedback', () => {
    it('should accept positive feedback', (done: jest.DoneCallback) => {
      let traceId: string;

      clientSocket.on('stream_started', (data: any) => {
        traceId = data.traceId;
      });

      clientSocket.on('stream_complete', () => {
        // Send feedback
        clientSocket.emit('feedback', {
          traceId,
          rating: 1, // thumbs up
          comment: 'Very helpful!',
        });

        // Wait a bit for processing
        setTimeout(() => {
          done();
        }, 1000);
      });

      clientSocket.emit('query', {
        prompt: 'What is diversification?',
        userId: testUserId,
      });
    }, 30000);

    it('should accept negative feedback', (done: jest.DoneCallback) => {
      let traceId: string;

      clientSocket.on('stream_started', (data: any) => {
        traceId = data.traceId;
      });

      clientSocket.on('stream_complete', () => {
        clientSocket.emit('feedback', {
          traceId,
          rating: -1, // thumbs down
          comment: 'Not accurate',
        });

        setTimeout(() => {
          done();
        }, 1000);
      });

      clientSocket.emit('query', {
        prompt: 'What is inflation?',
        userId: testUserId,
      });
    }, 30000);
  });

  describe('Concurrent Connections', () => {
    it('should handle multiple clients simultaneously', (done: jest.DoneCallback) => {
      const client2 = io('http://localhost:3001/ai-chat', {
        transports: ['websocket'],
      });
      const client3 = io('http://localhost:3001/ai-chat', {
        transports: ['websocket'],
      });

      let completions = 0;
      const checkDone = () => {
        completions++;
        if (completions === 3) {
          client2.disconnect();
          client3.disconnect();
          done();
        }
      };

      clientSocket.on('stream_complete', checkDone);
      client2.on('stream_complete', checkDone);
      client3.on('stream_complete', checkDone);

      clientSocket.emit('query', {
        prompt: 'What is equity?',
        userId: testUserId + '-1',
      });
      client2.emit('query', {
        prompt: 'What is debt?',
        userId: testUserId + '-2',
      });
      client3.emit('query', {
        prompt: 'What is gold?',
        userId: testUserId + '-3',
      });
    }, 45000);
  });

  describe('Backpressure Handling', () => {
    it('should handle rapid queries gracefully', (done: jest.DoneCallback) => {
      let completedQueries = 0;
      const totalQueries = 5;

      clientSocket.on('stream_complete', () => {
        completedQueries++;
        if (completedQueries === totalQueries) {
          expect(completedQueries).toBe(totalQueries);
          done();
        }
      });

      // Send 5 queries rapidly
      for (let i = 0; i < totalQueries; i++) {
        clientSocket.emit('query', {
          prompt: `What is investment type ${i + 1}?`,
          userId: testUserId,
        });
      }
    }, 60000);
  });
});
