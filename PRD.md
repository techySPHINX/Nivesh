# PRD — Project Nivesh (AI Financial Strategist)

## 1. Product Overview

### Product Name

**Nivesh** – Your AI Financial Strategist

### One-liner

Nivesh turns your real financial data into decisions—through natural language conversations, simulations, and explainable recommendations.

### Vision

Build the world's most trusted AI financial strategist that understands the user's financial life, simulates the future, and guides them with transparent, explainable, goal-linked decisions, not generic budgeting tips.

### Mission

Enable users to confidently answer:

- "Can I afford this?"
- "What should I do next?"
- "What happens if I choose option A vs B?"
- "Am I on track for my life goals?"

### Positioning

**From dashboards to decision-making.**

Nivesh is not a tracker, not a broker, not a generic budget app—Nivesh is financial reasoning + strategic planning on real user data.

---

## 2. Problem Statement

### User Problem

Most people have:

- Income records
- Transactions
- Investments
- Loans/credit cards

But they don't have **financial clarity** because:

- Data is scattered across accounts/apps
- Existing apps focus on graphs and budgets, not decisions
- Financial planning requires expertise (or expensive advisors)
- Users are anxious and fear making irreversible mistakes (loan, investment, overspending, delayed planning)

### Business Problem

Financial apps suffer from:

- Low retention (users check balances and churn)
- Low differentiation (everyone offers "tracking + analytics")
- Limited engagement loops (no reason to return daily/weekly)

---

## 3. Goals and Success Criteria

### Product Goals

- Make finance feel conversational and simple
- Provide goal-oriented decisions (not just insights)
- Build trust through explainability + privacy
- Increase engagement via simulations, alerts, and "next best action"

### Success Metrics (North Star + Core KPIs)

#### North Star Metric

**# of "Financial Decisions Completed" per user per month**

_(A decision = user asks question → receives simulation + explanation → completes action like saving, adjusting SIP, setting goal, loan plan, etc.)_

#### Core KPIs

- WAU / MAU and stickiness
- D7 / D30 retention
- Simulation usage rate (% users running at least 1 simulation per week)
- Goal setup completion rate
- Alert action rate (alerts that lead to meaningful user action)
- Premium conversion rate
- Trust score (user feedback on "helpful", "accurate", "transparent")

---

## 4. Target Users & Personas

### Persona A — "The First Salary Planner" (22–28)

- Wants to start SIPs, reduce unnecessary expenses
- Unsure about investing choices
- Needs clarity, not complexity

### Persona B — "The Milestone Family" (28–40)

- Marriage, home purchase planning
- Balancing savings + lifestyle + EMIs
- Wants scenario clarity (loan vs rent, down payment plans)

### Persona C — "The Portfolio Optimizer" (25–45)

- Already invests in MF/SIPs
- Wants portfolio intelligence + rebalancing suggestions
- Wants explainability and controls

### Persona D — "Globally Mobile / NRI"

- Needs multi-goal planning
- Wants clarity on net worth, long-term targets
- Needs exportability + portability

---

## 5. Key Value Proposition

### Core Promise

> "Your money finally makes sense — decisions, not dashboards."

### Key Differentiators

- Real financial data ingestion via Fi MCP
- AI financial reasoning layer (not just analytics)
- Scenario simulation engine
- Explainability-first output: why, assumptions, alternatives, risks
- Privacy & portability: user-owned insights + export + APIs
- Optional future: Financial Digital Twin

---

## 6. Product Scope (MVP → V1 → V2)

### MVP (8–10 weeks)

**Focus:** Core conversations + simulations + explainable outputs.

**MVP includes:**

- Auth + secure data connection via Fi MCP
- Conversational UI (text-first)
- Net worth dashboard (simple)
- Simulations:
  - Retirement corpus projection
  - Home loan affordability
  - SIP increase effect
- Explainability module: assumptions + "why"
- Export: CSV/PDF report (basic)
- Alerts: basic unusual spend

### V1 (12–16 weeks)

**Focus:** Increase retention and depth via goal engine + investment advisor.

- Goal planning (home, retirement, education)
- Investment strategy advisor + rebalancing suggestions
- Advanced anomaly detection & alerts
- Voice support (English + 1 local language)
- Premium tier

### V2 (6+ months)

**Focus:** Globalization + Digital Twin + Life Events mode.

- Life Events mode (job switch, marriage, kids, relocation)
- Multi-country personalization (tax/inflation/currency context)
- Financial digital twin (behavioral modeling)
- B2B version for banks/neo-banks

---

## 7. User Journeys

### Journey 1: "Can I afford a home loan?"

1. User asks: "Can I afford ₹50L loan?"
2. Nivesh pulls income, existing EMIs, expense baseline
3. Asks 1–2 clarifying questions:
   - tenure? interest estimate?
   - down payment?
4. Displays:
   - EMI range + affordability score
   - impact on savings rate
   - best plan (reduce EMI vs increase down payment)
5. Action buttons:
   - "Add Home Goal"
   - "Optimize plan"
   - "Export report"

### Journey 2: "I want ₹1 Cr by 35"

1. User states goal
2. Nivesh computes required monthly savings + SIP
3. Simulation:
   - conservative / moderate / aggressive scenarios
4. Output:
   - "If you invest ₹X monthly in Y allocation, you're on track"
5. Next step:
   - schedule monthly review
   - set alerts on overspending

### Journey 3: Anomaly alert → action

1. Alert: "Spending spike detected"
2. Nivesh explains pattern deviation
3. Suggests a corrective plan
4. User sets budget trigger OR savings adjustment

---

## 8. Product Requirements (Detailed)

### 8.1 Core Modules

#### A) Data Ingestion & Context Layer

**Inputs:**

- Transactions (income/expense categories)
- Net worth components (cash, investments, liabilities)
- Investments: MF, stocks (if available via MCP)
- Loans: amount, EMI, tenure, interest (if available)
- Optional: user manual inputs

**Requirements:**

- Data refresh: scheduled + on-demand
- Data normalization:
  - categorize spend
  - detect recurring subscriptions
  - detect salary/income cycles
- Privacy: no raw data exposure in logs

#### B) Conversational Finance Interface

**Features:**

- Chat UI with quick prompts:
  - "Am I overspending?"
  - "How to reach ₹X by Y year?"
  - "Can I afford this EMI?"
- Follow-up questioning for missing parameters
- Answer structure:
  - Direct answer
  - Explanation + assumptions
  - Visual chart
  - Recommendations
  - Next actions

**Constraints:**

- Must avoid hallucination
- Must clearly label assumptions
- Must provide confidence score / certainty flag

#### C) Simulation & Projection Engine

**Simulations required:**

- Net worth projection
- Retirement corpus
- Loan affordability (EMI impact)
- Goal-based SIP plan

**Calculation requirements:**

- adjustable inflation, salary growth, return rates
- scenario presets:
  - Conservative / Moderate / Aggressive
- show sensitivity:
  - "If returns are 2% lower, outcome becomes…"
- interactive chart output

#### D) Investment Strategy Advisor (V1)

**Outputs:**

- current allocation analysis
- rebalancing advice
- SIP suggestions per goal
- risk profile alignment

**Constraints:**

- Not "stock tips"
- Investment advice must be framed as education + strategy, not guaranteed returns
- Must include risk disclaimer and explain reasoning

#### E) Alerts & Anomaly Detection

**MVP Alerts:**

- abnormal spend spike
- sudden income drop
- EMI increases
- goal off-track warning

**Alert style:**

- actionable
- quantified impact
- recommended fix

#### F) Privacy, Trust & Control Layer

**Non-negotiables:**

- Consent-driven data usage
- Export everything (reports / spreadsheets)
- Delete account = delete data
- Data encryption at rest and in transit
- "Why am I seeing this?" for each insight

#### G) Voice-first Interaction (V1+)

- speech-to-text + TTS
- local language support (minimum Hindi for India rollout; later multi-language)
- summaries in voice: "Today's financial health in 20 seconds"

---

## 9. UX Requirements

### Design Principles

- Clarity > Complexity
- Decisions > Dashboards
- Explainability > Flashy AI
- Trust by design (privacy and assumptions always visible)

### Core Screens

- **Home:** Financial health snapshot + goal progress
- **Chat:** Ask anything + suggestion chips
- **Simulations:** scenario sliders + chart
- **Goals:** track milestones
- **Alerts:** "what changed + what to do now"
- **Export center:** reports and data

---

## 10. Technical Architecture (High Level)

### Stack Overview

- **Fi MCP server:** secure structured financial data ingestion
- **Gemini Pro:** reasoning + response generation
- **Vertex AI (optional):** anomaly detection models, evaluation pipelines
- **Firestore:** user profile, conversation memory, goal settings
- **Firebase Auth:** authentication and identity
- **Charts:** Charts API / in-app charting library

### System Components

- **Data Service:** MCP ingestion, normalization, caching
- **Reasoning Service:**
  - prompt templates
  - tool calling for calculations
  - response formatting
- **Simulation Service:**
  - deterministic calculations (not LLM-based)
- **Alert Engine:**
  - rule-based in MVP + ML later
- **UI Layer:** chat + graphs + actions

---

## 11. Safety, Compliance, and Trust

### AI Safety Guardrails

Responses must not claim certainty without evidence

**Must avoid:**

- guaranteed return claims
- "buy/sell this stock" explicit advice

**Always show:**

- assumptions
- risk
- alternatives

### Compliance Considerations (India + Global)

- Maintain disclosure: "informational only"
- For global expansion: modular compliance layer

---

## 12. Experimentation Plan

### MVP Experiments

- Ask-first vs dashboard-first onboarding
- "Show assumptions" default ON vs optional
- Push alerts frequency optimization
- Simulation UI: slider-based vs preset scenarios

**Success = measurable lift in:**

- D7 retention
- simulations per WAU (On average, how many scenario simulations your Weekly Active Users run in a week.)
- trust score

---

## 13. Monetization Strategy

### Free Tier

- limited simulations/month
- basic financial chat
- limited exports

### Premium Tier

- unlimited simulations
- deep goal planning
- advanced investment insights
- monthly financial summary report
- multi-goal optimization
- voice + multi-language support

### B2B

- "AI Money Coach SDK" for banks/fintech

---

## 14. Rollout Plan

### Phase 0: Internal Alpha

- Team + limited testers
- validate calculation correctness and UX

### Phase 1: Closed Beta (500–2000 users)

- early adopters: salary earners, SIP investors
- focus: trust, accuracy, usefulness

### Phase 2: Public Launch

- influencers + fintech partners
- focus: retention loops + premium conversion

---

## 15. Risks & Mitigations

### Risk 1: Incorrect advice undermines trust

**Mitigation:**

- deterministic calculation engine
- assumptions + confidence layer
- restricted output boundaries

### Risk 2: Low retention (users treat it like a one-time tool)

**Mitigation:**

- weekly money check-in
- goal progress nudges
- alerts + monthly report

### Risk 3: Privacy concerns block adoption

**Mitigation:**

- clear privacy UX
- export + delete controls
- transparent data usage panel

---

**Document Version:** 1.0  
**Last Updated:** January 13, 2026
