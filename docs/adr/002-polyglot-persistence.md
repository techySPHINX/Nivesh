# ADR-002: Polyglot Persistence Strategy

## Status

**Accepted** - January 17, 2026

## Context

Nivesh processes diverse data types with different access patterns:

1. **Transactional Financial Data** - Users, accounts, transactions, goals

   - Requires ACID guarantees
   - Complex joins and aggregations
   - Strong consistency

2. **Financial Relationships** - How entities affect each other

   - "How does this investment impact my retirement goal?"
   - "What are the cascading effects of a salary increase?"
   - Graph traversal queries

3. **Conversation History** - Chat messages, AI responses

   - Document-oriented (JSON)
   - Schema flexibility (AI responses vary)
   - High write throughput

4. **Analytics & Reporting** - User behavior, spending trends

   - Time-series data
   - Columnar storage for fast aggregations
   - Append-only writes

5. **Cache & Sessions** - Hot data, user sessions
   - Sub-millisecond read latency
   - TTL-based expiry
   - Pub/Sub for real-time updates

Using a single database type (e.g., only PostgreSQL) would:

- Force suboptimal data modeling (graph queries in SQL)
- Create performance bottlenecks (analytics on OLTP database)
- Increase complexity (JSON blobs instead of native documents)

## Decision

We will implement **Polyglot Persistence** using specialized databases for each data type:

### Database Allocation

| Database       | Use Case         | Data Types                                                | Rationale                                    |
| -------------- | ---------------- | --------------------------------------------------------- | -------------------------------------------- |
| **PostgreSQL** | Primary OLTP     | Users, Accounts, Transactions, Investments, Goals, Alerts | ACID, mature, excellent tooling              |
| **Neo4j**      | Knowledge Graph  | Financial entities, Relationships, Impact analysis        | Native graph queries, relationship traversal |
| **MongoDB**    | Document Store   | Conversations, AI responses, Audit logs                   | Schema flexibility, horizontal scaling       |
| **Redis**      | Cache + Sessions | Hot data, User sessions, Rate limiting                    | In-memory speed, Pub/Sub, TTL                |
| **ClickHouse** | Analytics OLAP   | User events, Metrics, Aggregated reports                  | Columnar storage, fast aggregations          |

### Data Flow Architecture

```
User Transaction → PostgreSQL (source of truth)
                ↓ (Kafka Event)
                → Neo4j (update graph relationships)
                → ClickHouse (analytics event)
                → Redis (invalidate cache)

AI Conversation → MongoDB (full conversation history)
               → PostgreSQL (key decisions only)
               → Redis (recent context cache)
```

### Module-to-Database Mapping

```
User Module            → PostgreSQL
Financial Data Module  → PostgreSQL (primary) + Neo4j (graph sync)
Knowledge Graph Module → Neo4j (primary) + Redis (cache)
AI Reasoning Module    → MongoDB (conversations) + PostgreSQL (decisions)
Simulation Module      → PostgreSQL (results) + Redis (intermediate state)
ML Intelligence Module → PostgreSQL (models metadata) + ClickHouse (training data)
Goal Planning Module   → PostgreSQL
Alerts Module          → PostgreSQL + Redis (recent alerts)
Explainability Module  → MongoDB (audit logs) + PostgreSQL (summaries)
Analytics Module       → ClickHouse (primary) + PostgreSQL (user context)
```

## Consequences

### Positive

✅ **Optimal Performance**

- Each database used for its strength
- Graph queries in Neo4j (100x faster than SQL joins for deep traversal)
- Analytics queries in ClickHouse (10x faster than PostgreSQL for aggregations)

✅ **Scalability**

- Scale databases independently based on load
- Neo4j clustering for graph queries
- ClickHouse distributed tables for analytics

✅ **Development Velocity**

- Natural data modeling (graphs as graphs, documents as documents)
- No impedance mismatch (e.g., JSON in SQL)

✅ **Future-Proof**

- Easy to add specialized stores (e.g., TimescaleDB for time-series later)
- Database choice doesn't lock architecture

### Negative

⚠️ **Operational Complexity**

- 5 databases to maintain, backup, monitor
- Different query languages (SQL, Cypher, MQL, Redis commands)
- More failure modes

⚠️ **Data Consistency Challenges**

- Eventual consistency between databases
- No cross-database transactions
- Need event-driven synchronization

⚠️ **Team Skill Requirements**

- Developers must learn multiple databases
- Increased onboarding time

⚠️ **Cost**

- More infrastructure to run (mitigated by cloud managed services)

### Risks

🔴 **Risk**: Data gets out of sync between databases

- **Mitigation**:
  - Kafka as single source of events (event sourcing)
  - Idempotent event handlers
  - Automated reconciliation jobs (daily)
  - Monitoring dashboard for sync lag

🔴 **Risk**: Developers query wrong database for data

- **Mitigation**:
  - Repository pattern enforces database abstraction
  - Linting rules prevent direct database access
  - API documentation clearly states data sources

🔴 **Risk**: Backup/restore complexity across 5 databases

- **Mitigation**:
  - Automated backup scripts with consistent snapshots
  - Disaster recovery runbook
  - Regular restore testing

## Alternatives Considered

### Alternative 1: PostgreSQL Only (Single Database)

**Implementation:**

```sql
-- Graph queries in SQL (recursive CTEs)
WITH RECURSIVE financial_impact AS (
  SELECT goal_id, affected_by_id FROM relationships WHERE goal_id = ?
  UNION ALL
  SELECT r.goal_id, r.affected_by_id
  FROM relationships r
  JOIN financial_impact fi ON r.goal_id = fi.affected_by_id
)
SELECT * FROM financial_impact;

-- Documents as JSONB
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  user_id UUID,
  messages JSONB -- Unstructured data
);
```

**Pros:**

- Single database to manage
- Simple backups
- ACID everywhere

**Cons:**

- ❌ Graph queries 10-100x slower than Neo4j
- ❌ Analytics queries slow (no columnar storage)
- ❌ JSON queries clunky (JSONB path syntax)
- ❌ Scaling bottleneck (cannot scale components independently)

**Why Rejected:** Performance and scalability constraints.

### Alternative 2: Microservices with Database-Per-Service

**Pros:**

- True isolation
- Independent scaling

**Cons:**

- ❌ Too complex for modular monolith
- ❌ Network overhead between services
- ❌ Distributed transactions (Saga pattern complexity)

**Why Rejected:** Overkill for current scale. Can migrate later.

### Alternative 3: MongoDB Only (Document Store)

**Pros:**

- Flexible schema
- Single database type

**Cons:**

- ❌ Poor for graph queries (no native graph support)
- ❌ Weak transactional guarantees (compared to PostgreSQL)
- ❌ Not ideal for analytics (not columnar)

**Why Rejected:** Not suitable for financial data (need ACID).

## Implementation Guidelines

### Data Synchronization Pattern

```typescript
// Example: Transaction created in PostgreSQL
@EventPattern('transaction.created')
async handleTransactionCreated(event: TransactionCreatedEvent) {
  // 1. Update Neo4j graph
  await this.neo4jService.runQuery(`
    MATCH (user:User {id: $userId})
    CREATE (txn:Transaction {id: $txnId, amount: $amount})
    CREATE (user)-[:MADE_TRANSACTION]->(txn)
  `, event);

  // 2. Send to ClickHouse for analytics
  await this.clickhouseService.insert('transactions', {
    timestamp: event.timestamp,
    userId: event.userId,
    amount: event.amount,
    category: event.category,
  });

  // 3. Invalidate cache
  await this.redisService.del(`user:${event.userId}:net_worth`);
}
```

### Query Routing Rules

```typescript
// ✅ CORRECT: Query appropriate database
class FinancialDataService {
  // PostgreSQL for transactional data
  async getUserTransactions(userId: string) {
    return this.prisma.transaction.findMany({ where: { userId } });
  }

  // Neo4j for graph queries
  async getGoalImpactGraph(goalId: string) {
    return this.neo4j.runQuery(
      `
      MATCH (goal:Goal {id: $goalId})-[r:AFFECTS*1..3]->(affected)
      RETURN goal, r, affected
    `,
      { goalId }
    );
  }

  // ClickHouse for analytics
  async getSpendingTrends(userId: string, months: number) {
    return this.clickhouse.query(`
      SELECT 
        toStartOfMonth(timestamp) AS month,
        category,
        sum(amount) AS total
      FROM transactions
      WHERE user_id = '${userId}'
        AND timestamp >= now() - INTERVAL ${months} MONTH
      GROUP BY month, category
      ORDER BY month DESC
    `);
  }

  // Redis for cached data
  async getNetWorth(userId: string) {
    const cached = await this.redis.get(`user:${userId}:net_worth`);
    if (cached) return JSON.parse(cached);

    const netWorth = await this.calculateNetWorth(userId);
    await this.redis.set(
      `user:${userId}:net_worth`,
      JSON.stringify(netWorth),
      "EX",
      300
    );
    return netWorth;
  }
}
```

### Backup Strategy

```bash
# Daily automated backups (cron)
# PostgreSQL
pg_dump nivesh_db | gzip > backups/postgres-$(date +%Y%m%d).sql.gz

# Neo4j
neo4j-admin dump --database=neo4j --to=backups/neo4j-$(date +%Y%m%d).dump

# MongoDB
mongodump --uri="mongodb://..." --out=backups/mongo-$(date +%Y%m%d)

# ClickHouse
clickhouse-client --query="BACKUP DATABASE nivesh TO 'backups/clickhouse-$(date +%Y%m%d)'"

# Upload to GCS
gsutil cp -r backups/ gs://nivesh-backups/$(date +%Y%m%d)/
```

### Monitoring Dashboards

**Grafana Panels:**

1. **Sync Lag Dashboard**

   - Kafka consumer lag per topic
   - Time since last Neo4j update per user
   - ClickHouse insertion delay

2. **Database Performance**

   - PostgreSQL connection pool usage
   - Neo4j query latency (p95, p99)
   - Redis memory usage
   - ClickHouse query execution time

3. **Data Consistency Checks**
   - Transaction count: PostgreSQL vs ClickHouse
   - User count: PostgreSQL vs Neo4j
   - Alerts for mismatches > 1%

## Cost Analysis (Initial Estimates)

### Development Environment (Docker Compose)

- **Cost**: $0 (local resources)
- **Resources**: 16GB RAM, 4 CPUs sufficient

### Staging Environment (GCP)

- PostgreSQL Cloud SQL: ~$50/month (db-f1-micro)
- Neo4j Aura Free Tier: $0 (developer)
- MongoDB Atlas M0: $0 (free tier)
- Redis Memorystore: ~$20/month (1GB)
- ClickHouse (self-hosted on GCE): ~$30/month (e2-small)
- **Total**: ~$100/month

### Production Environment (GCP, MVP - 10K users)

- PostgreSQL Cloud SQL: ~$200/month (db-n1-standard-1)
- Neo4j Aura Professional: ~$300/month
- MongoDB Atlas M10: ~$60/month
- Redis Memorystore: ~$100/month (5GB)
- ClickHouse: ~$150/month (n1-standard-2)
- **Total**: ~$810/month

### Production at Scale (100K users)

- PostgreSQL: ~$1000/month (HA, replicas)
- Neo4j: ~$1500/month (clustering)
- MongoDB: ~$300/month (M30)
- Redis: ~$500/month (25GB cluster)
- ClickHouse: ~$800/month (distributed)
- **Total**: ~$4100/month

## References

- [Martin Kleppmann - Designing Data-Intensive Applications](https://dataintensive.net/)
- [Neo4j vs PostgreSQL for Graphs](https://neo4j.com/blog/rdbms-vs-graph-database-performance/)
- [ClickHouse vs PostgreSQL for Analytics](https://clickhouse.com/docs/en/faq/general/why-clickhouse-is-so-fast/)
- [MongoDB Use Cases](https://www.mongodb.com/use-cases)
- [Redis Patterns](https://redis.io/docs/manual/patterns/)

## Review History

- **2026-01-17**: Initial proposal and acceptance by @techySPHINX
