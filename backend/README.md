# Nivesh Backend

AI-Native Financial Reasoning Platform - Backend Modular Monolith

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ LTS
- Docker Desktop
- PostgreSQL, Neo4j, MongoDB, Redis, ClickHouse, Kafka (via Docker Compose)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration

# Start Docker services
docker-compose up -d

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

## 📦 Project Structure

```
backend/
├── src/
│   ├── core/                    # Core infrastructure
│   │   ├── config/              # Configuration management
│   │   ├── database/            # Database connections
│   │   │   ├── postgres/        # PostgreSQL/Prisma
│   │   │   ├── neo4j/           # Neo4j Graph DB
│   │   │   ├── mongodb/         # MongoDB
│   │   │   ├── redis/           # Redis Cache
│   │   │   └── clickhouse/      # ClickHouse Analytics
│   │   ├── messaging/           # Kafka event bus
│   │   ├── security/            # Authentication & Authorization
│   │   └── observability/       # Logging, metrics, tracing
│   │
│   ├── modules/                 # Business domain modules
│   │   ├── user/                # User management
│   │   ├── financial-data/      # Financial data ingestion
│   │   ├── knowledge-graph/     # Neo4j knowledge graph
│   │   ├── ai-reasoning/        # AI/ML reasoning engine
│   │   ├── simulation/          # Scenario simulations
│   │   ├── goal-planning/       # Goal planning & tracking
│   │   ├── alerts/              # Smart alerts
│   │   └── analytics/           # Analytics & insights
│   │
│   ├── main.ts                  # Application entry point
│   ├── app.module.ts            # Root module
│   └── health.controller.ts     # Health check endpoints
│
├── prisma/
│   └── schema.prisma            # Prisma database schema
│
├── test/                        # E2E tests
└── package.json
```

## 🛠️ Available Scripts

```bash
# Development
npm run dev                      # Start development server with hot reload
npm run start                    # Start production server

# Building
npm run build                    # Build for production
npm run start:prod               # Start production build

# Testing
npm run test                     # Run unit tests
npm run test:watch               # Run tests in watch mode
npm run test:cov                 # Run tests with coverage
npm run test:e2e                 # Run end-to-end tests

# Database
npm run prisma:generate          # Generate Prisma client
npm run prisma:migrate           # Run migrations
npm run prisma:studio            # Open Prisma Studio

# Code quality
npm run lint                     # Lint code
npm run format                   # Format code with Prettier
```

## 🗄️ Database Setup

### PostgreSQL (via Prisma)

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name init

# View database in Prisma Studio
npx prisma studio
```

### Neo4j

Access Neo4j Browser: http://localhost:7474

Default credentials:
- Username: `neo4j`
- Password: `nivesh_password`

### MongoDB

Connection string: `mongodb://nivesh_user:nivesh_password@localhost:27017`

### Redis

Connection: `localhost:6379`

### ClickHouse

Web UI: http://localhost:8123

### Kafka

Kafka UI: http://localhost:8080

## 🔐 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Application
NODE_ENV=development
PORT=3000

# Databases
DATABASE_URL=postgresql://nivesh_user:nivesh_password@localhost:5432/nivesh_db
NEO4J_URI=bolt://localhost:7687
MONGODB_URI=mongodb://nivesh_user:nivesh_password@localhost:27017
REDIS_HOST=localhost
CLICKHOUSE_HOST=http://localhost:8123

# Kafka
KAFKA_BROKERS=localhost:29092

# Security
JWT_SECRET=your-secret-key
FIREBASE_PROJECT_ID=your-project-id

# AI
GEMINI_API_KEY=your-api-key
```

## 📊 API Documentation

Swagger documentation available at: http://localhost:3000/api/docs

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 🐳 Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Clean up volumes
docker-compose down -v
```

## 📈 Health Checks

- Health: http://localhost:3000/api/v1/health
- Readiness: http://localhost:3000/api/v1/health/ready
- Liveness: http://localhost:3000/api/v1/health/live

## 🏗️ Architecture

### Modular Monolith

- **Core Infrastructure**: Shared services (DB, messaging, security)
- **Domain Modules**: Independent business capabilities
- **Event-Driven**: Kafka-based async communication
- **Polyglot Persistence**: Right database for each use case

### Technology Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **API**: REST + GraphQL (future)
- **Databases**: PostgreSQL, Neo4j, MongoDB, Redis, ClickHouse
- **Messaging**: Apache Kafka
- **ORM**: Prisma
- **AI/ML**: Google Gemini Pro, Vertex AI

## 📚 Documentation

- [Development Guide](../../DEVELOPMENT_GUIDE.md)
- [Module Implementation Guide](../../MODULE_IMPLEMENTATION_GUIDE.md)
- [Architecture Documentation](../../docs/Architecture.md)

## 🤝 Contributing

1. Follow the module implementation sequence
2. Write tests for all features (>80% coverage)
3. Use conventional commits
4. Update documentation

## 📄 License

MIT
