# Nivesh - Complete Development Guide

## 📋 Table of Contents

1. [Pre-Development Setup](#phase-0-pre-development-setup)
2. [Development Environment](#phase-1-development-environment)
3. [Backend Development](#phase-2-backend-development)
4. [Database Implementation](#phase-3-database-implementation)
5. [AI/ML Integration](#phase-4-aiml-integration)
6. [Frontend Development](#phase-5-frontend-development)
7. [Testing Strategy](#phase-6-testing-strategy)
8. [Deployment Procedures](#phase-7-deployment-procedures)

---

## Phase 0: Pre-Development Setup

### Prerequisites Installation

#### 1. Development Tools

```bash
# Node.js 20+ LTS
winget install OpenJS.NodeJS.LTS

# Python 3.11+
winget install Python.Python.3.11

# Docker Desktop
winget install Docker.DockerDesktop

# Git
winget install Git.Git

# Visual Studio Code
winget install Microsoft.VisualStudioCode

# Postman (API testing)
winget install Postman.Postman

# k9s (Kubernetes UI)
winget install k9s

# Terraform
winget install Hashicorp.Terraform
```

#### 2. VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-azuretools.vscode-docker",
    "ms-kubernetes-tools.vscode-kubernetes-tools",
    "ms-python.python",
    "ms-vscode.makefile-tools",
    "prisma.prisma",
    "redhat.vscode-yaml",
    "graphql.vscode-graphql",
    "neo4j.neo4j-vscode"
  ]
}
```

#### 3. GCP Account Setup

```bash
# Install gcloud CLI
(New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")
& $env:Temp\GoogleCloudSDKInstaller.exe

# Initialize gcloud
gcloud init

# Enable required APIs
gcloud services enable \
  container.googleapis.com \
  compute.googleapis.com \
  sqladmin.googleapis.com \
  aiplatform.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com
```

#### 4. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project "nivesh-dev"
3. Enable Authentication (Email/Password, Google)
4. Enable Firestore Database
5. Download `firebase-config.json`

---

## Phase 1: Development Environment

### Step 1.1: Initialize Monorepo

```bash
# Create project root
mkdir nivesh
cd nivesh

# Initialize git
git init
git branch -M main

# Initialize npm workspace
npm init -y

# Update package.json
```

**package.json (root):**

```json
{
  "name": "nivesh-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["backend", "frontend/web", "frontend/mobile", "shared/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\""
  },
  "devDependencies": {
    "turbo": "^1.11.0",
    "prettier": "^3.1.0",
    "husky": "^8.0.3",
    "lint-staged": "^15.1.0"
  }
}
```

### Step 1.2: Setup Turborepo

```bash
# Install dependencies
npm install

# Initialize turbo
npx turbo login
npx turbo link
```

**turbo.json:**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### Step 1.3: Setup Git Hooks

```bash
# Initialize husky
npx husky-init && npm install

# Configure pre-commit hook
echo "npx lint-staged" > .husky/pre-commit
```

**.lintstagedrc.json:**

```json
{
  "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,yml,yaml}": ["prettier --write"]
}
```

### Step 1.4: Docker Compose for Local Development

**docker-compose.yml:**

```yaml
version: "3.9"

services:
  # PostgreSQL - Primary Database
  postgres:
    image: postgres:15-alpine
    container_name: nivesh-postgres
    environment:
      POSTGRES_USER: nivesh_user
      POSTGRES_PASSWORD: nivesh_password
      POSTGRES_DB: nivesh_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/src/core/database/postgres/migrations:/docker-entrypoint-initdb.d
    networks:
      - nivesh-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nivesh_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Neo4j - Knowledge Graph
  neo4j:
    image: neo4j:5.15-community
    container_name: nivesh-neo4j
    environment:
      NEO4J_AUTH: neo4j/nivesh_password
      NEO4J_PLUGINS: '["apoc", "graph-data-science"]'
      NEO4J_dbms_memory_heap_max__size: 2G
    ports:
      - "7474:7474" # HTTP
      - "7687:7687" # Bolt
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs
    networks:
      - nivesh-network
    healthcheck:
      test:
        [
          "CMD",
          "cypher-shell",
          "-u",
          "neo4j",
          "-p",
          "nivesh_password",
          "RETURN 1",
        ]
      interval: 10s
      timeout: 5s
      retries: 5

  # MongoDB - Conversation History
  mongodb:
    image: mongo:7
    container_name: nivesh-mongodb
    environment:
      MONGO_INITDB_ROOT_USERNAME: nivesh_user
      MONGO_INITDB_ROOT_PASSWORD: nivesh_password
      MONGO_INITDB_DATABASE: nivesh_conversations
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    networks:
      - nivesh-network
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis - Cache & Session Store
  redis:
    image: redis:7-alpine
    container_name: nivesh-redis
    command: redis-server --requirepass nivesh_password
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - nivesh-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ClickHouse - Analytics
  clickhouse:
    image: clickhouse/clickhouse-server:latest
    container_name: nivesh-clickhouse
    environment:
      CLICKHOUSE_USER: nivesh_user
      CLICKHOUSE_PASSWORD: nivesh_password
      CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT: 1
    ports:
      - "8123:8123" # HTTP
      - "9000:9000" # Native
    volumes:
      - clickhouse_data:/var/lib/clickhouse
    networks:
      - nivesh-network
    ulimits:
      nofile:
        soft: 262144
        hard: 262144

  # Kafka - Event Bus
  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    container_name: nivesh-zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    networks:
      - nivesh-network

  kafka:
    image: confluentinc/cp-kafka:latest
    container_name: nivesh-kafka
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,PLAINTEXT_HOST://localhost:29092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    ports:
      - "29092:29092"
    networks:
      - nivesh-network
    healthcheck:
      test:
        [
          "CMD",
          "kafka-broker-api-versions",
          "--bootstrap-server",
          "localhost:9092",
        ]
      interval: 10s
      timeout: 10s
      retries: 5

  # Kong API Gateway
  kong-database:
    image: postgres:15-alpine
    container_name: nivesh-kong-db
    environment:
      POSTGRES_USER: kong
      POSTGRES_PASSWORD: kong_password
      POSTGRES_DB: kong
    volumes:
      - kong_data:/var/lib/postgresql/data
    networks:
      - nivesh-network

  kong-migrations:
    image: kong:latest
    container_name: nivesh-kong-migrations
    command: kong migrations bootstrap
    depends_on:
      - kong-database
    environment:
      KONG_DATABASE: postgres
      KONG_PG_HOST: kong-database
      KONG_PG_USER: kong
      KONG_PG_PASSWORD: kong_password
    networks:
      - nivesh-network

  kong:
    image: kong:latest
    container_name: nivesh-kong
    depends_on:
      - kong-database
      - kong-migrations
    environment:
      KONG_DATABASE: postgres
      KONG_PG_HOST: kong-database
      KONG_PG_USER: kong
      KONG_PG_PASSWORD: kong_password
      KONG_PROXY_ACCESS_LOG: /dev/stdout
      KONG_ADMIN_ACCESS_LOG: /dev/stdout
      KONG_PROXY_ERROR_LOG: /dev/stderr
      KONG_ADMIN_ERROR_LOG: /dev/stderr
      KONG_ADMIN_LISTEN: 0.0.0.0:8001
    ports:
      - "8000:8000" # Proxy
      - "8443:8443" # Proxy SSL
      - "8001:8001" # Admin API
      - "8444:8444" # Admin API SSL
    networks:
      - nivesh-network
    healthcheck:
      test: ["CMD", "kong", "health"]
      interval: 10s
      timeout: 10s
      retries: 10

  # Prometheus - Metrics
  prometheus:
    image: prom/prometheus:latest
    container_name: nivesh-prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"
    ports:
      - "9090:9090"
    volumes:
      - ./infrastructure/monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - nivesh-network

  # Grafana - Visualization
  grafana:
    image: grafana/grafana:latest
    container_name: nivesh-grafana
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: admin
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./infrastructure/monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
    networks:
      - nivesh-network

volumes:
  postgres_data:
  neo4j_data:
  neo4j_logs:
  mongodb_data:
  redis_data:
  clickhouse_data:
  kong_data:
  prometheus_data:
  grafana_data:

networks:
  nivesh-network:
    driver: bridge
```

### Step 1.5: Start Local Environment

```bash
# Start all services
docker-compose up -d

# Verify all services are running
docker-compose ps

# Check logs
docker-compose logs -f

# Access services:
# - PostgreSQL: localhost:5432
# - Neo4j Browser: http://localhost:7474
# - MongoDB: localhost:27017
# - Redis: localhost:6379
# - ClickHouse: http://localhost:8123
# - Kafka: localhost:29092
# - Kong Admin: http://localhost:8001
# - Prometheus: http://localhost:9090
# - Grafana: http://localhost:3001
```

---

## Phase 2: Backend Development

### Step 2.1: Initialize NestJS Backend

```bash
# Install NestJS CLI
npm install -g @nestjs/cli

# Create backend project
cd nivesh
nest new backend --package-manager npm --skip-git

cd backend

# Install core dependencies
npm install \
  @nestjs/config \
  @nestjs/cqrs \
  @nestjs/event-emitter \
  @nestjs/microservices \
  @nestjs/swagger \
  @nestjs/throttler \
  @nestjs/jwt \
  @nestjs/passport \
  passport \
  passport-jwt \
  passport-firebase-jwt \
  class-validator \
  class-transformer \
  @prisma/client \
  neo4j-driver \
  mongodb \
  redis \
  ioredis \
  kafkajs \
  @google-cloud/aiplatform \
  @google-cloud/vertexai \
  winston \
  helmet \
  compression \
  uuid \
  date-fns \
  rxjs

# Install dev dependencies
npm install -D \
  @types/node \
  @types/passport-jwt \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  eslint \
  prettier \
  prisma \
  jest \
  @nestjs/testing \
  supertest \
  @types/supertest
```

### Step 2.2: Configure Project Structure

**tsconfig.json:**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false,
    "paths": {
      "@core/*": ["src/core/*"],
      "@modules/*": ["src/modules/*"],
      "@shared/*": ["src/shared/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

**.eslintrc.js:**

```javascript
module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "tsconfig.json",
    tsconfigRootDir: __dirname,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint/eslint-plugin"],
  extends: [
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: [".eslintrc.js"],
  rules: {
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "off",
  },
};
```

**.prettierrc:**

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "semi": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

### Step 2.3: Setup Environment Configuration

**src/core/config/config.module.ts:**

```typescript
import { Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import databaseConfig from "./database.config";
import aiConfig from "./ai.config";
import redisConfig from "./redis.config";
import kafkaConfig from "./kafka.config";

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, aiConfig, redisConfig, kafkaConfig],
      envFilePath: [".env.local", ".env"],
    }),
  ],
})
export class ConfigModule {}
```

**src/core/config/database.config.ts:**

```typescript
import { registerAs } from "@nestjs/config";

export default registerAs("database", () => ({
  postgres: {
    host: process.env.POSTGRES_HOST || "localhost",
    port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
    username: process.env.POSTGRES_USER || "nivesh_user",
    password: process.env.POSTGRES_PASSWORD || "nivesh_password",
    database: process.env.POSTGRES_DB || "nivesh_db",
  },
  neo4j: {
    uri: process.env.NEO4J_URI || "bolt://localhost:7687",
    username: process.env.NEO4J_USER || "neo4j",
    password: process.env.NEO4J_PASSWORD || "nivesh_password",
  },
  mongodb: {
    uri:
      process.env.MONGODB_URI ||
      "mongodb://nivesh_user:nivesh_password@localhost:27017",
    database: process.env.MONGODB_DB || "nivesh_conversations",
  },
  clickhouse: {
    host: process.env.CLICKHOUSE_HOST || "http://localhost:8123",
    username: process.env.CLICKHOUSE_USER || "nivesh_user",
    password: process.env.CLICKHOUSE_PASSWORD || "nivesh_password",
  },
}));
```

**src/core/config/ai.config.ts:**

```typescript
import { registerAs } from "@nestjs/config";

export default registerAs("ai", () => ({
  gemini: {
    projectId: process.env.GCP_PROJECT_ID,
    location: process.env.GCP_LOCATION || "us-central1",
    model: process.env.GEMINI_MODEL || "gemini-1.5-pro",
    apiKey: process.env.GEMINI_API_KEY,
  },
  vertexAi: {
    projectId: process.env.GCP_PROJECT_ID,
    location: process.env.GCP_LOCATION || "us-central1",
  },
}));
```

**.env.example:**

```env
# Application
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=nivesh_user
POSTGRES_PASSWORD=nivesh_password
POSTGRES_DB=nivesh_db

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=nivesh_password

# MongoDB
MONGODB_URI=mongodb://nivesh_user:nivesh_password@localhost:27017
MONGODB_DB=nivesh_conversations

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=nivesh_password

# ClickHouse
CLICKHOUSE_HOST=http://localhost:8123
CLICKHOUSE_USER=nivesh_user
CLICKHOUSE_PASSWORD=nivesh_password

# Kafka
KAFKA_BROKERS=localhost:29092
KAFKA_CLIENT_ID=nivesh-backend

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d

# Firebase
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY=your-private-key

# GCP AI
GCP_PROJECT_ID=your-gcp-project-id
GCP_LOCATION=us-central1
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-1.5-pro

# External APIs
FI_MCP_API_URL=https://api.fi.money
FI_MCP_API_KEY=your-fi-mcp-api-key

# Observability
LOG_LEVEL=debug
ENABLE_REQUEST_LOGGING=true
```

### Step 2.4: Setup Main Application Entry

**src/main.ts:**

```typescript
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import helmet from "helmet";
import compression from "compression";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log", "debug", "verbose"],
  });

  // Security
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3001"],
    credentials: true,
  });

  // Compression
  app.use(compression());

  // Global prefix
  app.setGlobalPrefix(process.env.API_PREFIX || "api/v1");

  // Versioning
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  // Swagger documentation
  if (process.env.NODE_ENV !== "production") {
    const config = new DocumentBuilder()
      .setTitle("Nivesh API")
      .setDescription("AI Financial Strategist API Documentation")
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
```

**src/app.module.ts:**

```typescript
import { Module } from "@nestjs/common";
import { ConfigModule } from "./core/config/config.module";
import { HealthController } from "./health.controller";

// Import all feature modules
import { UserModule } from "./modules/user/user.module";
import { FinancialDataModule } from "./modules/financial-data/financial-data.module";
import { KnowledgeGraphModule } from "./modules/knowledge-graph/knowledge-graph.module";
import { AiReasoningModule } from "./modules/ai-reasoning/ai-reasoning.module";
import { SimulationModule } from "./modules/simulation/simulation.module";
import { MlIntelligenceModule } from "./modules/ml-intelligence/ml-intelligence.module";
import { GoalPlanningModule } from "./modules/goal-planning/goal-planning.module";
import { AlertsModule } from "./modules/alerts/alerts.module";
import { ExplainabilityModule } from "./modules/explainability/explainability.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { NotificationModule } from "./modules/notification/notification.module";

@Module({
  imports: [
    ConfigModule,
    // Feature modules will be added progressively
    // UserModule,
    // FinancialDataModule,
    // ... etc
  ],
  controllers: [HealthController],
})
export class AppModule {}
```

**src/health.controller.ts:**

```typescript
import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "Health check endpoint" })
  check() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    };
  }
}
```

### Step 2.5: Test Backend Setup

```bash
# Start backend development server
npm run start:dev

# Test health endpoint
curl http://localhost:3000/api/v1/health

# Access Swagger docs
# Open browser: http://localhost:3000/api/docs
```

---

## Phase 3: Database Implementation

### Step 3.1: Setup Prisma for PostgreSQL

```bash
# Initialize Prisma
cd backend
npx prisma init

# This creates:
# - prisma/schema.prisma
# - .env (update with your credentials)
```

**prisma/schema.prisma:**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// User Management
model User {
  id                String      @id @default(uuid())
  firebaseUid       String      @unique
  email             String      @unique
  phone             String?     @unique
  firstName         String?
  lastName          String?
  dateOfBirth       DateTime?
  kycStatus         String      @default("PENDING") // PENDING, VERIFIED, REJECTED
  riskProfile       String?     // CONSERVATIVE, MODERATE, AGGRESSIVE

  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  accounts          Account[]
  transactions      Transaction[]
  investments       Investment[]
  goals             Goal[]
  alerts            Alert[]

  @@map("users")
}

// Financial Accounts
model Account {
  id                String      @id @default(uuid())
  userId            String
  accountType       String      // BANK, CREDIT_CARD, INVESTMENT, LOAN
  accountNumber     String
  accountName       String
  institutionName   String
  balance           Decimal     @db.Decimal(15, 2)
  currency          String      @default("INR")
  isActive          Boolean     @default(true)

  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  user              User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions      Transaction[]

  @@map("accounts")
  @@index([userId])
}

// Transactions
model Transaction {
  id                String      @id @default(uuid())
  userId            String
  accountId         String
  transactionDate   DateTime
  description       String
  amount            Decimal     @db.Decimal(15, 2)
  transactionType   String      // DEBIT, CREDIT
  category          String?     // Auto-categorized by ML
  merchantName      String?
  isRecurring       Boolean     @default(false)
  confidence        Float?      // ML category confidence score

  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  user              User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  account           Account     @relation(fields: [accountId], references: [id], onDelete: Cascade)

  @@map("transactions")
  @@index([userId, transactionDate])
  @@index([accountId])
}

// Investments
model Investment {
  id                String      @id @default(uuid())
  userId            String
  investmentType    String      // MUTUAL_FUND, STOCK, BOND, FD, PPF, etc.
  assetName         String
  assetCode         String?     // ISIN, ticker symbol
  units             Decimal     @db.Decimal(15, 4)
  purchasePrice     Decimal     @db.Decimal(15, 2)
  currentPrice      Decimal     @db.Decimal(15, 2)
  purchaseDate      DateTime
  maturityDate      DateTime?

  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  user              User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("investments")
  @@index([userId])
}

// Goals
model Goal {
  id                String      @id @default(uuid())
  userId            String
  goalType          String      // RETIREMENT, HOME, EDUCATION, EMERGENCY, TRAVEL
  goalName          String
  targetAmount      Decimal     @db.Decimal(15, 2)
  currentAmount     Decimal     @db.Decimal(15, 2) @default(0)
  targetDate        DateTime
  priority          Int         @default(1)
  status            String      @default("IN_PROGRESS") // IN_PROGRESS, ACHIEVED, PAUSED

  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  user              User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  milestones        Milestone[]

  @@map("goals")
  @@index([userId])
}

// Goal Milestones
model Milestone {
  id                String      @id @default(uuid())
  goalId            String
  milestoneDate     DateTime
  targetAmount      Decimal     @db.Decimal(15, 2)
  isAchieved        Boolean     @default(false)
  achievedDate      DateTime?

  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  goal              Goal        @relation(fields: [goalId], references: [id], onDelete: Cascade)

  @@map("milestones")
  @@index([goalId])
}

// Alerts
model Alert {
  id                String      @id @default(uuid())
  userId            String
  alertType         String      // SPENDING_SPIKE, GOAL_OFF_TRACK, LOW_BALANCE, etc.
  severity          String      // INFO, WARNING, CRITICAL
  title             String
  message           String
  isRead            Boolean     @default(false)
  isActionable      Boolean     @default(true)
  actionTaken       Boolean     @default(false)

  createdAt         DateTime    @default(now())

  user              User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("alerts")
  @@index([userId, createdAt])
}
```

```bash
# Generate Prisma Client
npx prisma generate

# Create first migration
npx prisma migrate dev --name init

# Seed database (optional)
npx prisma db seed
```

### Step 3.2: Setup Neo4j Connection

**src/core/database/neo4j/neo4j.service.ts:**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import neo4j, { Driver, Session } from "neo4j-driver";

@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private driver: Driver;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const uri = this.configService.get<string>("database.neo4j.uri");
    const username = this.configService.get<string>("database.neo4j.username");
    const password = this.configService.get<string>("database.neo4j.password");

    this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
      maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
    });

    // Verify connectivity
    await this.driver.verifyConnectivity();
    console.log("✅ Neo4j connected successfully");
  }

  async onModuleDestroy() {
    await this.driver.close();
  }

  getSession(): Session {
    return this.driver.session();
  }

  async runQuery(cypher: string, params: any = {}) {
    const session = this.getSession();
    try {
      const result = await session.run(cypher, params);
      return result.records.map((record) => record.toObject());
    } finally {
      await session.close();
    }
  }
}
```

**src/core/database/neo4j/neo4j.module.ts:**

```typescript
import { Module, Global } from "@nestjs/common";
import { Neo4jService } from "./neo4j.service";

@Global()
@Module({
  providers: [Neo4jService],
  exports: [Neo4jService],
})
export class Neo4jModule {}
```

### Step 3.3: Setup MongoDB Connection

**src/core/database/mongodb/mongodb.service.ts:**

```typescript
import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MongoClient, Db } from "mongodb";

@Injectable()
export class MongodbService implements OnModuleInit {
  private client: MongoClient;
  private db: Db;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const uri = this.configService.get<string>("database.mongodb.uri");
    const database = this.configService.get<string>(
      "database.mongodb.database"
    );

    this.client = new MongoClient(uri);
    await this.client.connect();
    this.db = this.client.db(database);

    console.log("✅ MongoDB connected successfully");
  }

  getDb(): Db {
    return this.db;
  }

  getCollection(name: string) {
    return this.db.collection(name);
  }
}
```

### Step 3.4: Setup Redis Connection

**src/core/database/redis/redis.service.ts:**

```typescript
import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit {
  private client: Redis;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.client = new Redis({
      host: this.configService.get<string>("redis.host"),
      port: this.configService.get<number>("redis.port"),
      password: this.configService.get<string>("redis.password"),
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    this.client.on("connect", () => {
      console.log("✅ Redis connected successfully");
    });

    this.client.on("error", (err) => {
      console.error("❌ Redis connection error:", err);
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.set(key, value, "EX", ttl);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
```

---

## Phase 4: AI/ML Integration

### Step 4.1: Setup Gemini Pro Client

**src/core/ai/gemini/gemini.client.ts:**

```typescript
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

@Injectable()
export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>("ai.gemini.apiKey");
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: this.configService.get<string>("ai.gemini.model"),
    });
  }

  async generateResponse(prompt: string) {
    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  async chat(history: any[], message: string) {
    const chat = this.model.startChat({ history });
    const result = await chat.sendMessage(message);
    return result.response.text();
  }
}
```

### Step 4.2: Create Prompt Templates

**src/modules/ai-reasoning/infrastructure/ai-providers/gemini/prompt-templates/affordability.template.ts:**

```typescript
export const AFFORDABILITY_PROMPT = `
You are Nivesh, an AI Financial Strategist. A user is asking about affordability for a financial decision.

User Context:
- Monthly Income: {monthlyIncome}
- Monthly Fixed Expenses: {fixedExpenses}
- Monthly Variable Expenses: {variableExpenses}
- Current Savings: {currentSavings}
- Existing EMIs: {existingEmIs}
- Credit Score: {creditScore}

User Question: {userQuestion}

Provide a comprehensive analysis with:
1. Direct Answer (Can they afford it? Yes/No/Conditional)
2. Key Factors Considered
3. Impact on Monthly Cash Flow
4. Recommendations
5. Risk Assessment
6. Alternative Options

Format your response in JSON:
{
  "canAfford": boolean,
  "confidence": number (0-1),
  "keyFactors": string[],
  "monthlyCashFlowImpact": number,
  "recommendations": string[],
  "risks": string[],
  "alternatives": string[]
}
`;

export function buildAffordabilityPrompt(
  context: any,
  question: string
): string {
  return AFFORDABILITY_PROMPT.replace("{monthlyIncome}", context.monthlyIncome)
    .replace("{fixedExpenses}", context.fixedExpenses)
    .replace("{variableExpenses}", context.variableExpenses)
    .replace("{currentSavings}", context.currentSavings)
    .replace("{existingEMIs}", context.existingEMIs)
    .replace("{creditScore}", context.creditScore || "Not available")
    .replace("{userQuestion}", question);
}
```

---

## Phase 5: Frontend Development

### Step 5.1: Initialize Next.js Web App

```bash
cd nivesh/frontend
npx create-next-app@latest web --typescript --tailwind --app --use-npm

cd web

# Install dependencies
npm install \
  @tanstack/react-query \
  axios \
  zustand \
  react-hook-form \
  @hookform/resolvers \
  zod \
  date-fns \
  recharts \
  framer-motion \
  @radix-ui/react-dialog \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-tabs \
  sonner
```

**frontend/web/src/app/layout.tsx:**

```typescript
import "./globals.css";
import { Inter } from "next/font/google";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Nivesh - AI Financial Strategist",
  description: "Your money finally makes sense - decisions, not dashboards",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Step 5.2: Initialize React Native Mobile App

```bash
cd nivesh/frontend
npx create-expo-app mobile --template blank-typescript

cd mobile

# Install dependencies
npm install \
  @react-navigation/native \
  @react-navigation/native-stack \
  @react-navigation/bottom-tabs \
  @tanstack/react-query \
  axios \
  zustand \
  react-native-gesture-handler \
  react-native-reanimated \
  react-native-safe-area-context \
  react-native-screens \
  expo-secure-store
```

---

## Phase 6: Testing Strategy

### Step 6.1: Unit Testing Setup

**backend/test/jest-config.json:**

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "collectCoverageFrom": ["**/*.(t|j)s"],
  "coverageDirectory": "../coverage",
  "testEnvironment": "node"
}
```

### Step 6.2: Integration Testing

**backend/test/integration/api/user.e2e-spec.ts:**

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "./../src/app.module";

describe("UserController (e2e)", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it("/api/v1/users (GET)", () => {
    return request(app.getHttpServer()).get("/api/v1/users").expect(200);
  });
});
```

---

## Phase 7: Deployment Procedures

### Step 7.1: Build Docker Images

**backend/Dockerfile:**

```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/main"]
```

### Step 7.2: Kubernetes Deployment

**infrastructure/kubernetes/apps/backend/deployment.yaml:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nivesh-backend
  namespace: nivesh
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nivesh-backend
  template:
    metadata:
      labels:
        app: nivesh-backend
    spec:
      containers:
        - name: backend
          image: gcr.io/nivesh/backend:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: nivesh-secrets
                  key: database-url
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          livenessProbe:
            httpGet:
              path: /api/v1/health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/v1/health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
```

### Step 7.3: CI/CD Pipeline

**.github/workflows/ci-backend.yml:**

```yaml
name: Backend CI

on:
  push:
    branches: [main, develop]
    paths:
      - "backend/**"
  pull_request:
    branches: [main, develop]
    paths:
      - "backend/**"

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: ./backend
        run: npm ci

      - name: Run linter
        working-directory: ./backend
        run: npm run lint

      - name: Run tests
        working-directory: ./backend
        run: npm run test:cov

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/lcov.info

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push'

    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Login to GCR
        uses: docker/login-action@v2
        with:
          registry: gcr.io
          username: _json_key
          password: ${{ secrets.GCR_JSON_KEY }}

      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: ./backend
          push: true
          tags: gcr.io/nivesh/backend:${{ github.sha }},gcr.io/nivesh/backend:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

## Makefile for Common Commands

**Makefile:**

```makefile
.PHONY: help install dev build test deploy

help:
	@echo "Nivesh Development Commands"
	@echo "----------------------------"
	@echo "make install    - Install all dependencies"
	@echo "make dev        - Start development environment"
	@echo "make build      - Build all applications"
	@echo "make test       - Run all tests"
	@echo "make deploy     - Deploy to staging"

install:
	npm install
	cd backend && npm install
	cd frontend/web && npm install
	cd frontend/mobile && npm install

dev:
	docker-compose up -d
	turbo run dev

build:
	turbo run build

test:
	turbo run test

deploy:
	./scripts/deploy/deploy-staging.sh

clean:
	docker-compose down -v
	find . -name "node_modules" -type d -prune -exec rm -rf '{}' +
	find . -name "dist" -type d -prune -exec rm -rf '{}' +
```

---

## Next Steps After This Guide

1. **Module-by-Module Implementation** (Follow Phase 2.6 onwards)
2. **Database Schema Migrations**
3. **AI Prompt Engineering & Testing**
4. **Frontend Component Development**
5. **Integration Testing**
6. **Performance Optimization**
7. **Security Hardening**
8. **Production Deployment**

**Document Status**: ✅ Complete Development Guide
**Ready for**: Step-by-step module implementation
