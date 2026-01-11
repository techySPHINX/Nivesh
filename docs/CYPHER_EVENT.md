# Neo4j Graph Schema & Event Architecture

> **Graph database design and event-driven architecture for AI-powered financial reasoning**

[![Neo4j](https://img.shields.io/badge/database-Neo4j-008CC1.svg)](https://neo4j.com/)
[![Kafka](https://img.shields.io/badge/events-Apache%20Kafka-231F20.svg)](https://kafka.apache.org/)

## Table of Contents

- [Overview](#overview)
- [Neo4j Graph Schema](#neo4j-graph-schema)
- [Node Types](#node-types)
- [Relationship Types](#relationship-types)
- [Graph Query Examples](#graph-query-examples)
- [AI-Database Mapping](#ai-database-mapping)
- [Event-Driven Architecture](#event-driven-architecture)
- [Kafka Topics](#kafka-topics)
- [Event Consumers](#event-consumers)
- [Design Guarantees](#design-guarantees)

---

## Overview

Nivesh uses **Neo4j graph database** for financial relationship modeling and **Apache Kafka** for event-driven architecture. This combination enables:

-  **Complex relationship queries** that are impossible in SQL
-  **AI reasoning** based on financial causality
-  **Real-time event processing** for instant insights
-  **Eventual consistency** across microservices

---

## Neo4j Graph Schema

### Node Types

#### 1. User Node

```cypher
CREATE CONSTRAINT user_id_unique IF NOT EXISTS
FOR (u:User)
REQUIRE u.userId IS UNIQUE;

CREATE (:User {
  userId: "uuid",
  country: "IN",
  age: 32,
  riskProfile: "MODERATE"
});
```

#### 2. Income Node

```cypher
CREATE CONSTRAINT income_id_unique IF NOT EXISTS
FOR (i:Income)
REQUIRE i.incomeId IS UNIQUE;

CREATE (:Income {
  incomeId: "inc_123",
  type: "SALARY",
  amount: 120000,
  frequency: "MONTHLY",
  stabilityScore: 0.9
});
```

#### 3. Expense Node

```cypher
CREATE CONSTRAINT expense_id_unique IF NOT EXISTS
FOR (e:Expense)
REQUIRE e.expenseId IS UNIQUE;

CREATE (:Expense {
  expenseId: "exp_456",
  category: "DINING",
  amount: 850,
  date: date("2026-01-01"),
  recurring: false
});
```

#### 4. Investment Node

```cypher
CREATE CONSTRAINT investment_id_unique IF NOT EXISTS
FOR (i:Investment)
REQUIRE i.investmentId IS UNIQUE;

CREATE (:Investment {
  investmentId: "inv_789",
  type: "EQUITY_MF",
  riskLevel: "HIGH",
  expectedReturn: 0.12,
  horizonYears: 15
});
```

#### 5. Financial Goal Node

```cypher
CREATE CONSTRAINT goal_id_unique IF NOT EXISTS
FOR (g:Goal)
REQUIRE g.goalId IS UNIQUE;

CREATE (:Goal {
  goalId: "goal_ret_1",
  type: "RETIREMENT",
  targetAmount: 30000000,
  targetYear: 2045,
  priority: 1
});
```

#### 6. Life Event Node

```cypher
CREATE CONSTRAINT life_event_id_unique IF NOT EXISTS
FOR (l:LifeEvent)
REQUIRE l.eventId IS UNIQUE;

CREATE (:LifeEvent {
  eventId: "le_marriage",
  type: "MARRIAGE",
  expectedYear: 2028,
  costImpact: 1500000
});
```

#### 7. Market Factor Node

```cypher
CREATE CONSTRAINT market_factor_unique IF NOT EXISTS
FOR (m:MarketFactor)
REQUIRE m.factor IS UNIQUE;

CREATE (:MarketFactor {
  factor: "INFLATION",
  value: 0.06,
  region: "IN"
});
```

---

## Relationship Types

### User Relationships

```cypher
-- User earns income
MATCH (u:User), (i:Income)
CREATE (u)-[:EARNS]->(i);

-- User spends on expenses
MATCH (u:User), (e:Expense)
CREATE (u)-[:SPENDS_ON {
  month: "2026-01"
}]->(e);

-- User invests in instruments
MATCH (u:User), (i:Investment)
CREATE (u)-[:INVESTS_IN {
  allocationPercent: 40
}]->(i);

-- User has goals
MATCH (u:User), (g:Goal)
CREATE (u)-[:HAS_GOAL]->(g);
```

### Goal Dependencies

```cypher
-- Goals depend on investments
MATCH (g:Goal), (i:Investment)
CREATE (g)-[:DEPENDS_ON {
  contributionRatio: 0.6
}]->(i);
```

### Life Event Impacts

```cypher
-- Life events impact goals
MATCH (l:LifeEvent), (g:Goal)
CREATE (l)-[:IMPACTS {
  severity: "HIGH"
}]->(g);
```

### Market Influences

```cypher
-- Market factors affect investments
MATCH (m:MarketFactor), (i:Investment)
CREATE (m)-[:AFFECTS {
  sensitivity: 0.8
}]->(i);
```

---

## Graph Query Examples

### Cross-Goal Conflict Analysis

**Question:** "If I buy a house now, what happens to retirement?"

```cypher
MATCH (u:User {userId: $userId})
MATCH (u)-[:HAS_GOAL]->(g1:Goal {type: "HOME"})
MATCH (u)-[:HAS_GOAL]->(g2:Goal {type: "RETIREMENT"})
MATCH (g1)-[:DEPENDS_ON]->(i:Investment)
MATCH (g2)-[:DEPENDS_ON]->(i)
WHERE g1 <> g2
RETURN g1, g2, i;
```

**Why This Works:** Identifies shared investment dependencies between competing goals  impossible with SQL joins alone.

### Risk Exposure Analysis

```cypher
MATCH (u:User {userId: $userId})-[:INVESTS_IN]->(i:Investment)
WHERE i.riskLevel = ''HIGH''
RETURN u, COUNT(i) AS highRiskCount, SUM(i.currentValue) AS totalHighRiskValue;
```

### Goal Impact Simulation

```cypher
MATCH path = (u:User)-[:HAS_GOAL]->(g:Goal)-[:DEPENDS_ON]->(i:Investment)<-[:AFFECTS]-(m:MarketFactor)
WHERE u.userId = $userId
RETURN path;
```

---

## AI-Database Mapping

### Source of Truth Mapping

| AI Component | Data Source | Purpose |
|--------------|-------------|---------|
| **Financial Facts** | PostgreSQL | ACID-compliant transactions |
| **Relationships & Causality** | Neo4j | Graph-based reasoning |
| **Conversation Memory** | MongoDB | Chat history |
| **Behavioral Trends** | Time-Series DB | Analytics |
| **Real-Time Changes** | Kafka | Event streaming |

### AI Reasoning Pipeline

```
User Query
   
Intent Detection (ML)
   
Neo4j Traversal (Why & Impact)
   
SQL Aggregates (How Much)
   
Simulation Engine (What-If)
   
LLM Explanation (Plain Language)
```

### Example: Home Loan Affordability

**Question:** "Can I afford a 50L home loan?"

| Step | Database | Purpose |
|------|----------|---------|
| Income & Expenses | PostgreSQL | Current financial facts |
| Existing Goals | Neo4j | Goal conflicts |
| Market Interest Rate | MarketFactor Node | Current rates |
| Projection | Analytics DB | Future scenarios |
| Explanation | LLM | Natural language response |

---

## Event-Driven Architecture

### Why Kafka?

-  **Decoupled services** - Microservices communicate via events
-  **Audit trail** - Every financial change is logged
-  **Replay capability** - Reprocess events for debugging
-  **Scalability** - Handle millions of events

---

## Kafka Topics

### 1. User Financial Events

**Topic:** `user.financial.updated`

```json
{
  "userId": "uuid",
  "eventType": "EXPENSE_ADDED",
  "payload": {
    "category": "DINING",
    "amount": 850
  },
  "timestamp": "2026-01-01T10:30:00Z"
}
```

### 2. Investment Portfolio Events

**Topic:** `investment.portfolio.changed`

```json
{
  "userId": "uuid",
  "investmentId": "inv_789",
  "changeType": "REBALANCE",
  "from": "DEBT",
  "to": "EQUITY",
  "timestamp": "2026-01-02T09:00:00Z"
}
```

### 3. Goal Risk Detection

**Topic:** `goal.risk.detected`

```json
{
  "userId": "uuid",
  "goalId": "goal_ret_1",
  "riskLevel": "HIGH",
  "reason": "Savings rate dropped below threshold"
}
```

### 4. Life Event Triggers

**Topic:** `lifeevent.added`

```json
{
  "userId": "uuid",
  "eventType": "CHILD_BIRTH",
  "expectedYear": 2029
}
```

**Triggers:**
- Goal recalculation
- Investment rebalancing
- Simulation refresh

---

## Event Consumers

| Service | Consumes | Purpose |
|---------|----------|---------|
| **AI Reasoning Engine** | All topics | Contextual understanding |
| **Simulation Engine** | `financial.updated` | Recalculate projections |
| **Alert Engine** | `anomaly.detected` | User notifications |
| **Digital Twin** | All topics | User financial state |
| **Analytics** | `investment.*` | Portfolio analysis |

---

## Design Guarantees

### Event Processing Guarantees

 **Idempotent Events** - Same event processed multiple times = same result  
 **Exactly-Once Processing** - No duplicate transactions  
 **Replayable Simulations** - Reproduce any past state  
 **Explainability** - Full graph traversal audit trail  
 **Loose Coupling** - Services independent  

### Graph Database Benefits

 **Complex Queries** - Multi-hop relationships  
 **Performance** - Index-free adjacency  
 **Intuitive Modeling** - Matches mental model  
 **Schema Flexibility** - Add relationships dynamically  

---

## Best Practices

### Neo4j Optimization

1. **Use constraints** - Ensure data integrity
2. **Index frequently queried properties**
3. **Avoid dense nodes** - Partition if needed
4. **Profile queries** - Use `EXPLAIN` and `PROFILE`

### Kafka Best Practices

1. **Partitioning by userId** - Maintain ordering
2. **Schema evolution** - Use Avro/Protobuf
3. **Consumer groups** - Scale consumers
4. **Dead letter queues** - Handle failures

---

## Example Integration

### Complete Flow

```
1. User adds expense (UI)
   
2. Backend writes to PostgreSQL
   
3. Publishes to Kafka: user.financial.updated
   
4. Graph updater creates Expense node
   
5. AI engine analyzes spending pattern
   
6. Publishes to Kafka: anomaly.detected (if needed)
   
7. Alert service sends notification
```

---

## Monitoring

- **Neo4j metrics:** Query performance, node count
- **Kafka metrics:** Lag, throughput, consumer health
- **Event latency:** End-to-end processing time

---

**Last Updated:** January 2026  
**Maintained By:** Nivesh Backend Team  
**Related Docs:** [DATABASE_STRATEGY.md](DATABASE_STRATERGY.md), [TECH_STACK.md](TECH_STACK.md)
