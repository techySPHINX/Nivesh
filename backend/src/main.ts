// Must be loaded before any other import to instrument modules
import './tracing';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './core/exceptions/exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Create NestJS application — CORS is configured explicitly below
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    cors: false,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // ── CORS: Restrict to known origins ──────────────────────
  const corsOriginsRaw = configService.get<string>('CORS_ALLOWED_ORIGINS', '');
  const allowedOrigins = corsOriginsRaw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (nodeEnv === 'production' && allowedOrigins.length === 0) {
    logger.warn(
      '⚠️  CORS_ALLOWED_ORIGINS is empty in production — all cross-origin requests will be rejected. ' +
      'Set CORS_ALLOWED_ORIGINS=https://app.nivesh.finance in your environment.',
    );
  }

  // In development, allow localhost origins as a fallback
  const effectiveOrigins =
    allowedOrigins.length > 0
      ? allowedOrigins
      : nodeEnv === 'development'
        ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173']
        : [];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, health checks)
      if (!origin) {
        return callback(null, true);
      }
      if (effectiveOrigins.includes(origin)) {
        return callback(null, true);
      }
      logger.warn(`CORS: Blocked request from disallowed origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Request-Id'],
    maxAge: 86400, // 24h preflight cache
  });

  logger.log(`🔒 CORS configured — allowed origins: ${effectiveOrigins.join(', ') || '(none)'}`);


  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  if (nodeEnv === 'development' || configService.get<boolean>('ENABLE_SWAGGER_DOCS', true)) {
    const config = new DocumentBuilder()
      .setTitle('Nivesh API')
      .setDescription('AI-Native Financial Reasoning Platform API Documentation')
      .setVersion('1.0')
      .addTag('health', 'Health check endpoints')
      .addTag('users', 'User management')
      .addTag('financial-data', 'Financial data ingestion and management')
      .addTag('knowledge-graph', 'Financial knowledge graph operations')
      .addTag('ai-reasoning', 'AI-powered financial reasoning')
      .addTag('simulations', 'Financial scenario simulations')
      .addTag('goals', 'Goal planning and tracking')
      .addTag('alerts', 'Smart alerts and notifications')
      .addTag('analytics', 'Analytics and insights')
      .addTag('rag-pipeline', 'RAG vector indexing and semantic retrieval')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    logger.log(`📚 Swagger documentation available at http://localhost:${port}/api/docs`);
  }

  // Start server
  await app.listen(port);

  logger.log(`🚀 Nivesh Backend is running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`🌍 Environment: ${nodeEnv}`);
  logger.log(`📊 Health check: http://localhost:${port}/${apiPrefix}/health`);
}

bootstrap();
