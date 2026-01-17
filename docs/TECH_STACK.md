# Tech Stack

> **Open-source, cloud-agnostic, and production-ready technology stack for Nivesh - Your AI Financial Strategist**

⚠️ **PROPRIETARY DOCUMENTATION** - Copyright © 2026 Prateek (techySPHINX). All Rights Reserved.  
This document is part of proprietary software. See [LICENSE](../LICENSE) for terms.

[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](../LICENSE)
[![Tech Stack](https://img.shields.io/badge/stack-polyglot-green.svg)]()
[![PRD](https://img.shields.io/badge/docs-PRD-orange.svg)](../PRD.md)

## Table of Contents

- [Overview](#overview)
- [Product Context](#product-context)
- [AI & ML Stack](#ai--ml-stack)
- [Data & Storage](#data--storage)
- [Event-Driven Architecture](#event-driven-architecture)
- [Security & Compliance](#security--compliance)
- [Backend & Orchestration](#backend--orchestration)
- [Frontend Technologies](#frontend-technologies)
- [Infrastructure](#infrastructure)
- [AI Models Details](#ai-models-details)
- [LLM Infrastructure](#llm-infrastructure)
- [Data Connectors](#data-connectors)
- [Minimum Deployable Stack](#minimum-deployable-stack)
- [Technology Philosophy](#technology-philosophy)

---

## Overview

Nivesh uses a **polyglot persistence model** with open-source technologies to ensure:

- **Zero vendor lock-in** - Deploy anywhere, migrate freely
- **Cloud-agnostic deployment** - AWS, Azure, GCP, or on-premise
- **Production-grade scalability** - Handle millions of users
- **Regulatory compliance ready** - RBI, SEBI, GDPR compliant architecture

---

## Product Context

**Nivesh's Vision:** Build the world's most trusted AI financial strategist that understands the user's financial life, simulates the future, and guides them with transparent, explainable, goal-linked decisions.

**Core Promise:** _"Your money finally makes sense — decisions, not dashboards."_

This tech stack is designed to support:

- **Real financial data ingestion** via Fi MCP and banking APIs
- **AI financial reasoning** layer (not just analytics)
- **Scenario simulation** engine for what-if analysis
- **Explainability-first** output with assumptions, alternatives, and risks
- **Privacy & portability** as user-owned insights

---

## AI & ML Stack

**Purpose:** Enable conversational AI that provides goal-oriented financial decisions with explainability.

### Core AI Architecture (From Approved Mermaid Diagram)

```
User Query → API Gateway → AI Orchestrator
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↓
              Gemini LLM           Tool Router
           (Intent + Reason)          ↓
                    ↓         ┌────────┴────────┐
                    ↓         ↓                 ↓
                    ↓    Finance Engine    ML Models
                    ↓    (Simulations)    (Cat/Anom/Risk)
                    ↓         ↓                 ↓
                    └─────────┴─────────────────┘
                              ↓
                      Response Builder
```

### AI Components by Layer

| Layer                       | Technology                                                   | Purpose                                  | Where Used in Architecture                                   |
| --------------------------- | ------------------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------ |
| **AI Orchestrator**         | [LangChain](https://langchain.com/) + FastAPI                | Coordinates LLM + Tools                  | Central routing layer between API Gateway and AI services    |
| **LLM (Primary)**           | [Gemini Pro 1.5](https://ai.google.dev/)                     | Intent detection, reasoning, explanation | Conversational layer, natural language understanding         |
| **LLM (Fallback)**          | [Ollama](https://ollama.ai/) (Mistral 7B)                    | Open-source local inference backup       | Privacy-focused deployments, offline mode                    |
| **Tool Router**             | Custom FastAPI Service                                       | Routes to specialized tools              | Directs queries to Simulation/Categorization/Anomaly engines |
| **Finance Engine**          | Python NumPy + SciPy                                         | Deterministic calculations               | EMI, cashflow, goal projections, Monte Carlo simulations     |
| **Transaction Categorizer** | [XGBoost](https://xgboost.readthedocs.io/) + BERT Embeddings | Hybrid rule + ML categorization          | Merchant normalization, category tagging in data pipeline    |
| **Anomaly Detection**       | IsolationForest + Prophet + ChangePoint                      | Multi-layer anomaly detection            | Spending spikes, unusual patterns, fraud detection           |
| **Risk Profiler**           | [XGBoost](https://xgboost.readthedocs.io/)                   | User risk tolerance scoring              | Investment recommendations, portfolio allocation             |
| **Personalization Engine**  | LightGBM Ranker + Contextual Bandit                          | Learning-to-Rank for recommendations     | Next Best Action suggestions, home feed nudges               |
| **Embeddings**              | [Sentence-Transformers](https://www.sbert.net/)              | Semantic search for conversations        | Chat history search, similar scenario matching               |
| **Sentiment Analysis**      | [XLM-RoBERTa](https://huggingface.co/xlm-roberta-base)       | Multilingual emotion detection           | Detect financial anxiety, adjust response tone               |
| **Forecasting**             | [Prophet](https://facebook.github.io/prophet/)               | Time-series projections with seasonality | Income growth, expense trends, inflation modeling            |
| **Response Builder**        | Jinja2 Templates + Plotly                                    | Formats output with charts + actions     | Generates visual responses, action buttons, explanations     |

**Key Differentiators:**

- **Hybrid AI:** Combines LLM reasoning with deterministic calculations
- **Explainability:** Every output includes assumptions and confidence scores
- **Regulatory Safe:** All calculations are auditable and reproducible

---

## Data & Storage

**Purpose:** Polyglot persistence supporting real-time data ingestion, graph reasoning, and long-term analytics.

### Database Technologies (Polyglot Persistence)

| Data Type              | Technology                                                          | Use Case                                   | Why This Choice                                    | Data Flow (From Mermaid)                     |
| ---------------------- | ------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------- | -------------------------------------------- |
| **Graph DB (Primary)** | [Neo4j Community](https://neo4j.com/download/)                      | Financial Knowledge Graph, AI reasoning    | Complex relationship queries, Cypher for traversal | MCP → Normalization → Feature Store (Neo4j)  |
| **Relational DB**      | [PostgreSQL 15+](https://www.postgresql.org/)                       | Transactions, user data, financial records | ACID compliance, source of truth                   | Fi MCP → API Gateway → PostgreSQL            |
| **Feature Store**      | [Firestore](https://firebase.google.com/docs/firestore) / Redis     | Real-time ML features, user context        | Low-latency reads for AI orchestrator              | Enrichment Layer → Feature Store → AI Orch   |
| **Time-Series**        | [ClickHouse](https://clickhouse.com/)                               | Analytics, historical trends               | Fast aggregations, OLAP queries                    | PostgreSQL → ETL → ClickHouse (analytics)    |
| **Document Store**     | [MongoDB Community](https://www.mongodb.com/try/download/community) | Conversations, AI logs, unstructured data  | Flexible schema, chat history, audit trails        | Orchestrator → Response Builder → MongoDB    |
| **Cache (In-Memory)**  | [Redis 7+](https://redis.io/)                                       | Session management, real-time computations | Sub-millisecond latency, pub/sub for events        | Feature Store caching, session tokens        |
| **Object Storage**     | [MinIO](https://min.io/)                                            | S3-compatible file storage                 | User exports (PDFs), model artifacts               | Response Builder → MinIO (report generation) |
| **Message Queue**      | [Kafka](https://kafka.apache.org/)                                  | Event streaming, data pipeline             | Distributed, durable, replay-able event log        | Ingestion → Kafka → Neo4j sync + ML pipeline |

**Data Ingestion Sources:**

- **Fi MCP Server:** Structured financial data via secure MCP protocol
- **Banking APIs:** Transaction sync, account balances
- **Investment APIs:** Mutual funds, stocks portfolio
- **Manual Input:** User goals, life events, preferences

**Data Flow:**

```
Fi MCP → PostgreSQL (Source of Truth) → Neo4j (Relationships)
                ↓
         Kafka Events → MongoDB (Conversations)
                ↓
         ClickHouse (Analytics)
```

---

## Event-Driven Architecture

**Purpose:** Enable real-time data processing, ML pipeline orchestration, and service decoupling.

### Data Pipeline (From Mermaid Diagram 3)

```
Fi MCP → Ingestion Service → Cleaning/Deduplication
                                    ↓
                           Enrichment Layer
                    ┌───────┴────────┐
                    ↓                ↓
          Merchant Normalize    Txn Categorization
                    ↓                ↓
          Recurring Detector    Category Model
                    ↓                ↓
                Feature Store (Firestore/Redis)
                              ↓
            ┌─────────┴───────────────┐
            ↓                         ↓
    Anomaly Engine              Simulation Engine
    Risk Profiler               Personalization
```

| Technology                                     | Use Case                                  | Why                                        | Where in Flow                                     |
| ---------------------------------------------- | ----------------------------------------- | ------------------------------------------ | ------------------------------------------------- |
| **[Apache Kafka](https://kafka.apache.org/)**  | Event streaming, data pipeline backbone   | Distributed, durable, high-throughput      | MCP → Kafka → All downstream services             |
| **[Kafka Connect](https://kafka.apache.org/)** | Source/Sink connectors for databases      | No-code integration with PostgreSQL, Neo4j | Sync events to graph DB, time-series DB           |
| **[Avro Schemas](https://avro.apache.org/)**   | Event schema registry                     | Strongly-typed events, schema evolution    | Define transaction, alert, simulation event types |
| **[Debezium](https://debezium.io/)**           | Change Data Capture (CDC) from PostgreSQL | Real-time sync from OLTP to OLAP           | PostgreSQL changes → Kafka → ClickHouse           |
| **[Redis Streams](https://redis.io/)**         | Lightweight real-time event queue         | Sub-second latency for alerts              | Alert Engine → Redis Streams → Push Notifications |

---

## Security & Compliance

| Purpose                | Technology                                            | Description                              |
| ---------------------- | ----------------------------------------------------- | ---------------------------------------- |
| **Authentication**     | [Keycloak](https://www.keycloak.org/)                 | Open-source identity & access management |
| **Secrets Management** | [HashiCorp Vault (OSS)](https://www.vaultproject.io/) | Encrypted secrets storage                |
| **Audit Logs**         | [OpenTelemetry](https://opentelemetry.io/)            | Distributed tracing & logging            |
| **Consent Management** | Custom + Kafka                                        | GDPR/RBI compliance tracking             |
| **Encryption**         | PostgreSQL + TLS                                      | End-to-end encryption                    |

---

## Backend & Orchestration

**Purpose:** API layer, business logic, and service coordination.

### Service Architecture (From Mermaid Diagram 1)

```
User (App/Web/Voice) → Frontend UI
                            ↓
                      Firebase Auth
                            ↓
                   API Gateway (Kong)
                            ↓
      ┌─────────────┴─────────────┐
      ↓                           ↓
  NestJS Backend         AI Orchestrator (FastAPI)
  (CRUD + Logic)         (LLM + Tool Router)
      ↓                           ↓
  PostgreSQL              Neo4j + ML Models
```

| Layer                     | Technology                                                             | Purpose                                | Why This Choice                              | Use in Nivesh                                    |
| ------------------------- | ---------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------- | ------------------------------------------------ |
| **API Gateway**           | [Kong OSS](https://konghq.com/kong)                                    | Authentication, rate limiting, routing | Open-source, plugin ecosystem                | Centralized entry point, JWT validation          |
| **Backend (Primary)**     | [NestJS](https://nestjs.com/) (TypeScript)                             | REST API, business logic, CRUD         | TypeScript type safety, modular architecture | User management, transaction CRUD, goal tracking |
| **AI Service**            | [FastAPI](https://fastapi.tiangolo.com/) (Python)                      | AI orchestrator, ML inference          | Async, high-performance Python framework     | LLM calls, tool routing, simulation execution    |
| **gRPC (Internal)**       | [gRPC](https://grpc.io/)                                               | High-performance inter-service calls   | Binary protocol, low latency                 | NestJS ↔ FastAPI communication                   |
| **Authentication**        | [Firebase Auth](https://firebase.google.com/auth)                      | User identity, OAuth, phone OTP        | Free tier, ready-to-use SDKs                 | Sign-up, login, session management               |
| **Authorization**         | [Keycloak](https://www.keycloak.org/) (optional)                       | Role-based access control (RBAC)       | Open-source, OIDC/SAML support               | Enterprise deployments, fine-grained permissions |
| **Task Queue**            | [Celery](https://docs.celeryq.dev/) + Redis                            | Async task processing                  | Distributed, fault-tolerant                  | Background jobs (report generation, batch ML)    |
| **Workflow Orchestrator** | [Temporal.io](https://temporal.io/) (optional)                         | Complex multi-step workflows           | Durable execution, state management          | Multi-stage financial planning workflows         |
| **Observability**         | [Prometheus](https://prometheus.io/) + [Grafana](https://grafana.com/) | Metrics, monitoring, alerting          | Industry standard, rich visualization        | System health, API latency, error tracking       |

---

## Frontend Technologies

| Platform             | Technology                                                                        | Purpose                      |
| -------------------- | --------------------------------------------------------------------------------- | ---------------------------- |
| **Mobile**           | [React Native](https://reactnative.dev/)                                          | Cross-platform iOS/Android   |
| **Web**              | [Next.js 14+](https://nextjs.org/)                                                | Server-side rendering, SEO   |
| **Charts**           | [Recharts](https://recharts.org/) / [Apache ECharts](https://echarts.apache.org/) | Financial data visualization |
| **Voice UI**         | [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) | Voice-based interactions     |
| **State Management** | [Zustand](https://zustand-demo.pmnd.rs/) / [Redux](https://redux.js.org/)         | Client-side state            |

---

## Infrastructure

| Layer                | Technology                                                  | Notes                          |
| -------------------- | ----------------------------------------------------------- | ------------------------------ |
| **Containerization** | [Docker](https://www.docker.com/)                           | Application packaging          |
| **Orchestration**    | [Kubernetes](https://kubernetes.io/) (k3s)                  | Production deployment          |
| **Cloud Options**    | [Fly.io](https://fly.io/) / [Railway](https://railway.app/) | Cost-effective hosting         |
| **CI/CD**            | [GitHub Actions](https://github.com/features/actions)       | Automated testing & deployment |
| **Monitoring**       | [Grafana Cloud Free](https://grafana.com/products/cloud/)   | Production monitoring          |

---

## AI Models Details

### Core Reasoning Models

| Model             | Purpose                                             | License          |
| ----------------- | --------------------------------------------------- | ---------------- |
| **Gemini Pro**    | Financial reasoning, natural language understanding | Google API Terms |
| **GPT-3.5 Turbo** | Backup explanation generation                       | OpenAI API Terms |

### Custom ML Models

#### 1. Intent Detection

- **Model:** DistilBERT (fine-tuned)
- **Task:** Multi-class classification
- **Labels:**
  - `AFFORDABILITY` - Home/car loan queries
  - `RETIREMENT` - Retirement planning
  - `SPENDING` - Expense analysis
  - `INVESTMENT` - Investment advice
  - `SIMULATION` - What-if scenarios

#### 2. Risk Profiling

- **Model:** XGBoost Classifier
- **Inputs:**
  - User age
  - Income volatility
  - Expense ratio
  - Portfolio historical drawdowns
- **Output:** Risk score (01)

#### 3. Spending Anomaly Detection

- **Model:** LSTM Autoencoder
- **Input:** Monthly category-wise spending patterns
- **Output:** Anomaly score with severity level
- **Use Case:** Detect unusual spending spikes

#### 4. Sentiment & Stress Detection

- **Model:** XLM-RoBERTa (multilingual)
- **Outputs:**
  - `CALM` - Neutral emotional state
  - `ANXIOUS` - Stress detected in conversation
  - `CONFIDENT` - Positive sentiment

#### 5. Financial Forecasting

- **Model:** Facebook Prophet
- **Use Cases:**
  - Income growth projections
  - Expense trend analysis
  - Inflation impact modeling

#### 6. Scenario Simulation

- **Algorithm:** Monte Carlo Simulation
- **Parameters:**
  - 10,000 simulation runs
  - Variable market returns
  - Stochastic income/expense modeling

---

## LLM Infrastructure

| Component                | Technology                                           | Purpose                           |
| ------------------------ | ---------------------------------------------------- | --------------------------------- |
| **Prompt Registry**      | PostgreSQL                                           | Version-controlled prompt storage |
| **Prompt Testing**       | [Promptfoo](https://www.promptfoo.dev/)              | Automated prompt evaluation       |
| **Prompt Rollback**      | Feature Flags                                        | Safe deployment & rollback        |
| **Evaluation Framework** | [RAGAS](https://github.com/explodinggradients/ragas) | RAG evaluation metrics            |
| **Guardrails**           | Custom rules + regex                                 | Safety & compliance enforcement   |

---

## Data Connectors

| Source             | Method                                                             | Status    |
| ------------------ | ------------------------------------------------------------------ | --------- |
| **Bank Data**      | Mock Fi MCP / Open Banking Sandbox                                 | MVP Phase |
| **CSV Upload**     | Manual import                                                      | Available |
| **Investments**    | Static instrument database                                         | Available |
| **Market Data**    | [Yahoo Finance](https://finance.yahoo.com/) (responsible scraping) | Available |
| **Inflation Data** | Government open datasets                                           | Available |

> **Note:** Real bank API integrations require partnerships and will be implemented post-MVP.

---

## Minimum Deployable Stack

For MVP and initial testing, the following minimal stack can run on a **single VM or laptop**:

```yaml
Frontend: React Native (Mobile) / Next.js (Web)
Backend: NestJS
AI Engine: FastAPI + Gemini Pro
Databases:
  - PostgreSQL (relational)
  - Neo4j (graph)
Events: Kafka or Redpanda
Storage: MinIO (S3-compatible)
Auth: Keycloak
```

### What You DON'T Need (Initially)

Paid robo-advisor APIs  
 Bloomberg / Reuters data feeds  
 Expensive vector databases  
 Closed financial datasets  
 Fully autonomous trading capabilities

---

## Technology Philosophy

**Design Principles:**

1. **Open Source First** - All core technologies are OSS with active communities
2. **Cloud Agnostic** - Deploy anywhere (AWS, Azure, GCP, on-premise)
3. **Regulatory Ready** - Built for RBI, SEBI, GDPR, and financial compliance
4. **Explainable AI** - No black-box decision-making, every recommendation traceable
5. **Privacy by Design** - User data ownership, consent-driven access
6. **Scalability** - Handle millions of users with horizontal scaling

**Why These Choices Support Nivesh's Mission:**

- **Gemini Pro:** Free tier supports MVP phase; strong reasoning for financial advice
- **Neo4j:** Essential for graph reasoning (e.g., "How does this expense affect my retirement goal?")
- **Kafka:** Event-driven architecture enables real-time alerts and updates
- **PostgreSQL:** ACID compliance ensures financial transaction integrity
- **FastAPI:** High-performance Python for ML/AI workloads
- **NestJS:** Enterprise-grade TypeScript framework for maintainability

---

## Deployment Strategy (Aligned with PRD)

### MVP Phase (8-10 weeks)

- **Stack:** PostgreSQL + Neo4j + Gemini Pro + NestJS + FastAPI
- **Deployment:** Docker Compose on single VM
- **Users:** Internal testing + 50-100 beta users
- **Focus:** Core conversations, simulations, explainability

### V1 Phase (12-16 weeks)

- **Added:** Kafka, Redis, ClickHouse for analytics
- **Deployment:** Kubernetes (k3s) on cloud provider
- **Users:** 2,000-5,000 early adopters
- **Focus:** Goal planning, investment advisor, voice support

### V2 Phase (6+ months)

- **Added:** Multi-region deployment, advanced ML models
- **Deployment:** Multi-cloud with disaster recovery
- **Users:** 50,000+ users
- **Focus:** Global expansion, B2B licensing, financial digital twin

---

## License Compliance

All technologies used are either:

- **MIT License** - Commercial use allowed
- **Apache 2.0** - Patent grant included
- **AGPL** (Neo4j Community) - OK for hosted services
- **BSL** (Business Source License) - OK for internal use

**No GPL violations** - Clear licensing boundaries maintained

---

**Last Updated:** January 13, 2026  
**Version:** 2.0 (Aligned with PRD v1.0)  
**Maintained By:** Nivesh Engineering Team 5. **Scalable Architecture** - Designed for millions of users

---

## License Compliance

All technologies used are under permissive open-source licenses:

| Technology        | License            |
| ----------------- | ------------------ |
| PostgreSQL        | PostgreSQL License |
| Neo4j Community   | GPLv3              |
| Redis             | BSD License        |
| MongoDB Community | SSPL               |
| Apache Kafka      | Apache 2.0         |
| NestJS            | MIT                |
| FastAPI           | MIT                |
| React/Next.js     | MIT                |
| Keycloak          | Apache 2.0         |

---

## Getting Started

1. **Clone the repository**
2. **Run Docker Compose** for local development
3. **Follow setup guides** in respective service directories

For detailed installation instructions, see [STRUCTURE.md](STRUCTURE.md).

---

**Last Updated:** January 2026  
**Maintained By:** Nivesh Development Team  
**Questions?** Open an issue on GitHub
