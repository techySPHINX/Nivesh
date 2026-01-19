import { Module, Global } from '@nestjs/common';
import { KafkaModule as NestKafkaModule } from './kafka/kafka.module';

@Global()
@Module({
  imports: [NestKafkaModule],
  exports: [NestKafkaModule],
})
export class MessagingModule {}
