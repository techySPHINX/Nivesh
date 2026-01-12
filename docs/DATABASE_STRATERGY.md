# Database Strategy Documentation

# Nivesh - Polyglot Persistence Model

> **Strategic database architecture for Nivesh - Your AI Financial Strategist**

[![PostgreSQL](https://img.shields.io/badge/relational-PostgreSQL-336791.svg)](https://www.postgresql.org/)
[![Neo4j](https://img.shields.io/badge/graph-Neo4j-008CC1.svg)](https://neo4j.com/)
[![ClickHouse](https://img.shields.io/badge/analytics-ClickHouse-FFCC01.svg)](https://clickhouse.com/)
[![PRD](https://img.shields.io/badge/docs-PRD-orange.svg)](../PRD.md)

## Table of Contents

- [Overview](#overview)
- [Product Context](#product-context)
- [Database Strategy](#database-strategy)
- [PostgreSQL - Relational Database](#postgresql---relational-database)
- [Neo4j - Graph Database](#neo4j---graph-database)
- [MongoDB - Document Store](#mongodb---document-store)
- [Time-Series Analytics](#time-series-analytics)
- [Security & Privacy](#security--privacy)
- [Data Flow Architecture](#data-flow-architecture)

---

## Overview

Nivesh uses a **polyglot persistence model** where each data type is stored in the most appropriate database technology.

| Data Type                   | Storage    | Reason                                 | Use Case                                      |
| --------------------------- | ---------- | -------------------------------------- | --------------------------------------------- |
| **User & Transactions**     | PostgreSQL | ACID compliance, relational integrity  | Financial records, source of truth            |
| **Financial Relationships** | Neo4j      | Graph reasoning, cause-effect analysis | "How does this expense affect my retirement?" |
| **ML Features**             | ClickHouse | Time-series analytics, projections     | Historical trends, forecasting                |
| **Conversations**           | MongoDB    | Flexible schema, document storage      | Chat history, voice transcripts               |
| **Cache**                   | Redis      | Sub-millisecond latency                | Session data, real-time calculations          |

**Key Benefit:** Right tool for the right job - optimized performance and maintainability.

---

## Product Context

**Nivesh's Vision:** Turn real financial data into decisions through natural language conversations, simulations, and explainable recommendations.

**Database Requirements from PRD:**

- **Data Ingestion:** Real-time sync from Fi MCP, banking APIs, and manual inputs
- **Conversational Context:** Store chat history with user intent and AI responses
- **Simulation Engine:** Store goal projections, scenario parameters, and results
- **Explainability:** Audit trail for every AI decision with assumptions
- **Privacy:** User-owned data with export and delete capabilities
- **Compliance:** 7-year retention for RBI audit requirements

---

## Database Strategy

### Design Principles

1. **Source of Truth** - PostgreSQL for all financial transactions
2. **Reasoning Engine** - Neo4j for relationship queries
3. **Analytics** - Time-series DB for historical analysis
4. **Flexibility** - MongoDB for unstructured data

---

## PostgreSQL - Relational Database

### Core Tables

#### 1. User & Identity

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(20),
  dob DATE,
  country_code VARCHAR(5) DEFAULT ''IN'',
  preferred_language VARCHAR(10) DEFAULT ''en'',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
```

#### 2. User Preferences

```sql
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  risk_tolerance VARCHAR(20) CHECK (risk_tolerance IN (''LOW'', ''MEDIUM'', ''HIGH'')),
  voice_enabled BOOLEAN DEFAULT false,
  notifications_enabled BOOLEAN DEFAULT true,
  currency VARCHAR(10) DEFAULT ''INR'',
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. Financial Accounts

```sql
CREATE TABLE financial_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  account_type VARCHAR(30) NOT NULL CHECK (account_type IN (''BANK'', ''CREDIT'', ''INVESTMENT'')),
  masked_account_number VARCHAR(20),
  balance DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_accounts_user ON financial_accounts(user_id);
```

#### 4. Income Sources

```sql
CREATE TABLE income_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) CHECK (type IN (''SALARY'', ''BUSINESS'', ''FREELANCE'', ''RENTAL'', ''OTHER'')),
  amount DECIMAL(12,2) NOT NULL,
  frequency VARCHAR(20) CHECK (frequency IN (''MONTHLY'', ''YEARLY'', ''WEEKLY'')),
  is_stable BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_income_user ON income_sources(user_id);
```

#### 5. Expenses

```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES financial_accounts(id),
  category VARCHAR(50) NOT NULL,
  sub_category VARCHAR(50),
  amount DECIMAL(12,2) NOT NULL,
  transaction_date DATE NOT NULL,
  merchant VARCHAR(100),
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_expenses_user ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(transaction_date);
CREATE INDEX idx_expenses_category ON expenses(category);
```

#### 6. Assets & Liabilities

```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  asset_type VARCHAR(30) CHECK (asset_type IN (''CASH'', ''PROPERTY'', ''GOLD'', ''VEHICLE'', ''OTHER'')),
  value DECIMAL(14,2) NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE liabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  liability_type VARCHAR(30) CHECK (liability_type IN (''HOME_LOAN'', ''CAR_LOAN'', ''CREDIT_CARD'', ''PERSONAL_LOAN'')),
  outstanding_amount DECIMAL(14,2) NOT NULL,
  interest_rate DECIMAL(5,2),
  tenure_months INT,
  emi_amount DECIMAL(12,2),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 7. Investments

```sql
CREATE TABLE investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  investment_type VARCHAR(30) CHECK (investment_type IN (''MF'', ''STOCK'', ''ETF'', ''BOND'', ''FD'', ''PPF'')),
  instrument_name VARCHAR(100) NOT NULL,
  invested_amount DECIMAL(14,2) NOT NULL,
  current_value DECIMAL(14,2),
  risk_level VARCHAR(20) CHECK (risk_level IN (''LOW'', ''MEDIUM'', ''HIGH'')),
  started_at DATE,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_investments_user ON investments(user_id);
CREATE INDEX idx_investments_type ON investments(investment_type);
```

#### 8. Financial Goals

```sql
CREATE TABLE financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  goal_type VARCHAR(50) CHECK (goal_type IN (''RETIREMENT'', ''HOME'', ''EDUCATION'', ''EMERGENCY'', ''CUSTOM'')),
  target_amount DECIMAL(14,2) NOT NULL,
  target_year INT NOT NULL,
  priority INT CHECK (priority BETWEEN 1 AND 10),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_goals_user ON financial_goals(user_id);
CREATE INDEX idx_goals_priority ON financial_goals(priority);
```

#### 9. Life Events

```sql
CREATE TABLE life_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) CHECK (event_type IN (''MARRIAGE'', ''CHILD_BIRTH'', ''RELOCATION'', ''RETIREMENT'', ''CUSTOM'')),
  expected_year INT,
  financial_impact_estimate DECIMAL(14,2),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_life_events_user ON life_events(user_id);
```

#### 10. Alerts & Notifications

```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) CHECK (severity IN (''LOW'', ''MEDIUM'', ''HIGH'', ''CRITICAL'')),
  message TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_alerts_unresolved ON alerts(user_id, is_resolved) WHERE is_resolved = false;
```

---

## Neo4j - Graph Database

### Node Types

- `(:User)` - Financial user
- `(:Income)` - Income sources
- `(:Expense)` - Expense transactions
- `(:Investment)` - Investment holdings
- `(:Goal)` - Financial goals
- `(:LifeEvent)` - Life milestones
- `(:MarketFactor)` - Economic indicators
- `(:TaxRule)` - Tax regulations

### Relationship Types

```cypher
(:User)-[:EARNS]->(:Income)
(:User)-[:SPENDS_ON]->(:Expense)
(:User)-[:INVESTS_IN]->(:Investment)
(:User)-[:HAS_GOAL]->(:Goal)
(:User)-[:EXPERIENCES]->(:LifeEvent)

(:Investment)-[:AFFECTED_BY]->(:MarketFactor)
(:Goal)-[:DEPENDS_ON]->(:Investment)
(:LifeEvent)-[:IMPACTS]->(:Goal)
```

### Example Queries

```cypher
-- Find goal conflicts
MATCH (u:User {userId: $userId})-[:HAS_GOAL]->(g1:Goal)
MATCH (g1)-[:DEPENDS_ON]->(i:Investment)<-[:DEPENDS_ON]-(g2:Goal)
WHERE g1 <> g2
RETURN g1, g2, i;

-- Analyze risk exposure
MATCH (u:User)-[:INVESTS_IN]->(i:Investment)
WHERE i.riskLevel = ''HIGH''
RETURN u, COUNT(i) as highRiskCount;
```

---

## MongoDB - Document Store

### Conversations Collection

```javascript
{
  "_id": "conv_123",
  "user_id": "uuid",
  "session_id": "session_abc",
  "messages": [
    {
      "role": "user",
      "content": "Can I afford a house?",
      "sentiment": "ANXIOUS",
      "timestamp": ISODate("2026-01-01T10:00:00Z")
    },
    {
      "role": "assistant",
      "content": "Based on your income...",
      "confidence": 0.92,
      "decision_trace_id": "DT-2026-01-01-001",
      "timestamp": ISODate("2026-01-01T10:00:15Z")
    }
  ],
  "created_at": ISODate("2026-01-01T10:00:00Z"),
  "updated_at": ISODate("2026-01-01T10:00:15Z")
}
```

---

## Time-Series Analytics

### Financial Snapshots

```sql
CREATE TABLE financial_snapshots (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  snapshot_date DATE NOT NULL,
  net_worth DECIMAL(14,2),
  savings_rate DECIMAL(5,2),
  investment_risk_score DECIMAL(5,2),
  debt_to_income_ratio DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_snapshots_user_date ON financial_snapshots(user_id, snapshot_date);
```

### Simulation Results

```sql
CREATE TABLE simulation_results (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  scenario_name VARCHAR(100),
  probability_of_success DECIMAL(5,2),
  projected_value DECIMAL(14,2),
  confidence_interval_low DECIMAL(14,2),
  confidence_interval_high DECIMAL(14,2),
  generated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Security & Privacy

### Data Access Logs

```sql
CREATE TABLE data_access_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  accessed_by VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  purpose TEXT,
  ip_address INET,
  accessed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_access_logs_user ON data_access_logs(user_id);
CREATE INDEX idx_access_logs_time ON data_access_logs(accessed_at);
```

### Consent Management

```sql
CREATE TABLE user_consents (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL,
  scope VARCHAR(100),
  granted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP,
  UNIQUE(user_id, consent_type)
);

-- Consent types:
-- 'spending_analysis', 'investment_recommendations',
-- 'goal_tracking', 'life_event_impact', 'data_export'
```

---

## Data Flow Architecture

### Real-Time Data Pipeline

```
┌──────────────┐
│ Fi MCP / API │ (Transaction data ingestion)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ PostgreSQL   │ (Source of truth - ACID transactions)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Kafka Events │ (Event streaming backbone)
└──┬─────────┬─┘
   │         │
   ▼         ▼
┌────────┐ ┌──────────┐
│ Neo4j  │ │ MongoDB  │ (Graph sync & conversations)
└────────┘ └──────────┘
   │
   ▼
┌──────────────┐
│ AI Engine    │ (Reasoning + Simulations)
└──────────────┘
```

### Query Patterns

**Transaction Queries:**

- PostgreSQL for ACID-compliant writes
- Redis for cached recent transactions

**Relationship Queries:**

- Neo4j for "What impacts what?" questions
- Examples: "How does this expense affect my goals?"

**Analytics Queries:**

- ClickHouse for historical trend analysis
- Prophet models for forecasting

**Conversation History:**

- MongoDB for flexible schema chat storage
- Semantic search with embeddings

---

## Best Practices

### Data Integrity

1. **PostgreSQL as Source of Truth** - All financial transactions start here
2. **Event-Driven Sync** - Kafka ensures eventual consistency across databases
3. **Idempotent Operations** - Events can be replayed without duplication
4. **Transaction Logs** - Comprehensive audit trail for compliance

### Performance Optimization

1. **Strategic Indexing** - Index on user_id, date, category for fast queries
2. **Caching Layer** - Redis for frequently accessed data (session, recent transactions)
3. **Query Optimization** - Use EXPLAIN ANALYZE for PostgreSQL queries
4. **Graph Query Efficiency** - Limit traversal depth in Neo4j to avoid performance issues

### Privacy Compliance

1. **Encryption at Rest** - PostgreSQL transparent data encryption
2. **Encryption in Transit** - TLS 1.3 for all database connections
3. **Data Minimization** - Store only necessary information
4. **User Data Export** - Support GDPR-compliant data export in CSV/JSON
5. **Right to Deletion** - Cascade deletes + Kafka tombstone events
6. **Consent-Based Access** - Check `user_consents` table before data operations

### Backup & Recovery

1. **PostgreSQL:** Daily full backups + continuous WAL archiving
2. **Neo4j:** Daily backups of graph data
3. **MongoDB:** Replica sets with automatic failover
4. **Retention:** 7 years for financial data (RBI compliance)

---

## Scaling Strategy

### Horizontal Scaling

- **PostgreSQL:** Read replicas for analytics queries
- **Neo4j:** Causal clustering for high availability
- **MongoDB:** Sharding by user_id
- **Redis:** Redis Cluster for distributed caching

### Vertical Scaling

- Start with single instances for MVP
- Scale CPU/RAM as user base grows
- Monitor query performance with Prometheus

---

## Migration Strategy

### Data Migration Workflow

1. **Schema Changes:** Use migration tools (Flyway, Liquibase)
2. **Zero-Downtime Migrations:** Blue-green deployment strategy
3. **Data Validation:** Automated tests after migrations
4. **Rollback Plan:** Keep previous schema version for 30 days

---

**Last Updated:** January 13, 2026  
**Version:** 2.0 (Aligned with PRD v1.0)  
**Maintained By:** Nivesh Engineering Team
granted BOOLEAN DEFAULT false,
granted_at TIMESTAMP,
revoked_at TIMESTAMP,
expires_at TIMESTAMP
);

```

---

## Best Practices

1. **Encryption** - Encrypt PII at rest and in transit
2. **Indexing** - Strategic indexes for query performance
3. **Partitioning** - Time-based partitioning for large tables
4. **Backup** - Daily automated backups with point-in-time recovery
5. **Monitoring** - Query performance and slow query logging

---

**Last Updated:** January 2026
**Maintained By:** Nivesh Data Team
```
