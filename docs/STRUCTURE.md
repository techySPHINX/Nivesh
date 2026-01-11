# Project Structure & File Organization

> **Complete monorepo structure for Nivesh AI Financial Platform**

[![Monorepo](https://img.shields.io/badge/architecture-monorepo-purple.svg)](https://monorepo.tools/)
[![TypeScript](https://img.shields.io/badge/backend-TypeScript-3178C6.svg)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/AI-Python-3776AB.svg)](https://www.python.org/)

## Table of Contents

- [Overview](#overview)
- [Monorepo Structure](#monorepo-structure)
- [Backend (NestJS) Structure](#backend-nestjs-structure)
- [AI Engine (FastAPI) Structure](#ai-engine-fastapi-structure)
- [Frontend Structure](#frontend-structure)
- [Shared Libraries](#shared-libraries)
- [Infrastructure](#infrastructure)
- [Environment Configuration](#environment-configuration)

---

## Overview

Nivesh follows a **monorepo** architecture managed with **npm workspaces** (for TypeScript) and **Poetry** (for Python).

**Key Benefits:**
- ✅ **Shared code** - Reuse libraries across apps
- ✅ **Atomic commits** - Change multiple services in one PR
- ✅ **Unified versioning** - All services on same version
- ✅ **Easier refactoring** - Update interfaces across the codebase

---

## Monorepo Structure

```
nivesh/
│
├── apps/                          # Application services
│   ├── backend-nest/              # NestJS API server (TypeScript)
│   ├── ai-engine/                 # FastAPI ML service (Python)
│   └── frontend/                  # Next.js web app (TypeScript)
│
├── libs/                          # Shared libraries
│   ├── proto/                     # Protocol buffers (gRPC contracts)
│   ├── compliance/                # RBI/GDPR compliance utilities
│   └── prompts/                   # LLM prompt templates
│
├── infra/                         # Infrastructure as Code
│   ├── docker/                    # Docker compose files
│   ├── kubernetes/                # K8s manifests
│   └── terraform/                 # Cloud provisioning
│
├── data/                          # Data assets
│   ├── models/                    # ML model files (.pkl, .h5)
│   ├── embeddings/                # Vector embeddings
│   └── migrations/                # Database migrations
│
├── docs/                          # Documentation
│   ├── api/                       # API reference
│   ├── architecture/              # Architecture diagrams
│   └── guides/                    # User guides
│
├── scripts/                       # Build & deployment scripts
│   ├── build.sh                   # Build all services
│   ├── test.sh                    # Run all tests
│   └── deploy.sh                  # Deploy to production
│
├── .github/                       # GitHub workflows (CI/CD)
│   └── workflows/
│       ├── ci.yml                 # Continuous integration
│       └── deploy.yml             # Deployment pipeline
│
├── .env.example                   # Environment variables template
├── docker-compose.yml             # Local development stack
├── package.json                   # Root package.json (workspaces)
├── tsconfig.base.json             # Shared TypeScript config
├── pyproject.toml                 # Python dependencies (Poetry)
├── README.md                      # Project README
└── LICENSE                        # MIT License
```

---

## Backend (NestJS) Structure

### Full File Tree

```
apps/backend-nest/
│
├── src/
│   ├── main.ts                    # Application entry point
│   ├── app.module.ts              # Root module
│   │
│   ├── auth/                      # Authentication module
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   └── strategies/
│   │       ├── jwt.strategy.ts
│   │       └── keycloak.strategy.ts
│   │
│   ├── users/                     # User management
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── entities/
│   │   │   └── user.entity.ts
│   │   └── dto/
│   │       ├── create-user.dto.ts
│   │       └── update-user.dto.ts
│   │
│   ├── transactions/              # Financial transactions
│   │   ├── transactions.module.ts
│   │   ├── transactions.controller.ts
│   │   ├── transactions.service.ts
│   │   ├── entities/
│   │   │   ├── expense.entity.ts
│   │   │   ├── income.entity.ts
│   │   │   └── investment.entity.ts
│   │   └── dto/
│   │       └── create-transaction.dto.ts
│   │
│   ├── goals/                     # Financial goals
│   │   ├── goals.module.ts
│   │   ├── goals.controller.ts
│   │   ├── goals.service.ts
│   │   └── entities/
│   │       └── goal.entity.ts
│   │
│   ├── graph/                     # Neo4j graph operations
│   │   ├── graph.module.ts
│   │   ├── graph.service.ts
│   │   └── queries/
│   │       ├── user-graph.cypher
│   │       └── impact-analysis.cypher
│   │
│   ├── ai/                        # AI integration (calls FastAPI)
│   │   ├── ai.module.ts
│   │   ├── ai.service.ts
│   │   └── dto/
│   │       └── ai-query.dto.ts
│   │
│   ├── consent/                   # GDPR consent management
│   │   ├── consent.module.ts
│   │   ├── consent.controller.ts
│   │   ├── consent.service.ts
│   │   └── entities/
│   │       └── consent.entity.ts
│   │
│   ├── audit/                     # Audit logging
│   │   ├── audit.module.ts
│   │   ├── audit.service.ts
│   │   └── entities/
│   │       └── audit-log.entity.ts
│   │
│   ├── kafka/                     # Kafka event producers/consumers
│   │   ├── kafka.module.ts
│   │   ├── producers/
│   │   │   ├── transaction-producer.ts
│   │   │   └── consent-producer.ts
│   │   └── consumers/
│   │       └── graph-sync-consumer.ts
│   │
│   ├── common/                    # Shared utilities
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts
│   │   │   └── current-user.decorator.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/
│   │   │   └── logging.interceptor.ts
│   │   └── pipes/
│   │       └── validation.pipe.ts
│   │
│   └── config/                    # Configuration
│       ├── database.config.ts
│       ├── kafka.config.ts
│       └── redis.config.ts
│
├── test/                          # E2E tests
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
│
├── Dockerfile                     # Docker image definition
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
└── nest-cli.json                  # NestJS CLI config
```

### Key Modules

| Module | Purpose | Dependencies |
|--------|---------|--------------|
| **auth** | JWT + Keycloak authentication | @nestjs/passport, keycloak-connect |
| **users** | User CRUD operations | @nestjs/typeorm, pg |
| **transactions** | Expense/income/investment tracking | TypeORM, PostgreSQL |
| **graph** | Neo4j graph queries | neo4j-driver |
| **ai** | Call FastAPI ML service | @nestjs/axios |
| **kafka** | Event-driven architecture | kafkajs |
| **consent** | GDPR consent management | TypeORM |
| **audit** | Decision trace logging | TypeORM, Kafka |

---

## AI Engine (FastAPI) Structure

### Full File Tree

```
apps/ai-engine/
│
├── app/
│   ├── main.py                    # FastAPI app entry point
│   ├── config.py                  # Environment config
│   │
│   ├── api/                       # API endpoints
│   │   ├── __init__.py
│   │   ├── query.py               # POST /api/v1/query
│   │   ├── explain.py             # POST /api/v1/explain
│   │   └── health.py              # GET /health
│   │
│   ├── services/                  # Business logic
│   │   ├── intent_classifier.py   # Detect user intent
│   │   ├── graph_reasoner.py      # Convert intent → Cypher
│   │   ├── llm_service.py         # Gemini Pro integration
│   │   ├── safety_filters.py      # Pre/post-LLM filters
│   │   └── audit_logger.py        # Log to Kafka
│   │
│   ├── models/                    # ML models
│   │   ├── __init__.py
│   │   ├── intent_classifier.pkl  # DistilBERT model
│   │   ├── risk_model.pkl         # XGBoost risk scoring
│   │   ├── cash_flow_forecast.pkl # Prophet time series
│   │   └── anomaly_detector.pkl   # LSTM autoencoder
│   │
│   ├── prompts/                   # LLM prompt templates
│   │   ├── system_prompt.txt
│   │   ├── intent_to_graph.txt
│   │   ├── graph_to_nl.txt
│   │   └── explain_decision.txt
│   │
│   ├── schemas/                   # Pydantic models
│   │   ├── request.py             # API request schemas
│   │   ├── response.py            # API response schemas
│   │   └── events.py              # Kafka event schemas
│   │
│   ├── database/                  # Database clients
│   │   ├── postgres.py            # PostgreSQL connection
│   │   ├── neo4j.py               # Neo4j driver
│   │   ├── mongo.py               # MongoDB connection
│   │   └── redis.py               # Redis cache
│   │
│   ├── kafka/                     # Kafka integration
│   │   ├── producer.py            # Emit events
│   │   └── consumer.py            # Consume events
│   │
│   ├── utils/                     # Utilities
│   │   ├── logging.py             # Structured logging
│   │   ├── metrics.py             # Prometheus metrics
│   │   └── helpers.py             # Common functions
│   │
│   └── tests/                     # Unit tests
│       ├── test_intent.py
│       ├── test_graph.py
│       └── test_safety.py
│
├── models/                        # Model artifacts (gitignored)
│   ├── intent_classifier/
│   ├── risk_model/
│   └── cash_flow_forecast/
│
├── Dockerfile                     # Docker image
├── requirements.txt               # Python dependencies
├── pyproject.toml                 # Poetry config
└── pytest.ini                     # Pytest config
```

### Key Services

| Service | Purpose | Technology |
|---------|---------|------------|
| **intent_classifier** | Detect user intent (investment advice, spending analysis, etc.) | DistilBERT |
| **graph_reasoner** | Convert user query → Cypher query | LLM + prompt engineering |
| **llm_service** | Generate natural language responses | Gemini Pro 1.5 |
| **safety_filters** | Block harmful queries, detect hallucinations | Rule-based + Detoxify |
| **risk_model** | Score investment risk | XGBoost |
| **cash_flow_forecast** | Predict future income/expenses | Prophet |
| **anomaly_detector** | Detect unusual spending | LSTM autoencoder |

---

## Frontend Structure

```
apps/frontend/
│
├── app/                           # Next.js 14 (App Router)
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Home page
│   ├── dashboard/
│   │   ├── page.tsx               # Dashboard overview
│   │   ├── spending/
│   │   │   └── page.tsx           # Spending analysis
│   │   ├── goals/
│   │   │   └── page.tsx           # Financial goals
│   │   └── investments/
│   │       └── page.tsx           # Investment portfolio
│   └── api/                       # API routes (Next.js middleware)
│       └── auth/
│           └── [...nextauth].ts
│
├── components/                    # React components
│   ├── ui/                        # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── dialog.tsx
│   ├── charts/                    # Data visualization
│   │   ├── spending-chart.tsx
│   │   └── goal-progress.tsx
│   └── chat/                      # AI chatbot
│       ├── chat-interface.tsx
│       └── message-bubble.tsx
│
├── lib/                           # Utilities
│   ├── api-client.ts              # Axios wrapper
│   ├── auth.ts                    # Authentication helpers
│   └── utils.ts                   # Common functions
│
├── hooks/                         # Custom React hooks
│   ├── use-user.ts
│   └── use-transactions.ts
│
├── styles/
│   └── globals.css                # Global styles
│
├── public/                        # Static assets
│   ├── logo.svg
│   └── favicon.ico
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
├── user.proto                     # User service contract
├── transaction.proto              # Transaction service contract
├── ai.proto                       # AI service contract
│
└── generated/                     # Auto-generated code
    ├── typescript/
    │   ├── user_pb.ts
    │   └── transaction_pb.ts
    └── python/
        ├── user_pb2.py
        └── transaction_pb2.py
```

### libs/compliance/

```
libs/compliance/
│
├── rbi/                           # RBI compliance rules
│   ├── data-residency.ts
│   └── audit-trail.ts
│
├── gdpr/                          # GDPR utilities
│   ├── consent-manager.ts
│   └── data-deletion.ts
│
└── sebi/                          # SEBI investment rules
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
├── docker-compose.yml             # Local development
├── docker-compose.prod.yml        # Production
└── .dockerignore
```

### infra/kubernetes/

```
infra/kubernetes/
│
├── namespaces/
│   ├── nivesh-prod.yaml
│   └── nivesh-observability.yaml
│
├── deployments/
│   ├── backend.yaml
│   ├── ai-engine.yaml
│   └── frontend.yaml
│
├── services/
│   ├── backend-service.yaml
│   └── ai-engine-service.yaml
│
├── statefulsets/
│   ├── postgres.yaml
│   ├── neo4j.yaml
│   └── mongodb.yaml
│
├── configmaps/
│   └── app-config.yaml
│
├── secrets/
│   └── app-secrets.yaml
│
└── ingress/
    └── nivesh-ingress.yaml
```

### infra/terraform/

```
infra/terraform/
│
├── main.tf                        # Main Terraform config
├── variables.tf                   # Input variables
├── outputs.tf                     # Output values
│
├── modules/
│   ├── eks/                       # AWS EKS cluster
│   ├── rds/                       # PostgreSQL RDS
│   └── s3/                        # S3 buckets (MinIO alternative)
│
└── environments/
    ├── dev.tfvars
    ├── staging.tfvars
    └── prod.tfvars
```

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
```

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
