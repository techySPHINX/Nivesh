# Multi-Agent System Quick Reference

## 🚀 Quick Start Guide

### Basic Usage

```typescript
import { OrchestratorAgent } from '@/modules/ai-reasoning/agents/orchestrator.agent';
import { AgentMessage, AgentType } from '@/modules/ai-reasoning/types/agent.types';

// Inject OrchestratorAgent via NestJS DI
constructor(private readonly orchestrator: OrchestratorAgent) {}

// Execute a query
const message: AgentMessage = {
  id: 'msg-1',
  from: AgentType.ORCHESTRATOR,
  to: [AgentType.ORCHESTRATOR],
  type: 'request',
  payload: {
    query: "I want to buy a house worth ₹50L in 5 years",
    context: {
      userId: 'user-123',
      monthlyIncome: 150000,
      currentSavings: 500000,
    },
  },
  timestamp: new Date(),
};

const response = await this.orchestrator.execute(message);
```

---

## 📋 Available Workflows

### 1. Goal Planning
**Intent**: `goal_planning`  
**Use Cases**: House purchase, car purchase, education, wedding  
**Agents**: Planning → Risk → Investment → Simulation → Action  
**Duration**: ~90s  

```typescript
query: "I want to buy a house worth ₹50L in 5 years"
query: "Help me plan for my child's education (₹25L in 10 years)"
query: "Save for a car worth ₹15L in 2 years"
```

### 2. Portfolio Review
**Intent**: `portfolio_review`  
**Use Cases**: Investment checkup, rebalancing, performance review  
**Agents**: Risk + Investment + Graph (parallel)  
**Duration**: ~30s  

```typescript
query: "Review my investment portfolio"
query: "How is my portfolio performing?"
query: "Should I rebalance my investments?"
```

### 3. Risk Assessment
**Intent**: `risk_assessment`  
**Use Cases**: Financial health check, risk analysis  
**Agents**: Risk → Graph → Action  
**Duration**: ~55s  

```typescript
query: "How risky is my financial situation?"
query: "Am I financially secure?"
query: "What are my financial risks?"
```

### 4. Budget Analysis
**Intent**: `budget_analysis`  
**Use Cases**: Spending review, budget creation, expense tracking  
**Agents**: Graph → Monitoring → Action  
**Duration**: ~55s  

```typescript
query: "Analyze my spending patterns"
query: "Create a budget for me"
query: "Where am I overspending?"
```

### 5. Loan Affordability
**Intent**: `loan_affordability`  
**Use Cases**: Home loan, car loan, personal loan  
**Agents**: Simulation → Risk → Action  
**Duration**: ~60s  

```typescript
query: "Can I afford a ₹40L home loan?"
query: "Check EMI affordability for ₹15L car loan"
query: "What's the maximum loan I can take?"
```

### 6. Comprehensive Analysis
**Intent**: `comprehensive_analysis`  
**Use Cases**: Complete financial checkup  
**Agents**: All 7 agents (sequential)  
**Duration**: ~150s  

```typescript
query: "Complete financial health check"
query: "Analyze my overall financial situation"
```

---

## 🎯 Direct Agent Access

### Execute Specific Agent

```typescript
import { FinancialPlanningAgent } from '@/modules/ai-reasoning/agents/financial-planning.agent';

const message: AgentMessage = {
  id: 'msg-1',
  from: AgentType.ORCHESTRATOR,
  to: [AgentType.FINANCIAL_PLANNING],
  type: 'request',
  payload: {
    task: 'create_savings_plan',
    context: {
      traceId: 'trace-123',
      goal: {
        name: 'House Purchase',
        targetAmount: 5000000,
        targetDate: new Date('2029-12-31'),
      },
      userProfile: {
        monthlyIncome: 150000,
        currentSavings: 500000,
        existingDebt: 20000,
      },
    },
  },
  timestamp: new Date(),
};

const response = await planningAgent.execute(message);
```

---

## 🛠️ Agent Tasks Reference

### FinancialPlanningAgent
```typescript
Tasks:
- 'create_savings_plan'   → Goal decomposition, savings calculation
- 'optimize_timeline'     → Timeline optimization
- 'check_feasibility'     → Feasibility check (<50% income)

Context Required:
- goal: { name, targetAmount, targetDate }
- userProfile: { monthlyIncome, currentSavings, existingDebt }
```

### RiskAssessmentAgent
```typescript
Tasks:
- 'assess_overall_risk'   → 6 risk metrics, classification
- 'calculate_metrics'     → Individual metric calculation
- 'generate_mitigations'  → Mitigation strategies

Context Required:
- userProfile: { monthlyIncome, expenses[], debts[], investments[] }
- transactions: Transaction[]
```

### InvestmentAdvisorAgent
```typescript
Tasks:
- 'recommend_allocation'  → Asset allocation strategy
- 'suggest_products'      → Investment product recommendations
- 'project_returns'       → Return projections
- 'rebalance_portfolio'   → Rebalancing actions
- 'calculate_tax_savings' → Tax optimization

Context Required:
- riskProfile: 'conservative' | 'moderate' | 'aggressive'
- investmentGoal: number
- timeline: number (years)
- currentPortfolio?: { asset, allocation, amount }[]
```

### SimulationAgent
```typescript
Tasks:
- 'run_monte_carlo'           → 10K iterations, percentiles
- 'check_loan_affordability'  → EMI + stress testing
- 'assess_goal_probability'   → Goal success probability
- 'run_retirement_simulation' → Retirement corpus

Context Required:
- amount: number
- timeline: number
- returns?: number (default: 12%)
- volatility?: number (default: 8%)
```

### FinancialGraphAgent
```typescript
Tasks:
- 'analyze_spending_patterns'  → Category-wise analysis
- 'analyze_merchant_loyalty'   → Loyalty scoring
- 'detect_spending_anomalies'  → Anomaly detection
- 'analyze_goal_impact'        → Goal-transaction mapping

Context Required:
- userId: string
- timeRange?: { start: Date, end: Date }
```

### ActionExecutionAgent
```typescript
Tasks:
- 'create_budget'      → Category budgets with limits
- 'setup_sip'          → Automated SIP setup
- 'generate_actions'   → Comprehensive action plan
- 'create_reminders'   → Financial reminders

Context Required:
- spendingPatterns?: any[]
- monthlyIncome?: number
- products?: any[]
- financial_planning_result?: any
- risk_assessment_result?: any
- investment_advisor_result?: any
```

### MonitoringAgent
```typescript
Tasks:
- 'track_goals'              → Goal progress tracking
- 'monitor_budgets'          → Budget consumption monitoring
- 'detect_anomalies'         → Spending anomaly detection
- 'generate_monthly_report'  → Comprehensive monthly report
- 'check_alerts'             → All alerts aggregation

Context Required:
- goals?: Goal[]
- budgets?: Budget[]
- recentTransactions?: Transaction[]
```

---

## 📊 Response Format

```typescript
interface AgentResponse {
  success: boolean;
  result: any;                    // Agent-specific result
  reasoning: string[];            // Step-by-step reasoning
  confidence: number;             // 0.0 - 1.0
  toolsUsed: string[];           // Tools called
  nextActions: string[];         // Recommendations
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### Example Response

```typescript
{
  success: true,
  result: {
    synthesis: {
      summary: "Based on analysis, you need to save ₹65K/month...",
      keyInsights: [
        "Monthly savings: ₹65K (43% of income)",
        "Success probability: 78%",
        "Risk level: MEDIUM"
      ],
      recommendations: [
        "Start SIPs immediately",
        "Build emergency fund to 6 months",
        "Review quarterly"
      ],
      confidence: 0.85,
      sources: [AgentType.FINANCIAL_PLANNING, AgentType.RISK_ASSESSMENT, ...]
    },
    intent: {
      intent: 'goal_planning',
      confidence: 0.95
    },
    agentResults: [ /* 5 detailed agent responses */ ]
  },
  reasoning: [
    "Intent: goal_planning",
    "Agents used: 5",
    "Confidence: 0.85"
  ],
  confidence: 0.85,
  toolsUsed: [
    "FINANCIAL_PLANNING",
    "RISK_ASSESSMENT",
    "INVESTMENT_ADVISOR",
    "SIMULATION",
    "ACTION_EXECUTION"
  ],
  nextActions: [
    "Start SIPs immediately to leverage compounding",
    "Build emergency fund to 6 months (₹9L)",
    "Review portfolio quarterly for rebalancing"
  ]
}
```

---

## 🔍 Tracing & Debugging

### Get Execution Trace

```typescript
import { DecisionTraceService } from '@/modules/ai-reasoning/services/decision-trace.service';

const trace = await decisionTraceService.getTrace('trace-uuid');

// Returns:
{
  traceId: 'trace-uuid',
  executions: [
    {
      agentType: 'FINANCIAL_PLANNING',
      inputPayload: { ... },
      outputPayload: { ... },
      reasoning: [ ... ],
      toolsUsed: [ ... ],
      confidence: 0.88,
      durationMs: 5432,
      success: true,
      createdAt: '2025-01-26T10:30:00Z'
    },
    // ... more executions
  ]
}
```

### Get Agent Metrics

```typescript
const metrics = await decisionTraceService.getAgentMetrics('FINANCIAL_PLANNING');

// Returns:
{
  agentType: 'FINANCIAL_PLANNING',
  totalExecutions: 1250,
  successfulExecutions: 1180,
  avgConfidence: 0.87,
  avgDurationMs: 5200,
  positiveFeedbackCount: 450,
  negativeFeedbackCount: 30,
  lastUpdated: '2025-01-26T12:00:00Z'
}
```

---

## ⚙️ Configuration

### Timeouts (per agent)

```typescript
FinancialPlanning:   15s
RiskAssessment:      20s
InvestmentAdvisor:   15s
Simulation:          30s (Monte Carlo intensive)
FinancialGraph:      25s (Neo4j queries)
Monitoring:          20s
ActionExecution:     10s
Orchestrator:        60s
```

### Retry Configuration

```typescript
maxRetries: 2
retryDelay: exponential backoff
  - Attempt 1: 1s delay
  - Attempt 2: 2s delay
  - Attempt 3: 4s delay
```

### Tool Execution

```typescript
timeout: 30s (default)
validation: AJV schema validation
errorHandling: Graceful degradation
```

---

## 🚨 Error Handling

### Custom Error Types

```typescript
AgentExecutionError      → Agent execution failed
ToolExecutionError       → Tool call failed
ToolNotFoundError        → Tool not registered
ToolTimeoutError         → Tool exceeded timeout
ToolValidationError      → Invalid tool arguments
```

### Error Response

```typescript
{
  success: false,
  result: null,
  reasoning: [
    "Error occurred during execution",
    "Context preserved for debugging"
  ],
  confidence: 0,
  toolsUsed: [],
  nextActions: [
    "Retry with adjusted parameters",
    "Contact support if issue persists"
  ],
  error: {
    code: 'AGENT_EXECUTION_ERROR',
    message: 'Failed to calculate savings plan',
    details: {
      agentType: 'FINANCIAL_PLANNING',
      originalError: 'Invalid goal amount'
    }
  }
}
```

---

## 📈 Performance Optimization

### Parallel Execution

```typescript
// Use for independent analyses
const workflow = executionPlanBuilder.getWorkflow('portfolio_review');
// mode: 'parallel' → Risk + Investment + Graph run concurrently
```

### Context Enrichment

```typescript
// Sequential mode automatically enriches context
Step 1: Planning → context.financial_planning_result = { ... }
Step 2: Risk    → uses context.financial_planning_result
Step 3: Investment → uses both Planning + Risk results
```

### Caching (Future Enhancement)

```typescript
// Not yet implemented
// Plan: Cache similar queries for 5 minutes
```

---

## 🔐 Security Considerations

### Input Validation

```typescript
// AJV schema validation on all tool calls
// Type safety through TypeScript
// Sanitize user inputs before agent execution
```

### Rate Limiting (Future)

```typescript
// Implement rate limiting per user
// Prevent abuse of expensive operations (Monte Carlo)
```

### Data Privacy

```typescript
// Ensure user context doesn't leak between sessions
// Clear sensitive data from traces after 30 days
```

---

## 🧪 Testing

### Unit Test Example

```typescript
describe('FinancialPlanningAgent', () => {
  it('should create feasible savings plan', async () => {
    const message = createTestMessage({
      task: 'create_savings_plan',
      context: {
        goal: { targetAmount: 5000000, targetDate: in5Years },
        userProfile: { monthlyIncome: 150000 }
      }
    });
    
    const response = await agent.execute(message);
    
    expect(response.success).toBe(true);
    expect(response.result.feasible).toBe(true);
    expect(response.result.monthlySavingsRequired).toBeLessThan(75000);
    expect(response.confidence).toBeGreaterThan(0.8);
  });
});
```

### Integration Test Example

```typescript
describe('Goal Planning Workflow', () => {
  it('should orchestrate all agents successfully', async () => {
    const message = createOrchestratorMessage({
      query: "Buy house ₹50L in 5 years"
    });
    
    const response = await orchestrator.execute(message);
    
    expect(response.success).toBe(true);
    expect(response.toolsUsed).toContain('FINANCIAL_PLANNING');
    expect(response.toolsUsed).toContain('RISK_ASSESSMENT');
    expect(response.result.synthesis).toBeDefined();
  });
});
```

---

## 📚 Additional Resources

- [MULTI_AGENT_IMPLEMENTATION_COMPLETE.md](./MULTI_AGENT_IMPLEMENTATION_COMPLETE.md) - Complete implementation details
- [Agent Type Definitions](./backend/src/modules/ai-reasoning/types/agent.types.ts) - All interfaces
- [Workflow Templates](./backend/src/modules/ai-reasoning/services/execution-plan-builder.service.ts) - Predefined workflows

---

## 🆘 Common Issues

### Issue: Agent timeout
**Solution**: Increase timeout in ExecutionStep or optimize tool implementation

### Issue: Circular dependency in plan
**Solution**: Use `validatePlan()` before execution, fix dependencies

### Issue: Tool not found
**Solution**: Ensure tool is registered in ToolRegistry before calling

### Issue: Low confidence score
**Solution**: Review agent reasoning, ensure sufficient context provided

---

**Last Updated**: January 26, 2025  
**Version**: 1.0.0 (Phase 1 & 2 Complete)  
**Status**: Production Ready (Tool implementation pending)
