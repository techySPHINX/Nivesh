# Module Implementation Sequence Guide

## Overview

This document provides a **step-by-step sequence** for implementing all Nivesh modules in the modular monolith architecture. Follow this order to ensure dependencies are resolved properly.

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Setup core infrastructure and shared components

### Phase 2: Data Layer (Week 3-4)

**Goal:** Implement data ingestion and storage

### Phase 3: AI & Intelligence (Week 5-7)

**Goal:** Implement AI reasoning and ML models

### Phase 4: User-Facing Features (Week 8-10)

**Goal:** Implement goal planning, simulations, alerts

### Phase 5: Analytics & Monitoring (Week 11-12)

**Goal:** Implement analytics, explainability, reporting

### Phase 6: Testing & Optimization (Week 13-14)

**Goal:** E2E testing, performance tuning, security hardening

---

## Detailed Implementation Sequence

### Module 1: Core Infrastructure (Week 1)

**Priority:** Critical  
**Dependencies:** None  
**Estimated Time:** 5 days

#### What to Build

```
backend/src/core/
├── config/          ✅ Environment configuration
├── database/        ✅ Database connections (Postgres, Neo4j, MongoDB, Redis, ClickHouse)
├── messaging/       ✅ Kafka producer/consumer
├── security/        ✅ Auth, encryption, rate limiting
├── observability/   ✅ Logging, metrics, tracing
└── exceptions/      ✅ Error handling
```

#### Implementation Steps

**Day 1-2: Configuration & Database Setup**

```bash
# 1. Initialize NestJS project structure
cd backend
nest g module core/config
nest g module core/database

# 2. Setup database connections
# - Create PostgresModule (Prisma)
# - Create Neo4jModule (neo4j-driver)
# - Create MongodbModule (mongodb native)
# - Create RedisModule (ioredis)
# - Create ClickhouseModule (clickhouse client)

# 3. Test connections
npm run test:integration -- database.spec.ts
```

**Files to Create:**

- `src/core/database/postgres/postgres.module.ts`
- `src/core/database/postgres/postgres.service.ts`
- `src/core/database/neo4j/neo4j.module.ts`
- `src/core/database/neo4j/neo4j.service.ts`
- `src/core/database/mongodb/mongodb.module.ts`
- `src/core/database/redis/redis.module.ts`
- `src/core/database/clickhouse/clickhouse.module.ts`

**Day 3: Kafka Event Bus**

```bash
# 1. Setup Kafka module
nest g module core/messaging/kafka

# 2. Implement producer/consumer
# - KafkaProducerService
# - KafkaConsumerService
# - Base event schemas

# 3. Test event publishing
```

**Files to Create:**

- `src/core/messaging/kafka/kafka.module.ts`
- `src/core/messaging/kafka/kafka.producer.ts`
- `src/core/messaging/kafka/kafka.consumer.ts`
- `src/core/messaging/kafka/topics.enum.ts`
- `src/core/messaging/events/base.event.ts`

**Day 4: Security & Auth**

```bash
# 1. Firebase JWT authentication
nest g module core/security/auth

# 2. Guards and decorators
# - JwtAuthGuard
# - RolesGuard
# - RateLimitGuard

# 3. Encryption utilities
```

**Files to Create:**

- `src/core/security/auth/auth.module.ts`
- `src/core/security/auth/jwt.strategy.ts`
- `src/core/security/auth/firebase.strategy.ts`
- `src/core/security/auth/guards/jwt-auth.guard.ts`
- `src/core/security/encryption/encryption.service.ts`

**Day 5: Observability**

```bash
# 1. Winston logger
nest g module core/observability/logger

# 2. Prometheus metrics
nest g module core/observability/metrics

# 3. OpenTelemetry tracing
nest g module core/observability/tracing
```

**Files to Create:**

- `src/core/observability/logger/logger.module.ts`
- `src/core/observability/logger/logger.service.ts`
- `src/core/observability/metrics/metrics.module.ts`
- `src/core/observability/metrics/prometheus.service.ts`

**Acceptance Criteria:**

- ✅ All databases connect successfully
- ✅ Kafka publishes and consumes test events
- ✅ JWT authentication works with Firebase tokens
- ✅ Health check endpoint returns all service statuses
- ✅ Logs written to console with structured format
- ✅ Prometheus metrics exposed at `/metrics`

---

### Module 2: User Management (Week 1)

**Priority:** Critical  
**Dependencies:** Core Infrastructure  
**Estimated Time:** 3 days

#### What to Build

```
backend/src/modules/user/
├── domain/
│   ├── entities/user.entity.ts
│   ├── value-objects/email.vo.ts
│   └── repositories/user.repository.interface.ts
├── application/
│   ├── commands/create-user.command.ts
│   ├── queries/get-user.query.ts
│   └── dto/user-response.dto.ts
├── infrastructure/
│   └── persistence/user.repository.ts
└── presentation/
    └── user.controller.ts
```

#### Implementation Steps

**Day 1: Domain Layer**

```typescript
// 1. Define User entity
// 2. Create value objects (Email, Phone)
// 3. Define repository interface

// src/modules/user/domain/entities/user.entity.ts
export class User {
  id: string;
  firebaseUid: string;
  email: Email; // Value object
  phone?: Phone; // Value object
  firstName?: string;
  lastName?: string;
  kycStatus: KycStatus;
  createdAt: Date;
  updatedAt: Date;
}
```

**Day 2: Application Layer (CQRS)**

```typescript
// Commands
export class CreateUserCommand {
  constructor(
    public readonly firebaseUid: string,
    public readonly email: string
  ) {}
}

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  async execute(command: CreateUserCommand): Promise<User> {
    // Business logic
    const user = await this.userRepository.create({
      firebaseUid: command.firebaseUid,
      email: new Email(command.email),
    });

    // Publish event
    await this.eventPublisher.publish("user.created", { userId: user.id });

    return user;
  }
}

// Queries
export class GetUserQuery {
  constructor(public readonly userId: string) {}
}

@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery> {
  async execute(query: GetUserQuery): Promise<User> {
    return this.userRepository.findById(query.userId);
  }
}
```

**Day 3: Infrastructure & Presentation**

```typescript
// Repository implementation (Prisma)
@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return this.toDomain(user);
  }

  async create(data: CreateUserDto): Promise<User> {
    const user = await this.prisma.user.create({ data });
    return this.toDomain(user);
  }
}

// Controller (REST API)
@Controller("users")
export class UserController {
  constructor(private commandBus: CommandBus, private queryBus: QueryBus) {}

  @Post()
  async createUser(@Body() dto: CreateUserDto) {
    return this.commandBus.execute(
      new CreateUserCommand(dto.firebaseUid, dto.email)
    );
  }

  @Get(":id")
  async getUser(@Param("id") id: string) {
    return this.queryBus.execute(new GetUserQuery(id));
  }
}
```

**Acceptance Criteria:**

- ✅ Create user via POST `/api/v1/users`
- ✅ Get user by ID via GET `/api/v1/users/:id`
- ✅ Event `user.created` published to Kafka
- ✅ Unit tests for commands/queries (80% coverage)
- ✅ Integration test with PostgreSQL

---

### Module 3: Financial Data Ingestion (Week 2-3)

**Priority:** Critical  
**Dependencies:** User Module, Core Infrastructure  
**Estimated Time:** 7 days

#### What to Build

```
backend/src/modules/financial-data/
├── domain/
│   ├── entities/
│   │   ├── transaction.entity.ts
│   │   ├── account.entity.ts
│   │   └── investment.entity.ts
│   └── repositories/
│       └── transaction.repository.interface.ts
├── application/
│   ├── commands/sync-transactions.command.ts
│   ├── queries/get-transactions.query.ts
│   └── services/fi-mcp.integration.service.ts
├── infrastructure/
│   ├── persistence/transaction.repository.ts
│   └── integrations/fi-mcp/
│       ├── fi-mcp.client.ts
│       └── fi-mcp.adapter.ts
└── presentation/
    └── financial-data.controller.ts
```

#### Implementation Steps

**Day 1-2: Domain Entities**

```typescript
// Transaction entity
export class Transaction {
  id: string;
  userId: string;
  accountId: string;
  transactionDate: Date;
  description: string;
  amount: Money; // Value object
  transactionType: TransactionType; // DEBIT | CREDIT
  category?: string;
  merchantName?: string;
  isRecurring: boolean;
}

// Account entity
export class Account {
  id: string;
  userId: string;
  accountType: AccountType; // BANK | CREDIT_CARD | INVESTMENT | LOAN
  accountNumber: string;
  institutionName: string;
  balance: Money;
  currency: Currency;
  isActive: boolean;
}
```

**Day 3-4: Fi MCP Integration**

```typescript
// Fi MCP client
@Injectable()
export class FiMcpClient {
  constructor(private httpService: HttpService) {}

  async fetchTransactions(
    userId: string,
    fromDate: Date
  ): Promise<Transaction[]> {
    const response = await this.httpService
      .post("/api/transactions/sync", {
        userId,
        fromDate: fromDate.toISOString(),
      })
      .toPromise();

    return response.data.transactions.map(this.mapToTransaction);
  }

  private mapToTransaction(raw: any): Transaction {
    return {
      id: raw.id,
      userId: raw.userId,
      amount: new Money(raw.amount, raw.currency),
      transactionDate: new Date(raw.date),
      description: raw.description,
      // ... map other fields
    };
  }
}

// Sync command
@CommandHandler(SyncTransactionsCommand)
export class SyncTransactionsHandler {
  async execute(command: SyncTransactionsCommand): Promise<void> {
    // 1. Fetch from Fi MCP
    const transactions = await this.fiMcpClient.fetchTransactions(
      command.userId,
      command.fromDate
    );

    // 2. Save to PostgreSQL (batch insert)
    await this.transactionRepository.bulkCreate(transactions);

    // 3. Publish events for each transaction
    for (const txn of transactions) {
      await this.kafkaProducer.publishEvent(
        "transaction.synced",
        {
          userId: txn.userId,
          transactionId: txn.id,
          amount: txn.amount.value,
          category: txn.category,
        },
        txn.userId
      );
    }
  }
}
```

**Day 5: Net Worth Calculation**

```typescript
// Net worth query
@QueryHandler(GetNetWorthQuery)
export class GetNetWorthHandler {
  async execute(query: GetNetWorthQuery): Promise<NetWorth> {
    // 1. Check Redis cache
    const cached = await this.redisService.get(`net_worth:${query.userId}`);
    if (cached) return JSON.parse(cached);

    // 2. Calculate from database
    const accounts = await this.accountRepository.findByUserId(query.userId);
    const investments = await this.investmentRepository.findByUserId(
      query.userId
    );

    const totalAssets = this.calculateTotalAssets(accounts, investments);
    const totalLiabilities = this.calculateTotalLiabilities(accounts);

    const netWorth = {
      userId: query.userId,
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
      calculatedAt: new Date(),
    };

    // 3. Cache for 5 minutes
    await this.redisService.set(
      `net_worth:${query.userId}`,
      JSON.stringify(netWorth),
      300
    );

    return netWorth;
  }
}
```

**Day 6-7: Testing & API Endpoints**

```typescript
// REST API
@Controller("financial-data")
export class FinancialDataController {
  @Post("sync")
  @UseGuards(JwtAuthGuard)
  async syncTransactions(@CurrentUser() user: User) {
    return this.commandBus.execute(
      new SyncTransactionsCommand(user.id, new Date("2024-01-01"))
    );
  }

  @Get("transactions")
  @UseGuards(JwtAuthGuard)
  async getTransactions(
    @CurrentUser() user: User,
    @Query() query: GetTransactionsDto
  ) {
    return this.queryBus.execute(new GetTransactionsQuery(user.id, query));
  }

  @Get("net-worth")
  @UseGuards(JwtAuthGuard)
  async getNetWorth(@CurrentUser() user: User) {
    return this.queryBus.execute(new GetNetWorthQuery(user.id));
  }
}
```

**Acceptance Criteria:**

- ✅ Sync transactions from Fi MCP via POST `/api/v1/financial-data/sync`
- ✅ Retrieve transactions via GET `/api/v1/financial-data/transactions`
- ✅ Calculate net worth via GET `/api/v1/financial-data/net-worth`
- ✅ Events `transaction.synced` published for each transaction
- ✅ Net worth cached in Redis (5min TTL)
- ✅ Integration test with Fi MCP mock server

---

### Module 4: Knowledge Graph (Week 3)

**Priority:** High  
**Dependencies:** Financial Data Module  
**Estimated Time:** 5 days

#### What to Build

```
backend/src/modules/knowledge-graph/
├── domain/
│   ├── entities/financial-node.entity.ts
│   └── repositories/graph.repository.interface.ts
├── application/
│   ├── commands/create-relationship.command.ts
│   ├── queries/traverse-graph.query.ts
│   └── services/graph-builder.service.ts
├── infrastructure/
│   ├── persistence/neo4j.repository.ts
│   └── events/transaction-synced.consumer.ts
└── presentation/
    └── knowledge-graph.controller.ts
```

#### Implementation Steps

**Day 1-2: Neo4j Schema Design**

```cypher
// Create constraints
CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE;
CREATE CONSTRAINT transaction_id IF NOT EXISTS FOR (t:Transaction) REQUIRE t.id IS UNIQUE;
CREATE CONSTRAINT goal_id IF NOT EXISTS FOR (g:Goal) REQUIRE g.id IS UNIQUE;

// Create indexes
CREATE INDEX user_email IF NOT EXISTS FOR (u:User) ON (u.email);
CREATE INDEX transaction_date IF NOT EXISTS FOR (t:Transaction) ON (t.date);

// Sample graph structure
(:User)-[:HAS_ACCOUNT]->(:Account)
(:User)-[:HAS_GOAL]->(:Goal)
(:User)-[:MADE_TRANSACTION]->(:Transaction)
(:Transaction)-[:AFFECTS]->(:Goal)
(:Goal)-[:DEPENDS_ON]->(:Income)
```

**Day 3: Event Consumer (Sync from PostgreSQL)**

```typescript
// Listen to transaction.synced events
@Injectable()
export class TransactionSyncedConsumer {
  constructor(
    private neo4jService: Neo4jService,
    private kafkaConsumer: KafkaConsumerService
  ) {}

  async onModuleInit() {
    await this.kafkaConsumer.subscribe(
      "transaction.synced",
      "knowledge-graph-sync",
      this.handleTransactionSynced.bind(this)
    );
  }

  private async handleTransactionSynced(event: TransactionSyncedEvent) {
    // Check if already processed (idempotency)
    const exists = await this.checkIfExists(event.data.transactionId);
    if (exists) return;

    // Create transaction node and relationships
    await this.neo4jService.runQuery(
      `
      MATCH (user:User {id: $userId})
      CREATE (txn:Transaction {
        id: $transactionId,
        amount: $amount,
        category: $category,
        date: datetime($date)
      })
      CREATE (user)-[:MADE_TRANSACTION]->(txn)

      // Link to affected goals (if spending on goal-related category)
      WITH txn, user
      MATCH (user)-[:HAS_GOAL]->(goal:Goal {relatedCategory: $category})
      CREATE (txn)-[:AFFECTS]->(goal)
    `,
      {
        userId: event.data.userId,
        transactionId: event.data.transactionId,
        amount: event.data.amount,
        category: event.data.category,
        date: event.data.date,
      }
    );
  }
}
```

**Day 4: Graph Traversal Queries**

```typescript
// Query: Get all entities affected by a transaction
@QueryHandler(GetImpactGraphQuery)
export class GetImpactGraphHandler {
  async execute(query: GetImpactGraphQuery): Promise<ImpactGraph> {
    const result = await this.neo4jService.runQuery(
      `
      MATCH (txn:Transaction {id: $transactionId})
      MATCH (txn)-[r:AFFECTS*1..3]->(affected)
      RETURN txn, r, affected
    `,
      { transactionId: query.transactionId }
    );

    return this.mapToImpactGraph(result);
  }
}

// Query: Find shortest path between two financial entities
@QueryHandler(FindPathQuery)
export class FindPathHandler {
  async execute(query: FindPathQuery): Promise<Path> {
    const result = await this.neo4jService.runQuery(
      `
      MATCH path = shortestPath(
        (start {id: $startId})-[*]-(end {id: $endId})
      )
      RETURN path
    `,
      {
        startId: query.startId,
        endId: query.endId,
      }
    );

    return this.mapToPath(result);
  }
}
```

**Day 5: Testing & API**

```typescript
// REST API
@Controller("knowledge-graph")
export class KnowledgeGraphController {
  @Get("impact/:transactionId")
  @UseGuards(JwtAuthGuard)
  async getImpactGraph(@Param("transactionId") transactionId: string) {
    return this.queryBus.execute(new GetImpactGraphQuery(transactionId));
  }

  @Get("path")
  @UseGuards(JwtAuthGuard)
  async findPath(@Query() query: FindPathDto) {
    return this.queryBus.execute(new FindPathQuery(query.startId, query.endId));
  }
}
```

**Acceptance Criteria:**

- ✅ Neo4j synced with PostgreSQL transactions
- ✅ Graph query: Get impact of transaction on goals
- ✅ Graph query: Find shortest path between entities
- ✅ Event consumer handles `transaction.synced` idempotently
- ✅ Unit tests for graph queries
- ✅ Integration test with Neo4j

---

### Module 5: AI Reasoning Engine (Week 4-5)

**Priority:** Critical  
**Dependencies:** Financial Data, Knowledge Graph  
**Estimated Time:** 10 days

_(Due to length, I'll provide high-level overview. Full implementation in separate detailed guide.)_

#### What to Build

- Intent detection (BERT fine-tuned model)
- Context builder (fetch from PostgreSQL + Neo4j + Redis)
- Gemini Pro integration
- Prompt templates (affordability, goal planning, investment advice)
- Response formatting
- Conversation history (MongoDB)

#### Key Files

```
backend/src/modules/ai-reasoning/
├── application/services/
│   ├── intent-detection.service.ts
│   ├── context-builder.service.ts
│   └── response-formatter.service.ts
├── infrastructure/ai-providers/gemini/
│   ├── gemini.client.ts
│   └── prompt-templates/*.template.ts
└── presentation/
    └── ai-reasoning.controller.ts
```

#### API Endpoints

```
POST /api/v1/ai/chat
GET  /api/v1/ai/conversation/:conversationId
```

---

### Module 6-11: Remaining Modules (Week 6-12)

Follow similar pattern for:

- **Simulation Module** (Monte Carlo, retirement calculator)
- **ML Intelligence Module** (XGBoost risk profiling, LSTM spending prediction)
- **Goal Planning Module** (Goal CRUD, milestone tracking)
- **Alerts Module** (Rule engine, notification triggers)
- **Explainability Module** (Decision traces, audit logs)
- **Analytics Module** (ClickHouse aggregations, reports)

Each module follows **4-layer architecture** and publishes/consumes Kafka events.

---

## Testing Strategy Per Module

### Unit Tests (Jest)

```bash
# Run tests for specific module
npm test -- user.service.spec.ts

# Coverage
npm test -- --coverage
```

### Integration Tests

```bash
# Test with real databases (Docker)
npm run test:integration -- user.integration.spec.ts
```

### E2E Tests (Supertest)

```bash
# Test full user journeys
npm run test:e2e -- user-journey.e2e-spec.ts
```

---

## Development Workflow

### Daily Routine

```bash
# 1. Pull latest changes
git pull origin develop

# 2. Start local environment
docker-compose up -d

# 3. Run migrations
npx prisma migrate dev

# 4. Start backend in watch mode
npm run start:dev

# 5. Write code (TDD: test first, then implementation)

# 6. Run tests
npm test

# 7. Commit with conventional commits
git commit -m "feat(user): implement create user command"

# 8. Push to feature branch
git push origin feature/user-module
```

### Code Review Checklist

- ✅ Follows 4-layer architecture
- ✅ Unit tests written (>80% coverage)
- ✅ Integration tests for database operations
- ✅ Events published to Kafka (if applicable)
- ✅ API documented in Swagger
- ✅ Error handling with custom exceptions
- ✅ Logging with structured format
- ✅ No direct database access from controller
- ✅ No business logic in repositories

---

## When to Extract to Microservices

Monitor these metrics:

1. **Module API calls** > 50% of total traffic
2. **Database queries** from module causing bottleneck
3. **Team size** > 15 developers (need independent deployment)

**Extraction Priority:**

1. AI Reasoning (compute-heavy)
2. Simulation Engine (CPU-intensive)
3. ML Intelligence (GPU requirements)
4. Analytics (separate database)

---

## Conclusion

By following this sequence, you'll build a production-ready modular monolith in **12-14 weeks**. Each module is independently testable and ready for future extraction to microservices.

**Next Document:** Database Migration Strategy
