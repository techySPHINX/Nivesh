import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, ClickHouseClient } from '@clickhouse/client';

@Injectable()
export class ClickhouseService implements OnModuleInit {
  private readonly logger = new Logger(ClickhouseService.name);
  private client: ClickHouseClient;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      this.client = createClient({
        host: this.configService.get<string>('database.clickhouse.host') || 'http://localhost:8123',
        username: this.configService.get<string>('database.clickhouse.username') || 'default',
        password: this.configService.get<string>('database.clickhouse.password') || '',
        database: this.configService.get<string>('database.clickhouse.database') || 'nivesh',
        request_timeout: 60000,
      });

      // Test connection
      await this.client.ping();
      this.logger.log('✅ ClickHouse connected successfully');
    } catch (error) {
      this.logger.error('❌ Failed to connect to ClickHouse', error);
      throw error;
    }
  }

  getClient(): ClickHouseClient {
    return this.client;
  }

  async query<T = any>(query: string, params?: Record<string, any>): Promise<T[]> {
    const resultSet = await this.client.query({
      query,
      query_params: params,
      format: 'JSONEachRow',
    });

    const data = await resultSet.json<T[]>();
    return data as T[];
  }

  async insert(table: string, values: any[]): Promise<void> {
    await this.client.insert({
      table,
      values,
      format: 'JSONEachRow',
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      this.logger.error('ClickHouse health check failed', error);
      return false;
    }
  }
}
