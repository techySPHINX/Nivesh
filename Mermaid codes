1) High-Level System Architecture (End-to-End)
flowchart TB
  U[User (App/Web/Voice)] --> UI[Frontend UI: Chat + Dashboard + Simulations]
  UI --> AUTH[Auth (Firebase Auth)]
  AUTH --> API[API Gateway / Backend]

  API --> MCP[Fi MCP Server: Secure Financial Data]
  MCP --> NORM[Data Normalization + Enrichment]
  NORM --> FS[(Feature Store / Firestore)]

  API --> ORCH[AI Orchestrator]
  ORCH --> LLM[Gemini LLM: Intent + Reasoning + Explanation]
  ORCH --> TOOLS[Tool Router]

  TOOLS --> SIM[Deterministic Finance Engine (Simulations)]
  TOOLS --> CAT[Txn Categorization Model (XGBoost/BERT)]
  TOOLS --> ANOM[Anomaly Models (IsolationForest/Prophet/ChangePoint)]
  TOOLS --> RISK[Risk Profiling Model]
  TOOLS --> REC[Personalization Engine (Ranker/Bandit)]

  SIM --> OUT[Response Builder: Visuals + Next Actions]
  CAT --> OUT
  ANOM --> OUT
  RISK --> OUT
  REC --> OUT
  LLM --> OUT

  OUT --> UI


Interpretation:
LLM is the “brain” for conversation and reasoning, but calculation + alerts + personalization come from dedicated model services.

2) Conversational Query → Intent → Tool Calling (Sequence Diagram)

This is the most important flow.

sequenceDiagram
  participant User
  participant UI as Chat UI
  participant Orchestrator
  participant Gemini as Gemini LLM
  participant Tools as Tool Router
  participant Fin as Finance Engine
  participant FS as Feature Store
  participant Resp as Response Builder

  User->>UI: "Can I afford a ₹50L home loan?"
  UI->>Orchestrator: Send query + user_id
  Orchestrator->>FS: Fetch user context (income, spends, loans, net worth)
  FS-->>Orchestrator: Structured context

  Orchestrator->>Gemini: Prompt(query + context + guardrails)
  Gemini-->>Orchestrator: Intent JSON + missing params + tool plan

  alt Missing details
    Orchestrator->>UI: Ask clarifying question
    User->>UI: tenure/down payment info
    UI->>Orchestrator: User answers
    Orchestrator->>Gemini: Updated context
    Gemini-->>Orchestrator: Final tool plan
  end

  Orchestrator->>Tools: Execute simulation tools
  Tools->>Fin: Loan affordability + cashflow simulation
  Fin-->>Tools: EMI range + impact + risk score
  Tools-->>Orchestrator: Computed results

  Orchestrator->>Gemini: Generate explanation + tradeoffs + steps
  Gemini-->>Orchestrator: Plain-language response

  Orchestrator->>Resp: Build charts + action CTAs
  Resp-->>UI: Response (text + chart + actions)
  UI-->>User: Final answer

3) Data Pipeline Architecture (MCP → Enrichment → Feature Store → Models)

This diagram shows the machine learning data backbone.

flowchart LR
  MCP[Fi MCP Data Source] --> ING[Ingestion Service]
  ING --> CLEAN[Cleaning + De-duplication]
  CLEAN --> ENR[Enrichment Layer]
  ENR -->|Merchant normalize| MERCH[Merchant Resolver]
  ENR -->|Category tag| CATMOD[Txn Categorization Model]
  ENR -->|Recurring detection| SUBS[Recurring/Subscriptions Detector]

  MERCH --> FS[(Feature Store)]
  CATMOD --> FS
  SUBS --> FS
  CLEAN --> FS

  FS --> ANOM[Anomaly Engine]
  FS --> SIM[Simulation Engine]
  FS --> REC[Personalization Engine]
  FS --> RISK[Risk Profiling Model]

4) Transaction Categorization Model (Hybrid: Rules + ML)

This is how you keep accuracy high in real-world fintech.

flowchart TB
  TXN[Raw Transaction Record] --> PRE[Preprocessing]
  PRE --> RULES{Rule-based match?}
  RULES -->|Yes| OUT1[Category + Merchant (High confidence)]
  RULES -->|No| EMB[Text Embeddings: Merchant/UPI text]
  EMB --> ML[XGBoost/BERT Classifier]
  ML --> OUT2[Predicted Category + Confidence Score]
  OUT1 --> FINAL[Final Category Output]
  OUT2 --> FINAL
  FINAL --> FS[(Feature Store)]

5) Anomaly Detection Architecture (Rules + ML + Forecast)

This is how Nivesh generates actionable alerts.

flowchart TB
  FS[(Feature Store)] --> FEAT[Feature Extraction]
  FEAT --> RULES[Hard Rules: thresholds (critical)]
  FEAT --> ISO[Isolation Forest: anomalies]
  FEAT --> FORE[Forecast Model: Prophet/ARIMA baseline]
  FEAT --> CPD[Change Point Detection]

  RULES --> SCORE[Alert Scoring & Severity]
  ISO --> SCORE
  FORE --> SCORE
  CPD --> SCORE

  SCORE --> DEC{Is action needed?}
  DEC -->|No| LOG[Log only]
  DEC -->|Yes| ALERT[Generate Alert + Recommendation]
  ALERT --> GEM[Gemini: Natural language explanation]
  GEM --> UI[Push/Inbox Alert in App]

6) Simulation & Projection Engine (Deterministic + Monte Carlo)

This ensures trust and removes hallucination risk.

flowchart TB
  Q[User Question: goal/loan/retirement] --> PARSE[Gemini -> structured parameters]
  PARSE --> DATA[Fetch financial context from FS]
  DATA --> DET[Deterministic Engine: cashflow/EMI/goal math]
  DET --> MC[Monte Carlo Simulation: return uncertainty]
  MC --> OUT[Outcomes: P50/P75/P90 + risk bands]
  OUT --> VIS[Charts Builder]
  VIS --> EXP[Gemini Explanation Layer: assumptions + tradeoffs]
  EXP --> UI[Final Output]

7) Investment Strategy Advisor (Allocation + Rebalancing)

This is strategy-focused, compliant, and scalable.

flowchart TB
  FS[(User Portfolio + Goals)] --> RISK[Risk Profiling Model]
  FS --> CURR[Current Allocation Analyzer]
  RISK --> OPT[Portfolio Optimizer: Risk parity/constraints]
  CURR --> GAP[Gap Detection: drift vs target]
  OPT --> REBAL[Rebalancing Plan]
  GAP --> REBAL
  REBAL --> EXP[Gemini: Explain why + risks + alternatives]
  EXP --> UI[Recommendations + Action buttons]

8) Personalization / “Next Best Action” Engine

This is the retention engine.

flowchart TB
  FS[(User Events + History)] --> CONTEXT[Context Builder]
  CONTEXT --> RANK[Learning-to-Rank Model (LightGBM/XGB Ranker)]
  CONTEXT --> BANDIT[Contextual Bandit (Thompson/LinUCB)]
  RANK --> MIX[Recommendation Mixer]
  BANDIT --> MIX
  MIX --> NBA[Next Best Actions: simulations, goals, tips]
  NBA --> UI[Home feed + prompts + nudges]
