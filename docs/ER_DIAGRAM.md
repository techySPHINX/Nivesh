# Entity-Relationship Diagrams

> **Complete data model for Nivesh - Your AI Financial Strategist**

[![PostgreSQL](https://img.shields.io/badge/relational-PostgreSQL-336791.svg)](https://www.postgresql.org/)
[![Neo4j](https://img.shields.io/badge/graph-Neo4j-008CC1.svg)](https://neo4j.com/)
[![MongoDB](https://img.shields.io/badge/document-MongoDB-47A248.svg)](https://www.mongodb.com/)
[![PRD](https://img.shields.io/badge/docs-PRD-orange.svg)](../PRD.md)

## Table of Contents

- [Overview](#overview)
- [Product Context](#product-context)
- [PostgreSQL ER Diagram](#postgresql-er-diagram)
- [Neo4j Graph Relationships](#neo4j-graph-relationships)
- [MongoDB Collections](#mongodb-collections)
- [Why Graph Matters](#why-graph-matters)
- [Cross-Database Relationships](#cross-database-relationships)

---

## Overview

Nivesh uses a **polyglot persistence** model where different databases serve specific purposes:

| Database       | Purpose                                 | Data Type                              |
| -------------- | --------------------------------------- | -------------------------------------- |
| **PostgreSQL** | Transactional data (ACID compliance)    | Users, accounts, transactions          |
| **Neo4j**      | Relationship analysis (graph traversal) | Financial connections, impact analysis |
| **MongoDB**    | Unstructured data (flexible schema)     | Conversations, logs, documents         |

**Design Philosophy:** Use the right database for the right job, synchronized via event-driven architecture (Kafka).

---

## Product Context

**Nivesh's Core Features (from PRD):**

- **Net worth dashboard:** Aggregate data from multiple sources
- **Scenario simulations:** Retirement, home loan, SIP projections
- **Goal planning:** Track progress toward financial milestones
- **Explainability:** Every recommendation includes reasoning
- **Alerts:** Detect anomalies and off-track goals

**Data Model Requirements:**

- Support for **multi-source data ingestion** (Fi MCP, banking APIs, manual input)
- **Relational integrity** for financial transactions (PostgreSQL)
- **Graph reasoning** for impact analysis (Neo4j)
- **Flexible schema** for conversations (MongoDB)

---

## PostgreSQL ER Diagram

### Core Financial Tables

```
┌─────────────────┐
│     users       │
├─────────────────┤
│ id (PK)         │◀────┐
│ name            │     │
│ email           │     │
│ phone           │     │
│ date_of_birth   │     │
│ created_at      │     │
└─────────────────┘     │
                        │
        ┌───────────────┼───────────────┬─────────────┐
        │               │               │             │
        ▼               ▼               ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│user_prefs    │ │fin_accounts  │ │income_sources│ │expenses      │
├──────────────┤ ├──────────────┤ ├──────────────┤ ├──────────────┤
│id (PK)       │ │id (PK)       │ │id (PK)       │ │id (PK)       │
│user_id (FK)  │ │user_id (FK)  │ │user_id (FK)  │ │user_id (FK)  │
│currency      │ │account_type  │ │source_name   │ │category      │
│language      │ │bank_name     │ │amount        │ │amount        │
│timezone      │ │balance       │ │frequency     │ │date          │
│risk_profile  │ │last_synced   │ │start_date    │ │merchant      │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
                                                            │
        ┌──────────────┬─────────────────────────┬─────────┘
        │              │                         │
        ▼              ▼                         ▼
┌──────────────┐ ┌──────────────┐      ┌──────────────┐
│assets        │ │liabilities   │      │investments   │
├──────────────┤ ├──────────────┤      ├──────────────┤
│id (PK)       │ │id (PK)       │      │id (PK)       │
│user_id (FK)  │ │user_id (FK)  │      │user_id (FK)  │
│asset_type    │ │liability_type│      │asset_type    │
│current_value │ │outstanding   │      │quantity      │
│purchase_date │ │interest_rate │      │buy_price     │
│description   │ │emi_amount    │      │current_price │
└──────────────┘ └──────────────┘      └──────────────┘
                                                │
        ┌───────────────────────────────────────┘
        │
        ▼
┌──────────────┐       ┌──────────────┐
│financial_goals│      │life_events   │
├──────────────┤       ├──────────────┤
│id (PK)       │       │id (PK)       │
│user_id (FK)  │       │user_id (FK)  │
│goal_name     │       │event_type    │
│target_amount │       │event_date    │
│deadline      │       │impact_score  │
│priority      │       │description   │
└──────────────┘       └──────────────┘
```

### Compliance & Audit Tables

```
┌─────────────────┐       ┌─────────────────┐
│data_access_logs │       │user_consents    │
├─────────────────┤       ├─────────────────┤
│id (PK)          │       │id (PK)          │
│user_id (FK)     │       │user_id (FK)     │
│accessed_by      │       │scope            │
│table_name       │       │granted_at       │
│action           │       │expires_at       │
│timestamp        │       │revoked_at       │
│reason           │       │purpose          │
└─────────────────┘       └─────────────────┘
```

### Relationships

```
users (1) ──── (N) user_preferences
users (1) ──── (N) financial_accounts
users (1) ──── (N) income_sources
users (1) ──── (N) expenses
users (1) ──── (N) assets
users (1) ──── (N) liabilities
users (1) ──── (N) investments
users (1) ──── (N) financial_goals
users (1) ──── (N) life_events
users (1) ──── (N) data_access_logs
users (1) ──── (N) user_consents
```

---

## Neo4j Graph Relationships

### Node Types

```
(User)
(Income)
(Expense)
(Investment)
(Goal)
(LifeEvent)
(MarketFactor)
```

### Graph Structure

```
                    (MarketFactor:StockMarket)
                              │
                         [:AFFECTS]
                              │
                              ▼
    (User:John)─────[:EARNS]────────▶(Income:Salary ₹80k)
        │                                    │
        │                               [:ENABLES]
        │                                    │
        ├─────[:SPENDS_ON]──────▶(Expense:Rent ₹20k)
        │                                    │
        │                               [:IMPACTS]
        │                                    │
        ├─────[:INVESTS_IN]─────▶(Investment:ELSS)
        │                                    │
        │                               [:SUPPORTS]
        │                                    │
        └─────[:HAS_GOAL]───────▶(Goal:Retirement ₹2Cr)
                                             │
                                        [:DEPENDS_ON]
                                             │
                                             ▼
                               (LifeEvent:Marriage 2026)
```

### Relationship Types

| Relationship   | From         | To         | Properties                         |
| -------------- | ------------ | ---------- | ---------------------------------- |
| **EARNS**      | User         | Income     | frequency, reliability_score       |
| **SPENDS_ON**  | User         | Expense    | necessity_level (essential/luxury) |
| **INVESTS_IN** | User         | Investment | risk_level, allocation_percentage  |
| **HAS_GOAL**   | User         | Goal       | priority (high/medium/low)         |
| **IMPACTS**    | Expense      | Goal       | delay_months, severity             |
| **DEPENDS_ON** | Goal         | Income     | dependency_score                   |
| **AFFECTS**    | MarketFactor | Investment | correlation_coefficient            |
| **TRIGGERS**   | LifeEvent    | Expense    | probability, estimated_cost        |

---

### Example Queries

#### Query 1: Find all goals impacted by high expenses

```cypher
MATCH (u:User {id: $user_id})-[:SPENDS_ON]->(e:Expense)
WHERE e.amount > 10000
MATCH (e)-[:IMPACTS]->(g:Goal)
RETURN g.name, g.target_amount, sum(e.amount) AS total_impact
ORDER BY total_impact DESC;
```

#### Query 2: Income stability analysis

```cypher
MATCH (u:User {id: $user_id})-[r:EARNS]->(i:Income)
RETURN
  i.source_name,
  i.amount,
  r.reliability_score,
  CASE
    WHEN r.reliability_score > 0.9 THEN 'Stable'
    WHEN r.reliability_score > 0.7 THEN 'Moderate'
    ELSE 'Volatile'
  END AS stability;
```

#### Query 3: Goal dependency chain

```cypher
MATCH path = (g:Goal {name: 'Buy House'})-[:DEPENDS_ON*]->(i:Income)
WHERE g.user_id = $user_id
RETURN path;
```

This shows all income sources that the "Buy House" goal depends on (directly or indirectly).

---

## MongoDB Collections

### 1. Conversations Collection

```javascript
{
  "_id": ObjectId("..."),
  "user_id": "user_123",
  "session_id": "sess_456",
  "messages": [
    {
      "role": "user",
      "content": "Should I invest in mutual funds?",
      "timestamp": ISODate("2026-01-15T10:30:00Z")
    },
    {
      "role": "assistant",
      "content": "Based on your moderate risk profile...",
      "timestamp": ISODate("2026-01-15T10:30:05Z"),
      "trace_id": "20260115-103000-abc123",
      "confidence": 0.87
    }
  ],
  "created_at": ISODate("2026-01-15T10:30:00Z"),
  "updated_at": ISODate("2026-01-15T10:35:00Z")
}
```

### 2. Analytics Events Collection

```javascript
{
  "_id": ObjectId("..."),
  "event_type": "spending_anomaly",
  "user_id": "user_123",
  "timestamp": ISODate("2026-01-15T14:00:00Z"),
  "data": {
    "category": "Dining",
    "usual_amount": 5000,
    "current_amount": 15000,
    "anomaly_score": 0.92
  },
  "action_taken": "alert_sent"
}
```

### 3. Document Store Collection

```javascript
{
  "_id": ObjectId("..."),
  "user_id": "user_123",
  "document_type": "bank_statement",
  "file_name": "hdfc_jan2026.pdf",
  "upload_date": ISODate("2026-01-15T12:00:00Z"),
  "storage_path": "s3://nivesh-docs/user_123/statements/hdfc_jan2026.pdf",
  "metadata": {
    "bank_name": "HDFC",
    "statement_month": "2026-01",
    "num_transactions": 45
  }
}
```

---

## Why Graph Matters

### Problem: "Will buying a car delay my house goal?"

**Traditional SQL approach (complex joins):**

```sql
-- Step 1: Get user's car purchase plan
SELECT cost FROM purchases WHERE user_id = 123 AND type = 'Car';

-- Step 2: Get current house goal progress
SELECT target_amount, current_amount FROM goals WHERE user_id = 123 AND name = 'Buy House';

-- Step 3: Calculate impact (manual calculation in application)
-- Step 4: Join with income, expenses, etc. (many joins)
```

**Graph approach (single query):**

```cypher
MATCH (u:User {id: 123})-[:PLANS_TO_BUY]->(car:Purchase {type: 'Car'})
MATCH (u)-[:HAS_GOAL]->(house:Goal {name: 'Buy House'})
MATCH (u)-[:EARNS]->(income:Income)
MATCH (u)-[:SPENDS_ON]->(expense:Expense)

WITH
  house.target_amount - house.current_amount AS house_gap,
  car.cost AS car_cost,
  sum(income.amount) AS monthly_income,
  sum(expense.amount) AS monthly_expense

WITH
  monthly_income - monthly_expense AS monthly_surplus,
  house_gap,
  car_cost

RETURN
  house_gap / monthly_surplus AS months_without_car,
  (house_gap + car_cost) / monthly_surplus AS months_with_car,
  ((house_gap + car_cost) / monthly_surplus) - (house_gap / monthly_surplus) AS delay_months;
```

**Output:**

```
months_without_car: 48
months_with_car: 60
delay_months: 12
```

**Answer in UI:**  
_"Buying a car will delay your house goal by 12 months."_

---

### Graph Advantage: N-Degree Impact Analysis

Find all expenses that impact the "Retirement" goal (directly or indirectly):

```cypher
MATCH path = (e:Expense)-[:IMPACTS*1..3]->(g:Goal {name: 'Retirement'})
WHERE e.user_id = $user_id
RETURN e.category, e.amount, length(path) AS impact_distance
ORDER BY impact_distance, e.amount DESC;
```

This would be extremely complex (or impossible) in SQL.

---

## Cross-Database Relationships

### How Data Flows

```
┌─────────────────────────────────────────────────┐
│ 1. User opens app                               │
│    ↓                                            │
│ 2. PostgreSQL: Load user profile, accounts     │
│    ↓                                            │
│ 3. Neo4j: Load financial graph (relationships)  │
│    ↓                                            │
│ 4. User asks: "Will buying a car delay my goal?"│
│    ↓                                            │
│ 5. Neo4j: Run impact analysis query             │
│    ↓                                            │
│ 6. MongoDB: Save conversation with trace_id     │
│    ↓                                            │
│ 7. Kafka: Emit ai.decision.made event           │
│    ↓                                            │
│ 8. PostgreSQL: Log to decision_traces table     │
└─────────────────────────────────────────────────┘
```

### Data Sync

```
PostgreSQL (source of truth)
      │
      │ Kafka event: user.transaction.added
      │
      ▼
Neo4j (graph representation)
  CREATE (e:Expense {amount: 5000, category: 'Dining'})
  CREATE (u:User {id: 123})-[:SPENDS_ON]->(e)
```

**Why this architecture?**

- **PostgreSQL:** Strong consistency for money (ACID)
- **Neo4j:** Fast relationship queries (graph traversal)
- **MongoDB:** Flexible schema for conversations/logs

---

## Schema Evolution

### Adding New Node Type (Neo4j)

```cypher
-- Add constraint
CREATE CONSTRAINT subscription_id IF NOT EXISTS
FOR (s:Subscription) REQUIRE s.id IS UNIQUE;

-- Create nodes
CREATE (s:Subscription {
  id: 'sub_netflix',
  service_name: 'Netflix',
  monthly_cost: 799,
  auto_renew: true
})

-- Create relationship
MATCH (u:User {id: $user_id})
CREATE (u)-[:SUBSCRIBES_TO]->(s);

-- Update expense impact
MATCH (u:User)-[:SUBSCRIBES_TO]->(s:Subscription)
MATCH (u)-[:HAS_GOAL]->(g:Goal)
CREATE (s)-[:IMPACTS {monthly_cost: s.monthly_cost}]->(g);
```

### Adding New Table (PostgreSQL)

```sql
-- Migration: Add subscriptions table
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    service_name VARCHAR(100),
    monthly_cost DECIMAL(10, 2),
    billing_date INT,  -- Day of month (1-31)
    auto_renew BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
```

---

## Data Integrity Rules

### ACID Guarantees (PostgreSQL)

1. **Atomicity:** All financial transactions are all-or-nothing
2. **Consistency:** Foreign key constraints prevent orphaned records
3. **Isolation:** Concurrent transactions don't interfere
4. **Durability:** Once committed, data survives crashes

### Eventual Consistency (Neo4j via Kafka)

1. **Event-Driven Sync:** PostgreSQL → Kafka → Neo4j
2. **Idempotent Consumers:** Replaying events produces same result
3. **Conflict Resolution:** Last-write-wins for graph updates
4. **Monitoring:** Track sync lag (target < 5 seconds)

### Data Validation

```sql
-- Check constraints for data quality
ALTER TABLE expenses
ADD CONSTRAINT positive_amount CHECK (amount > 0);

ALTER TABLE investments
ADD CONSTRAINT valid_return_rate CHECK (expected_return BETWEEN -1.0 AND 2.0);

ALTER TABLE goals
ADD CONSTRAINT valid_deadline CHECK (deadline_date > created_at);
```

---

## MVP Phase ER Mapping

Based on PRD MVP features, these entities are critical:

| MVP Feature                 | Key Entities                          | Relationships                            |
| --------------------------- | ------------------------------------- | ---------------------------------------- |
| **Net worth dashboard**     | users, accounts, assets, liabilities  | User → owns → Account/Asset/Liability    |
| **Retirement projection**   | goals, investments, income_sources    | Goal → requires → Investment strategy    |
| **Home loan affordability** | income_sources, expenses, liabilities | Income - Expenses - EMIs = Affordability |
| **SIP increase simulation** | investments, goals                    | Investment → contributes_to → Goal       |
| **Explainability**          | audit_logs, decision_traces           | Every query → logs → audit trail         |
| **Export reports**          | All entities                          | User → owns → all financial data         |

---

## Database Migration Strategy

### Phase 1: MVP (Current)

- PostgreSQL with essential tables
- Neo4j with basic graph schema
- MongoDB for conversations

### Phase 2: V1 (Goal Planning)

- Add `life_events` table
- Expand goal types (education, wedding, etc.)
- Add `investment_recommendations` table

### Phase 3: V2 (Advanced Features)

- Multi-currency support
- Tax optimization tables
- Insurance policy tracking
- Real estate portfolio

---

## Performance Considerations

### Indexing Strategy

**PostgreSQL:**

```sql
-- High-cardinality columns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date);

-- Composite indexes for common queries
CREATE INDEX idx_expenses_user_category_date ON expenses(user_id, category, date);
```

**Neo4j:**

```cypher
-- Node property indexes
CREATE INDEX user_id_index FOR (u:User) ON (u.userId);
CREATE INDEX goal_user_index FOR (g:Goal) ON (g.userId);

-- Full-text search
CREATE FULLTEXT INDEX expense_description FOR (e:Expense) ON EACH [e.description];
```

### Query Optimization

1. **Use EXPLAIN ANALYZE** in PostgreSQL to identify slow queries
2. **Limit graph traversal depth** in Neo4j (use `LIMIT` clause)
3. **Cache frequently accessed data** in Redis
4. **Denormalize for read performance** where appropriate

---

**Last Updated:** January 13, 2026  
**Version:** 2.0 (Aligned with PRD v1.0)  
**Maintained By:** Nivesh Engineering Team-- Sync to Neo4j via Kafka event
INSERT INTO subscriptions (...) VALUES (...);
-- Triggers Kafka event → Neo4j consumer creates nodes

```

---

## Best Practices

✅ **PostgreSQL** - Use for all financial transactions (money is serious)
✅ **Neo4j** - Use for "how does X affect Y?" queries
✅ **MongoDB** - Use for unstructured data (logs, conversations)
✅ **Sync via Kafka** - Keep databases eventually consistent
✅ **PostgreSQL = source of truth** - Other DBs are projections

---

**Last Updated:** January 2026
**Maintained By:** Nivesh Data Team
**Related Docs:** [DATABASE_STRATERGY.md](DATABASE_STRATERGY.md), [CYPHER_EVENT.md](CYPHER_EVENT.md)
```
