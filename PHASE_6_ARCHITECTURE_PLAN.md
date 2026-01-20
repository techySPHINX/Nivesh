# Phase 6: Production-Ready Core Services Architecture

## Executive Summary

**Decision Date**: January 20, 2026  
**Architect**: Principal Backend Engineer  
**Status**: Planning → Implementation

### Strategic Assessment

After comprehensive debugging and code review, we have:

- ✅ **Clean Core Infrastructure** (5 databases, Kafka, Security, Observability)
- ✅ **Financial Data Module** (100% functional, production-ready)
- ✅ **User Module** (Complete CQRS implementation)
- ⚠️ **Goal Management Module** (Schema/entity mismatch - requires refactor)
- ❌ **Budget Management Module** (Domain only, incomplete)
- ❌ **AI Reasoning Engine** (Not started - **CRITICAL GAP**)

### Critical Path Analysis

Based on PRD North Star Metric: **"# of Financial Decisions Completed per user per month"**

The AI Reasoning Engine is the **MOST CRITICAL** missing component. Without it:

- Users cannot ask "Can I afford this?"
- No simulations or future projections
- No explainable recommendations
- **The core value proposition is missing**

## Phase 6 Strategic Decisions

### 🎯 Primary Objective

**Build the AI Financial Reasoning Engine** - The heart of Nivesh's value proposition

### 📋 Phase 6 Scope

#### Priority 1: AI Reasoning Engine (HIGH PRIORITY)

- **LLM Integration Layer** with Gemini Pro
- **Prompt Engineering Framework** for financial queries
- **Context Builder** (user data → structured prompts)
- **Decision Simulator** (What-if scenarios)
- **Explanation Generator** (Transparent reasoning)

#### Priority 2: Fix Goal Management Module (MEDIUM PRIORITY)

- Align Prisma schema with domain entities
- Complete application/infrastructure layers
- Enable module in production

#### Priority 3: Complete Budget Management (MEDIUM PRIORITY)

- Application layer (commands/queries/handlers)
- Infrastructure layer (repository implementation)
- Presentation layer (REST API)

#### Priority 4: Production Hardening (HIGH PRIORITY)

- Rate limiting middleware
- Idempotency keys for financial operations
- Request/Response logging
- Error monitoring integration

## Architectural Decisions

### ADR-006: AI Reasoning Engine Architecture

**Status**: Accepted  
**Date**: 2026-01-20

#### Context

Need to implement the core AI reasoning capability that differentiates Nivesh from traditional financial apps.

#### Decision

Implement a **Layered AI Architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│     Presentation Layer (REST API)       │
│  - Natural language queries             │
│  - What-if simulations                  │
│  - Recommendations API                  │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│     Application Layer (Use Cases)       │
│  - ProcessQueryCommand                  │
│  - SimulateScenarioCommand              │
│  - GenerateRecommendationsQuery         │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│      Domain Layer (Business Logic)      │
│  - FinancialContext (aggregate)         │
│  - DecisionEngine (service)             │
│  - SimulationEngine (service)           │
│  - ExplanationBuilder (service)         │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│    Infrastructure Layer (AI Services)   │
│  - GeminiProService (LLM client)        │
│  - PromptTemplateEngine                 │
│  - ContextSerializer                    │
│  - ResponseParser                       │
└─────────────────────────────────────────┘
```

#### Consequences

**Positive**:

- Clear separation between AI infrastructure and business logic
- Testable without calling external APIs
- Easy to swap LLM providers
- Prompt versioning and A/B testing support

**Negative**:

- Additional abstraction layers
- Initial complexity in prompt engineering

#### Implementation Strategy

1. Start with simple query-response
2. Add context building from financial data
3. Implement simulation capabilities
4. Add explainability layer
5. Integrate with Neo4j for knowledge graph reasoning

### ADR-007: Prompt Engineering Strategy

**Status**: Accepted  
**Date**: 2026-01-20

#### Decision

Use **Structured Prompt Templates** with version control:

```typescript
// Prompt structure
interface FinancialPrompt {
  systemContext: string;
  userContext: {
    demographics: UserProfile;
    financialState: FinancialSnapshot;
    goals: Goal[];
    constraints: Constraint[];
  };
  query: string;
  outputFormat: StructuredOutputSchema;
}
```

#### Prompt Repository Structure

```
prompts/
├── system-prompts/
│   ├── base-financial-advisor.v1.txt
│   ├── risk-assessment.v1.txt
│   └── goal-planning.v1.txt
├── templates/
│   ├── affordability-check.template
│   ├── goal-projection.template
│   └── budget-analysis.template
└── validators/
    ├── response-schema.ts
    └── safety-checks.ts
```

### ADR-008: Data Privacy & AI Safety

**Status**: Accepted  
**Date**: 2026-01-20

#### Decision

Implement **Privacy-First AI** approach:

1. **Data Minimization**
   - Only send aggregated financial data to LLM
   - Never send PII (names, emails, phone numbers)
   - Use anonymized identifiers

2. **Local Processing First**
   - Calculate basic metrics locally
   - Only use AI for complex reasoning
   - Cache common queries

3. **Audit Trail**
   - Log all AI interactions (anonymized)
   - Track decision paths
   - Enable explainability queries

4. **Safety Guardrails**
   - Validate AI responses before returning
   - Detect and reject unsafe recommendations
   - Human-in-the-loop for high-stakes decisions

## Implementation Roadmap

### Week 1: AI Foundation

- [ ] Set up AI reasoning module structure
- [ ] Implement GeminiProService with retry logic
- [ ] Create prompt template engine
- [ ] Build context serializer for financial data
- [ ] Add response parser and validator

### Week 2: Core AI Capabilities

- [ ] Implement simple Q&A (affordability checks)
- [ ] Add financial snapshot builder
- [ ] Create decision engine with business rules
- [ ] Implement basic simulation engine
- [ ] Add explanation generator

### Week 3: Advanced Features

- [ ] What-if scenario simulations
- [ ] Goal projection calculations
- [ ] Budget optimization recommendations
- [ ] Investment suggestions (basic)
- [ ] Risk assessment

### Week 4: Production Hardening

- [ ] Fix Goal Management schema issues
- [ ] Complete Budget Management module
- [ ] Add rate limiting middleware
- [ ] Implement idempotency keys
- [ ] Add comprehensive logging
- [ ] Integration testing suite

## Success Metrics

### Technical Metrics

- AI response time < 2 seconds (p95)
- AI accuracy rate > 85% (validated against rule-based engine)
- Prompt token efficiency (< 3000 tokens per query)
- Zero PII leakage to external services
- 99.9% uptime for reasoning engine

### Business Metrics

- Users complete 1+ financial decision per week
- 70%+ users find AI explanations helpful
- 50%+ users run what-if simulations
- 30%+ users act on AI recommendations

## Risk Assessment

### High Risk

- **LLM Hallucinations**: Mitigation → Validate outputs, use structured prompts
- **Cost Overruns**: Mitigation → Implement caching, rate limiting, token optimization
- **Data Privacy**: Mitigation → Strict anonymization, audit trails

### Medium Risk

- **Schema Mismatches**: Mitigation → Comprehensive testing, gradual rollout
- **Performance**: Mitigation → Async processing, caching layer

### Low Risk

- **Technology Changes**: Mitigation → Abstraction layers make provider swaps easy

## Resource Requirements

### Infrastructure

- Gemini Pro API access (already configured)
- Redis for prompt/response caching
- MongoDB for AI interaction logs
- Neo4j for knowledge graph reasoning

### Team

- 1 Backend Engineer (full-time)
- 1 ML/Prompt Engineer (consulting, 10 hrs/week)
- 1 Financial Domain Expert (consulting, 5 hrs/week)

### Timeline

- **Phase 6 Duration**: 4 weeks
- **Target Completion**: Mid-February 2026
- **MVP Launch**: End of February 2026

## Next Steps

1. **Immediate (Today)**:
   - Create ai-reasoning module structure
   - Set up prompt repository
   - Implement basic GeminiPro integration

2. **This Week**:
   - Build financial context serializer
   - Create first prompt templates
   - Implement simple affordability checker

3. **Next Week**:
   - Add simulation capabilities
   - Build explanation layer
   - Fix Goal Management issues

## Approval & Sign-off

**Technical Review**: Required  
**Security Review**: Required (before production)  
**Financial Domain Review**: Required  
**Product Team Alignment**: Required

---

**Prepared by**: Principal Backend Engineer  
**Review Status**: Pending  
**Next Review Date**: 2026-01-27
