# ADR-003: Event-Driven Architecture with Kafka

## Status

**Accepted** - January 17, 2026

## Context

Nivesh's modular monolith requires inter-module communication for:

1. **Data Synchronization** - Transaction in PostgreSQL → Update Neo4j graph → Send to ClickHouse
2. **Async Processing** - Trigger ML model predictions, send notifications, generate reports
3. **Decoupling Modules** - User module shouldn't directly depend on Alert module
4. **Audit Trail** - Every financial decision must be logged for compliance (RBI/SEBI)
5. **Future Scalability** - When modules are extracted to microservices, event bus is already in place

### Communication Patterns Needed

| Pattern               | Example                                                      | Requirement            |
| --------------------- | ------------------------------------------------------------ | ---------------------- |
| **Fan-out**           | Transaction created → Update graph, analytics, cache, alerts | 1-to-many              |
| **Request-Reply**     | User asks question → AI generates response                   | Synchronous-like       |
| **Event Sourcing**    | Reconstruct user's financial state from events               | Audit trail            |
| **Stream Processing** | Real-time spending anomaly detection                         | Continuous computation |

### Options Considered

1. **Kafka** - Distributed event streaming platform
2. **RabbitMQ** - Message broker with queues
3. **GCP Pub/Sub** - Cloud-native messaging
4. **In-Memory Events** (NestJS EventEmitter)
5. **Database Polling** - Check tables for changes

## Decision

We will use **Apache Kafka** as the event bus with the following design:

### Architecture

```
┌─────────────┐
│   Module A  │
└──────┬──────┘
       │ Publish Event
       ▼
┌─────────────────────────────────────┐
│         Kafka Topics                 │
│  ┌─────────────────────────────┐    │
│  │ user.created                │    │
│  │ transaction.synced          │    │
│  │ goal.created                │    │
│  │ simulation.completed        │    │
│  │ alert.triggered             │    │
│  │ decision.logged             │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
       │ Subscribe
       ▼
┌─────────────┐
│   Module B  │  (consumes event asynchronously)
└─────────────┘
```

### Topic Strategy

**Topic Naming Convention**: `<module>.<entity>.<action>`

```
user.created
user.updated
user.deleted

transaction.synced
transaction.categorized

goal.created
goal.updated
goal.achieved

simulation.started
simulation.completed

alert.triggered
alert.acknowledged

decision.logged
```

### Event Schema (CloudEvents Standard)

```typescript
interface BaseEvent {
  specversion: "1.0";
  id: string; // UUID
  source: string; // 'nivesh/user-module'
  type: string; // 'user.created'
  time: string; // ISO 8601 timestamp
  datacontenttype: string; // 'application/json'
  data: any; // Event payload
  correlationid?: string; // For tracing
  causationid?: string; // Event that caused this
}

// Example
const event: BaseEvent = {
  specversion: "1.0",
  id: "123e4567-e89b-12d3-a456-426614174000",
  source: "nivesh/financial-data-module",
  type: "transaction.synced",
  time: "2026-01-17T10:30:00Z",
  datacontenttype: "application/json",
  data: {
    userId: "user-123",
    transactionId: "txn-456",
    amount: 1500,
    category: "Dining",
    date: "2026-01-17",
  },
  correlationid: "sync-job-789",
};
```

### Consumer Groups

```
Topic: transaction.synced
├── Consumer Group: knowledge-graph-sync   (updates Neo4j)
├── Consumer Group: analytics-pipeline     (sends to ClickHouse)
├── Consumer Group: alert-processor        (checks anomalies)
└── Consumer Group: ml-categorization      (predicts category)
```

Each consumer group processes events independently.

### Message Ordering Guarantees

- **Partition Key**: `userId` (all events for same user go to same partition)
- **Ordering**: Guaranteed **per partition** (per user)
- **Parallelism**: Multiple partitions for high throughput

```typescript
// Publish event with partition key
await this.kafkaProducer.send({
  topic: "transaction.synced",
  messages: [
    {
      key: event.data.userId, // Partition key
      value: JSON.stringify(event),
    },
  ],
});
```

### Kafka Configuration

**Development (Docker Compose):**

```yaml
kafka:
  replicas: 1
  partitions: 3 (per topic)
  replication: 1
```

**Production (GCP):**

```yaml
kafka:
  replicas: 3 (HA)
  partitions: 6 (per topic)
  replication: 3 (data safety)
  retention: 7 days
```

## Consequences

### Positive

✅ **Decoupling**

- Modules don't need to know about each other
- Add new consumers without modifying producers
- Easy to disable features (just stop consumer)

✅ **Reliability**

- Messages persisted to disk (not lost if consumer crashes)
- Replayable events (replay last 7 days)
- At-least-once delivery guarantee

✅ **Scalability**

- Horizontal scaling via partitions
- Consumers process in parallel
- Back-pressure handling (Kafka buffers messages)

✅ **Audit Trail**

- All events logged forever (can enable long retention)
- Reconstruct system state from events
- Debugging by replaying events

✅ **Async Performance**

- Non-blocking operations (publish and continue)
- Slow consumers don't block producers

### Negative

⚠️ **Operational Complexity**

- Kafka cluster to maintain (Zookeeper + brokers)
- Monitor consumer lag, partition rebalancing
- More failure modes (broker down, consumer stuck)

⚠️ **Eventual Consistency**

- Events processed asynchronously (delay: ~100ms-1s)
- Need to handle out-of-order events
- Duplicate events possible (idempotency required)

⚠️ **Schema Evolution**

- Event schema changes must be backward compatible
- Versioning strategy needed

⚠️ **Learning Curve**

- Developers must understand Kafka concepts (topics, partitions, offsets)

### Risks

🔴 **Risk**: Consumer falls behind (high lag)

- **Mitigation**:
  - Monitor consumer lag via Prometheus
  - Alert if lag > 1000 messages
  - Auto-scale consumers (Kubernetes HPA)
  - Batch processing for catch-up

🔴 **Risk**: Duplicate event processing (at-least-once delivery)

- **Mitigation**:
  - Idempotent event handlers (check if already processed)
  - Store processed event IDs in database
  - Use Kafka transactions (exactly-once if needed)

🔴 **Risk**: Kafka cluster failure (data loss)

- **Mitigation**:
  - Replication factor = 3 (HA)
  - min.insync.replicas = 2 (data safety)
  - Regular backups via MirrorMaker
  - Failover to secondary cluster

🔴 **Risk**: Breaking schema changes

- **Mitigation**:
  - Schema registry (Confluent Schema Registry)
  - Versioned event types (`transaction.synced.v2`)
  - Consumers support multiple versions

## Alternatives Considered

### Alternative 1: RabbitMQ

**Pros:**

- Easier to set up
- Rich routing (exchanges, bindings)
- Built-in management UI

**Cons:**

- ❌ Not designed for event streaming (transient messages)
- ❌ No event replay (once consumed, gone)
- ❌ Lower throughput than Kafka
- ❌ Not ideal for audit trail

**Why Rejected:** No event replay. We need audit trail for compliance.

### Alternative 2: GCP Pub/Sub

**Pros:**

- Managed service (no ops)
- Auto-scaling
- Dead-letter queues

**Cons:**

- ❌ Vendor lock-in (can't run locally/on-prem)
- ❌ Higher cost ($0.40 per GB)
- ❌ No native event replay (7-day retention)
- ❌ Less control over partitioning

**Why Rejected:** Vendor lock-in. Want to stay cloud-agnostic.

### Alternative 3: In-Memory Events (NestJS EventEmitter)

**Implementation:**

```typescript
@Injectable()
class FinancialDataService {
  constructor(private eventEmitter: EventEmitter2) {}

  async syncTransaction(data) {
    // ... save to DB
    this.eventEmitter.emit("transaction.synced", data);
  }
}

@Injectable()
class AlertService {
  @OnEvent("transaction.synced")
  handleTransaction(data) {
    // ... process
  }
}
```

**Pros:**

- Simple (no external service)
- Zero latency

**Cons:**

- ❌ Events lost if process crashes
- ❌ Cannot scale horizontally (events in-memory only)
- ❌ No audit trail
- ❌ Tight coupling (all modules in same process)

**Why Rejected:** Not durable. Not scalable.

### Alternative 4: Database Polling (Outbox Pattern)

**Implementation:**

```sql
CREATE TABLE outbox_events (
  id UUID PRIMARY KEY,
  event_type TEXT,
  payload JSONB,
  published BOOLEAN DEFAULT FALSE
);

-- Worker polls every 1 second
SELECT * FROM outbox_events WHERE published = FALSE;
```

**Pros:**

- Transactional with business logic (same DB)
- Simple to understand

**Cons:**

- ❌ Polling overhead (database load)
- ❌ Latency (poll interval)
- ❌ Scaling issues (single poller or distributed locking)

**Why Rejected:** Not real-time. Database becomes bottleneck.

## Implementation Guidelines

### Event Publisher (Producer)

```typescript
// src/core/messaging/kafka/kafka.producer.ts
import { Injectable } from "@nestjs/common";
import { Kafka, Producer } from "kafkajs";
import { ConfigService } from "@nestjs/config";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class KafkaProducerService {
  private producer: Producer;

  constructor(private configService: ConfigService) {
    const kafka = new Kafka({
      clientId: this.configService.get("kafka.clientId"),
      brokers: this.configService.get("kafka.brokers"),
    });
    this.producer = kafka.producer();
  }

  async onModuleInit() {
    await this.producer.connect();
  }

  async publishEvent(topic: string, data: any, userId?: string) {
    const event = {
      specversion: "1.0",
      id: uuidv4(),
      source: "nivesh/backend",
      type: topic,
      time: new Date().toISOString(),
      datacontenttype: "application/json",
      data,
    };

    await this.producer.send({
      topic,
      messages: [
        {
          key: userId || event.id, // Partition key
          value: JSON.stringify(event),
        },
      ],
    });

    console.log(`✅ Published event: ${topic}`);
  }
}
```

**Usage:**

```typescript
@Injectable()
class FinancialDataService {
  constructor(private kafkaProducer: KafkaProducerService) {}

  async syncTransaction(userId: string, transaction: Transaction) {
    // Save to database
    await this.prisma.transaction.create({ data: transaction });

    // Publish event
    await this.kafkaProducer.publishEvent(
      "transaction.synced",
      {
        userId,
        transactionId: transaction.id,
        amount: transaction.amount,
        category: transaction.category,
      },
      userId // Partition key
    );
  }
}
```

### Event Consumer (Subscriber)

```typescript
// src/modules/knowledge-graph/infrastructure/events/transaction-synced.consumer.ts
import { Injectable } from "@nestjs/common";
import { KafkaConsumerService } from "@core/messaging/kafka/kafka.consumer";
import { Neo4jService } from "@core/database/neo4j/neo4j.service";

@Injectable()
export class TransactionSyncedConsumer {
  constructor(
    private kafkaConsumer: KafkaConsumerService,
    private neo4jService: Neo4jService
  ) {}

  async onModuleInit() {
    await this.kafkaConsumer.subscribe(
      "transaction.synced",
      "knowledge-graph-sync",
      async (event) => {
        try {
          await this.handleTransactionSynced(event.data);
        } catch (error) {
          console.error("Failed to process event:", error);
          throw error; // Kafka will retry
        }
      }
    );
  }

  private async handleTransactionSynced(data: any) {
    // Idempotency check
    const exists = await this.neo4jService.runQuery(
      "MATCH (t:Transaction {id: $id}) RETURN t",
      { id: data.transactionId }
    );
    if (exists.length > 0) {
      console.log("Transaction already processed, skipping");
      return;
    }

    // Update graph
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
    `,
      data
    );

    console.log(`✅ Graph updated for transaction ${data.transactionId}`);
  }
}
```

### Error Handling & Retries

```typescript
// Kafka consumer with retry logic
await kafkaConsumer.subscribe(
  "transaction.synced",
  "knowledge-graph-sync",
  async (event) => {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        await processEvent(event);
        return; // Success
      } catch (error) {
        attempt++;
        if (attempt >= maxRetries) {
          // Send to dead-letter queue
          await kafkaProducer.publishEvent("transaction.synced.dlq", event);
          console.error("Event moved to DLQ after 3 retries");
          return;
        }
        await sleep(Math.pow(2, attempt) * 1000); // Exponential backoff
      }
    }
  }
);
```

### Monitoring

**Prometheus Metrics:**

```typescript
// Event publish duration
histogram("kafka_event_publish_duration_ms", "topic");

// Consumer lag
gauge("kafka_consumer_lag", "topic", "group");

// Event processing errors
counter("kafka_event_processing_errors", "topic", "consumer_group");
```

**Grafana Dashboard:**

- Events published per minute (by topic)
- Consumer lag (current offset - committed offset)
- Processing latency (p50, p95, p99)
- DLQ message count

### Testing

**Unit Test (Event Publisher):**

```typescript
describe("TransactionSyncedEvent", () => {
  it("should publish event with correct schema", async () => {
    const mockProducer = { send: jest.fn() };
    const service = new FinancialDataService(mockProducer);

    await service.syncTransaction("user-123", transaction);

    expect(mockProducer.send).toHaveBeenCalledWith({
      topic: "transaction.synced",
      messages: expect.arrayContaining([
        expect.objectContaining({
          key: "user-123",
          value: expect.stringContaining("transaction.synced"),
        }),
      ]),
    });
  });
});
```

**Integration Test (Event Consumer):**

```typescript
describe("TransactionSyncedConsumer", () => {
  it("should update Neo4j graph on event", async () => {
    const event = {
      data: {
        userId: "user-123",
        transactionId: "txn-456",
        amount: 1500,
        category: "Dining",
      },
    };

    await consumer.handleTransactionSynced(event.data);

    const result = await neo4jService.runQuery(
      "MATCH (t:Transaction {id: $id}) RETURN t",
      { id: "txn-456" }
    );

    expect(result).toHaveLength(1);
    expect(result[0].t.properties.amount).toBe(1500);
  });
});
```

## Migration Plan

### Phase 1: Development Environment (Week 1)

- ✅ Set up Kafka via Docker Compose
- ✅ Implement KafkaProducerService
- ✅ Implement KafkaConsumerService
- ✅ Add first topic: `transaction.synced`

### Phase 2: MVP Topics (Weeks 2-4)

```
user.created
transaction.synced
goal.created
simulation.completed
alert.triggered
```

### Phase 3: Event Sourcing (Weeks 5-8)

- Store all events in MongoDB (audit trail)
- Implement event replay functionality
- Add event versioning

### Phase 4: Production Deployment (Week 9+)

- Deploy Kafka cluster on GKE (3 brokers)
- Configure monitoring (Prometheus + Grafana)
- Set up disaster recovery (backup topics)

## Cost Analysis

### Development

- **Kafka (Docker)**: $0 (local resources)

### Staging (GCP)

- **Self-managed Kafka on GCE**: ~$50/month (e2-small x 1)

### Production (GCP, MVP - 10K users)

- **Self-managed Kafka on GKE**: ~$300/month (n1-standard-1 x 3)
- **Confluent Cloud Alternative**: ~$500/month (Basic tier)

### Production at Scale (100K users)

- **Self-managed Kafka on GKE**: ~$800/month (n1-standard-2 x 3 + Zookeeper)
- **Confluent Cloud Alternative**: ~$2000/month (Standard tier)

## References

- [Kafka Official Documentation](https://kafka.apache.org/documentation/)
- [CloudEvents Specification](https://cloudevents.io/)
- [Event-Driven Microservices (Chris Richardson)](https://microservices.io/patterns/data/event-driven-architecture.html)
- [Kafka: The Definitive Guide (O'Reilly)](https://www.confluent.io/resources/kafka-the-definitive-guide/)
- [Building Event-Driven Microservices (Adam Bellemare)](https://www.oreilly.com/library/view/building-event-driven-microservices/9781492057888/)

## Review History

- **2026-01-17**: Initial proposal and acceptance by @techySPHINX
