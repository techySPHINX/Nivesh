# Project Structure & File Organization

> **Complete monorepo structure for Nivesh - Your AI Financial Strategist**

⚠️ **PROPRIETARY DOCUMENTATION** - Copyright © 2026 Prateek (techySPHINX). All Rights Reserved.  
This document is part of proprietary software. See [LICENSE](../LICENSE) for terms.

[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](../LICENSE)
[![Monorepo](https://img.shields.io/badge/architecture-monorepo-purple.svg)](https://monorepo.tools/)
[![TypeScript](https://img.shields.io/badge/backend-TypeScript-3178C6.svg)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/AI-Python-3776AB.svg)](https://www.python.org/)
[![PRD](https://img.shields.io/badge/docs-PRD-orange.svg)](../PRD.md)

## Table of Contents

- [Overview](#overview)
- [Product Context](#product-context)
- [Monorepo Structure](#monorepo-structure) # modular monolith
- [Backend (NestJS) Structure](#backend-nestjs-structure)
- [AI Engine (FastAPI) Structure](#ai-engine-fastapi-structure)
- [Frontend Structure](#frontend-structure)
- [Shared Libraries](#shared-libraries)
- [Infrastructure](#infrastructure)
- [Environment Configuration](#environment-configuration)
- [Development Workflow](#development-workflow)

---

## Overview

Nivesh follows a **monorepo** architecture managed with **npm workspaces** (for TypeScript) and **Poetry** (for Python).

**Key Benefits:**

- ✅ **Shared code** - Reuse libraries across apps
- ✅ **Atomic commits** - Change multiple services in one PR
- ✅ **Unified versioning** - All services on same version
- ✅ **Easier refactoring** - Update interfaces across the codebase
- ✅ **Consistent tooling** - One CI/CD pipeline for all services

---

## Product Context

**Nivesh's Mission:** Enable users to confidently answer:

- "Can I afford this?"
- "What should I do next?"
- "What happens if I choose option A vs B?"
- "Am I on track for my life goals?"

This structure supports:

- **Conversational AI** interfaces (text + voice)
- **Simulation engine** for scenario planning
- **Goal-based planning** with milestone tracking
- **Explainability** for every recommendation
- **Privacy & control** with user-owned data exports

---

## Monorepo Structure

**Architecture Alignment:** This structure implements the approved Mermaid architecture diagrams.

```
nivesh/
│
├── apps/                          # Application services (Diagram 1)
│   ├── backend-nest/              # NestJS API server (TypeScript)
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/          # Firebase Auth integration
│   │       │   ├── transactions/  # Fi MCP data ingestion
│   │       │   ├── graph/         # Neo4j Feature Store sync
│   │       │   ├── kafka/         # Event streaming
│   │       │   └── audit/         # Explainability logs
│   │
│   ├── ai-engine/                 # FastAPI ML service (Python)
│   │   └── src/
│   │       ├── orchestrator/      # AI Orchestrator (Diagram 2)
│   │       ├── tools/             # Tool Router
│   │       │   ├── simulation/    # Deterministic Finance Engine
│   │       │   ├── categorization/# Transaction Categorization Model
│   │       │   ├── anomaly/       # Anomaly Detection (IsolationForest/Prophet)
│   │       │   ├── risk/          # Risk Profiling Model
│   │       │   └── personalization/# Recommendation Engine
│   │       ├── llm/               # Gemini LLM integration
│   │       ├── enrichment/        # Data Enrichment Layer (Diagram 3)
│   │       └── response_builder/  # Response Builder (charts + actions)
│   │
│   └── frontend/                  # Next.js web app (TypeScript)
│       └── src/
│           ├── pages/             # Next.js pages
│           ├── components/        # Chat UI, Dashboard, Simulations
│           └── lib/               # API client, Firebase Auth
│
├── libs/                          # Shared libraries
│   ├── proto/                     # Protocol buffers (gRPC contracts)
│   │   ├── transaction.proto      # Transaction events (Kafka Avro)
│   │   ├── simulation.proto       # Simulation requests/responses
│   │   └── audit.proto            # Explainability event schema
│   │
│   ├── compliance/                # RBI/GDPR compliance utilities
│   │   ├── consent-manager.ts     # GDPR consent tracking
│   │   ├── retention-policy.ts    # 7-year RBI audit retention
│   │   └── pii-masking.ts         # PII data anonymization
│   │
│   └── prompts/                   # LLM prompt templates
│       ├── system-prompt.txt      # Base financial advisor prompt
│       ├── intent-detection.txt   # Intent classification prompt
│       └── explanation.txt        # Explainability generation
│
├── infra/                         # Infrastructure as Code
│   ├── docker/                    # Docker compose files
│   │   ├── docker-compose.yml     # Local dev stack
│   │   ├── docker-compose.prod.yml# Production config
│   │   └── Dockerfile.*           # Service-specific Dockerfiles
│   │
│   ├── kubernetes/                # K8s manifests (V1 phase)
│   │   ├── backend-deployment.yaml
│   │   ├── ai-engine-deployment.yaml
│   │   ├── neo4j-statefulset.yaml
│   │   ├── kafka-statefulset.yaml
│   │   └── ingress.yaml
│   │
│   └── terraform/                 # Cloud provisioning (optional)
│       ├── aws/                   # AWS EKS + RDS
│       ├── gcp/                   # GCP GKE + Cloud SQL
│       └── azure/                 # Azure AKS + Cosmos DB
│
├── data/                          # Data assets
│   ├── models/                    # ML model files
│   │   ├── xgboost_risk.pkl       # Risk Profiling Model
│   │   ├── xgboost_category.pkl   # Transaction Categorization
│   │   ├── isolation_forest.pkl   # Anomaly Detection
│   │   └── prophet_forecast.pkl   # Forecasting Model
│   │
│   ├── embeddings/                # Vector embeddings
│   │   └── sentence_transformers/ # Conversation search
│   │
│   └── migrations/                # Database migrations
│       ├── postgres/              # PostgreSQL schema versions
│       ├── neo4j/                 # Cypher scripts for graph setup
│       └── clickhouse/            # ClickHouse table definitions
│
├── docs/                          # Documentation
│   ├── api/                       # API reference
│   │   ├── backend-api.md         # NestJS REST API
│   │   └── ai-api.md              # FastAPI ML endpoints
│   │
│   ├── architecture/              # Architecture diagrams
│   │   ├── mermaid-diagrams.md    # Approved Mermaid architecture
│   │   ├── data-flow.md           # Data pipeline flow
│   │   └── deployment.md          # Infrastructure diagrams
│   │
│   └── guides/                    # User guides
│       ├── developer-setup.md     # Local dev environment
│       ├── deployment-guide.md    # Production deployment
│       └── contributing.md        # Contribution guidelines
│
├── scripts/                       # Build & deployment scripts
│   ├── build.sh                   # Build all services
│   ├── test.sh                    # Run all tests
│   ├── deploy.sh                  # Deploy to production
│   ├── seed-data.sh               # Seed test data (dev)
│   └── migrate-db.sh              # Run database migrations
│
├── .github/                       # GitHub workflows (CI/CD)
│   └── workflows/
│       ├── ci.yml                 # Continuous integration
│       ├── deploy-staging.yml     # Staging deployment
│       └── deploy-prod.yml        # Production deployment
│
├── .env.example                   # Environment variables template
├── docker-compose.yml             # Local development stack
├── package.json                   # Root package.json (npm workspaces)
├── tsconfig.base.json             # Shared TypeScript config
├── pyproject.toml                 # Python dependencies (Poetry)
├── README.md                      # Project README
└── LICENSE                        # MIT License
```

### Architecture Mapping

| Mermaid Component         | Codebase Location                           |
| ------------------------- | ------------------------------------------- |
| **Fi MCP Server**         | `apps/backend-nest/src/modules/mcp/`        |
| **Data Normalization**    | `apps/ai-engine/src/enrichment/`            |
| **Feature Store (Neo4j)** | `apps/backend-nest/src/modules/graph/`      |
| **AI Orchestrator**       | `apps/ai-engine/src/orchestrator/`          |
| **Gemini LLM**            | `apps/ai-engine/src/llm/`                   |
| **Tool Router**           | `apps/ai-engine/src/tools/router.py`        |
| **Finance Engine**        | `apps/ai-engine/src/tools/simulation/`      |
| **Txn Categorization**    | `apps/ai-engine/src/tools/categorization/`  |
| **Anomaly Detection**     | `apps/ai-engine/src/tools/anomaly/`         |
| **Risk Profiling**        | `apps/ai-engine/src/tools/risk/`            |
| **Personalization**       | `apps/ai-engine/src/tools/personalization/` |
| **Response Builder**      | `apps/ai-engine/src/response_builder/`      |

---

├── tsconfig.base.json # Shared TypeScript config
├── pyproject.toml # Python dependencies (Poetry)
├── README.md # Project README
└── LICENSE # MIT License

```

---

## Backend (NestJS) Structure

### Full File Tree

```

apps/backend-nest/
│
├── src/
│ ├── main.ts # Application entry point
│ ├── app.module.ts # Root module
│ │
│ ├── auth/ # Authentication module
│ │ ├── auth.module.ts
│ │ ├── auth.controller.ts
│ │ ├── auth.service.ts
│ │ ├── guards/
│ │ │ ├── jwt-auth.guard.ts
│ │ │ └── roles.guard.ts
│ │ └── strategies/
│ │ ├── jwt.strategy.ts
│ │ └── keycloak.strategy.ts
│ │
│ ├── users/ # User management
│ │ ├── users.module.ts
│ │ ├── users.controller.ts
│ │ ├── users.service.ts
│ │ ├── entities/
│ │ │ └── user.entity.ts
│ │ └── dto/
│ │ ├── create-user.dto.ts
│ │ └── update-user.dto.ts
│ │
│ ├── transactions/ # Financial transactions
│ │ ├── transactions.module.ts
│ │ ├── transactions.controller.ts
│ │ ├── transactions.service.ts
│ │ ├── entities/
│ │ │ ├── expense.entity.ts
│ │ │ ├── income.entity.ts
│ │ │ └── investment.entity.ts
│ │ └── dto/
│ │ └── create-transaction.dto.ts
│ │
│ ├── goals/ # Financial goals
│ │ ├── goals.module.ts
│ │ ├── goals.controller.ts
│ │ ├── goals.service.ts
│ │ └── entities/
│ │ └── goal.entity.ts
│ │
│ ├── graph/ # Neo4j graph operations
│ │ ├── graph.module.ts
│ │ ├── graph.service.ts
│ │ └── queries/
│ │ ├── user-graph.cypher
│ │ └── impact-analysis.cypher
│ │
│ ├── ai/ # AI integration (calls FastAPI)
│ │ ├── ai.module.ts
│ │ ├── ai.service.ts
│ │ └── dto/
│ │ └── ai-query.dto.ts
│ │
│ ├── consent/ # GDPR consent management
│ │ ├── consent.module.ts
│ │ ├── consent.controller.ts
│ │ ├── consent.service.ts
│ │ └── entities/
│ │ └── consent.entity.ts
│ │
│ ├── audit/ # Audit logging
│ │ ├── audit.module.ts
│ │ ├── audit.service.ts
│ │ └── entities/
│ │ └── audit-log.entity.ts
│ │
│ ├── kafka/ # Kafka event producers/consumers
│ │ ├── kafka.module.ts
│ │ ├── producers/
│ │ │ ├── transaction-producer.ts
│ │ │ └── consent-producer.ts
│ │ └── consumers/
│ │ └── graph-sync-consumer.ts
│ │
│ ├── common/ # Shared utilities
│ │ ├── decorators/
│ │ │ ├── roles.decorator.ts
│ │ │ └── current-user.decorator.ts
│ │ ├── filters/
│ │ │ └── http-exception.filter.ts
│ │ ├── interceptors/
│ │ │ └── logging.interceptor.ts
│ │ └── pipes/
│ │ └── validation.pipe.ts
│ │
│ └── config/ # Configuration
│ ├── database.config.ts
│ ├── kafka.config.ts
│ └── redis.config.ts
│
├── test/ # E2E tests
│ ├── app.e2e-spec.ts
│ └── jest-e2e.json
│
├── Dockerfile # Docker image definition
├── package.json # Dependencies
├── tsconfig.json # TypeScript config
└── nest-cli.json # NestJS CLI config

```

### Key Modules

| Module           | Purpose                            | Dependencies                       |
| ---------------- | ---------------------------------- | ---------------------------------- |
| **auth**         | JWT + Keycloak authentication      | @nestjs/passport, keycloak-connect |
| **users**        | User CRUD operations               | @nestjs/typeorm, pg                |
| **transactions** | Expense/income/investment tracking | TypeORM, PostgreSQL                |
| **graph**        | Neo4j graph queries                | neo4j-driver                       |
| **ai**           | Call FastAPI ML service            | @nestjs/axios                      |
| **kafka**        | Event-driven architecture          | kafkajs                            |
| **consent**      | GDPR consent management            | TypeORM                            |
| **audit**        | Decision trace logging             | TypeORM, Kafka                     |

---

## AI Engine (FastAPI) Structure

### Full File Tree

```

apps/ai-engine/
│
├── app/
│ ├── main.py # FastAPI app entry point
│ ├── config.py # Environment config
│ │
│ ├── api/ # API endpoints
│ │ ├── **init**.py
│ │ ├── query.py # POST /api/v1/query
│ │ ├── explain.py # POST /api/v1/explain
│ │ └── health.py # GET /health
│ │
│ ├── services/ # Business logic
│ │ ├── intent_classifier.py # Detect user intent
│ │ ├── graph_reasoner.py # Convert intent → Cypher
│ │ ├── llm_service.py # Gemini Pro integration
│ │ ├── safety_filters.py # Pre/post-LLM filters
│ │ └── audit_logger.py # Log to Kafka
│ │
│ ├── models/ # ML models
│ │ ├── **init**.py
│ │ ├── intent_classifier.pkl # DistilBERT model
│ │ ├── risk_model.pkl # XGBoost risk scoring
│ │ ├── cash_flow_forecast.pkl # Prophet time series
│ │ └── anomaly_detector.pkl # LSTM autoencoder
│ │
│ ├── prompts/ # LLM prompt templates
│ │ ├── system_prompt.txt
│ │ ├── intent_to_graph.txt
│ │ ├── graph_to_nl.txt
│ │ └── explain_decision.txt
│ │
│ ├── schemas/ # Pydantic models
│ │ ├── request.py # API request schemas
│ │ ├── response.py # API response schemas
│ │ └── events.py # Kafka event schemas
│ │
│ ├── database/ # Database clients
│ │ ├── postgres.py # PostgreSQL connection
│ │ ├── neo4j.py # Neo4j driver
│ │ ├── mongo.py # MongoDB connection
│ │ └── redis.py # Redis cache
│ │
│ ├── kafka/ # Kafka integration
│ │ ├── producer.py # Emit events
│ │ └── consumer.py # Consume events
│ │
│ ├── utils/ # Utilities
│ │ ├── logging.py # Structured logging
│ │ ├── metrics.py # Prometheus metrics
│ │ └── helpers.py # Common functions
│ │
│ └── tests/ # Unit tests
│ ├── test_intent.py
│ ├── test_graph.py
│ └── test_safety.py
│
├── models/ # Model artifacts (gitignored)
│ ├── intent_classifier/
│ ├── risk_model/
│ └── cash_flow_forecast/
│
├── Dockerfile # Docker image
├── requirements.txt # Python dependencies
├── pyproject.toml # Poetry config
└── pytest.ini # Pytest config

```

### Key Services

| Service                | Purpose                                                         | Technology               |
| ---------------------- | --------------------------------------------------------------- | ------------------------ |
| **intent_classifier**  | Detect user intent (investment advice, spending analysis, etc.) | DistilBERT               |
| **graph_reasoner**     | Convert user query → Cypher query                               | LLM + prompt engineering |
| **llm_service**        | Generate natural language responses                             | Gemini Pro 1.5           |
| **safety_filters**     | Block harmful queries, detect hallucinations                    | Rule-based + Detoxify    |
| **risk_model**         | Score investment risk                                           | XGBoost                  |
| **cash_flow_forecast** | Predict future income/expenses                                  | Prophet                  |
| **anomaly_detector**   | Detect unusual spending                                         | LSTM autoencoder         |

---

## Frontend Structure

```

apps/frontend/
│
├── app/ # Next.js 14 (App Router)
│ ├── layout.tsx # Root layout
│ ├── page.tsx # Home page
│ ├── dashboard/
│ │ ├── page.tsx # Dashboard overview
│ │ ├── spending/
│ │ │ └── page.tsx # Spending analysis
│ │ ├── goals/
│ │ │ └── page.tsx # Financial goals
│ │ └── investments/
│ │ └── page.tsx # Investment portfolio
│ └── api/ # API routes (Next.js middleware)
│ └── auth/
│ └── [...nextauth].ts
│
├── components/ # React components
│ ├── ui/ # shadcn/ui components
│ │ ├── button.tsx
│ │ ├── card.tsx
│ │ └── dialog.tsx
│ ├── charts/ # Data visualization
│ │ ├── spending-chart.tsx
│ │ └── goal-progress.tsx
│ └── chat/ # AI chatbot
│ ├── chat-interface.tsx
│ └── message-bubble.tsx
│
├── lib/ # Utilities
│ ├── api-client.ts # Axios wrapper
│ ├── auth.ts # Authentication helpers
│ └── utils.ts # Common functions
│
├── hooks/ # Custom React hooks
│ ├── use-user.ts
│ └── use-transactions.ts
│
├── styles/
│ └── globals.css # Global styles
│
├── public/ # Static assets
│ ├── logo.svg
│ └── favicon.ico
│
├── Dockerfile
├── package.json
├── tsconfig.json
└── next.config.js

```

---

## Shared Libraries

### libs/proto/ (gRPC Contracts)

```

libs/proto/
│
├── user.proto # User service contract
├── transaction.proto # Transaction service contract
├── ai.proto # AI service contract
│
└── generated/ # Auto-generated code
├── typescript/
│ ├── user_pb.ts
│ └── transaction_pb.ts
└── python/
├── user_pb2.py
└── transaction_pb2.py

```

### libs/compliance/

```

libs/compliance/
│
├── rbi/ # RBI compliance rules
│ ├── data-residency.ts
│ └── audit-trail.ts
│
├── gdpr/ # GDPR utilities
│ ├── consent-manager.ts
│ └── data-deletion.ts
│
└── sebi/ # SEBI investment rules
└── investment-limits.ts

```

### libs/prompts/

```

libs/prompts/
│
├── investment-advice.txt
├── spending-analysis.txt
├── goal-planning.txt
└── risk-assessment.txt

```

---

## Infrastructure

### infra/docker/

```

infra/docker/
│
├── docker-compose.yml # Local development
├── docker-compose.prod.yml # Production
└── .dockerignore

```

### infra/kubernetes/

```

infra/kubernetes/
│
├── namespaces/
│ ├── nivesh-prod.yaml
│ └── nivesh-observability.yaml
│
├── deployments/
│ ├── backend.yaml
│ ├── ai-engine.yaml
│ └── frontend.yaml
│
├── services/
│ ├── backend-service.yaml
│ └── ai-engine-service.yaml
│
├── statefulsets/
│ ├── postgres.yaml
│ ├── neo4j.yaml
│ └── mongodb.yaml
│
├── configmaps/
│ └── app-config.yaml
│
├── secrets/
│ └── app-secrets.yaml
│
└── ingress/
└── nivesh-ingress.yaml

```

### infra/terraform/

```

infra/terraform/
│
├── main.tf # Main Terraform config
├── variables.tf # Input variables
├── outputs.tf # Output values
│
├── modules/
│ ├── eks/ # AWS EKS cluster
│ ├── rds/ # PostgreSQL RDS
│ └── s3/ # S3 buckets (MinIO alternative)
│
└── environments/
├── dev.tfvars
├── staging.tfvars
└── prod.tfvars

````

---

## Environment Configuration

### Production .env Template

```bash
# ===================================
# APPLICATION
# ===================================
NODE_ENV=production
PORT=3000
API_VERSION=v1

# ===================================
# DATABASES
# ===================================
# PostgreSQL (Transactional Data)
POSTGRES_HOST=postgres-service
POSTGRES_PORT=5432
POSTGRES_DB=nivesh
POSTGRES_USER=nivesh
POSTGRES_PASSWORD=<secret>
POSTGRES_URL=postgresql://nivesh:<secret>@postgres-service:5432/nivesh

# Neo4j (Graph Database)
NEO4J_URI=bolt://neo4j-service:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=<secret>

# MongoDB (Conversations & Logs)
MONGODB_URI=mongodb://mongo-service:27017/nivesh

# Redis (Cache & Sessions)
REDIS_URL=redis://redis-service:6379

# ===================================
# EVENT STREAMING
# ===================================
KAFKA_BROKERS=kafka-service:9092
KAFKA_CLIENT_ID=nivesh-backend
KAFKA_GROUP_ID=nivesh-consumer-group

# ===================================
# AI SERVICES
# ===================================
# Gemini Pro (LLM)
GEMINI_API_KEY=<secret>
GEMINI_MODEL=gemini-pro-1.5

# OpenAI (Fallback)
OPENAI_API_KEY=<secret>

# AI Engine (FastAPI)
AI_ENGINE_URL=http://ai-engine-service:8000

# ===================================
# AUTHENTICATION
# ===================================
# Keycloak (SSO)
KEYCLOAK_URL=http://keycloak-service:8080
KEYCLOAK_REALM=nivesh
KEYCLOAK_CLIENT_ID=nivesh-backend
KEYCLOAK_CLIENT_SECRET=<secret>

# JWT
JWT_SECRET=<secret>
JWT_EXPIRY=7d

# ===================================
# OBJECT STORAGE
# ===================================
# MinIO (S3-compatible)
MINIO_ENDPOINT=minio-service:9000
MINIO_ACCESS_KEY=nivesh
MINIO_SECRET_KEY=<secret>
MINIO_BUCKET=nivesh-documents

# ===================================
# MONITORING
# ===================================
# Prometheus
PROMETHEUS_URL=http://prometheus-service:9090

# Grafana
GRAFANA_URL=http://grafana-service:3000

# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger-service:4318

# ===================================
# FEATURE FLAGS
# ===================================
AI_ENABLED=true
AI_CONFIDENCE_THRESHOLD=0.7
ALLOW_INVESTMENT_ADVICE=true
MAX_QUERY_RATE_PER_USER=10  # per minute

# ===================================
# COMPLIANCE
# ===================================
DATA_RESIDENCY=IN  # India
AUDIT_LOG_RETENTION_DAYS=2555  # 7 years
ENABLE_GDPR_DATA_DELETION=true

# ===================================
# EXTERNAL INTEGRATIONS
# ===================================
# Bank statement parsing
RAZORPAY_KEY=<secret>
PLAID_CLIENT_ID=<secret>
PLAID_SECRET=<secret>

# Market data
ALPHA_VANTAGE_API_KEY=<secret>
````

---

## Development Workflow

### Start Development Environment

```bash
# Clone repository
git clone https://github.com/your-org/nivesh.git
cd nivesh

# Copy environment template
cp .env.example .env

# Start all services
docker-compose up -d

# Install dependencies
npm install  # Backend + Frontend
cd apps/ai-engine && poetry install  # AI Engine

# Run migrations
npm run migrate

# Start dev servers
npm run dev  # Backend + Frontend (concurrently)
cd apps/ai-engine && poetry run uvicorn app.main:app --reload  # AI Engine
```

### Run Tests

```bash
# Backend tests
npm run test

# AI Engine tests
cd apps/ai-engine && poetry run pytest

# E2E tests
npm run test:e2e
```

### Build for Production

```bash
# Build all services
./scripts/build.sh

# Deploy using Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Or deploy to Kubernetes
kubectl apply -f infra/kubernetes/
```

---

## Module Organization by MVP Features

Based on PRD requirements, here's how modules map to features:

### MVP Phase Features → Modules

| MVP Feature                 | Backend Module            | AI Module                | Frontend Component           |
| --------------------------- | ------------------------- | ------------------------ | ---------------------------- |
| **Net worth dashboard**     | `transactions/`, `goals/` | `simulations/`           | `Dashboard`, `NetWorthChart` |
| **Retirement projection**   | `goals/`, `investments/`  | `simulations/retirement` | `RetirementSimulator`        |
| **Home loan affordability** | `goals/`, `transactions/` | `simulations/loan`       | `LoanCalculator`             |
| **SIP increase effect**     | `investments/`            | `simulations/sip`        | `SIPProjection`              |
| **Explainability module**   | `audit/`, `consent/`      | `reasoning/explain`      | `ExplanationPanel`           |
| **Export reports**          | `exports/`                | N/A                      | `ExportButton`               |
| **Unusual spend alerts**    | `alerts/`, `kafka/`       | `anomaly_detection/`     | `AlertCenter`                |

### V1 Phase Features → Modules

| V1 Feature                     | Implementation                               |
| ------------------------------ | -------------------------------------------- |
| **Goal planning**              | `goals/` + `simulations/multi_goal`          |
| **Investment advisor**         | `investments/` + `portfolio_optimizer/`      |
| **Advanced anomaly detection** | Enhanced LSTM models in `anomaly_detection/` |
| **Voice support**              | `voice/` module + Web Speech API integration |
| **Premium tier**               | `subscriptions/` module + payment gateway    |

---

## Key Design Patterns

### 1. Domain-Driven Design (DDD)

- Each module represents a bounded context
- Clear separation of concerns
- Domain entities with rich business logic

### 2. CQRS (Command Query Responsibility Segregation)

- Write operations go through NestJS
- Read operations can query Neo4j directly
- Event sourcing via Kafka

### 3. Event-Driven Architecture

```
Transaction Created → Kafka Topic → Neo4j Sync Consumer
                    → Anomaly Detection Consumer
                    → Alert Generation Consumer
```

### 4. Microservices Communication

```
Frontend → API Gateway → NestJS Backend ⇄ FastAPI AI Engine
                              ↓
                         PostgreSQL (ACID)
                              ↓
                         Kafka Events → Neo4j (Graph Sync)
```

---

## Folder Naming Conventions

- **Lowercase with hyphens:** `user-profile/`, `financial-goals/`
- **Feature-based:** `auth/`, `transactions/`, `goals/`
- **Layer-based:** `entities/`, `dto/`, `services/`, `controllers/`
- **Test files:** `*.spec.ts`, `*.test.py`
- **Config files:** `*.config.ts`, `.env.*`

---

## Code Organization Principles

1. **Single Responsibility:** Each module does one thing well
2. **Dependency Injection:** NestJS DI container for loose coupling
3. **Interface Segregation:** Small, focused interfaces
4. **DRY (Don't Repeat Yourself):** Shared utilities in `libs/`
5. **SOLID Principles:** Throughout the codebase

---

**Last Updated:** January 13, 2026  
**Version:** 2.0 (Aligned with PRD v1.0)  
**Maintained By:** Nivesh Engineering Team

# Or individually

docker build -t nivesh/backend:latest apps/backend-nest
docker build -t nivesh/ai-engine:latest apps/ai-engine
docker build -t nivesh/frontend:latest apps/frontend

```

---

## Best Practices

✅ **Monorepo** - Keep all services in one repo
✅ **Shared libraries** - Avoid code duplication
✅ **Environment parity** - Dev environment matches production
✅ **Infrastructure as Code** - All infra in Git
✅ **Secrets management** - Never commit secrets (.env in .gitignore)
✅ **Atomic commits** - Change multiple services in one PR

---

**Last Updated:** January 2026
**Maintained By:** Nivesh DevOps Team
**Related Docs:** [CONTAINERIZATION.md](CONTAINERIZATION.md), [TECH_STACK.md](TECH_STACK.md)
```
