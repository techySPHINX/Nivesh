import { registerAs } from '@nestjs/config';

export default registerAs('kafka', () => ({
  brokers: (process.env.KAFKA_BROKERS || 'localhost:29092').split(','),
  clientId: process.env.KAFKA_CLIENT_ID || 'nivesh-backend',
  groupId: process.env.KAFKA_GROUP_ID || 'nivesh-consumer-group',
  sasl: process.env.KAFKA_SASL_USERNAME
    ? {
        mechanism: 'plain' as const,
        username: process.env.KAFKA_SASL_USERNAME,
        password: process.env.KAFKA_SASL_PASSWORD || '',
      }
    : undefined,
}));
