# LLM Integration Guide

> **Comprehensive guide to LLM prompts, graph reasoning, and compliance for Nivesh - Your AI Financial Strategist**

[![Gemini](https://img.shields.io/badge/LLM-Gemini%20Pro-4285F4.svg)](https://ai.google.dev/)
[![DistilBERT](https://img.shields.io/badge/NER-DistilBERT-orange.svg)](https://huggingface.co/distilbert-base-uncased)
[![PRD](https://img.shields.io/badge/docs-PRD-orange.svg)](../PRD.md)

## Table of Contents

- [Overview](#overview)
- [Product Context](#product-context)
- [System Prompt](#system-prompt)
- [Prompt Templates](#prompt-templates)
- [Graph Reasoning Patterns](#graph-reasoning-patterns)
- [Compliance Event Schemas](#compliance-event-schemas)
- [Emotional Safety](#emotional-safety)
- [Guardrails & Filters](#guardrails--filters)

---

## Overview

Nivesh uses a **hybrid AI architecture** combining:

1. **LLM (Gemini Pro 1.5)** - Natural language understanding and generation
2. **Graph reasoning (Neo4j)** - Financial relationship analysis
3. **Deterministic logic** - Rule-based safety checks
4. **Retrieval-augmented generation (RAG)** - Context from user's financial graph

### Conversational Query Flow (Mermaid Diagram 2)

```
User Query → Chat UI → Orchestrator
                            ↓
                    Fetch Context (Feature Store)
                            ↓
                    Gemini LLM (Intent + Tool Plan)
                            ↓
                ┌───────────┴──────────┐
                ↓                      ↓
        Missing Params?          Tool Execution
                ↓                      ↓
        Ask Clarifying Q      Finance Engine
                ↓              (EMI, Cashflow)
                ↓                      ↓
        User Answers → Gemini Explanation
                                       ↓
                            Response Builder
                            (Charts + Actions)
                                       ↓
                                   UI Output
```

### Architecture Guarantees

- ✅ **Factual accuracy** - Grounded in user's actual data from Neo4j graph
- ✅ **Explainability** - Every recommendation traceable with decision ID
- ✅ **Compliance** - RBI/SEBI/GDPR rules enforced in pre/post-LLM filters
- ✅ **Safety** - Multi-layer guardrails prevent harmful content

---

## Product Context

**Nivesh's Core Promise (from PRD):** _"Your money finally makes sense — decisions, not dashboards."_

**LLM's Role:**

- Convert user questions into Neo4j graph queries
- Generate natural language explanations for simulations
- Detect user intent (affordability, retirement, investment, etc.)
- Provide emotional intelligence (detect anxiety, offer reassurance)
- Create actionable next steps from complex financial data

**Constraints:**

- Must avoid hallucinations (all facts from user's graph)
- Must include assumptions in every response
- Must refuse illegal/unethical requests
- Must escalate mental health concerns

---

## System Prompt

### Global Non-Negotiable Rules

```python
SYSTEM_PROMPT = """
You are Nivesh, an AI financial advisor helping Indians manage personal finances.

RULES (NON-NEGOTIABLE):
1. You ONLY answer questions about the user's financial data from their graph
2. You NEVER give advice if consent is not granted
3. You NEVER make up numbers - only use retrieved data
4. You ALWAYS explain HOW you arrived at an answer
5. You REFUSE illegal/unethical requests (tax evasion, insider trading, etc.)
6. You are NOT a therapist - escalate mental health concerns

CAPABILITIES:
- Analyze spending patterns from the user's expense graph
- Predict future cash flow using Prophet model
- Recommend budget optimizations based on goals
- Detect anomalies and financial risks
- Explain decisions using the decision trace

LIMITATIONS:
- Cannot execute trades (you only advise)
- Cannot access external accounts without integration
- Cannot predict stock prices (you assess risk)
- Cannot provide tax/legal advice (refer to professionals)

TONE:
- Empathetic but professional
- Simple language (avoid financial jargon)
- Provide actionable next steps

COMPLIANCE:
- Check user consent before querying sensitive data
- Log every decision to the audit trail
- Refuse if data is insufficient or consent missing
"""
```

---

## Prompt Templates

### 1. Intent → Graph Reasoning

**Purpose:** Convert user question to Neo4j Cypher query

```python
INTENT_TO_GRAPH_PROMPT = """
User Question: {user_query}
User Context: {user_id}

Convert this question into a Neo4j Cypher query to retrieve relevant financial data.

Available Node Types:
- User (id, name, age, risk_profile)
- Income (amount, source, frequency)
- Expense (amount, category, date)
- Investment (amount, asset_type, risk_level)
- Goal (target_amount, deadline, priority)
- LifeEvent (type, impact_score, date)

Available Relationships:
- (User)-[:EARNS]->(Income)
- (User)-[:SPENDS_ON]->(Expense)
- (User)-[:INVESTS_IN]->(Investment)
- (User)-[:HAS_GOAL]->(Goal)
- (Expense)-[:IMPACTS]->(Goal)
- (LifeEvent)-[:AFFECTS]->(User)

Example:
User: "How much did I spend on groceries last month?"
Query:
MATCH (u:User {id: $user_id})-[:SPENDS_ON]->(e:Expense {category: 'Groceries'})
WHERE e.date >= date() - duration('P1M')
RETURN sum(e.amount) AS total

Now generate the query for: {user_query}
"""
```

**Example Usage:**

| User Question                               | Generated Cypher                                                                                                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "What's my highest expense category?"       | `MATCH (u:User {id: $user_id})-[:SPENDS_ON]->(e:Expense) RETURN e.category, sum(e.amount) AS total ORDER BY total DESC LIMIT 1`                                  |
| "Am I on track for my emergency fund goal?" | `MATCH (u:User)-[:HAS_GOAL]->(g:Goal {name: 'Emergency Fund'}) RETURN g.target_amount, g.current_amount, (g.current_amount / g.target_amount * 100) AS progress` |

---

### 2. Graph Traversal → Natural Language

**Purpose:** Explain graph query results in simple language

```python
GRAPH_TO_NL_PROMPT = """
User Question: {user_query}
Graph Data Retrieved:
{graph_results}

Explain these results to the user in simple, actionable language.

Guidelines:
- Highlight key insights
- Compare to benchmarks if available
- Suggest next steps
- Use currency format (₹1,234.56)
- Be empathetic if results are concerning

Example:
Graph Data: {"category": "Groceries", "total": 12500}
Response: "You spent ₹12,500 on groceries last month. This is 15% above the average for your income bracket. Consider meal planning to reduce waste."

Now explain: {graph_results}
"""
```

---

### 3. Explain My Decision

**Purpose:** Generate audit-friendly explanation for recommendations

```python
EXPLAIN_DECISION_PROMPT = """
Recommendation: {recommendation}
Data Used:
- User Profile: {user_profile}
- Graph Data: {graph_data}
- Model Outputs: {model_predictions}
- Rules Applied: {rules}

Generate a transparent explanation suitable for:
1. The user (simple language)
2. Regulators (technical details)

Format:
## For User
[Simple explanation with bullet points]

## For Audit
- Data sources: [list tables/nodes queried]
- Logic: [step-by-step reasoning]
- Confidence: [model confidence scores]
- Alternatives considered: [other options]
"""
```

**Example Output:**

```markdown
## For User

We recommend investing ₹5,000/month in a diversified mutual fund because:

- Your risk profile is "moderate"
- You have 15 years until retirement
- This allocation historically returns 10-12% annually

## For Audit

- Data sources: User.risk_profile, Goal.deadline, Investment.asset_type
- Logic: Rule #47 (age-based allocation) + Prophet cash flow forecast
- Confidence: 87% (based on 10-year backtest)
- Alternatives: Fixed deposits (rejected: lower returns), direct stocks (rejected: too risky)
```

---

### 4. Emotional Safety Prompt

**Purpose:** Detect and respond to emotional distress

```python
EMOTIONAL_SAFETY_PROMPT = """
User Message: {user_query}

Check if the user expresses:
1. Financial distress (bankruptcy, overwhelming debt)
2. Mental health concerns (depression, anxiety about money)
3. Harmful intent (gambling to "fix" problems)

If detected, respond with:
- Empathy and validation
- Refusal to give financial advice in crisis
- Resources (helplines, debt counseling)

Example:
User: "I'm drowning in debt and don't see a way out"
Response: "I can see you're going through a really tough time financially. While I can help with budgeting, it sounds like you might benefit from speaking with a debt counselor. Here are some free resources: [National Debt Helpline]."
"""
```

---

## Graph Reasoning Patterns

### Standard Patterns

#### Pattern 1: Monthly Expense Breakdown

```cypher
// User: "Show me where my money goes each month"
MATCH (u:User {id: $user_id})-[:SPENDS_ON]->(e:Expense)
WHERE e.date >= date() - duration('P1M')
WITH e.category, sum(e.amount) AS total
ORDER BY total DESC
RETURN e.category, total, (total / sum(total) * 100) AS percentage
```

#### Pattern 2: Goal Impact Analysis

```cypher
// User: "Will buying a car delay my house goal?"
MATCH (u:User {id: $user_id})-[:HAS_GOAL]->(g:Goal {name: 'Buy House'})
WITH g.target_amount AS house_target, g.current_amount AS house_current
MATCH (u)-[:PLANS_TO_BUY]->(car:Purchase {type: 'Car'})
WITH house_target, house_current, car.cost AS car_cost
RETURN
  house_target - house_current AS gap_before,
  house_target - (house_current - car_cost) AS gap_after,
  (gap_after - gap_before) AS delay_impact
```

#### Pattern 3: Income Stability Check

```cypher
// User: "How stable is my income?"
MATCH (u:User {id: $user_id})-[:EARNS]->(i:Income)
WHERE i.date >= date() - duration('P6M')
WITH i.amount AS income
RETURN
  avg(income) AS avg_income,
  stdev(income) AS volatility,
  CASE
    WHEN stdev(income) / avg(income) < 0.1 THEN 'Stable'
    WHEN stdev(income) / avg(income) < 0.3 THEN 'Moderate'
    ELSE 'Volatile'
  END AS stability
```

#### Pattern 4: Life Event Impact

```cypher
// User: "How will getting married affect my finances?"
MATCH (u:User {id: $user_id})-[:EXPERIENCED]->(le:LifeEvent {type: 'Marriage'})
MATCH (le)-[:AFFECTS]->(impact:FinancialImpact)
RETURN impact.category, impact.estimated_change
```

---

## Compliance Event Schemas

### RBI-Compliant Event Logging

Every AI decision must emit a Kafka event for audit.

#### Event: `ai.decision.made`

```json
{
  "event_type": "ai.decision.made",
  "timestamp": "2026-01-15T10:30:00Z",
  "trace_id": "20260115-103000-abc123",
  "user_id": "user_123",
  "decision": {
    "type": "investment_recommendation",
    "recommendation": "Invest ₹5000/month in ELSS mutual fund",
    "confidence": 0.87
  },
  "data_sources": [
    "User.risk_profile",
    "Goal.retirement_fund",
    "Investment.current_portfolio"
  ],
  "reasoning": {
    "rules_applied": ["rule_47_age_based_allocation"],
    "model_outputs": {
      "prophet_forecast": "12% annual growth",
      "risk_model": "moderate_risk"
    }
  },
  "alternatives": [
    {
      "option": "Fixed Deposit",
      "rejected_reason": "Returns too low (6% vs 12%)"
    }
  ],
  "user_consent": {
    "granted": true,
    "scope": ["financial_data", "ai_recommendations"],
    "expiry": "2027-01-15T00:00:00Z"
  }
}
```

#### Event: `ai.refusal.logged`

```json
{
  "event_type": "ai.refusal.logged",
  "timestamp": "2026-01-15T10:35:00Z",
  "trace_id": "20260115-103500-def456",
  "user_id": "user_456",
  "user_query": "Help me hide income from taxes",
  "refusal_reason": "illegal_request",
  "guardrail_triggered": "pre_llm_filter_illegal_activity",
  "action_taken": "query_blocked"
}
```

#### Event: `consent.changed`

```json
{
  "event_type": "consent.changed",
  "timestamp": "2026-01-15T11:00:00Z",
  "user_id": "user_789",
  "consent_action": "granted",
  "scope": ["spending_analysis", "goal_tracking"],
  "revoked_scope": ["investment_recommendations"],
  "effective_date": "2026-01-15T11:00:00Z",
  "expiry_date": "2027-01-15T11:00:00Z"
}
```

### GDPR Data Deletion Event

```json
{
  "event_type": "data.deletion.requested",
  "timestamp": "2026-01-15T12:00:00Z",
  "user_id": "user_999",
  "deletion_scope": "all_user_data",
  "reason": "user_request",
  "status": "in_progress",
  "estimated_completion": "2026-01-16T12:00:00Z",
  "systems_affected": [
    "postgres.users",
    "neo4j.user_graph",
    "mongodb.conversations",
    "minio.documents"
  ]
}
```

---

## Emotional Safety

### Detection Keywords

```python
DISTRESS_KEYWORDS = [
    "can't afford",
    "drowning in debt",
    "suicidal",
    "hopeless",
    "bankruptcy",
    "losing everything",
    "gambling to recover",
    "payday loans"
]
```

### Safe Response Template

```python
DISTRESS_RESPONSE = """
{name}, I can see you're going through a really challenging time financially,
and I want you to know that you're not alone in feeling this way.

While I can help with budgeting and financial planning, it sounds like you
might benefit from speaking with a professional who specializes in debt
counseling or financial crisis support.

Here are some resources that might help:
- National Debt Helpline: 1800-XXX-XXXX (Free, confidential advice)
- Money Matters India: www.moneymatters.in
- If you're feeling overwhelmed emotionally: NIMHANS Helpline 080-XXXX-XXXX

Would you like me to help you create a basic plan to prioritize your most
urgent expenses? We can take this one step at a time.
"""
```

---

## Guardrails & Filters

### Pre-LLM Filters

Before sending to Gemini, check:

```python
def pre_llm_filter(user_query: str) -> bool:
    """Return False if query should be blocked."""

    # Block illegal requests
    if any(kw in user_query.lower() for kw in ["tax evasion", "insider trading", "money laundering"]):
        return False

    # Block requests without consent
    if not user.has_consent("ai_recommendations"):
        return False

    # Block requests outside scope
    if "medical advice" in user_query.lower():
        return False

    return True
```

### Post-LLM Filters

After Gemini responds, check:

```python
def post_llm_filter(llm_response: str) -> str:
    """Filter or modify LLM output before showing user."""

    # Check for hallucinations
    if not verify_facts_in_graph(llm_response):
        return "I couldn't verify all the information. Let me double-check your data."

    # Check for harmful advice
    if "invest all your money" in llm_response.lower():
        return "That recommendation seems too risky. Let me recalculate with safer parameters."

    # Add disclaimers
    if "invest" in llm_response.lower():
        llm_response += "\n\n*This is not financial advice. Consult a SEBI-registered advisor before investing.*"

    return llm_response
```

---

## Example End-to-End Flow

**User Query:** "Should I invest in stocks right now?"

### Step 1: Intent Classification

```python
intent = classify_intent(query)
# Result: "investment_advice"
```

### Step 2: Consent Check

```python
if not user.has_consent("investment_recommendations"):
    return "I need your permission to analyze your investment profile. Would you like to grant consent?"
```

### Step 3: Graph Retrieval

```cypher
MATCH (u:User {id: $user_id})-[:HAS_PROFILE]->(p:RiskProfile)
MATCH (u)-[:HAS_GOAL]->(g:Goal)
MATCH (u)-[:INVESTS_IN]->(i:Investment)
RETURN p.risk_level, g.deadline, sum(i.amount) AS current_investment
```

### Step 4: Model Prediction

```python
risk_score = risk_model.predict(user_data)
# Result: 0.65 (moderate risk)
```

### Step 5: LLM Generation

```python
recommendation = gemini.generate(
    prompt=INVESTMENT_ADVICE_PROMPT,
    context={
        "risk_level": "moderate",
        "timeline": "15 years",
        "current_portfolio": "₹50,000"
    }
)
```

### Step 6: Post-Processing

```python
final_response = post_llm_filter(recommendation)
final_response += "\n\n*Disclaimer: This is not financial advice...*"
```

### Step 7: Audit Logging

```python
kafka.produce("ai.decision.made", {
    "trace_id": "20260115-103000-abc123",
    "recommendation": final_response,
    "confidence": 0.87
})
```

### Step 8: User Response

```
Based on your moderate risk profile and 15-year timeline, a diversified
mutual fund portfolio would be suitable. Consider starting with ₹5,000/month
in ELSS funds for tax benefits.

*This is not financial advice. Consult a SEBI-registered advisor before investing.*
```

---

## Best Practices

✅ **Always ground responses in user's graph data**  
✅ **Log every decision to Kafka for audit**  
✅ **Add disclaimers for investment/tax advice**  
✅ **Detect and escalate emotional distress**  
✅ **Refuse illegal/unethical requests**  
✅ **Explain reasoning transparently**

---

**Last Updated:** January 2026  
**Maintained By:** Nivesh AI Team  
**Related Docs:** [GUARDRAILS_SAFEGUARDS.md](GUARDRAILS_SAFEGUARDS.md), [DECISION_TRACE.md](DECISION_TRACE.md)
