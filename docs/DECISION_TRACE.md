# AI Decision Trace & Explainability

> **Complete audit trail for every AI recommendation**

[![Transparency](https://img.shields.io/badge/transparency-100%25-brightgreen.svg)](https://transparency.google/)
[![RBI Compliant](https://img.shields.io/badge/audit-RBI%20compliant-blue.svg)](https://www.rbi.org.in/)

## Table of Contents

- [Overview](#overview)
- [High-Level Decision Flow](#high-level-decision-flow)
- [Decision Trace ID Structure](#decision-trace-id-structure)
- [Step-by-Step Trace](#step-by-step-trace)
- [Trace Persistence](#trace-persistence)
- [Querying Traces](#querying-traces)
- [Explainability UI](#explainability-ui)
- [Regulatory Compliance](#regulatory-compliance)

---

## Overview

Every AI decision in Nivesh is **fully traceable** from user query to final recommendation. This ensures:

- ✅ **Transparency** - Users understand why AI recommended something
- ✅ **Accountability** - Developers can debug wrong recommendations
- ✅ **Regulatory compliance** - RBI/SEBI can audit AI decisions
- ✅ **Trust** - Users see the reasoning, not just the answer

**Core Principle:**  
*"If the AI can't explain it, it shouldn't recommend it."*

---

## High-Level Decision Flow

```
┌─────────────────────────────────────────────────────┐
│ 1. USER QUERY                                       │
│    "Should I invest ₹10,000/month?"                 │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 2. CONSENT CHECK                                    │
│    ✓ User granted "investment_recommendations"      │
│    ✓ Consent expires: 2027-01-15                    │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 3. INTENT CLASSIFICATION                            │
│    Detected: "investment_advice"                    │
│    Confidence: 0.94                                 │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 4. GRAPH DATA RETRIEVAL                             │
│    Query: MATCH (u:User)-[:HAS_PROFILE]->...        │
│    Retrieved: risk_profile, goals, current_assets   │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 5. DETERMINISTIC LOGIC                              │
│    Applied Rules:                                   │
│    • Rule #47: Age-based allocation                 │
│    • Rule #12: Emergency fund check                 │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 6. LLM GENERATION                                   │
│    Model: Gemini Pro 1.5                            │
│    Prompt: INVESTMENT_ADVICE_PROMPT                 │
│    Temperature: 0.3 (conservative)                  │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 7. SAFETY FILTERS                                   │
│    ✓ Fact verification passed                       │
│    ✓ No toxicity detected                           │
│    ✓ Disclaimer added                               │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 8. RESPONSE TO USER                                 │
│    "Based on your moderate risk profile..."         │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 9. AUDIT LOG (Kafka)                                │
│    Event: ai.decision.made                          │
│    Trace ID: 20260115-103000-abc123                 │
│    Stored: Postgres (7 years retention)             │
└─────────────────────────────────────────────────────┘
```

---

## Decision Trace ID Structure

Every decision gets a unique trace ID:

```
Format: YYYYMMDD-HHMMSS-{random_6_chars}

Example: 20260115-103000-abc123

Components:
- 20260115: Date (January 15, 2026)
- 103000: Time (10:30:00 AM)
- abc123: Random identifier
```

This ID appears in:
- User's chat interface ("Trace ID: 20260115-103000-abc123")
- Audit logs
- Database records
- Support tickets

---

## Step-by-Step Trace

### Step 1: User Query

```json
{
  "trace_id": "20260115-103000-abc123",
  "timestamp": "2026-01-15T10:30:00Z",
  "step": "user_query",
  "data": {
    "user_id": "user_789",
    "query": "Should I invest ₹10,000/month in mutual funds?",
    "channel": "web_chat",
    "session_id": "sess_456"
  }
}
```

---

### Step 2: Consent Verification

```json
{
  "trace_id": "20260115-103000-abc123",
  "timestamp": "2026-01-15T10:30:00.123Z",
  "step": "consent_check",
  "data": {
    "user_id": "user_789",
    "required_scope": "investment_recommendations",
    "consent_granted": true,
    "consent_expiry": "2027-01-15T00:00:00Z",
    "consent_source": "mobile_app_v1.2.3"
  }
}
```

---

### Step 3: Intent Classification

```json
{
  "trace_id": "20260115-103000-abc123",
  "timestamp": "2026-01-15T10:30:00.250Z",
  "step": "intent_classification",
  "data": {
    "model": "distilbert-intent-classifier",
    "detected_intent": "investment_advice",
    "confidence": 0.94,
    "alternative_intents": [
      {"intent": "general_query", "confidence": 0.04},
      {"intent": "goal_planning", "confidence": 0.02}
    ]
  }
}
```

---

### Step 4: Graph Data Retrieval

```json
{
  "trace_id": "20260115-103000-abc123",
  "timestamp": "2026-01-15T10:30:00.450Z",
  "step": "graph_retrieval",
  "data": {
    "database": "neo4j",
    "cypher_query": "MATCH (u:User {id: $user_id})-[:HAS_PROFILE]->(p:RiskProfile) MATCH (u)-[:HAS_GOAL]->(g:Goal) RETURN p.risk_level, g.deadline, g.target_amount",
    "query_execution_time_ms": 45,
    "results": {
      "risk_level": "moderate",
      "goals": [
        {"name": "Retirement", "deadline": "2041-01-01", "target_amount": 20000000},
        {"name": "Emergency Fund", "deadline": "2027-01-01", "target_amount": 500000}
      ],
      "current_investments": {
        "mutual_funds": 150000,
        "fixed_deposits": 200000,
        "stocks": 50000
      },
      "monthly_surplus": 15000
    }
  }
}
```

---

### Step 5: Deterministic Logic

```json
{
  "trace_id": "20260115-103000-abc123",
  "timestamp": "2026-01-15T10:30:00.600Z",
  "step": "rule_engine",
  "data": {
    "rules_applied": [
      {
        "rule_id": "rule_47",
        "rule_name": "age_based_allocation",
        "description": "Equity allocation = 100 - age",
        "inputs": {"user_age": 30},
        "output": {"recommended_equity_percentage": 70}
      },
      {
        "rule_id": "rule_12",
        "rule_name": "emergency_fund_check",
        "description": "Ensure 6 months of expenses in liquid assets",
        "inputs": {"monthly_expenses": 40000, "liquid_assets": 200000},
        "output": {"emergency_fund_adequate": false, "gap": 40000}
      }
    ],
    "deterministic_recommendation": "Allocate ₹5,000/month to emergency fund, ₹5,000/month to equity mutual funds"
  }
}
```

---

### Step 6: LLM Generation

```json
{
  "trace_id": "20260115-103000-abc123",
  "timestamp": "2026-01-15T10:30:01.200Z",
  "step": "llm_generation",
  "data": {
    "model": "gemini-pro-1.5",
    "prompt_template": "INVESTMENT_ADVICE_PROMPT",
    "prompt_variables": {
      "user_age": 30,
      "risk_profile": "moderate",
      "monthly_surplus": 15000,
      "emergency_fund_gap": 40000
    },
    "model_parameters": {
      "temperature": 0.3,
      "top_p": 0.9,
      "max_tokens": 500
    },
    "raw_response": "Based on your financial profile, I recommend allocating ₹10,000/month as follows: ₹5,000 to complete your emergency fund (currently ₹40,000 short of 6-month expenses), and ₹5,000 to equity mutual funds (70% equity allocation suitable for your age)...",
    "tokens_used": 287,
    "api_latency_ms": 850
  }
}
```

---

### Step 7: Post-LLM Safety Checks

```json
{
  "trace_id": "20260115-103000-abc123",
  "timestamp": "2026-01-15T10:30:01.500Z",
  "step": "safety_filters",
  "data": {
    "fact_verification": {
      "status": "passed",
      "facts_checked": [
        {"claim": "₹40,000 short", "verified": true, "source": "graph_retrieval.results.monthly_surplus"},
        {"claim": "6-month expenses", "verified": true, "source": "rule_12.inputs.monthly_expenses"}
      ]
    },
    "toxicity_check": {
      "status": "passed",
      "toxicity_score": 0.02,
      "threshold": 0.7
    },
    "disclaimer_injection": {
      "added": true,
      "disclaimer_type": "investment_advice"
    }
  }
}
```

---

### Step 8: Final Response

```json
{
  "trace_id": "20260115-103000-abc123",
  "timestamp": "2026-01-15T10:30:01.650Z",
  "step": "user_response",
  "data": {
    "response": "Based on your moderate risk profile and 15-year timeline to retirement, I recommend investing ₹10,000/month as follows:\n\n1. **₹5,000 to Emergency Fund** (liquid mutual funds or savings account)\n   - You're currently ₹40,000 short of 6 months' expenses\n   - This should be your priority\n\n2. **₹5,000 to Equity Mutual Funds** (ELSS for tax benefits)\n   - 70% equity allocation is suitable for your age (30)\n   - Consider index funds for diversification\n\n*This is not financial advice. Investments are subject to market risks. Consult a SEBI-registered advisor before investing.*",
    "confidence": 0.87,
    "trace_id_shown_to_user": "20260115-103000-abc123"
  }
}
```

---

### Step 9: Audit Log (Kafka Event)

```json
{
  "event_type": "ai.decision.made",
  "trace_id": "20260115-103000-abc123",
  "timestamp": "2026-01-15T10:30:01.800Z",
  "user_id": "user_789",
  "decision": {
    "type": "investment_recommendation",
    "recommendation": "₹5,000/month emergency fund + ₹5,000/month equity MF",
    "confidence": 0.87
  },
  "data_sources": [
    "neo4j.user_risk_profile",
    "neo4j.user_goals",
    "postgres.user_transactions"
  ],
  "reasoning": {
    "rules_applied": ["rule_47", "rule_12"],
    "model_used": "gemini-pro-1.5",
    "deterministic_logic": true
  },
  "alternatives_considered": [
    {
      "option": "100% equity",
      "rejected_reason": "Emergency fund gap must be addressed first"
    },
    {
      "option": "Fixed deposits",
      "rejected_reason": "Returns too low for long-term goals"
    }
  ],
  "compliance": {
    "consent_verified": true,
    "data_accessed": ["financial_profile", "transaction_history"],
    "disclaimer_added": true
  }
}
```

---

## Trace Persistence

### Database Schema

```sql
CREATE TABLE decision_traces (
    trace_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    
    -- User input
    user_query TEXT NOT NULL,
    detected_intent VARCHAR(100),
    
    -- Data retrieval
    graph_query TEXT,
    graph_results JSONB,
    
    -- Processing
    rules_applied JSONB,
    model_used VARCHAR(100),
    model_parameters JSONB,
    
    -- Output
    final_response TEXT,
    confidence FLOAT,
    
    -- Audit
    consent_verified BOOLEAN,
    data_sources TEXT[],
    safety_checks_passed BOOLEAN,
    
    -- Retention
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 years')
);

CREATE INDEX idx_user_id ON decision_traces(user_id);
CREATE INDEX idx_created_at ON decision_traces(created_at);
CREATE INDEX idx_expires_at ON decision_traces(expires_at);
```

---

## Querying Traces

### User-Facing Queries

**"Show me why you recommended this"**

```sql
SELECT 
    trace_id,
    user_query,
    final_response,
    rules_applied,
    confidence
FROM decision_traces
WHERE user_id = 'user_789'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

**"What data did you use?"**

```sql
SELECT 
    trace_id,
    data_sources,
    graph_query,
    graph_results
FROM decision_traces
WHERE trace_id = '20260115-103000-abc123';
```

---

### Regulator-Facing Queries

**"Show all AI investment recommendations in December 2025"**

```sql
SELECT 
    trace_id,
    user_id,
    user_query,
    final_response,
    confidence,
    rules_applied,
    model_used
FROM decision_traces
WHERE detected_intent = 'investment_advice'
  AND created_at BETWEEN '2025-12-01' AND '2025-12-31'
ORDER BY created_at DESC;
```

**"Find decisions with low confidence (<70%)"**

```sql
SELECT 
    trace_id,
    user_query,
    confidence,
    final_response
FROM decision_traces
WHERE confidence < 0.70
  AND created_at >= NOW() - INTERVAL '30 days'
ORDER BY confidence ASC;
```

---

## Explainability UI

### User Interface

```
┌─────────────────────────────────────────────────────┐
│ Your Recommendation                  [?] Explain     │
├─────────────────────────────────────────────────────┤
│ Based on your moderate risk profile, invest         │
│ ₹10,000/month: ₹5,000 in emergency fund +          │
│ ₹5,000 in equity mutual funds.                     │
│                                                     │
│ [Show me how you calculated this]                   │
└─────────────────────────────────────────────────────┘

(User clicks "Show me how you calculated this")

┌─────────────────────────────────────────────────────┐
│ Decision Breakdown                                  │
├─────────────────────────────────────────────────────┤
│ 📊 Data I Used:                                     │
│   • Your age: 30                                    │
│   • Risk profile: Moderate                          │
│   • Monthly surplus: ₹15,000                        │
│   • Emergency fund gap: ₹40,000                     │
│                                                     │
│ 🧮 Rules Applied:                                   │
│   • Rule #12: Emergency fund = 6 months expenses    │
│   • Rule #47: Equity allocation = 100 - age (70%)   │
│                                                     │
│ 🤖 AI Reasoning:                                    │
│   Confidence: 87%                                   │
│   Alternatives considered: 100% equity (rejected)   │
│                                                     │
│ 🔍 Trace ID: 20260115-103000-abc123                 │
│    (Save this for support inquiries)                │
└─────────────────────────────────────────────────────┘
```

---

## Regulatory Compliance

### RBI/SEBI Requirements

| Requirement | Implementation | Evidence |
|-------------|----------------|----------|
| **Explainability** | Every decision has a trace ID | `decision_traces` table |
| **Data provenance** | All data sources logged | `data_sources` column |
| **Auditability** | 7-year retention | `expires_at` column |
| **User transparency** | "Explain this" button in UI | Explainability UI |
| **Consent tracking** | Consent verified at each step | `consent_verified` column |
| **Model versioning** | Model ID logged | `model_used` column |

### Audit Export

```python
def export_audit_report(start_date: str, end_date: str) -> pd.DataFrame:
    """
    Generate regulator-friendly audit report.
    
    Format: CSV with all decision traces
    """
    query = """
        SELECT 
            trace_id,
            user_id,
            created_at,
            user_query,
            detected_intent,
            rules_applied,
            model_used,
            confidence,
            consent_verified,
            data_sources
        FROM decision_traces
        WHERE created_at BETWEEN %s AND %s
        ORDER BY created_at ASC
    """
    
    df = pd.read_sql(query, conn, params=[start_date, end_date])
    df.to_csv(f"audit_report_{start_date}_{end_date}.csv", index=False)
    
    return df
```

---

## Debugging with Traces

### Developer Workflow

1. **User reports wrong recommendation**
2. **Get trace ID from user** (shown in chat UI)
3. **Query decision_traces table**
4. **Analyze each step:**
   - Was the graph query correct?
   - Did the rules apply correctly?
   - Did the LLM misinterpret something?
5. **Fix bug and add test case**

### Example Debug Query

```sql
-- Find all decisions where rule_47 was applied but confidence was low
SELECT 
    trace_id,
    user_query,
    confidence,
    rules_applied,
    final_response
FROM decision_traces
WHERE rules_applied @> '[{"rule_id": "rule_47"}]'::jsonb
  AND confidence < 0.75
ORDER BY confidence ASC
LIMIT 10;
```

---

## Best Practices

✅ **Always log the trace ID** - Show it to users  
✅ **Explain in user-friendly terms** - Avoid jargon  
✅ **Include alternative options** - Show what was considered  
✅ **Track confidence scores** - Refuse if too low  
✅ **Preserve for 7 years** - RBI requirement  
✅ **Export for audits** - CSV format for regulators  

---

**Last Updated:** January 2026  
**Maintained By:** Nivesh AI Team  
**Related Docs:** [LLM_GUIDE.md](LLM_GUIDE.md), [GUARDRAILS_SAFEGUARDS.md](GUARDRAILS_SAFEGUARDS.md)
