# PROJECT NIVESH — Your AI Financial Strategist

**AI-Native Financial Reasoning Platform**

**Last Updated:** January 13, 2026  
**Version:** 2.0 (Aligned with PRD v1.0)  
**Status:** Documentation Complete, Development In Progress

---

## 1️⃣ SYSTEM VISION (TECHNICAL)

**Core Concept:**  
Nivesh is not a fintech app with AI features — it is an **AI reasoning system** with fintech data connectors.

**Value Proposition:**  
_"Your money finally makes sense — decisions, not dashboards."_

### Product Philosophy

```
Financial Data → Structured Knowledge Graph
     ↓
Knowledge Graph → AI Reasoning Layer
     ↓
Reasoning → Simulations + Explanations
     ↓
Output → Conversational, Visual, Voice-First Insights
```

**Target Users:**

- First Salary Planners (22-28): Starting SIPs, reducing expenses
- Milestone Families (28-40): Home loans, marriage, education planning
- Portfolio Optimizers (25-45): Investment intelligence, rebalancing
- Globally Mobile/NRI: Multi-goal planning, net worth clarity

---

## 2️⃣ HIGH LEVEL DESIGN (HLD)

### 2.1 Core Architecture Overview

```
┌─────────────┐
│ Mobile/Web  │  (React Native, Next.js)
│ App (UI)    │
└─────┬───────┘
      │
      ▼
┌────────────────────┐
│ API Gateway        │  (Kong OSS)
│ (Auth, Rate Limit) │
└─────┬──────────────┘
      │
┌─────▼──────────────────────────────────────────┐
│               CORE AI PLATFORM                  │
│                                                  │
│ ┌───────────────┐   ┌────────────────────────┐ │
│ │ Financial     │   │ Conversation & Reason  │ │
│ │ Data Layer    │──▶│ Engine (LLM + Logic)   │ │
│ │(Fi MCP,APIs)  │   │  (Gemini Pro 1.5)      │ │
│ └───────────────┘   └────────────┬───────────┘ │
│                                   │             │
│ ┌───────────────┐   ┌────────────▼───────────┐ │
│ │ Financial     │   │ Simulation Engine       │ │
│ │ Knowledge     │◀──│ (Projections & What-If)│ │
│ │ Graph (Neo4j) │   │ (Monte Carlo, Prophet) │ │
│ └───────────────┘   └────────────┬───────────┘ │
│                                   │             │
│ ┌───────────────┐   ┌────────────▼───────────┐ │
│ │ ML Models     │◀──│ Decision & Explain      │ │
│ │ (Risk, Spend) │   │ Layer (Audit Trail)    │ │
│ │ (XGBoost,LSTM)│   └────────────┬───────────┘ │
│ └───────────────┘                │             │
│                                   │             │
│ ┌───────────────┐   ┌────────────▼───────────┐ │
│ │ Alert Engine  │◀──│ Personalization Engine │ │
│ │(Kafka Events) │   │ (User Preferences)     │ │
│ └───────────────┘   └────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### 2.2 Major Subsystems (HLD)

| Layer                         | Responsibility                     | Technologies                |
| ----------------------------- | ---------------------------------- | --------------------------- |
| **Data Ingestion Layer**      | Fi MCP, bank APIs, investment APIs | NestJS, PostgreSQL          |
| **Financial Knowledge Graph** | Unified semantic view of money     | Neo4j, Cypher               |
| **AI Reasoning Engine**       | Financial logic + LLM reasoning    | FastAPI, Gemini Pro         |
| **Simulation Engine**         | Long-term projections              | Prophet, Monte Carlo        |
| **ML Intelligence Layer**     | Risk, anomalies, behavior          | XGBoost, LSTM               |
| **Conversation Engine**       | Chat + voice + emotion             | MongoDB, XLM-RoBERTa        |
| **Explainability Layer**      | Trust & transparency               | Audit logs, decision traces |
| **Privacy & Control Layer**   | Data ownership                     | Consent management, GDPR    |

---

## 3️⃣ LOW LEVEL DESIGN (LLD)

### 3.1 Financial Data Layer (LLD)

**Data Sources:**

- Bank transactions (via Fi MCP)
- Credit cards (API integration)
- Mutual funds / stocks (portfolio APIs)
- Loans (EMI tracking)
- Insurance (policy management)
- Goals (user manual input)

**Data Ingestion Flow:**

```
Fi MCP → API Gateway → NestJS Backend → PostgreSQL
                              ↓
                        Kafka Event Bus
                              ↓
                        Neo4j Graph Sync
```

Normalized Financial Schema
User
├── Profile
├── Income[]
├── Expenses[]
├── Assets[]
├── Liabilities[]
├── Investments[]
├── Goals[]
└── LifeEvents[]

Example: Expense Model
{
"id": "exp_123",
"category": "Dining",
"amount": 850,
"date": "2026-01-01",
"merchant": "Zomato",
"recurrence": false
}

3.2 Financial Knowledge Graph (Critical Component)
Why a Knowledge Graph?

Because financial reasoning is relational, not tabular.

Nodes

User

Income

Expense

Investment

Goal

Life Event

Market Indicator

Tax Rule

Edges

EARNS

SPENDS_ON

INVESTS_IN

AFFECTS

CONSTRAINS

DEPENDS_ON

Example
(User) ──INVESTS_IN──▶ (Equity MF)
(User) ──HAS_GOAL──▶ (Retirement)
(Inflation) ──AFFECTS──▶ (Goal)

Graph DB:

Neo4j / Amazon Neptune

4️⃣ AI & ML ARCHITECTURE (MOST IMPORTANT)
4.1 Core AI Reasoning Engine
Model Type

Hybrid Reasoning System

LLM (Gemini / GPT)

Deterministic finance logic

Simulation math

Rule engine

Flow
User Query
→ Intent Detection
→ Financial Context Retrieval
→ Constraint Identification
→ Simulation / Analysis
→ Explanation Generation

Why Hybrid?

LLMs:

Explain

Reason

Converse

Rules & Math:

Accuracy

Compliance

Determinism

4.2 Intent Detection Model
Model

Fine-tuned Transformer (BERT / DistilBERT)

Intents

Affordability check

Retirement planning

Overspending analysis

Investment advice

Scenario simulation

Output
{
"intent": "HOUSE_AFFORDABILITY",
"confidence": 0.93
}

4.3 Risk Profiling Model
Model

Gradient Boosted Trees (XGBoost)

Inputs

Age

Income stability

Expense volatility

Investment behavior

Past drawdown tolerance

Output
{
"risk_score": 0.62,
"risk_category": "Moderate"
}

4.4 Spending Pattern & Anomaly Detection
Model

Seasonal Hybrid ESD

LSTM Autoencoders (advanced)

Algorithm

Learn monthly spending baseline

Detect deviation beyond threshold

Contextualize anomaly

Output
{
"category": "Dining",
"deviation": 35%,
"impact": "Savings goal risk"
}

4.5 Investment Recommendation Engine
Multi-Layer Decision System

Layer 1: Constraints

Age

Goal horizon

Liquidity needs

Layer 2: Optimization

Mean-Variance Optimization

Black-Litterman Model

Layer 3: Behavioral Adjustment

Loss aversion

Panic selling history

Output
{
"action": "REBALANCE",
"from": "Debt",
"to": "Equity",
"reason": "Age + long horizon"
}

4.6 Scenario Simulation Engine
Algorithm

Monte Carlo Simulation

Steps

Generate 10,000 future paths

Vary:

Returns

Inflation

Income growth

Compute:

Net worth distribution

Goal success probability

Output
{
"median_net_worth": "₹3.2 Cr",
"success_probability": 78%
}

4.7 Financial Digital Twin (Advanced)
What It Is

A continuously learning state machine of user finances.

Components

Behavior model (ML)

Financial state graph

Projection cache

Feedback loop

Updates When:

User spends

User invests

Market changes

Life event added

4.8 Emotion & Sentiment Awareness
Model

Multilingual sentiment classifier (XLM-R)

Use

Detect anxiety / confidence

Adjust tone

Trigger reassurance logic

5️⃣ EXPLAINABILITY & TRUST LAYER
Explain-My-Decision Algorithm

For each recommendation:

Identify influencing factors

Rank impact

Generate natural explanation

Example:

Why:
• Your age gives long horizon
• Debt allocation is higher than needed
• Goal is 15 years away

If ignored:
• 12–18% lower retirement corpus

6️⃣ VOICE & LOCAL LANGUAGE STACK
Components

Speech-to-Text (Whisper / Google STT)

Multilingual LLM

Text-to-Speech

Key Challenge

Maintain financial accuracy across languages

Solution:

Translate → reason in English → re-explain locally

7️⃣ PRIVACY & CONTROL ARCHITECTURE

Zero data resale

Encrypted per-user vault

Explainable AI logs

Exportable financial graph

8️⃣ SCALABILITY & PRODUCTION READINESS
Layer Tech
API NestJS
AI Services Python + FastAPI
Graph Neo4j
Cache Redis
Streaming Kafka
Storage Encrypted S3
Infra Kubernetes
Observability Prometheus + OpenTelemetry
