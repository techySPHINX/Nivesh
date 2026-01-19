import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    username: process.env.POSTGRES_USER || 'nivesh_user',
    password: process.env.POSTGRES_PASSWORD || 'nivesh_password',
    database: process.env.POSTGRES_DB || 'nivesh_db',
    url: process.env.DATABASE_URL,
  },
  neo4j: {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    username: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'nivesh_password',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    database: process.env.MONGODB_DB || 'nivesh_conversations',
    username: process.env.MONGODB_USER || 'nivesh_user',
    password: process.env.MONGODB_PASSWORD || 'nivesh_password',
  },
  clickhouse: {
    host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
    username: process.env.CLICKHOUSE_USER || 'nivesh_user',
    password: process.env.CLICKHOUSE_PASSWORD || 'nivesh_password',
    database: process.env.CLICKHOUSE_DB || 'nivesh_analytics',
  },
}));
