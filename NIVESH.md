PROJECT NIVESH

AI-Native Financial Reasoning Platform

1️⃣ SYSTEM VISION (TECHNICAL)

Nivesh is not a fintech app with AI features
It is an AI reasoning system with fintech data connectors

Core idea:

Financial data → Structured knowledge graph

Knowledge graph → AI reasoning layer

Reasoning → Simulations + explanations

Output → Conversational, visual, voice-first insights

2️⃣ HIGH LEVEL DESIGN (HLD)
2.1 Core Architecture Overview
┌─────────────┐
│ Mobile/Web  │
│ App (UI)    │
└─────┬───────┘
      │
      ▼
┌────────────────────┐
│ API Gateway        │
│ (Auth, Rate Limit) │
└─────┬──────────────┘
      │
┌─────▼──────────────────────────────────────────┐
│               CORE AI PLATFORM                  │
│                                                  │
│ ┌───────────────┐   ┌────────────────────────┐ │
│ │ Financial     │   │ Conversation & Reason  │ │
│ │ Data Layer    │──▶│ Engine (LLM + Logic)   │ │
│ └───────────────┘   └────────────┬───────────┘ │
│                                   │             │
│ ┌───────────────┐   ┌────────────▼───────────┐ │
│ │ Financial     │   │ Simulation Engine       │ │
│ │ Knowledge     │◀──│ (Projections & What-If)│ │
│ │ Graph         │   └────────────┬───────────┘ │
│ └───────────────┘                │             │
│                                   │             │
│ ┌───────────────┐   ┌────────────▼───────────┐ │
│ │ ML Models     │◀──│ Decision & Explain      │ │
│ │ (Risk, Spend) │   │ Layer                  │ │
│ └───────────────┘   └────────────┬───────────┘ │
│                                   │             │
│ ┌───────────────┐   ┌────────────▼───────────┐ │
│ │ Alert Engine  │◀──│ Personalization Engine │ │
│ └───────────────┘   └────────────────────────┘ │
└──────────────────────────────────────────────────┘

2.2 Major Subsystems (HLD)
Layer	Responsibility
Data Ingestion Layer	Fi MCP, bank APIs, investment APIs
Financial Knowledge Graph	Unified semantic view of money
AI Reasoning Engine	Financial logic + LLM reasoning
Simulation Engine	Long-term projections
ML Intelligence Layer	Risk, anomalies, behavior
Conversation Engine	Chat + voice + emotion
Explainability Layer	Trust & transparency
Privacy & Control Layer	Data ownership
3️⃣ LOW LEVEL DESIGN (LLD)
3.1 Financial Data Layer (LLD)
Data Sources

Bank transactions

Credit cards

Mutual funds / stocks

Loans

Insurance

Goals (user input)

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
Layer	Tech
API	NestJS
AI Services	Python + FastAPI
Graph	Neo4j
Cache	Redis
Streaming	Kafka
Storage	Encrypted S3
Infra	Kubernetes
Observability	Prometheus + OpenTelemetry
