import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import neo4j, { Driver, Session, Result } from 'neo4j-driver';

@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(Neo4jService.name);
  private driver: Driver;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      const uri = this.configService.get<string>('database.neo4j.uri') || 'bolt://localhost:7687';
      const username = this.configService.get<string>('database.neo4j.username') || 'neo4j';
      const password = this.configService.get<string>('database.neo4j.password') || 'password';

      this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 60000,
      });

      // Verify connection
      await this.driver.verifyConnectivity();
      this.logger.log('✅ Neo4j connected successfully');
    } catch (error) {
      this.logger.error('❌ Failed to connect to Neo4j', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.driver) {
      await this.driver.close();
      this.logger.log('Neo4j disconnected');
    }
  }

  getSession(database?: string): Session {
    const db = database || this.configService.get<string>('database.neo4j.database');
    return this.driver.session({ database: db });
  }

  async write(cypher: string, params?: Record<string, any>): Promise<Result> {
    const session = this.getSession();
    try {
      return await session.executeWrite((tx) => tx.run(cypher, params));
    } finally {
      await session.close();
    }
  }

  async read(cypher: string, params?: Record<string, any>): Promise<Result> {
    const session = this.getSession();
    try {
      return await session.executeRead((tx) => tx.run(cypher, params));
    } finally {
      await session.close();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.driver.verifyConnectivity();
      return true;
    } catch (error) {
      this.logger.error('Neo4j health check failed', error);
      return false;
    }
  }
}
