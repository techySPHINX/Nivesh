import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Create NestJS application
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    cors: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

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
