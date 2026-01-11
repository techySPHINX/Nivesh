# Tech Stack

> **Open-source, cloud-agnostic, and production-ready technology stack for Nivesh AI Financial Platform**

[![License](https://img.shields.io/badge/license-Open%20Source-blue.svg)](LICENSE)
[![Tech Stack](https://img.shields.io/badge/stack-polyglot-green.svg)]()

## Table of Contents

- [Overview](#overview)
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

---

## Overview

Nivesh uses a **polyglot persistence model** with open-source technologies to ensure:

- **Zero vendor lock-in**
- **Cloud-agnostic deployment**
- **Production-grade scalability**
- **Regulatory compliance ready**

---

## AI & ML Stack

| Layer                  | Technology                                                   | Purpose                                            |
| ---------------------- | ------------------------------------------------------------ | -------------------------------------------------- |
| **LLM**                | [Gemini Pro](https://ai.google.dev/)                         | Free tier, strong financial reasoning capabilities |
| **Embeddings**         | [Sentence-Transformers](https://www.sbert.net/)              | Open-source semantic search                        |
| **Intent Classifier**  | [DistilBERT](https://huggingface.co/distilbert-base-uncased) | Lightweight, fast intent detection                 |
| **Sentiment Analysis** | [XLM-RoBERTa](https://huggingface.co/xlm-roberta-base)       | Multilingual sentiment detection                   |
| **Forecasting**        | [Prophet](https://facebook.github.io/prophet/)               | Time-series financial projections                  |
| **Anomaly Detection**  | LSTM Autoencoder                                             | Spending pattern anomaly detection                 |
| **Simulation**         | Monte Carlo (NumPy)                                          | Deterministic financial simulations                |
| **Risk Scoring**       | [XGBoost](https://xgboost.readthedocs.io/)                   | Explainable risk profiling                         |

---

## Data & Storage

### Database Technologies

| Data Type          | Technology                                                          | Use Case                                   |
| ------------------ | ------------------------------------------------------------------- | ------------------------------------------ |
| **Relational DB**  | [PostgreSQL 15+](https://www.postgresql.org/)                       | Transactions, user data, financial records |
| **Graph DB**       | [Neo4j Community](https://neo4j.com/download/)                      | Financial relationships, reasoning graphs  |
| **Time-Series**    | [ClickHouse](https://clickhouse.com/)                               | Analytics, historical trends               |
| **Document Store** | [MongoDB Community](https://www.mongodb.com/try/download/community) | Conversations, unstructured data           |
| **Cache**          | [Redis 7+](https://redis.io/)                                       | Session management, real-time data         |
| **Object Storage** | [MinIO](https://min.io/)                                            | S3-compatible document storage             |

**Key Benefits:**

- All open-source
- Cloud-agnostic deployment
- Horizontal scalability
- Industry-proven reliability

---

## Event-Driven Architecture

| Component                   | Technology                                                       | Purpose                              |
| --------------------------- | ---------------------------------------------------------------- | ------------------------------------ |
| **Message Broker**          | [Apache Kafka](https://kafka.apache.org/)                        | Event streaming backbone             |
| **Lightweight Alternative** | [Redpanda](https://redpanda.com/)                                | Kafka-compatible, simpler deployment |
| **Stream Processing**       | [Kafka Streams](https://kafka.apache.org/documentation/streams/) | Real-time event processing           |
| **Schema Registry**         | [Confluent OSS](https://github.com/confluentinc/schema-registry) | Event schema versioning              |

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

| Layer                 | Technology                                                             | Purpose                                |
| --------------------- | ---------------------------------------------------------------------- | -------------------------------------- |
| **API Gateway**       | [Kong (OSS)](https://konghq.com/kong)                                  | Rate limiting, authentication, routing |
| **Backend Framework** | [NestJS](https://nestjs.com/)                                          | TypeScript-based microservices         |
| **AI Services**       | [FastAPI](https://fastapi.tiangolo.com/)                               | Python-based ML/AI endpoints           |
| **Graph Queries**     | Neo4j Bolt Protocol                                                    | Graph database connectivity            |
| **Background Jobs**   | [BullMQ](https://docs.bullmq.io/)                                      | Queue-based job processing             |
| **Observability**     | [Prometheus](https://prometheus.io/) + [Grafana](https://grafana.com/) | Metrics, monitoring, alerting          |

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

1. **Open Source First** - All core technologies are OSS
2. **Cloud Agnostic** - Deploy anywhere (AWS, Azure, GCP, on-premise)
3. **Regulatory Ready** - Built for RBI, GDPR, and financial compliance
4. **Explainable AI** - No black-box decision-making
5. **Scalable Architecture** - Designed for millions of users

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
