import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
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
    }),
  ],
  exports: [NestConfigModule],
})
export class CoreConfigModule {}
