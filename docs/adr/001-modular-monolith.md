# ADR-001: Modular Monolith Architecture

## Status

**Accepted** - January 17, 2026

## Context

Nivesh is an AI-native financial reasoning platform that requires:

- **Complex domain logic** across multiple financial contexts (transactions, goals, investments, simulations)
- **Real-time AI reasoning** with low latency requirements
- **Event-driven architecture** for data synchronization
- **Future scalability** as user base grows
- **Fast development iteration** for MVP launch

We needed to choose between:

1. **Microservices from day one** - Separate services for each domain
2. **Modular Monolith** - Single deployable with clear module boundaries
3. **Traditional Monolith** - Layered architecture without domain separation

## Decision

We will implement a **Modular Monolith** architecture with the following characteristics:

### Architecture Principles

1. **Domain-Driven Design (DDD)**

   - Each module represents a bounded context (User, Financial Data, AI Reasoning, Simulation, etc.)
   - Clear domain boundaries with explicit interfaces
   - Module ownership of data and business logic

2. **4-Layer Architecture per Module**

   ```
   Domain Layer       → Entities, Value Objects, Domain Events
   Application Layer  → Use Cases (Commands/Queries), DTOs
   Infrastructure     → Database, External APIs, Events
   Presentation       → Controllers, GraphQL Resolvers
   ```

3. **Event-Driven Communication**

   - Modules communicate via Kafka events for async operations
   - Direct function calls for synchronous operations within monolith
   - No shared databases between modules (logical separation)

4. **Polyglot Persistence**
   - PostgreSQL: Transactional data (users, transactions, goals)
   - Neo4j: Financial knowledge graph (relationships)
   - MongoDB: Conversation history (document store)
   - Redis: Cache and session store
   - ClickHouse: Analytics and reporting

### Module Structure

```
backend/src/modules/
├── user/
├── financial-data/
├── knowledge-graph/
├── ai-reasoning/
├── simulation/
├── ml-intelligence/
├── goal-planning/
├── alerts/
├── explainability/
├── analytics/
└── notification/
```

Each module is **independently testable** and has **clear dependencies**.

## Consequences

### Positive

✅ **Faster Initial Development**

- Single codebase reduces operational complexity
- No network overhead between modules
- Easier debugging and tracing
- Simpler deployment pipeline

✅ **Team Productivity**

- Junior developers can contribute without microservices expertise
- Easier to refactor across module boundaries
- Single IDE/debugger workflow

✅ **Cost Efficiency**

- Single server for MVP (can scale vertically)
- No service mesh overhead
- Reduced infrastructure cost in early stages

✅ **Future-Proof**

- Modules can be extracted to microservices later
- Event-driven communication already in place
- Database-per-module pattern prepared

✅ **Transaction Consistency**

- ACID transactions within modules
- Eventual consistency via events between modules

### Negative

⚠️ **Scaling Constraints**

- Cannot scale individual modules independently initially
- Single deployment unit (but mitigated by horizontal scaling)

⚠️ **Coupling Risk**

- Developers might bypass module boundaries
- Requires strict code review discipline

⚠️ **Deployment Risk**

- Bug in one module affects entire application
- Need robust testing and feature flags

### Risks

🔴 **Risk**: Developers create tight coupling between modules

- **Mitigation**: Enforce dependency rules via CI/CD linting, mandatory code reviews

🔴 **Risk**: Database becomes a bottleneck

- **Mitigation**: Connection pooling (PgBouncer), read replicas, Redis caching

🔴 **Risk**: Monolith becomes too large to manage

- **Mitigation**: Extract high-load modules (AI Reasoning, Simulation) to services when needed

## Alternatives Considered

### Alternative 1: Microservices from Day 1

**Pros:**

- Independent scaling per service
- Polyglot technology choices
- Fault isolation

**Cons:**

- ❌ Overhead of service mesh, API gateway, distributed tracing
- ❌ Network latency between services
- ❌ Complex deployment (11+ services)
- ❌ Requires experienced DevOps team
- ❌ Higher initial infrastructure cost

**Why Rejected:** Over-engineering for MVP stage. Premature optimization.

### Alternative 2: Traditional Layered Monolith

**Pros:**

- Simplest to understand
- Fast initial development

**Cons:**

- ❌ No clear domain boundaries
- ❌ Difficult to extract modules later
- ❌ Shared database schema creates coupling
- ❌ Hard to assign module ownership

**Why Rejected:** Not scalable. Creates technical debt that's hard to refactor.

## Migration Path to Microservices

When to consider extraction (signals):

1. Module traffic exceeds 50% of total API calls
2. Module requires different scaling characteristics
3. Team size > 15 developers (Conway's Law)
4. Deployment frequency hindered by monolith size

**Extraction Sequence** (future):

1. **Phase 1**: AI Reasoning Module (highest compute load)
2. **Phase 2**: Simulation Engine (CPU-intensive, batch jobs)
3. **Phase 3**: ML Intelligence (GPU requirements)
4. **Phase 4**: Analytics (read-heavy, separate database)

## Implementation Guidelines

### Module Communication Rules

✅ **Allowed:**

- Direct function calls within same module
- Event publishing to Kafka
- Reading from shared cache (Redis)

❌ **Forbidden:**

- Direct database access to another module's tables
- Importing entities from another module
- Synchronous HTTP calls between modules (use events)

### Testing Strategy

```typescript
// Unit tests: Test domain logic in isolation
// Integration tests: Test module with real database
// Contract tests: Test event schemas between modules
// E2E tests: Test user journeys across modules
```

### Monitoring

- **Module-level metrics**: Track performance per module
- **Inter-module events**: Monitor Kafka lag per topic
- **Database queries**: Track slow queries per module

## References

- [Martin Fowler - MonolithFirst](https://martinfowler.com/bliki/MonolithFirst.html)
- [Sam Newman - Monolith to Microservices](https://www.amazon.com/Monolith-Microservices-Evolutionary-Patterns-Transform/dp/1492047848)
- [NestJS Modular Architecture](https://docs.nestjs.com/modules)
- [Domain-Driven Design (Eric Evans)](https://www.amazon.com/Domain-Driven-Design-Tackling-Complexity-Software/dp/0321125215)

## Review History

- **2026-01-17**: Initial proposal and acceptance by @techySPHINX
