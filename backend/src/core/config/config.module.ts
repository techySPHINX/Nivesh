import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import databaseConfig from './database.config';
import aiConfig from './ai.config';
import redisConfig from './redis.config';
import kafkaConfig from './kafka.config';
import securityConfig from './security.config';
import qdrantConfig from './qdrant.config';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, aiConfig, redisConfig, kafkaConfig, securityConfig, qdrantConfig],
      envFilePath: ['.env.local', '.env'],
      cache: true,
      validationSchema: Joi.object({
        // Environment
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test', 'staging')
          .required(),
        PORT: Joi.number().default(3000),

        // Security — required in production, optional in dev
        JWT_SECRET: Joi.string().min(32).when('NODE_ENV', {
          is: 'production',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        ENCRYPTION_KEY: Joi.string().min(32).when('NODE_ENV', {
          is: 'production',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),

        // Database
        DATABASE_URL: Joi.string().uri().when('NODE_ENV', {
          is: 'production',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),

        // Redis
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
      }).options({ allowUnknown: true, abortEarly: false }),
    }),
  ],
  exports: [NestConfigModule],
})
export class CoreConfigModule {}
