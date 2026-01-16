# Project Nivesh — Technical Requirements Document

  

---

  

## 1. Purpose

  

This document defines the **technical requirements and processing workflow** for the Nivesh platform.  

It specifies how user requests are handled, how financial data is ingested and processed, and how backend services, data pipelines, and simulation engines interact to generate deterministic financial insights.

  

> **Note:** Gemini LLM reasoning and explanation layer is defined separately in a dedicated document.

  

---

  

## 2. High-Level System Architecture

  

User (Web/App/Voice)

↓

Frontend UI (Chat + Dashboard + Simulations)

↓

Authentication (Firebase Auth)

↓

API Gateway / Backend (FastAPI)

↓

─────────────────────────────────────────────

| Financial Data Pipeline | AI Orchestrator |

─────────────────────────────────────────────

↓ ↓

Feature Store (Firestore) Tool Router

↓ ↓

Simulation + Models + Engines

↓

Response Builder (Visuals + Actions)

↓

Frontend UI → User

  

---

  

## 3. Technology Stack

  

### Frontend

  

| Component  | Technology |

|------------|------------|

| Framework | Next.js (React) |

| Styling | Tailwind CSS |

| Charts | Recharts / Chart.js |

| State Management | React Query / Zustand |

| API Calls | Axios / Fetch API |

| Authentication | Firebase Web SDK |

  

---

  

### Backend

  

| Component | Technology |

|------------|------------|

| Framework | FastAPI (Python) |

| API Gateway | FastAPI Router |

| Authentication | Firebase Admin SDK (JWT validation) |

| Async Tasks | Celery + Redis |

| Validation | Pydantic |

| Logging | Python Logging + OpenTelemetry |

  

---

  

### Data & Storage

  

| Component | Technology |

|------------|------------|

| Feature Store | Firestore |

| Cache | Redis |

| File Storage | Firebase Storage |

| Secrets | GCP Secret Manager |

  

---

  

### Data Processing & ML

  

| Component | Technology |

|------------|------------|

| Data Processing | Pandas, NumPy |

| ML Models | scikit-learn, XGBoost |

| Text Embeddings | Sentence Transformers / MiniLM |

| Anomaly Detection | IsolationForest / Prophet |

  

---

  

### Infrastructure

  

| Component | Technology |

|------------|------------|

| Containerization | Docker |

| CI/CD | GitHub Actions |

| Frontend Hosting | Firebase Hosting |

| Backend Hosting | GCP Cloud Run |

| Monitoring | OpenTelemetry + Grafana |

  

---

  

## 4. Repository Structure

  

nivesh/

│

├── frontend/

├── backend/

│ ├── app/

│ │ ├── api/

│ │ ├── services/

│ │ ├── models/

│ │ ├── pipelines/

│ │ └── main.py

│

├── data_pipeline/

│ ├── ingestion_service.py

│ ├── cleaning.py

│ ├── enrichment.py

│ └── categorization/

│ ├── rule_engine.py

│ ├── embedding.py

│ └── classifier.py

│

├── simulation_engine/

│ ├── retirement.py

│ ├── loan.py

│ ├── sip.py

│ ├── networth.py

│

├── feature_store/

│ └── firestore_client.py

│

├── tests/

├── docs/

│ ├── TECHNICAL_REQUIREMENTS.md

│ ├── ARCHITECTURE.md

│ └── API_CONTRACTS.md

│

├── docker-compose.yml

├── README.md

└── .github/workflows/

---

  

## 5. End-to-End Request Processing Flow

  

### Step 1 — User Request

- User enters query in Chat UI  

- Frontend attaches Firebase JWT  

- Request forwarded to Backend API Gateway  

  

### Step 2 — Authentication

- Backend verifies JWT via Firebase Admin SDK  

- User ID extracted and validated  

  

### Step 3 — Context Fetch

- Backend retrieves structured financial context from Feature Store  

- Context includes income, expenses, loans, assets, transactions  

  

### Step 4 — Orchestration

- Orchestrator receives query + context  

- Builds execution plan  

- Sends plan to Tool Router  

  

### Step 5 — Tool Routing

Tool Router invokes:

- Simulation Engine  

- Transaction Categorization  

- Risk Profiling  

- Anomaly Detection  

- Personalization Engine  

  

### Step 6 — Simulation Execution

Simulation Engine computes:

- EMI & loan affordability  

- SIP planning  

- Retirement projection  

- Net-worth forecasting  

  

### Step 7 — Response Building

Response Builder composes:

- Numerical results  

- Chart datasets  

- Action metadata  

  

### Step 8 — Visualization

Frontend renders:

- Chat response  

- Charts  

- Scenario controls  

- Action buttons  

  

---

  

## 6. Financial Data Pipeline

  

### Data Ingestion

- Source: Fi MCP / Mock JSON  

- Ingestion Service pulls transactions  

- Stored in staging layer  

  

### Cleaning & Deduplication

- Remove duplicates  

- Normalize timestamps  

- Standardize currency  

  

### Enrichment

- Merchant normalization  

- Category tagging  

- Recurring detection  

  

### Transaction Categorization Flow

  

Raw Transaction

→ Preprocessing

→ Rule-based Match?

├── Yes → Category + Merchant (High Confidence)

└── No → Embeddings → ML Classifier → Category + Score

→ Feature Store

  

---

  

## 7. Feature Store Schema

  

### transactions/{user_id}/records

```json

{

  "txn_id": "string",

  "amount": "number",

  "timestamp": "datetime",

  "merchant_raw": "string",

  "merchant_normalized": "string",

  "category": "string",

  "confidence": "number",

  "recurring_flag": "boolean"

}
```

  

### users/{user_id}/summary

  ```json
  
  {

  "monthly_income": "number",

  "monthly_expenses": "number",

  "savings_rate": "number",

  "emi_ratio": "number",

  "net_worth": "number"

}

  ```
 

### simulations/{user_id}/results

  
```json

{

  "retirement_projection": "object",

  "loan_affordability": "object",

  "sip_plan": "object",

  "risk_score": "number"

}
```

## 8. Backend Services

| Service                           |                      Responsibility          |
|-----------------------------------|----------------------------------------------|
| Auth Service                      | JWT validation and user session verification |
| Ingestion Service                 | Pull financial data from Fi MCP server       |
| Cleaning Service                  | Transaction normalization and deduplication  |
| Enrichment Service                | Merchant normalization and category tagging  |
| Categorization Service            | ML-based transaction classification          |
| Feature Store Service             | Firestore read/write operations              |
| Simulation Engine                 | Deterministic financial computations         |
| Risk Engine                       | Financial risk scoring                       |
| Anomaly Engine                    | Spending anomaly detection                   |
| Orchestrator Service              | Execution planning and tool routing          |
| Response Builder                  | Final payload assembly for frontend          |
|-----------------------------------|----------------------------------------------|

---


## 9. API Overview

### POST /chat
```json

{
  "user_id": "string",
  "query": "string"
}
```

### POST /query

```json

{
  "text_response": "string",
  "charts": "object",
  "actions": "array"
}
```

## 10. Security

- JWT-protected APIs  
- Firestore user data isolation  
- No raw financial data logging  
- HTTPS enforced across all services  

---

## 11. Non-Functional Requirements

| Category        | Requirement                     |
|-----------------|---------------------------------|
| Latency         | < 300ms for cached queries      |
| Scalability     | Stateless backend services      |
| Reliability     | Retry on data ingestion failure |
| Privacy         | Strict user data isolation      |
| Maintainability | Modular and testable services   |

---

## 12. Development Milestones

| Phase | Deliverable                                |
|-------|--------------------------------------------|
| 1     | Frontend + Authentication                  |
| 2     | Data Ingestion Pipeline                    |
| 3     | Feature Store + Transaction Categorization |
| 4     | Simulation Engine                          |
| 5     | Orchestrator + Response Builder            |
| 6     | Full Integration + Demo                    |

---

## 13. Deployment Targets

| Component | Platform          |
|-----------|-------------------|
| Frontend  | Firebase Hosting  |
| Backend   | GCP Cloud Run     |
| Database  | Firestore         |
| Cache     | Redis             |
| CI/CD     | GitHub Actions    |

---



