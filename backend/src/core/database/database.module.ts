import { Module, Global } from '@nestjs/common';
import { PostgresModule } from './postgres/postgres.module';
import { Neo4jModule } from './neo4j/neo4j.module';
import { MongodbModule } from './mongodb/mongodb.module';
import { RedisModule } from './redis/redis.module';
import { ClickhouseModule } from './clickhouse/clickhouse.module';

@Global()
@Module({
  imports: [PostgresModule, Neo4jModule, MongodbModule, RedisModule, ClickhouseModule],
  exports: [PostgresModule, Neo4jModule, MongodbModule, RedisModule, ClickhouseModule],
})
export class DatabaseModule {}
