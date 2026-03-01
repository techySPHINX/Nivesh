# Project Structure

> Nivesh — AI Financial Strategist monorepo layout

```
nivesh/
├── backend/                       # NestJS API server (TypeScript)
│   ├── prisma/                    # Prisma ORM schema & migrations
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   ├── src/
│   │   ├── app.module.ts          # Root module
│   │   ├── main.ts                # Entry point
│   │   ├── health.controller.ts   # Health check endpoint
│   │   ├── core/                  # Core services (config, guards, filters)
│   │   ├── modules/               # Feature modules (auth, users, transactions, etc.)
│   │   └── test/                  # Unit tests
│   ├── test/                      # E2E tests
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── Makefile
│   ├── LLM_INTEGRATION_GUIDE.md   # LLM setup & integration reference
│   └── FINANCIAL_DATA_API_REFERENCE.md
│
├── frontend/                      # Next.js web application (TypeScript)
│   ├── app/                       # Next.js App Router pages
│   │   ├── (auth)/                # Auth routes (login, register)
│   │   ├── dashboard/             # Dashboard pages
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/                # React components
│   │   ├── chat/                  # Chat UI components
│   │   ├── dashboard/             # Dashboard widgets
│   │   ├── layouts/               # Layout wrappers
│   │   └── ui/                    # Shared UI primitives
│   ├── contexts/                  # React contexts (AuthContext)
│   ├── lib/                       # Utilities (API client, Firebase, WebSocket)
│   ├── types/                     # TypeScript type definitions
│   ├── middleware.ts              # Next.js middleware (auth guards)
│   └── package.json
│
├── ml-services/                   # Python ML/AI microservices
│   ├── model_server/              # FastAPI model serving (app.py, health.py)
│   ├── intent_classifier/         # User intent classification model
│   ├── credit_risk_scorer/        # Credit risk scoring model
│   ├── spending_predictor/        # Spending prediction model
│   ├── anomaly_detector/          # Financial anomaly detection
│   ├── financial_ner/             # Financial named entity recognition
│   ├── gemini_advisor/            # Gemini-based financial advisor
│   ├── drift_detection/           # Model drift monitoring
│   ├── feature_store/             # Feature engineering & storage
│   ├── data_validation/           # Input data validation schemas
│   ├── shared/                    # Shared utilities (config, logging, metrics, security)
│   ├── airflow/                   # Airflow DAGs for ML pipelines
│   ├── data/                      # Training data (intents, transactions, NER)
│   ├── scripts/                   # Training scripts (train_all.py)
│   ├── test/                      # ML service tests
│   ├── docs/                      # ML-specific documentation
│   ├── monitoring/                # Prometheus config for ML metrics
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── requirements.txt
│   └── README.md
│
├── docs/                          # Project documentation
│   ├── Architecture.md            # System architecture overview
│   ├── BACKEND_ARCHITECTURE.md    # Backend design details
│   ├── DATABASE_STRATERGY.md      # Polyglot persistence design
│   ├── ER_DIAGRAM.md              # Entity relationship diagrams
│   ├── CONTAINERIZATION.md        # Docker setup guide
│   ├── KUBERNETES.md              # K8s deployment (planned)
│   ├── TECH_STACK.md              # Technology choices & rationale
│   ├── LLM_GUIDE.md              # LLM integration patterns
│   ├── RAG_ARCHITECTURE.md        # RAG pipeline design
│   ├── RAG_API_REFERENCE.md       # RAG API endpoints
│   ├── RAG_TROUBLESHOOTING.md     # RAG debugging guide
│   ├── GUARDRAILS_SAFEGUARDS.md   # AI safety & compliance
│   ├── CYPHER_EVENT.md            # Neo4j Cypher queries
│   ├── DECISION_TRACE.md          # Decision logging
│   ├── PROMPT_ROLLBACK.md         # Prompt versioning
│   └── adr/                       # Architecture Decision Records
│
├── monitoring/                    # Observability stack configs
│   ├── prometheus.yml
│   ├── alerts/                    # Alert rules (drift, performance)
│   └── grafana/                   # Grafana dashboards & datasources
│
├── docker-compose.yml             # Root orchestration (all services)
├── Makefile                       # Project-wide commands
├── README.md                      # Project overview & getting started
├── SETUP.md                       # Detailed setup instructions
├── TODO.md                        # Development roadmap & task tracking
├── PRD.md                         # Product Requirements Document
├── CONTRIBUTING.md                # Contribution guidelines
├── LICENSE                        # Proprietary license
└── LICENSE_NOTICE.md              # License notice for dependencies
```

## Key Directories

| Directory | Language | Purpose |
|-----------|----------|---------|
| `backend/` | TypeScript | NestJS REST API, WebSocket, Prisma ORM |
| `frontend/` | TypeScript | Next.js web app with chat & dashboard UI |
| `ml-services/` | Python | ML models, model server, data pipelines |
| `docs/` | Markdown | Architecture docs, ADRs, guides |
| `monitoring/` | YAML | Prometheus alerts, Grafana dashboards |
