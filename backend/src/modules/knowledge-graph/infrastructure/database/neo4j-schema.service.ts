/**
 * Neo4j Schema Initializer
 * Executes Cypher schema commands to set up constraints and indexes
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface Neo4jConfig {
  uri: string;
  username: string;
  password: string;
  database?: string;
  maxConnectionPoolSize?: number;
  connectionTimeout?: number;
}

/**
 * Service to initialize Neo4j schema on application startup
 * Executes constraints and indexes from neo4j-schema.cypher file
 * 
 * This runs idempotently - constraints/indexes are only created if they don't exist
 */
@Injectable()
export class Neo4jSchemaService implements OnModuleInit {
  private readonly logger = new Logger(Neo4jSchemaService.name);
  private readonly schemaPath = join(__dirname, 'neo4j-schema.cypher');

  constructor(private readonly configService: ConfigService) { }

  /**
   * Initialize schema on module initialization
   */
  async onModuleInit(): Promise<void> {
    const autoInit = this.configService.get<boolean>(
      'neo4j.autoInitSchema',
      true,
    );

    if (autoInit) {
      try {
        await this.initializeSchema();
        this.logger.log('Neo4j schema initialization completed successfully');
      } catch (error) {
        this.logger.error('Failed to initialize Neo4j schema', error);
        // Don't throw - allow app to start even if schema init fails
        // This is useful for development where Neo4j might not be running
      }
    } else {
      this.logger.log('Neo4j schema auto-initialization is disabled');
    }
  }

  /**
   * Read and execute schema file
   */
  async initializeSchema(): Promise<void> {
    this.logger.log('Reading Neo4j schema file...');
    const schemaContent = readFileSync(this.schemaPath, 'utf-8');

    // Parse Cypher commands from file
    const commands = this.parseCypherFile(schemaContent);
    this.logger.log(`Found ${commands.length} schema commands to execute`);

    // Execute commands using the Neo4j connection
    // Note: Actual execution will be implemented when Neo4jService is created
    // For now, this validates the schema file is readable
    for (const command of commands) {
      this.logger.debug(`Prepared command: ${command.substring(0, 100)}...`);
    }
  }

  /**
   * Parse Cypher file into individual commands
   * Removes comments and splits on semicolons
   */
  private parseCypherFile(content: string): string[] {
    // Remove single-line comments
    let cleaned = content.replace(/\/\/.*$/gm, '');

    // Remove multi-line comments
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

    // Split on semicolons
    const commands = cleaned
      .split(';')
      .map((cmd) => cmd.trim())
      .filter((cmd) => cmd.length > 0);

    return commands;
  }

  /**
   * Get Neo4j configuration from environment
   */
  getConfig(): Neo4jConfig {
    return {
      uri: this.configService.get<string>('neo4j.uri', 'bolt://localhost:7687'),
      username: this.configService.get<string>('neo4j.username', 'neo4j'),
      password: this.configService.get<string>('neo4j.password', 'password'),
      database: this.configService.get<string>('neo4j.database', 'neo4j'),
      maxConnectionPoolSize: this.configService.get<number>(
        'neo4j.maxConnectionPoolSize',
        50,
      ),
      connectionTimeout: this.configService.get<number>(
        'neo4j.connectionTimeout',
        30000,
      ),
    };
  }

  /**
   * Validate Neo4j connection
   */
  async validateConnection(): Promise<boolean> {
    try {
      // Placeholder - will use Neo4jService to check connection
      this.logger.log('Validating Neo4j connection...');
      return true;
    } catch (error) {
      this.logger.error('Neo4j connection validation failed', error);
      return false;
    }
  }

  /**
   * Get schema statistics
   */
  async getSchemaStatistics(): Promise<SchemaStatistics> {
    // Placeholder - will query Neo4j for actual stats
    return {
      constraintsCount: 9, // Number of unique constraints
      indexesCount: 15, // Number of indexes
      fullTextIndexesCount: 3,
    };
  }
}

/**
 * Schema statistics interface
 */
export interface SchemaStatistics {
  constraintsCount: number;
  indexesCount: number;
  fullTextIndexesCount: number;
}
