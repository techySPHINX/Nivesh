# Prompt & Model Versioning System

> **Comprehensive versioning, rollback, and A/B testing for AI prompts and models**

[![Versioning](https://img.shields.io/badge/versioning-semantic-blue.svg)](https://semver.org/)
[![Rollback](https://img.shields.io/badge/rollback-instant-green.svg)](https://rollback.dev/)

## Table of Contents

- [Overview](#overview)
- [Prompt Registry](#prompt-registry)
- [Versioning Strategy](#versioning-strategy)
- [Deployment Flow](#deployment-flow)
- [Rollback Mechanisms](#rollback-mechanisms)
- [Model Registry](#model-registry)
- [A/B Testing](#ab-testing)
- [Decision Fingerprinting](#decision-fingerprinting)
- [Monte Carlo Simulation](#monte-carlo-simulation)

---

## Overview

Nivesh treats **prompts as code** with full versioning, testing, and rollback capabilities. This ensures:

- ✅ **Reproducibility** - Every decision uses a specific prompt version
- ✅ **Safety** - Bad prompts can be instantly rolled back
- ✅ **A/B testing** - Compare prompt versions in production
- ✅ **Audit trail** - RBI can inspect exact prompts used
- ✅ **Gradual rollout** - Test with 5% of users before full deployment

---

## Prompt Registry

### Database Schema

```sql
CREATE TABLE prompt_registry (
    prompt_id VARCHAR(100) PRIMARY KEY,
    prompt_name VARCHAR(255) NOT NULL,
    version VARCHAR(20) NOT NULL,

    -- Content
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT NOT NULL,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(100),
    description TEXT,

    -- Deployment
    status VARCHAR(50) DEFAULT 'draft',  -- draft, testing, production, deprecated
    deployed_at TIMESTAMP,
    rollout_percentage INT DEFAULT 0,

    -- Performance
    avg_confidence FLOAT,
    avg_latency_ms INT,
    refusal_rate FLOAT,
    user_satisfaction_score FLOAT,

    -- Rollback
    parent_version VARCHAR(100),
    rollback_trigger TEXT,

    UNIQUE(prompt_name, version)
);

CREATE INDEX idx_prompt_status ON prompt_registry(status);
CREATE INDEX idx_prompt_name ON prompt_registry(prompt_name);
```

---

## Versioning Strategy

### Semantic Versioning

Follow **SemVer** (major.minor.patch):

```
v1.2.3
 │ │ └─ Patch: Bug fixes, typo corrections (no behavior change)
 │ └─── Minor: New features, backward-compatible improvements
 └───── Major: Breaking changes, complete rewrites
```

### Examples

| Change              | Version Bump    | Example                                  |
| ------------------- | --------------- | ---------------------------------------- |
| Fix typo in prompt  | v1.2.3 → v1.2.4 | "Analyse" → "Analyze"                    |
| Add new instruction | v1.2.3 → v1.3.0 | Add "Explain in simple terms"            |
| Complete rewrite    | v1.2.3 → v2.0.0 | Switch from imperative to conversational |

---

### Prompt Entry Example

```sql
INSERT INTO prompt_registry (
    prompt_id,
    prompt_name,
    version,
    system_prompt,
    user_prompt_template,
    description,
    status
) VALUES (
    'investment_advice_v2_1_0',
    'investment_advice',
    'v2.1.0',
    'You are Nivesh, an AI financial advisor...', -- Full system prompt
    'User Question: {user_query}\nUser Profile: {user_profile}...', -- Template
    'Added emergency fund prioritization logic',
    'testing'
);
```

---

## Deployment Flow

### Stages

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Draft   │ → │ Testing  │ → │ Canary   │ → │Production│
│ (0%)     │   │ (Dev env)│   │ (5%)     │   │ (100%)   │
└──────────┘   └──────────┘   └──────────┘   └──────────┘
```

### 1. Draft

```sql
-- Create new prompt version
INSERT INTO prompt_registry (...) VALUES (...);

-- Status: draft (not used in production)
UPDATE prompt_registry
SET status = 'draft'
WHERE prompt_id = 'investment_advice_v2_1_0';
```

---

### 2. Testing (Dev Environment)

```sql
-- Move to testing
UPDATE prompt_registry
SET status = 'testing',
    deployed_at = NOW()
WHERE prompt_id = 'investment_advice_v2_1_0';
```

**Manual Testing:**

- Red team attacks (try to break it)
- Compare outputs with previous version
- Check confidence scores
- Measure latency

---

### 3. Canary Deployment (5% of users)

```sql
-- Gradual rollout to 5% of users
UPDATE prompt_registry
SET status = 'canary',
    rollout_percentage = 5
WHERE prompt_id = 'investment_advice_v2_1_0';
```

**Monitoring:**

- Track refusal rate (should be < 30%)
- Monitor user satisfaction (thumbs up/down)
- Check hallucination rate (< 1%)
- Compare A/B test metrics

---

### 4. Full Production (100% of users)

```sql
-- If canary succeeds, roll out to all users
UPDATE prompt_registry
SET status = 'production',
    rollout_percentage = 100
WHERE prompt_id = 'investment_advice_v2_1_0';

-- Deprecate old version
UPDATE prompt_registry
SET status = 'deprecated'
WHERE prompt_name = 'investment_advice'
  AND version = 'v2.0.0';
```

---

## Rollback Mechanisms

### Instant Rollback

If the new prompt causes issues, instantly revert:

```sql
-- Rollback to previous version
UPDATE prompt_registry
SET status = 'production',
    rollout_percentage = 100
WHERE prompt_name = 'investment_advice'
  AND version = 'v2.0.0';  -- Previous stable version

-- Mark failed version
UPDATE prompt_registry
SET status = 'deprecated',
    rollback_trigger = 'High refusal rate (45%) detected',
    rollout_percentage = 0
WHERE prompt_id = 'investment_advice_v2_1_0';
```

---

### Automatic Rollback Triggers

```python
def monitor_prompt_performance():
    """
    Continuously monitor prompt metrics and auto-rollback if needed.
    """
    current_prompt = get_active_prompt("investment_advice")

    metrics = {
        "refusal_rate": get_refusal_rate(current_prompt.prompt_id),
        "avg_confidence": get_avg_confidence(current_prompt.prompt_id),
        "hallucination_rate": get_hallucination_rate(current_prompt.prompt_id),
        "user_satisfaction": get_satisfaction_score(current_prompt.prompt_id)
    }

    # Rollback conditions
    if metrics["refusal_rate"] > 0.40:  # > 40% refusals
        rollback(current_prompt, reason="High refusal rate")

    elif metrics["avg_confidence"] < 0.60:  # < 60% confidence
        rollback(current_prompt, reason="Low confidence")

    elif metrics["hallucination_rate"] > 0.05:  # > 5% hallucinations
        rollback(current_prompt, reason="High hallucination rate")

    elif metrics["user_satisfaction"] < 3.0:  # < 3/5 stars
        rollback(current_prompt, reason="Low user satisfaction")
```

---

## Model Registry

Track which LLM model is used for each decision:

```sql
CREATE TABLE model_registry (
    model_id VARCHAR(100) PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,

    -- Provider
    provider VARCHAR(50),  -- google, openai, anthropic
    api_endpoint TEXT,

    -- Parameters
    temperature FLOAT DEFAULT 0.3,
    top_p FLOAT DEFAULT 0.9,
    max_tokens INT DEFAULT 500,

    -- Deployment
    status VARCHAR(50) DEFAULT 'active',
    deployed_at TIMESTAMP,

    -- Performance
    avg_latency_ms INT,
    cost_per_1k_tokens FLOAT,

    UNIQUE(model_name, version)
);
```

### Example Entries

```sql
INSERT INTO model_registry VALUES
('gemini_pro_1_5', 'Gemini Pro', '1.5', 'google', 'https://generativelanguage.googleapis.com/v1/models/gemini-pro', 0.3, 0.9, 500, 'active', NOW(), 850, 0.001),
('gpt4_turbo', 'GPT-4 Turbo', '2024-04-09', 'openai', 'https://api.openai.com/v1/chat/completions', 0.3, 0.9, 500, 'backup', NOW(), 1200, 0.01);
```

---

## A/B Testing

### Setup

```sql
-- Create two prompt versions for A/B test
INSERT INTO prompt_registry (prompt_id, prompt_name, version, ...) VALUES
('investment_advice_v2_0_0', 'investment_advice', 'v2.0.0', ...), -- Control
('investment_advice_v2_1_0', 'investment_advice', 'v2.1.0', ...); -- Treatment

-- Split traffic 50/50
UPDATE prompt_registry SET rollout_percentage = 50 WHERE prompt_id = 'investment_advice_v2_0_0';
UPDATE prompt_registry SET rollout_percentage = 50 WHERE prompt_id = 'investment_advice_v2_1_0';
```

### Routing Logic

```python
def get_prompt_for_user(user_id: str, prompt_name: str) -> Dict:
    """
    Route user to a specific prompt version based on rollout percentage.
    """
    # Get all active versions
    versions = db.query(
        "SELECT * FROM prompt_registry WHERE prompt_name = $1 AND status = 'production' ORDER BY version DESC",
        prompt_name
    )

    # Hash user ID to determine assignment (sticky assignment)
    user_hash = int(hashlib.md5(user_id.encode()).hexdigest(), 16) % 100

    cumulative = 0
    for version in versions:
        cumulative += version['rollout_percentage']
        if user_hash < cumulative:
            return version

    # Fallback to latest version
    return versions[0]
```

### Metrics Comparison

```sql
-- Compare A/B test results
SELECT
    prompt_id,
    version,
    avg_confidence,
    refusal_rate,
    user_satisfaction_score,
    COUNT(*) AS decisions_made
FROM prompt_registry pr
JOIN decision_traces dt ON dt.model_used = pr.prompt_id
WHERE pr.prompt_name = 'investment_advice'
  AND pr.status = 'production'
  AND dt.created_at >= NOW() - INTERVAL '7 days'
GROUP BY prompt_id, version
ORDER BY user_satisfaction_score DESC;
```

**Example Output:**

| prompt_id                | version | avg_confidence | refusal_rate | satisfaction | decisions |
| ------------------------ | ------- | -------------- | ------------ | ------------ | --------- |
| investment_advice_v2_1_0 | v2.1.0  | 0.85           | 0.22         | 4.2          | 1250      |
| investment_advice_v2_0_0 | v2.0.0  | 0.82           | 0.28         | 3.9          | 1200      |

**Winner:** v2.1.0 (higher confidence, lower refusal rate, better satisfaction)

---

## Decision Fingerprinting

Track which prompt version was used for each decision:

```sql
ALTER TABLE decision_traces
ADD COLUMN prompt_version VARCHAR(100),
ADD COLUMN model_version VARCHAR(100);

-- Link decision to prompt version
INSERT INTO decision_traces (..., prompt_version, model_version) VALUES
(..., 'investment_advice_v2_1_0', 'gemini_pro_1_5');
```

**Benefits:**

- Reproduce exact decision by replaying with same prompt version
- Debug issues by filtering by prompt version
- Audit compliance by showing exact prompt used

---

## Monte Carlo Simulation

### Purpose

Before deploying a new prompt, simulate its performance on historical queries to predict impact.

### Implementation

```python
import random
import numpy as np
from typing import List, Dict

def monte_carlo_prompt_test(
    new_prompt: str,
    historical_queries: List[Dict],
    num_simulations: int = 1000
) -> Dict:
    """
    Run Monte Carlo simulation to predict new prompt's performance.

    Args:
        new_prompt: The new prompt version to test
        historical_queries: Past 1000 user queries with known outcomes
        num_simulations: Number of Monte Carlo iterations

    Returns:
        Predicted metrics (confidence, refusal_rate, satisfaction)
    """
    results = {
        "confidence_scores": [],
        "refusals": 0,
        "satisfactions": []
    }

    for _ in range(num_simulations):
        # Sample random historical query
        query = random.choice(historical_queries)

        # Run new prompt on historical query
        response = llm.generate(
            system_prompt=new_prompt,
            user_query=query['text'],
            user_context=query['context']
        )

        # Collect metrics
        results["confidence_scores"].append(response.confidence)
        if response.refused:
            results["refusals"] += 1

        # Simulate user satisfaction (based on response quality)
        satisfaction = evaluate_response_quality(response, query['expected_output'])
        results["satisfactions"].append(satisfaction)

    # Calculate statistics
    return {
        "avg_confidence": np.mean(results["confidence_scores"]),
        "confidence_95th_percentile": np.percentile(results["confidence_scores"], 95),
        "confidence_5th_percentile": np.percentile(results["confidence_scores"], 5),
        "predicted_refusal_rate": results["refusals"] / num_simulations,
        "avg_satisfaction": np.mean(results["satisfactions"]),
        "pass_rate": sum(1 for s in results["satisfactions"] if s >= 4.0) / num_simulations
    }

def evaluate_response_quality(response: str, expected: str) -> float:
    """
    Score response quality (1-5 scale).

    Uses:
    - Semantic similarity to expected output
    - Fact verification
    - Tone analysis
    """
    similarity = semantic_similarity(response, expected)
    facts_correct = verify_facts(response)
    tone_appropriate = check_tone(response)

    # Weighted score
    score = (
        similarity * 0.5 +
        facts_correct * 0.3 +
        tone_appropriate * 0.2
    ) * 5.0

    return score
```

### Example Usage

```python
# Load historical queries
historical_queries = db.query("""
    SELECT user_query AS text, user_context AS context, final_response AS expected_output
    FROM decision_traces
    WHERE detected_intent = 'investment_advice'
      AND confidence >= 0.8
    ORDER BY RANDOM()
    LIMIT 1000
""")

# Test new prompt
new_prompt = """
You are Nivesh, an AI financial advisor...
[NEW INSTRUCTION: Always prioritize emergency fund before investments]
"""

results = monte_carlo_prompt_test(new_prompt, historical_queries, num_simulations=1000)

print(f"""
Monte Carlo Simulation Results (n=1000):
-------------------------------------------
Average Confidence: {results['avg_confidence']:.2%}
Confidence 95th %ile: {results['confidence_95th_percentile']:.2%}
Confidence 5th %ile:  {results['confidence_5th_percentile']:.2%}

Predicted Refusal Rate: {results['predicted_refusal_rate']:.2%}
Average Satisfaction: {results['avg_satisfaction']:.1f}/5.0
Pass Rate (≥4.0): {results['pass_rate']:.2%}

✅ DEPLOY if pass_rate > 80%
❌ REJECT if refusal_rate > 30%
""")
```

**Example Output:**

```
Monte Carlo Simulation Results (n=1000):
-------------------------------------------
Average Confidence: 84.5%
Confidence 95th %ile: 92.0%
Confidence 5th %ile:  71.0%

Predicted Refusal Rate: 23.0%
Average Satisfaction: 4.3/5.0
Pass Rate (≥4.0): 87.0%

✅ DEPLOY - Prompt is ready for canary deployment
```

---

## Best Practices

✅ **Version every prompt change** - Even typo fixes  
✅ **Test in dev before production** - Use Monte Carlo simulation  
✅ **Gradual rollout** - Start with 5% of users  
✅ **Monitor metrics continuously** - Auto-rollback if needed  
✅ **Link decisions to prompt versions** - Full traceability  
✅ **A/B test major changes** - Compare before full rollout  
✅ **Keep deprecated versions** - May need to rollback

---

## Rollback Decision Tree

```
Is the new prompt causing issues?
│
├─ Yes → What type of issue?
│   │
│   ├─ High refusal rate (>40%)
│   │   └─ Instant rollback + investigate prompt logic
│   │
│   ├─ High hallucination rate (>5%)
│   │   └─ Instant rollback + add fact verification
│   │
│   ├─ Low user satisfaction (<3.0/5.0)
│   │   └─ Rollback + A/B test against previous version
│   │
│   └─ Critical bug (wrong numbers)
│       └─ Instant rollback + emergency hotfix
│
└─ No → Continue monitoring
    └─ If metrics improve, roll out to 100%
```

---

## Future Enhancements

1. **Prompt optimization** - Use genetic algorithms to auto-tune prompts
2. **Multi-armed bandit** - Dynamically allocate traffic to best-performing version
3. **Synthetic data generation** - Generate edge cases for testing
4. **Prompt compression** - Reduce token usage while maintaining quality

---

**Last Updated:** January 2026  
**Maintained By:** Nivesh AI Team  
**Related Docs:** [LLM_GUIDE.md](LLM_GUIDE.md), [DECISION_TRACE.md](DECISION_TRACE.md)
