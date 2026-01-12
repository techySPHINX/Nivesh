# Nivesh — Your AI Financial Strategist

> **AI-Native Financial Reasoning Platform** - Democratizing intelligent financial planning through explainable AI

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tech Stack](https://img.shields.io/badge/stack-open%20source-green.svg)](docs/TECH_STACK.md)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](docs/CONTRIBUTING.md)
[![Documentation](https://img.shields.io/badge/docs-complete-brightgreen.svg)](docs/)

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

### High-Level Design

```
┌─────────────────────────────────────────────────┐
│              NIVESH PLATFORM                     │
│                                                  │
│  ┌────────────┐       ┌───────────────────┐    │
│  │ Mobile/Web │  ───▶ │  API Gateway      │    │
│  │    UI      │       │  (Auth, Routing)  │    │
│  └────────────┘       └─────────┬─────────┘    │
│                                  │              │
│       ┌──────────────────────────┼────────┐    │
│       │                          │        │    │
│   ┌───▼──────┐     ┌────────────▼───┐ ┌──▼──┐ │
│   │ NestJS   │────▶│  AI Reasoning  │ │ Neo4j│ │
│   │ Backend  │     │  Engine        │ │Graph │ │
│   └────┬─────┘     │  (FastAPI)     │ └──────┘ │
│        │           └────────┬───────┘          │
│        │                    │                   │
│   ┌────▼─────┐    ┌────────▼────────┐         │
│   │PostgreSQL│    │ Kafka Event Bus │         │
│   │  +Redis  │    │  +  MongoDB     │         │
│   └──────────┘    └─────────────────┘         │
└─────────────────────────────────────────────────┘
```

### Key Architectural Principles

1. **Polyglot Persistence** - Right database for each data type
2. **Event-Driven** - Kafka-based real-time processing
3. **Microservices** - Independent, scalable services
4. **Graph Reasoning** - Neo4j for financial relationships
5. **Hybrid AI** - LLM + Deterministic Logic

---

## 🛠️ Tech Stack

| Layer              | Technology                               |
| ------------------ | ---------------------------------------- |
| **Frontend**       | React Native, Next.js, Recharts          |
| **Backend**        | NestJS (TypeScript), FastAPI (Python)    |
| **Databases**      | PostgreSQL, Neo4j, MongoDB, Redis        |
| **AI/ML**          | Gemini Pro, DistilBERT, XGBoost, Prophet |
| **Infrastructure** | Docker, Kubernetes, Kafka, MinIO         |
| **Auth**           | Keycloak                                 |
| **Observability**  | Prometheus, Grafana, OpenTelemetry       |

> **All open-source technologies** - See [TECH_STACK.md](TECH_STACK.md) for details

---

## 📁 Project Structure

```
nivesh-platform/
├── apps/
│   ├── backend-nest/      # NestJS core backend
│   ├── ai-engine/         # FastAPI AI services
│   ├── frontend/          # React Native/Next.js
│   └── api-gateway/       # Kong gateway (optional)
│
├── libs/
│   ├── proto/             # Event schemas (Kafka/Avro)
│   ├── compliance/        # RBI, GDPR rules
│   └── prompts/           # LLM prompt registry
│
├── infra/
│   ├── docker/            # Docker configurations
│   ├── kubernetes/        # K8s manifests
│   └── terraform/         # Infrastructure as Code
│
├── docs/
│   ├── TECH_STACK.md      # Technology stack details
│   ├── DATABASE_STRATEGY.md
│   ├── CONTAINERIZATION.md
│   └── ...
│
└── docker-compose.yml     # Local development setup
```

> See [STRUCTURE.md](STRUCTURE.md) for complete project organization

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**/**yarn**
- **Python** 3.11+
- **Docker** & **Docker Compose**
- **PostgreSQL** 15+
- **Neo4j** 5+

### Quick Start (Local Development)

```bash
# Clone the repository
git clone https://github.com/your-org/nivesh-platform.git
cd nivesh-platform

# Start all services with Docker Compose
docker-compose up -d

# Access the services
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# AI Engine: http://localhost:8000
# Neo4j Browser: http://localhost:7474
```

### Manual Setup

```bash
# Install backend dependencies
cd apps/backend-nest
npm install
npm run start:dev

# Install AI engine dependencies
cd apps/ai-engine
pip install -r requirements.txt
uvicorn main:app --reload

# Install frontend dependencies
cd apps/frontend
npm install
npm run dev
```

### Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# Database
POSTGRES_URI=postgresql://user:pass@localhost:5432/nivesh
NEO4J_URI=bolt://localhost:7687
MONGODB_URI=mongodb://localhost:27017/nivesh

# AI Services
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# Kafka
KAFKA_BROKERS=localhost:9092

# Auth
KEYCLOAK_URL=http://localhost:8080
```

---

## 📖 Documentation

Comprehensive documentation is available in the [/docs](docs/) directory:

| Document                                                      | Description                                       |
| ------------------------------------------------------------- | ------------------------------------------------- |
| **[PRD.md](PRD.md)**                                          | Product Requirements Document - Vision & Strategy |
| **[REQUIREMENTS.md](REQUIREMENTS.md)**                        | Lean Canvas - Business Model                      |
| **[TECH_STACK.md](docs/TECH_STACK.md)**                       | Complete technology stack and AI models           |
| **[STRUCTURE.md](docs/STRUCTURE.md)**                         | Monorepo structure and module organization        |
| **[DATABASE_STRATERGY.md](docs/DATABASE_STRATERGY.md)**       | Polyglot persistence architecture                 |
| **[CYPHER_EVENT.md](docs/CYPHER_EVENT.md)**                   | Neo4j graph schema and event system               |
| **[ER_DIAGRAM.md](docs/ER_DIAGRAM.md)**                       | Entity-relationship diagrams                      |
| **[CONTAINERIZATION.md](docs/CONTAINERIZATION.md)**           | Docker and container strategy                     |
| **[KUBERNETES.md](docs/KUBERNETES.md)**                       | K8s deployment guide                              |
| **[LLM_GUIDE.md](docs/LLM_GUIDE.md)**                         | LLM prompts and reasoning patterns                |
| **[GUARDRAILS_SAFEGUARDS.md](docs/GUARDRAILS_SAFEGUARDS.md)** | AI safety and compliance                          |
| **[DECISION_TRACE.md](docs/DECISION_TRACE.md)**               | Explainability and audit trails                   |
| **[PROMPT_ROLLBACK.md](docs/PROMPT_ROLLBACK.md)**             | AI model versioning system                        |

**All documentation is PRD-aligned and production-ready.**

---

## 🗺️ Roadmap

### Phase 1: MVP (8-10 weeks) — Q1 2026 ✅

**Focus:** Core conversations + simulations + explainability

- [x] Core backend infrastructure (NestJS + FastAPI)
- [x] PostgreSQL + Neo4j integration
- [x] Basic AI reasoning engine (Gemini Pro)
- [x] Financial graph schema
- [x] Docker containerization
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

---

## 🔒 Security

Security is paramount for financial applications. Please report vulnerabilities to: **security@nivesh.ai**

We follow:

- **OWASP Top 10** security practices
- **SOC 2** compliance standards
- **Regular security audits**
- **Dependency scanning** with Snyk
- **Secrets management** with HashiCorp Vault

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Open Source Community** for amazing tools
- **Neo4j** for graph database technology
- **Google** for Gemini Pro API
- **Apache Foundation** for Kafka
- **CNCF** for cloud-native technologies

---

## 📞 Contact & Support

- **Website:** [https://nivesh.ai](https://nivesh.ai)
- **Email:** support@nivesh.ai
- **Twitter:** [@NiveshAI](https://twitter.com/niveshAI)
- **Discord:** [Join our community](https://discord.gg/nivesh)
- **Slack:** [Nivesh Developers](https://nivesh-dev.slack.com)

---

<div align="center">
  
**Built with ❤️ for financial inclusion**

_Empowering every Indian with AI-powered financial intelligence_

[⭐ Star us on GitHub](https://github.com/your-org/nivesh-platform) | [🐛 Report Bug](https://github.com/your-org/nivesh-platform/issues) | [💡 Request Feature](https://github.com/your-org/nivesh-platform/issues)

</div>
