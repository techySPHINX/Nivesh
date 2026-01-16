# Nivesh — Your AI Financial Strategist

> **AI-Native Financial Reasoning Platform** - Democratizing intelligent financial planning through explainable AI

[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![Tech Stack](https://img.shields.io/badge/stack-open%20source-green.svg)](docs/TECH_STACK.md)
[![Status](https://img.shields.io/badge/status-In%20Development-yellow.svg)](docs/DOCUMENTATION_UPDATE_SUMMARY.md)
[![Documentation](https://img.shields.io/badge/docs-complete-brightgreen.svg)](docs/)

## ⚠️ IMPORTANT LEGAL NOTICE

**THIS IS PROPRIETARY SOFTWARE - ALL RIGHTS RESERVED**

- 🚫 **NO LICENSE IS GRANTED** for any use without explicit written permission
- 📖 **VIEWING ONLY**: You may view the source code for educational reference ONLY
- 💼 **COMMERCIAL LICENSE REQUIRED**: Contact **jaganhotta357@outlook.com** for licensing
- ⚖️ **LEGAL CONSEQUENCES**: Unauthorized use will result in civil and criminal prosecution
- 📜 **Read Full Terms**: See [LICENSE](LICENSE) file for complete legal agreement

**To use this software for ANY purpose (personal, commercial, research), you MUST obtain a written license.**

---

## 🎯 Vision

**Nivesh is not a fintech app with AI features** — it is an **AI reasoning system** with fintech data connectors.

### Core Philosophy

```
Financial Data → Structured Knowledge Graph
     ↓
Knowledge Graph → AI Reasoning Layer
     ↓
Reasoning → Simulations + Explanations
     ↓
Output → Conversational, Visual, Voice-First Insights
```

**Mission:** Enable users to confidently answer:

- _"Can I afford this?"_
- _"What should I do next?"_
- _"What happens if I choose option A vs B?"_
- _"Am I on track for my life goals?"_

**Positioning:** From dashboards to decision-making. Nivesh is financial reasoning + strategic planning on real user data.

---

## 📚 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Documentation](#-documentation)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### 🤖 AI-Powered Financial Intelligence

- **Natural Language Understanding** - Ask questions in plain English/Hindi
- **Context-Aware Reasoning** - Understands your complete financial situation via graph database
- **Explainability-First** - Every recommendation includes assumptions, alternatives, and risks
- **Multi-Modal Interface** - Text, voice, and visual interactions

### 📊 Comprehensive Financial Analysis

- **Income & Expense Tracking** - Automated categorization with anomaly detection (LSTM)
- **Investment Portfolio Management** - Multi-asset class tracking and optimization
- **Goal-Based Planning** - Retirement, education, home purchase with milestone tracking
- **Life Event Modeling** - Marriage, children, relocation financial impact analysis

### 🧠 Advanced Capabilities

- **Graph-Based Reasoning** - Neo4j powered financial relationship mapping
- **Monte Carlo Simulations** - 10,000+ scenario probability analysis for projections
- **Risk Profiling** - XGBoost-based risk assessment and tolerance matching
- **Real-Time Insights** - Kafka event-driven architecture for instant updates

### 🔒 Privacy & Compliance

- **GDPR Compliant** - User data ownership and export capabilities
- **RBI/SEBI Ready** - Designed for Indian financial regulatory requirements
- **Explainable Decisions** - Full audit trail (7-year retention) for every AI recommendation
- **Consent Management** - Granular data access controls

### 🎯 Key Differentiators

✅ **Real financial data ingestion** via Fi MCP  
✅ **AI financial reasoning layer** (not just analytics)  
✅ **Scenario simulation engine** for what-if analysis  
✅ **Privacy & portability** as user-owned insights  
✅ **Optional future:** Financial Digital Twin

---

## 🏗️ Architecture

### High-Level System Architecture (End-to-End)

**From Approved Mermaid Diagrams - Complete Data Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    NIVESH AI PLATFORM                            │
│                                                                  │
│  User (App/Web/Voice) → Frontend UI (Chat + Dashboard + Sims)   │
│                              ↓                                   │
│                      Firebase Auth                               │
│                              ↓                                   │
│                   API Gateway (Kong OSS)                         │
│                              ↓                                   │
│         ┌────────────────────┴────────────────────┐             │
│         ↓                                          ↓             │
│   ┌──────────────┐                      ┌──────────────┐        │
│   │  Fi MCP      │                      │    NestJS    │        │
│   │  Server      │                      │   Backend    │        │
│   └──────┬───────┘                      └──────┬───────┘        │
│          │                                     │                │
│          ↓                                     ↓                │
│   ┌──────────────┐                      ┌──────────────┐        │
│   │     Data     │                      │  PostgreSQL  │        │
│   │Normalization │                      │(Source Truth)│        │
│   │+ Enrichment  │                      └──────┬───────┘        │
│   └──────┬───────┘                             │                │
│          │                                     │                │
│          ↓                                     ↓                │
│   ┌──────────────────────┐            ┌───────────────┐        │
│   │  Feature Store       │◄───────────┤ Kafka Event   │        │
│   │  (Neo4j Graph +      │            │     Bus       │        │
│   │   Firestore/Redis)   │            └───────┬───────┘        │
│   └──────┬───────────────┘                    │                │
│          │                                     │                │
│          ↓                                     ↓                │
│   ┌──────────────────────┐            ┌───────────────┐        │
│   │   AI Orchestrator    │            │   MongoDB     │        │
│   │                      │            │  (Chat Logs)  │        │
│   │  ┌───────────────┐   │            └───────────────┘        │
│   │  │  Gemini LLM   │   │                    │                │
│   │  │(Intent+Reason)│   │                    ↓                │
│   │  └───────┬───────┘   │            ┌───────────────┐        │
│   │          │            │            │  ClickHouse   │        │
│   │          ↓            │            │  (Analytics)  │        │
│   │  ┌───────────────┐   │            └───────────────┘        │
│   │  │  Tool Router  │   │                                     │
│   │  └───────┬───────┘   │                                     │
│   │          │            │                                     │
│   │  ┌───────┴───────────────────┐                             │
│   │  │                           │                             │
│   │  ↓               ↓           ↓         ↓                   │
│   │ Finance      Category    Anomaly    Risk      Personalize  │
│   │ Engine      Model       Detection  Profile    Engine       │
│   │(Simulations) (XGBoost)  (Prophet)  (XGBoost) (Ranker)     │
│   │              (BERT)     (IsoForest)                        │
│   │  │               │           │         │          │        │
│   │  └───────────────┴───────────┴─────────┴──────────┘        │
│   │                      │                                     │
│   │                      ↓                                     │
│   │              ┌───────────────┐                             │
│   │              │   Response    │                             │
│   │              │   Builder     │                             │
│   │              │(Charts+Actions)│                            │
│   │              └───────┬───────┘                             │
│   │                      │                                     │
│   └──────────────────────┼─────────────────────────────────────┘
│                          ↓                                      │
│                      UI Output                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Why This Architecture?

| Design Decision               | Rationale                                                                              | Technology Choice                         |
| ----------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------- |
| **Graph-First Feature Store** | Financial reasoning requires relationship traversal ("How does X affect Y?")           | Neo4j for complex graph queries           |
| **Hybrid AI (LLM + Logic)**   | LLMs explain, deterministic code calculates - avoids hallucination in finance          | Gemini Pro 1.5 + NumPy/SciPy              |
| **Tool Router Pattern**       | Specialized models (categorization, anomaly, risk) are better than one LLM             | FastAPI microservices architecture        |
| **Event-Driven Pipeline**     | Real-time sync from transactions → enrichment → graph without blocking API             | Kafka for async data flow                 |
| **Polyglot Persistence**      | Each data type in optimal DB (relations in Postgres, graphs in Neo4j, docs in MongoDB) | PostgreSQL + Neo4j + MongoDB + ClickHouse |
| **Explainability-First**      | Every recommendation must be auditable for RBI/SEBI compliance                         | MongoDB audit logs + decision trace IDs   |

---

## 🛠️ Tech Stack

### Complete Technology Breakdown

#### **Frontend Layer**

| Technology                                        | Purpose                  | Why                                | Where Used                               |
| ------------------------------------------------- | ------------------------ | ---------------------------------- | ---------------------------------------- |
| [React Native](https://reactnative.dev/)          | Mobile app (iOS/Android) | Cross-platform, native performance | Chat interface, dashboard, goal tracking |
| [Next.js 14](https://nextjs.org/)                 | Web app with SSR         | SEO-friendly, fast page loads      | Public website, web chat, simulations    |
| [Recharts](https://recharts.org/)                 | Data visualization       | React-native charts library        | Financial charts, goal progress, trends  |
| [Firebase Auth](https://firebase.google.com/auth) | Authentication           | Free tier, phone OTP, OAuth        | Sign-up, login, session management       |

#### **Backend Layer**

| Technology                               | Purpose                     | Why                                    | Where Used                                    |
| ---------------------------------------- | --------------------------- | -------------------------------------- | --------------------------------------------- |
| [NestJS](https://nestjs.com/)            | REST API server             | TypeScript, modular, enterprise-grade  | CRUD operations, user management, Fi MCP sync |
| [FastAPI](https://fastapi.tiangolo.com/) | AI/ML microservice          | Async Python, automatic OpenAPI docs   | AI orchestrator, tool router, ML inference    |
| [Kong OSS](https://konghq.com/kong)      | API Gateway                 | Rate limiting, JWT validation, routing | Centralized entry point for all APIs          |
| [gRPC](https://grpc.io/)                 | Inter-service communication | Binary protocol, low latency           | NestJS ↔ FastAPI communication                |

#### **AI & Machine Learning Stack**

| Technology                                             | Purpose                      | Why                                      | Where Used                                     |
| ------------------------------------------------------ | ---------------------------- | ---------------------------------------- | ---------------------------------------------- |
| [Gemini Pro 1.5](https://ai.google.dev/)               | Primary LLM                  | Financial reasoning, intent detection    | Natural language Q&A, explanation generation   |
| [Ollama](https://ollama.ai/) (Mistral 7B)              | Open-source LLM backup       | Privacy mode, offline inference          | Self-hosted deployments                        |
| [XGBoost](https://xgboost.readthedocs.io/)             | Risk scoring, categorization | Explainable, fast, production-ready      | Transaction categorization, risk profiling     |
| [Prophet](https://facebook.github.io/prophet/)         | Time-series forecasting      | Handles seasonality, missing data        | Income growth, expense trends, inflation       |
| [IsolationForest](https://scikit-learn.org/)           | Anomaly detection            | Unsupervised, works with high dimensions | Fraud detection, unusual spending alerts       |
| [Sentence-Transformers](https://www.sbert.net/)        | Embeddings                   | Open-source semantic search              | Chat history search, similar scenario matching |
| [XLM-RoBERTa](https://huggingface.co/xlm-roberta-base) | Multilingual sentiment       | Supports Hindi + 100 languages           | Detect financial anxiety, adjust tone          |
| [LangChain](https://langchain.com/)                    | LLM orchestration            | Tool calling, prompt templates, memory   | AI orchestrator, RAG pipeline                  |

#### **Database Layer (Polyglot Persistence)**

| Technology                                              | Purpose                         | Why                                         | Data Flow                                      |
| ------------------------------------------------------- | ------------------------------- | ------------------------------------------- | ---------------------------------------------- |
| [Neo4j Community](https://neo4j.com/)                   | **Graph DB (Feature Store)**    | Financial relationship reasoning via Cypher | Fi MCP → Enrichment → Neo4j → AI Orchestrator  |
| [PostgreSQL 15+](https://www.postgresql.org/)           | Relational DB (Source of Truth) | ACID compliance, audit trail                | Fi MCP → API Gateway → PostgreSQL              |
| [Firestore](https://firebase.google.com/docs/firestore) | Real-time feature store         | Low-latency reads for ML models             | Enrichment Layer → Firestore → AI Orchestrator |
| [Redis 7+](https://redis.io/)                           | Cache + Session Store           | Sub-millisecond latency, pub/sub            | Session tokens, feature caching                |
| [MongoDB](https://www.mongodb.com/)                     | Document store                  | Flexible schema for AI logs, conversations  | AI Orchestrator → Response Builder → MongoDB   |
| [ClickHouse](https://clickhouse.com/)                   | Time-series analytics           | Columnar storage, fast aggregations         | PostgreSQL → ETL → ClickHouse (OLAP)           |
| [MinIO](https://min.io/)                                | Object storage                  | S3-compatible, self-hosted                  | User reports (PDFs), model artifacts           |

#### **Event Streaming & Data Pipeline**

| Technology                                 | Purpose                  | Why                                     | Where Used                               |
| ------------------------------------------ | ------------------------ | --------------------------------------- | ---------------------------------------- |
| [Apache Kafka](https://kafka.apache.org/)  | Event streaming backbone | Distributed, durable, high-throughput   | Fi MCP → Kafka → All downstream services |
| [Kafka Connect](https://kafka.apache.org/) | Database connectors      | No-code CDC (Change Data Capture)       | PostgreSQL → Kafka → Neo4j sync          |
| [Avro](https://avro.apache.org/)           | Schema registry          | Strongly-typed events, schema evolution | Transaction events, simulation events    |
| [Debezium](https://debezium.io/)           | PostgreSQL CDC           | Real-time sync OLTP → OLAP              | PostgreSQL changes → Kafka → ClickHouse  |

#### **Infrastructure & DevOps**

| Technology                                 | Purpose                  | Why                                       | Where Used                                 |
| ------------------------------------------ | ------------------------ | ----------------------------------------- | ------------------------------------------ |
| [Docker](https://www.docker.com/)          | Containerization         | Reproducible builds, isolation            | All services containerized                 |
| [Kubernetes](https://kubernetes.io/)       | Container orchestration  | Auto-scaling, self-healing, declarative   | Production deployments (V1 phase)          |
| [Prometheus](https://prometheus.io/)       | Metrics & monitoring     | Time-series metrics, alerting             | System health, API latency, DB performance |
| [Grafana](https://grafana.com/)            | Observability dashboards | Rich visualizations, multi-source support | Real-time monitoring, SLA tracking         |
| [OpenTelemetry](https://opentelemetry.io/) | Distributed tracing      | Trace requests across microservices       | Debug latency, track AI decision paths     |

### Technology Selection Philosophy

✅ **100% Open Source** - No vendor lock-in, community-driven  
✅ **Cloud-Agnostic** - Deploy on AWS, GCP, Azure, or on-premise  
✅ **Production-Grade** - Battle-tested at scale by industry leaders  
✅ **Compliance-Ready** - GDPR, RBI, SEBI audit requirements built-in  
✅ **Free Tiers Available** - Firebase Auth, Gemini API, Firestore free quotas

> **All technologies chosen are either free/open-source or have generous free tiers for MVP phase**

---

## 📁 Project Structure

```
nivesh/
│
├── apps/                                      # Application Services
│   ├── backend-nest/                          # NestJS API Server
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/                      # Firebase Auth
│   │       │   ├── transactions/              # Fi MCP Data Ingestion
│   │       │   ├── graph/                     # Neo4j Feature Store
│   │       │   ├── kafka/                     # Event Streaming
│   │       │   └── audit/                     # Explainability Logs
│   │
│   ├── ai-engine/                             # FastAPI ML Service
│   │   └── src/
│   │       ├── orchestrator/                  # AI Orchestrator (Mermaid Diagram 2)
│   │       ├── tools/
│   │       │   ├── router.py                  # Tool Router
│   │       │   ├── simulation/                # Finance Engine (Monte Carlo)
│   │       │   ├── categorization/            # Txn Categorization (XGBoost+BERT)
│   │       │   ├── anomaly/                   # Anomaly Detection (IsolationForest)
│   │       │   ├── risk/                      # Risk Profiling (XGBoost)
│   │       │   └── personalization/           # Recommendation Engine (Ranker)
│   │       ├── llm/                           # Gemini LLM Integration
│   │       ├── enrichment/                    # Data Enrichment Layer
│   │       └── response_builder/              # Charts + Actions Generator
│   │
│   └── frontend/                              # Next.js Web + React Native Mobile
│       └── src/
│           ├── pages/                         # Next.js Pages
│           ├── components/                    # Chat UI, Dashboard, Simulations
│           └── lib/                           # API Client, Firebase Auth
│
├── libs/                                      # Shared Libraries
│   ├── proto/                                 # gRPC/Kafka Avro Schemas
│   ├── compliance/                            # RBI/GDPR Rules Engine
│   └── prompts/                               # LLM Prompt Templates
│
├── infra/                                     # Infrastructure as Code
│   ├── docker/
│   │   └── docker-compose.yml                 # Local Dev Stack (11 services)
│   ├── kubernetes/                            # K8s Manifests (Production)
│   └── terraform/                             # Cloud Provisioning (AWS/GCP/Azure)
│
├── data/                                      # Data Assets
│   ├── models/                                # ML Models (.pkl files)
│   │   ├── xgboost_risk.pkl                   # Risk Profiling
│   │   ├── xgboost_category.pkl               # Transaction Categorization
│   │   └── isolation_forest.pkl               # Anomaly Detection
│   ├── embeddings/                            # Sentence Transformers
│   └── migrations/                            # Database Migrations
│       ├── postgres/                          # SQL Scripts
│       ├── neo4j/                             # Cypher Scripts
│       └── clickhouse/                        # ClickHouse Tables
│
├── docs/                                      # Documentation
│   ├── TECH_STACK.md                          # Technology Stack Details
│   ├── DATABASE_STRATERGY.md                  # Polyglot Persistence Strategy
│   ├── STRUCTURE.md                           # Monorepo Organization
│   ├── CONTAINERIZATION.md                    # Docker Architecture
│   ├── LLM_GUIDE.md                           # LLM Integration Guide
│   └── GUARDRAILS_SAFEGUARDS.md               # AI Safety Architecture
│
├── Mermaid codes.md                           # Approved Architecture Diagrams
├── NIVESH.md                                  # Technical Vision Document
├── PRD.md                                     # Product Requirements Document
├── REQUIREMENTS.md                            # Lean Canvas - Business Model
├── README.md                                  # This File
└── docker-compose.yml                         # Quick Start Configuration
```

### Architecture Mapping (Code ↔ Mermaid Diagrams)

| Mermaid Component          | Codebase Location                           | Technology              |
| -------------------------- | ------------------------------------------- | ----------------------- |
| **Fi MCP Server**          | `apps/backend-nest/src/modules/mcp/`        | NestJS + Fi MCP SDK     |
| **Data Normalization**     | `apps/ai-engine/src/enrichment/`            | Python Pandas + Kafka   |
| **Feature Store (Neo4j)**  | `apps/backend-nest/src/modules/graph/`      | Neo4j Bolt Driver       |
| **AI Orchestrator**        | `apps/ai-engine/src/orchestrator/`          | FastAPI + LangChain     |
| **Gemini LLM**             | `apps/ai-engine/src/llm/gemini_client.py`   | Gemini Pro 1.5 API      |
| **Tool Router**            | `apps/ai-engine/src/tools/router.py`        | FastAPI Router          |
| **Finance Engine**         | `apps/ai-engine/src/tools/simulation/`      | NumPy + SciPy           |
| **Txn Categorization**     | `apps/ai-engine/src/tools/categorization/`  | XGBoost + BERT          |
| **Anomaly Detection**      | `apps/ai-engine/src/tools/anomaly/`         | IsolationForest+Prophet |
| **Risk Profiling**         | `apps/ai-engine/src/tools/risk/`            | XGBoost                 |
| **Personalization Engine** | `apps/ai-engine/src/tools/personalization/` | LightGBM Ranker         |
| **Response Builder**       | `apps/ai-engine/src/response_builder/`      | Jinja2 + Plotly         |

---

## � How Nivesh Works - Query Flow

### Example: "Can I afford a ₹50L home loan?"

**Step-by-Step Flow (From Mermaid Diagram 2):**

```
1. User Input → Chat UI
   ↓
2. Chat UI → API Gateway (Kong) [JWT validation]
   ↓
3. API Gateway → AI Orchestrator (FastAPI)
   ↓
4. Orchestrator → Feature Store (Neo4j)
   • Query: MATCH (u:User {id: $userId})-[:EARNS]->(income)
   • Fetch: Current income, expenses, existing EMIs, net worth
   ↓
5. Orchestrator → Gemini LLM
   • Prompt: "User asks: 'Can I afford ₹50L loan?'"
   • Context: {income: ₹80K/mo, expenses: ₹45K/mo, existing_emi: ₹8K/mo}
   • Request: Extract intent + missing parameters
   ↓
6. Gemini Response:
   {
     "intent": "HOUSE_AFFORDABILITY",
     "missing_params": ["loan_tenure", "interest_rate", "down_payment"],
     "confidence": 0.94
   }
   ↓
7. Orchestrator → UI: "What's your preferred loan tenure?"
   ↓
8. User: "20 years, 8.5% interest, ₹10L down payment"
   ↓
9. Orchestrator → Tool Router
   • Route: simulation/loan_affordability
   ↓
10. Tool Router → Finance Engine
    • Calculate: EMI = ₹34,500/mo for ₹40L (after down payment)
    • Cashflow: ₹80K - ₹45K - ₹8K - ₹34,500 = -₹7,500 (NEGATIVE)
    ↓
11. Finance Engine → Orchestrator
    {
      "affordable": false,
      "monthly_surplus": -7500,
      "recommended_action": "Increase income OR reduce loan amount"
    }
    ↓
12. Orchestrator → Gemini LLM (Explanation)
    • Prompt: "Explain why ₹50L loan is not affordable"
    • Context: {emi: ₹34,500, surplus: -₹7,500}
    ↓
13. Gemini Response:
    "Based on your ₹80K monthly income and ₹45K expenses, a ₹50L loan
     would result in a ₹34,500 EMI, leaving you ₹7,500 short each month.

     Alternatives:
     1. Increase down payment to ₹20L (EMI becomes ₹25,800 - AFFORDABLE)
     2. Extend tenure to 25 years (EMI becomes ₹31,200 - STILL TIGHT)
     3. Look for ₹40L loan instead (EMI ₹27,600 - COMFORTABLE)

     Assumptions:
     • Interest rate: 8.5%
     • No change in income/expenses
     • Emergency fund: ₹5K/month recommended"
    ↓
14. Orchestrator → Response Builder
    • Generate: Chart showing EMI vs Income breakdown
    • Action buttons: ["Adjust Loan Amount", "Add Goal", "Export Report"]
    ↓
15. Response Builder → UI
    {
      "text": "...",
      "charts": [income_breakdown_chart, emi_comparison_chart],
      "actions": ["adjust_loan", "add_goal", "export_pdf"],
      "decision_trace_id": "DT-2026-01-16-001",
      "confidence": 0.94
    }
    ↓
16. UI → User (Final Output)
```

### Key Technologies in This Flow

| Step      | Technology Used                     | Why                                                   |
| --------- | ----------------------------------- | ----------------------------------------------------- |
| **1-2**   | Next.js + Firebase Auth             | Secure authentication, session management             |
| **3**     | Kong API Gateway                    | Rate limiting, JWT validation, routing                |
| **4**     | Neo4j Cypher Queries                | Fast relationship traversal for user context          |
| **5-6**   | Gemini Pro 1.5 (LLM)                | Intent detection, parameter extraction                |
| **9-10**  | Python NumPy/SciPy (Finance Engine) | Deterministic EMI calculation (no hallucination risk) |
| **12-13** | Gemini Pro 1.5 (Explanation)        | Natural language explanation with alternatives        |
| **14**    | Jinja2 + Plotly                     | Response formatting with charts                       |
| **16**    | MongoDB (Audit Log)                 | Store decision trace for explainability/compliance    |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**/**yarn**
- **Python** 3.11+
- **Docker** & **Docker Compose**
- **Git**

### Quick Start (Recommended - One Command)

```bash
# Clone the repository
git clone https://github.com/techySPHINX/Nivesh.git
cd nivesh

# Start all 11 services with Docker Compose
docker-compose up -d

# Wait for services to initialize (~2 minutes)
# Watch logs: docker-compose logs -f

# Access the services
# Frontend:        http://localhost:3000
# Backend API:     http://localhost:3001/api
# AI Engine:       http://localhost:8000/docs
# Neo4j Browser:   http://localhost:7474 (user: neo4j, pass: changeme)
# Kafka UI:        http://localhost:8080
# Grafana:         http://localhost:3001 (user: admin, pass: admin)
```

**What Docker Compose Starts:**

1. **frontend** - Next.js web app
2. **backend-nest** - NestJS API server
3. **ai-engine** - FastAPI ML service
4. **postgres** - PostgreSQL (source of truth)
5. **neo4j** - Graph database (feature store)
6. **redis** - Cache + session store
7. **mongodb** - Conversation logs
8. **kafka** - Event streaming
9. **clickhouse** - Analytics database
10. **kong** - API gateway
11. **minio** - Object storage

### Manual Setup (For Development)

```bash
# 1. Install backend dependencies
cd apps/backend-nest
npm install
cp .env.example .env
npm run start:dev

# 2. Install AI engine dependencies (separate terminal)
cd apps/ai-engine
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000

# 3. Install frontend dependencies (separate terminal)
cd apps/frontend
npm install
cp .env.example .env.local
npm run dev
```

### Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# Database Connections
POSTGRES_URI=postgresql://nivesh_user:secure_password@localhost:5432/nivesh_db
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=changeme
MONGODB_URI=mongodb://localhost:27017/nivesh_conversations
REDIS_URL=redis://localhost:6379
CLICKHOUSE_URL=http://localhost:8123

# AI Services
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_backup_key  # Optional backup

# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_TOPIC_TRANSACTIONS=nivesh.transactions
KAFKA_TOPIC_ALERTS=nivesh.alerts

# Authentication
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=nivesh-app.firebaseapp.com
JWT_SECRET=your_secure_jwt_secret_here

# Fi MCP Configuration
FI_MCP_API_KEY=your_fi_mcp_api_key
FI_MCP_WEBHOOK_SECRET=your_webhook_secret

# Storage
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=nivesh-reports
```

### Verify Installation

```bash
# Check all services are running
docker-compose ps

# Test backend API
curl http://localhost:3001/api/health

# Test AI engine
curl http://localhost:8000/health

# Test Neo4j connection
docker exec -it nivesh-neo4j cypher-shell -u neo4j -p changeme "MATCH (n) RETURN count(n);"
```

OPENAI_API_KEY=your_openai_api_key

# Kafka

KAFKA_BROKERS=localhost:9092

# Auth

KEYCLOAK_URL=http://localhost:8080

````

---

## 📖 Documentation

Comprehensive documentation is available in the [/docs](docs/) directory:

| Document                                                      | Description                                       | What You'll Learn                                        |
| ------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------- |
| **[PRD.md](PRD.md)**                                          | Product Requirements Document                     | Vision, user personas, value proposition, roadmap        |
| **[REQUIREMENTS.md](REQUIREMENTS.md)**                        | Lean Canvas - Business Model                      | Problem, solution, revenue streams, key metrics          |
| **[NIVESH.md](NIVESH.md)**                                    | Technical Vision Document                         | System design, HLD, LLD, AI architecture                 |
| **[Mermaid codes.md](Mermaid%20codes.md)**                    | **Approved Architecture Diagrams**                | **All 8 Mermaid flow diagrams (stakeholder approved)**   |
| **[TECH_STACK.md](docs/TECH_STACK.md)**                       | Complete Technology Stack                         | Every technology, why we use it, where it's used         |
| **[STRUCTURE.md](docs/STRUCTURE.md)**                         | Monorepo Structure                                | Folder organization, code-to-architecture mapping        |
| **[DATABASE_STRATERGY.md](docs/DATABASE_STRATERGY.md)**       | Polyglot Persistence Architecture                 | Database schemas, graph modeling, data flow              |
| **[CONTAINERIZATION.md](docs/CONTAINERIZATION.md)**           | Docker Architecture                               | Container setup, docker-compose, networking              |
| **[KUBERNETES.md](docs/KUBERNETES.md)**                       | Kubernetes Deployment Guide                       | K8s manifests, production deployment                     |
| **[LLM_GUIDE.md](docs/LLM_GUIDE.md)**                         | LLM Integration Guide                             | Prompt engineering, RAG, graph reasoning                 |
| **[GUARDRAILS_SAFEGUARDS.md](docs/GUARDRAILS_SAFEGUARDS.md)** | AI Safety & Compliance                            | Pre/post-LLM filters, refusal logic, content moderation  |

**All documentation is:**
- ✅ Aligned with approved Mermaid architecture diagrams
- ✅ Synchronized with open-source technology choices
- ✅ Production-ready with compliance considerations (RBI/SEBI/GDPR)
- ✅ Continuously updated with implementation progress
- ✅ Cleaned up - removed duplicate and obsolete files

**Documentation Cleanup Completed:**
- ❌ Removed: `TechnicalRequirements.md` (duplicate of TECHNICAL_REQUIREMENTS.md)
- ❌ Removed: `DOCUMENTATION_STATUS.md` (replaced by DOCUMENTATION_UPDATE_SUMMARY.md)
- ❌ Removed: `PROGRESS_REPORT.md` (replaced by DOCUMENTATION_UPDATE_SUMMARY.md)
- ❌ Removed: `FINAL_COMPLETION_REPORT.md` (replaced by DOCUMENTATION_UPDATE_SUMMARY.md)

---

## 🗺️ Roadmap

### Phase 1: MVP (8-10 weeks) — Q1 2026 ✅

**Focus:** Core conversations + simulations + explainability

- [x] Architecture documentation (HLD/LLD)
- [x] Technology stack finalization
- [x] Database schema design (PostgreSQL + Neo4j)
- [x] Docker containerization setup
- [x] Mermaid architecture diagrams (stakeholder approved)
- [x] Proprietary license implementation
- [x] Documentation cleanup and organization
- [ ] Core backend implementation (NestJS + FastAPI)
- [ ] AI Orchestrator + Tool Router
- [ ] Finance simulation engine
- [ ] Neo4j graph integration
- [ ] Net worth dashboard
- [ ] Simulations: Retirement, Home Loan, SIP
- [ ] Explainability module
- [ ] Export: CSV/PDF reports
- [ ] Basic anomaly alerts

**Target:** 50-100 beta users, internal testing

---

### Phase 2: V1 (12-16 weeks) — Q2 2026

**Focus:** Retention + depth via goal engine + investment advisor

- [ ] Goal planning engine (home, retirement, education)
- [ ] Investment strategy advisor + rebalancing
- [ ] Advanced anomaly detection (LSTM models)
- [ ] Voice support (English + Hindi)
- [ ] Premium tier monetization
- [ ] Kubernetes deployment
- [ ] Mobile app (iOS/Android)

**Target:** 2,000-5,000 early adopters

---

### Phase 3: V2 (6+ months) — Q3-Q4 2026

**Focus:** Global expansion + Digital Twin + Life Events

- [ ] Life Events mode (job switch, marriage, kids, relocation)
- [ ] Multi-country personalization (tax/inflation/currency)
- [ ] Financial digital twin (behavioral modeling)
- [ ] B2B version for banks/neo-banks
- [ ] Multi-region deployment
- [ ] Advanced ML models

**Target:** 50,000+ users, international expansion

---

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting PRs.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards

- **TypeScript** for backend (NestJS)
- **Python 3.11+** for AI services
- **ESLint** & **Prettier** for code formatting
- **Jest** for testing
- **Conventional Commits** for commit messages

**Contributing Policy:**
- 🚫 **No Pull Requests Accepted** without prior written permission
- 📧 **Contact First**: Email jaganhotta357@outlook.com to discuss contributions
- 📜 **CLA Required**: All contributors must sign a Contributor License Agreement
- ⚖️ **Proprietary Code**: All contributions become property of the Licensor

---

## 🔒 Security

Security is paramount for financial applications.

**Security Vulnerability Reporting:**
- **Email**: jaganhotta357@outlook.com
- **Subject**: [NIVESH SECURITY] Vulnerability Report
- **Response Time**: 5-7 business days
- **Responsible Disclosure**: We follow a 90-day disclosure timeline

We follow:

- **OWASP Top 10** security practices
- **SOC 2** compliance standards (planned)
- **Regular security audits**
- **Dependency scanning** with Snyk
- **Secrets management** with HashiCorp Vault

**Security Notice**: This software handles sensitive financial data. Unauthorized deployment or use may expose you to significant security and liability risks.

---

## 📄 License

**PROPRIETARY SOFTWARE - ALL RIGHTS RESERVED**

Copyright © 2026 Prateek (techySPHINX). All Rights Reserved.

This software is licensed under a **Proprietary Software License Agreement**.

### Quick Summary (NOT LEGAL ADVICE):

- ❌ **NO LICENSE** is granted for any use without written permission
- 📖 **Viewing Only**: You may view source code for educational purposes ONLY
- 🚫 **No Copying**: You may NOT copy, fork, clone, download, or use this software
- 🚫 **No Commercial Use**: Any commercial use is strictly prohibited
- 🚫 **No Personal Projects**: Personal use requires a license
- 💼 **License Required**: Contact jaganhotta357@outlook.com for licensing
- ⚖️ **Legal Action**: Violations will result in civil and criminal prosecution
- 💰 **Damages**: Up to $150,000 per violation under copyright law

### To Use This Software:

1. **Contact**: jaganhotta357@outlook.com
2. **Subject**: "Nivesh Commercial License Request"
3. **Obtain**: Written Commercial License Agreement
4. **Pay**: Applicable licensing fees
5. **Comply**: With all license terms

**See the full [LICENSE](LICENSE) file for complete legal terms and conditions.**

**Unauthorized use of this software constitutes copyright infringement and may result in:**
- Civil liability (damages, injunctions, legal fees)
- Criminal prosecution
- Permanent blacklisting from future licenses
- Public disclosure of violation

---

## 🙏 Acknowledgments

- **Open Source Community** for amazing tools
- **Neo4j** for graph database technology
- **Google** for Gemini Pro API
- **Apache Foundation** for Kafka
- **CNCF** for cloud-native technologies

---

## 📞 Contact & Support

- **Repository:** [github.com/techySPHINX/Nivesh](https://github.com/techySPHINX/Nivesh)
- **Project Lead:** Prateek
- **Email:** support@nivesh.ai (coming soon)
- **Documentation:** All docs in [/docs](docs/) folder
- **Issues:** [GitHub Issues](https://github.com/techySPHINX/Nivesh/issues)

---

## 📚 Quick Reference

### Key Documentation Files

| Need to understand...        | Read this file                                              |
| ---------------------------- | ----------------------------------------------------------- |
| **Overall vision**           | [PRD.md](PRD.md) - Product Requirements                     |
| **Business model**           | [REQUIREMENTS.md](REQUIREMENTS.md) - Lean Canvas            |
| **Architecture diagrams**    | [Mermaid codes.md](Mermaid%20codes.md) - Approved diagrams  |
| **All technologies**         | [docs/TECH_STACK.md](docs/TECH_STACK.md)                    |
| **Code organization**        | [docs/STRUCTURE.md](docs/STRUCTURE.md)                      |
| **Database design**          | [docs/DATABASE_STRATERGY.md](docs/DATABASE_STRATERGY.md)    |
| **Docker setup**             | [docs/CONTAINERIZATION.md](docs/CONTAINERIZATION.md)        |
| **AI/LLM integration**       | [docs/LLM_GUIDE.md](docs/LLM_GUIDE.md)                      |
| **What was updated**         | [docs/DOCUMENTATION_UPDATE_SUMMARY.md](docs/DOCUMENTATION_UPDATE_SUMMARY.md) |

### Quick Commands

```bash
# Start everything (development)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop everything
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# Check service health
docker-compose ps

# Access Neo4j browser
open http://localhost:7474

# Access API documentation
open http://localhost:8000/docs
````

### Technology at a Glance

| Layer     | Technologies                      | Free/OSS |
| --------- | --------------------------------- | -------- |
| Frontend  | React Native, Next.js             | ✅       |
| Backend   | NestJS, FastAPI, Kong             | ✅       |
| Databases | PostgreSQL, Neo4j, MongoDB, Redis | ✅       |
| AI/ML     | Gemini Pro, XGBoost, Prophet      | ✅\*     |
| DevOps    | Docker, Kubernetes, Prometheus    | ✅       |

\*Gemini has generous free tier

---

<div align="center">

**Built with ❤️ for financial inclusion in India**

_Empowering every Indian with AI-powered financial intelligence_

[⭐ Star us on GitHub](https://github.com/techySPHINX/Nivesh) | [🐛 Report Bug](https://github.com/techySPHINX/Nivesh/issues) | [💡 Request Feature](https://github.com/techySPHINX/Nivesh/issues)

---

**Status:** 📝 Documentation Complete | 🚧 Development In Progress | 🎯 MVP Target: Q1 2026

**Last Updated:** January 16, 2026 | **Version:** 2.0 | **Branch:** req/ver_1

</div>
```
