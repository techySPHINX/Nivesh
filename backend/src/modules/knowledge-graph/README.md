# Knowledge Graph Module - README

## Overview

The Knowledge Graph Module leverages Neo4j graph database to build intelligent relationship mapping and provide AI-powered insights for financial data. It enables pattern detection, anomaly detection, and personalized recommendations based on user behavior and spending patterns.

## Architecture

```
knowledge-graph/
├── domain/                        # Domain layer (business logic)
│   ├── entities/                  # Core domain entities
│   │   ├── graph-node.entity.ts          # Graph node with 9 node types
│   │   ├── graph-relationship.entity.ts  # Relationships with 16 types
│   │   └── spending-pattern.entity.ts    # Pattern detection entity
│   ├── value-objects/             # Immutable value objects
│   │   ├── cypher-query.vo.ts           # Type-safe Cypher queries
│   │   └── graph-query-result.vo.ts     # Query result wrapper
│   └── repositories/              # Repository interfaces
│       └── knowledge-graph.repository.interface.ts
├── infrastructure/                # Infrastructure layer
│   └── database/                  # Database schema and services
│       ├── neo4j-schema.cypher          # Complete graph schema
│       └── neo4j-schema.service.ts      # Schema initializer
├── application/                   # Application layer (to be implemented)
│   ├── commands/                  # Write operations
│   ├── queries/                   # Read operations
│   └── handlers/                  # Command/Query handlers
└── presentation/                  # Presentation layer (to be implemented)
    └── controllers/               # REST API controllers
```

## Graph Data Model

### Node Types (9)
- **User**: User accounts with risk profiles
- **Account**: Financial accounts (checking, savings, credit)
- **Transaction**: Financial transactions with metadata
- **Category**: Spending/income categories
- **Budget**: Budget allocations with thresholds
- **Goal**: Financial goals with target amounts
- **Merchant**: Vendors and service providers
- **Location**: Geographic locations
- **Tag**: Custom tags for categorization

### Relationship Types (16)
- **OWNS**: User owns account
- **MADE_TRANSACTION**: Account made transaction
- **BELONGS_TO_CATEGORY**: Transaction belongs to category
- **AT_MERCHANT**: Transaction at merchant
- **AT_LOCATION**: Transaction at location
- **HAS_TAG**: Transaction has tag
- **AFFECTS_BUDGET**: Transaction affects budget
- **HAS_BUDGET**: User has budget
- **HAS_GOAL**: User has goal
- **CONTRIBUTES_TO_GOAL**: Account contributes to goal
- **SUBCATEGORY_OF**: Category subcategory hierarchy
- **SIMILAR_MERCHANT**: Merchant similarity
- **MERCHANT_CHAIN**: Merchant chain membership
- **SIMILAR_SPENDING**: User spending pattern similarity
- **SIMILAR_GOALS**: User goal similarity
- **RECOMMENDS**: User recommendation relationship

## Features

### 1. Pattern Detection
Detects 10 types of spending patterns:
- Recurring payments
- Periodic spending
- Category concentration
- Merchant loyalty
- Time-of-day patterns
- Location-based patterns
- Seasonal spending
- Unusual spending
- Budget overruns
- Goal progress patterns

### 2. Graph Queries
- **Node Operations**: CRUD for all node types
- **Relationship Operations**: Create, update, delete relationships
- **Path Finding**: Find paths between nodes with max depth
- **Neighborhood**: Get neighbors with relationship filtering
- **Pattern Matching**: Execute custom Cypher queries
- **Batch Operations**: Efficient bulk operations

### 3. Analytics Support
- Node/relationship counting by type
- Graph statistics (density, average degree)
- Pattern confidence scoring
- Recommendation generation

## Neo4j Schema

### Constraints (9 unique constraints)
All node types have unique ID constraints to ensure data integrity.

### Indexes (15+ indexes)
- **User**: email, createdAt
- **Transaction**: date, amount, type (time-based queries)
- **Category/Merchant**: name (lookups)
- **Budget**: period, status (filtering)
- **Goal**: targetDate, status (filtering)
- **Location**: city, coordinates (geographic queries)
- **Relationships**: createdAt, confidence (pattern detection)

### Full-Text Indexes (3)
- Merchant search (name, description)
- Category search (name, description)
- Tag search (name)

## Business Rules

### Node Validation
- Every node must have unique ID
- Node type determines allowed relationships
- Properties are immutable (use update method)
- Timestamps automatically managed

### Relationship Validation
- Relationships must connect valid node types
- Relationship type determines allowed node combinations
- Weight represents strength (0-1 scale)
- Confidence represents ML certainty (0-1 scale)
- Bidirectional support for symmetric relationships

### Pattern Requirements
- Minimum 3 occurrences to be considered valid
- Confidence score ≥ 0.7 for actionable patterns
- Frequency ≥ 5 for recurring patterns
- Patterns can trigger recommendations

## Sample Queries

### Find User Spending by Category
```cypher
MATCH (u:User {id: $userId})-[:OWNS]->(a:Account)-[:MADE_TRANSACTION]->(t:Transaction)
      -[:BELONGS_TO_CATEGORY]->(c:Category)
WHERE t.date >= $startDate
RETURN c.name, SUM(t.amount) as total, COUNT(t) as count
ORDER BY total DESC;
```

### Find Similar Users
```cypher
MATCH (u1:User {id: $userId})-[r:SIMILAR_SPENDING]->(u2:User)
WHERE r.confidence > 0.7
RETURN u2, r.similarity, r.sharedCategories
ORDER BY r.similarity DESC
LIMIT 10;
```

### Detect Recurring Transactions
```cypher
MATCH (u:User {id: $userId})-[:OWNS]->(a:Account)-[:MADE_TRANSACTION]->(t:Transaction)
      -[:AT_MERCHANT]->(m:Merchant)
WHERE t.date >= date() - duration('P3M')
WITH m, COLLECT(t.date) as dates, COLLECT(t.amount) as amounts
WHERE SIZE(dates) >= 3
WITH m, dates, amounts,
     duration.between(dates[0], dates[-1]).days / SIZE(dates) as avgInterval
WHERE avgInterval >= 25 AND avgInterval <= 35
RETURN m.name, dates, amounts, avgInterval;
```

## Configuration

Add to `.env`:
```env
# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
NEO4J_DATABASE=neo4j
NEO4J_MAX_CONNECTION_POOL_SIZE=50
NEO4J_CONNECTION_TIMEOUT=30000
NEO4J_AUTO_INIT_SCHEMA=true
```

## Development

### Schema Initialization
The schema is automatically initialized on application startup using `Neo4jSchemaService`. This service:
1. Reads `neo4j-schema.cypher` file
2. Parses Cypher commands
3. Executes constraints and indexes
4. Validates connection

### Adding New Node Types
1. Add to `NodeType` enum in `graph-node.entity.ts`
2. Define validation rules in `canConnectTo()`
3. Add constraint in `neo4j-schema.cypher`
4. Add relevant indexes
5. Update documentation

### Adding New Relationship Types
1. Add to `RelationshipType` enum in `graph-relationship.entity.ts`
2. Define valid node pairs in `isValidRelationship()`
3. Update `canConnectTo()` in GraphNode
4. Document in schema file

## Performance Considerations

### Indexing Strategy
- All ID fields have unique constraints (automatic indexes)
- Time-based queries indexed on date fields
- Filter queries indexed on status/type fields
- Full-text search for text matching

### Query Optimization
- Use parameterized queries (CypherQuery VO)
- Limit relationship traversal depth
- Use `MERGE` for idempotent operations
- Batch operations for bulk inserts
- Read-only transactions for queries

### Scaling
- Connection pooling (max 50 connections)
- Read replicas for analytics queries
- Relationship weight for query pruning
- Pattern caching for repeated queries

## Testing

### Unit Tests
Test domain entities and value objects:
- GraphNode creation and validation
- GraphRelationship type checking
- SpendingPattern detection logic
- CypherQuery sanitization

### Integration Tests
Test Neo4j operations:
- Schema initialization
- Node CRUD operations
- Relationship creation
- Pattern matching queries
- Performance benchmarks

## Next Steps

Phase 10 implementation continues with:
1. **Branch 2**: Kafka consumers + Neo4j graph service
2. **Branch 3**: Pattern detection + recommendation engine
3. **Branch 4**: REST API controller + module integration

## References

- [Neo4j Cypher Manual](https://neo4j.com/docs/cypher-manual/)
- [Graph Data Modeling](https://neo4j.com/developer/data-modeling/)
- [Neo4j Performance](https://neo4j.com/developer/guide-performance-tuning/)
