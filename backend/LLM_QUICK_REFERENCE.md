# LLM Integration - Quick Reference Card

## 🚀 Installation & Setup

```bash
# 1. Install dependencies
cd backend && pnpm install

# 2. Add to .env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-1.5-pro
FRONTEND_URL=http://localhost:3000

# 3. Run migration
pnpm prisma generate
pnpm prisma migrate dev --name llm_integration

# 4. Start server
pnpm dev
```

## 📡 API Quick Start

### REST Examples

```bash
# 1. Generate response
curl -X POST http://localhost:3001/api/v1/ai/generate \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How to save for retirement?",
    "userId": "user-123"
  }'

# 2. Create prompt
curl -X POST http://localhost:3001/api/v1/ai/prompts \
  -d '{
    "promptName": "advisor",
    "version": "1.0.0",
    "promptText": "You are a financial advisor...",
    "temperature": 0.3
  }'

# 3. List functions
curl http://localhost:3001/api/v1/ai/functions
```

### WebSocket Example

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001/ai-chat');

socket.emit('query', {
  query: 'Calculate EMI for ₹10 lakh loan',
  userId: 'user-123'
});

socket.on('response_chunk', (data) => {
  console.log(data.text);
});

socket.on('stream_complete', (data) => {
  console.log(`Latency: ${data.latencyMs}ms`);
});
```

## 🔧 Key Services

| Service | Purpose | Location |
|---------|---------|----------|
| GeminiService | LLM generation | `core/integrations/gemini/` |
| PromptManagementService | Version control | `ai-reasoning/infrastructure/` |
| SafetyGuardrailsService | Safety checks | `ai-reasoning/infrastructure/` |
| FunctionExecutorService | Tool execution | `ai-reasoning/domain/` |
| StreamingResponseService | Real-time streaming | `ai-reasoning/infrastructure/` |
| AIChatGateway | WebSocket handler | `ai-reasoning/presentation/` |

## 📊 Database Quick Queries

```sql
-- Get all prompts
SELECT "promptName", version, status FROM prompt_registry;

-- Check active A/B tests
SELECT * FROM prompt_ab_tests WHERE status = 'running';

-- Recent executions
SELECT "userId", "latencyMs", "tokensUsed", "createdAt" 
FROM prompt_executions 
ORDER BY "createdAt" DESC LIMIT 10;

-- Safety blocks
SELECT "safetyReason", COUNT(*) 
FROM prompt_executions 
WHERE "safetyTriggered" = true 
GROUP BY "safetyReason";
```

## 🎯 Common Workflows

### 1. Deploy New Prompt
```bash
# Create draft
POST /api/v1/ai/prompts { version: "1.1.0", status: "draft" }

# Test internally
PUT /api/v1/ai/prompts/{id}/status { status: "testing" }

# Deploy to 5% users
PUT /api/v1/ai/prompts/{id}/status { status: "canary" }

# Rollout to 100%
PUT /api/v1/ai/prompts/{id}/status { status: "production" }
```

### 2. Run A/B Test
```bash
# Start test
POST /api/v1/ai/prompts/ab-tests {
  testName: "tone_test",
  controlPromptId: "v1",
  treatmentPromptId: "v2",
  trafficSplit: 50
}

# Check results
GET /api/v1/ai/prompts/ab-tests/{testId}

# Conclude
POST /api/v1/ai/prompts/ab-tests/{testId}/conclude {
  winner: "treatment"
}
```

### 3. Rollback on Issue
```bash
POST /api/v1/ai/prompts/{name}/rollback {
  targetVersion: "1.0.0",
  reason: "High refusal rate"
}
```

## 🛡️ Safety Patterns Blocked

- **PII:** PAN, Aadhaar, Credit Cards, Email, Phone
- **Harmful Terms:** "guaranteed returns", "risk-free", "insider trading"
- **Bad Advice:** "put all money in X", "borrow to invest"
- **Unsupported Claims:** "you will definitely", "100% guaranteed"

## 🔨 10 Available Functions

1. `calculate_emi` - Loan EMI calculator
2. `calculate_tax` - Indian tax calculation
3. `calculate_sip_returns` - SIP returns
4. `calculate_compound_interest` - Compound interest
5. `run_monte_carlo_simulation` - Financial simulations
6. `assess_loan_affordability` - FOIR check
7. `optimize_portfolio` - Asset allocation
8. `analyze_spending_pattern` - Spending analysis
9. `check_goal_progress` - Goal tracking
10. `query_financial_graph` - Neo4j queries (mock)

## 📈 Monitoring

```bash
# Check logs
pm2 logs backend | grep -i "gemini\|llm"

# Execution metrics
curl http://localhost:3001/api/v1/ai/metrics?startDate=2026-01-25

# Database stats
psql -d nivesh -c "SELECT COUNT(*), AVG(latencyMs) FROM prompt_executions;"
```

## ⚡ Performance Tips

1. **Use Flash model for simple queries:**
   ```typescript
   model: query.length < 100 ? 'gemini-1.5-flash' : 'gemini-1.5-pro'
   ```

2. **Cache prompts in Redis** (TODO)
3. **Reduce max tokens for faster responses**
4. **Implement semantic deduplication**

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| WebSocket won't connect | Check FRONTEND_URL in .env |
| High latency | Use Flash model, reduce maxTokens |
| Too many safety blocks | Adjust thresholds in safety service |
| Function timeout | Increase timeout in executor service |
| A/B test not working | Verify prompt status = production |

## 📝 File Locations

```
backend/
├── src/
│   ├── core/integrations/gemini/
│   │   └── gemini.service.ts          # Main LLM service
│   │
│   └── modules/ai-reasoning/
│       ├── domain/services/
│       │   ├── function-registry.service.ts
│       │   └── function-executor.service.ts
│       │
│       ├── infrastructure/services/
│       │   ├── prompt-management.service.ts
│       │   ├── safety-guardrails.service.ts
│       │   └── streaming-response.service.ts
│       │
│       └── presentation/
│           ├── llm.controller.ts
│           └── gateways/ai-chat.gateway.ts
│
├── prisma/
│   ├── schema.prisma                  # Updated with 3 new models
│   └── migrations/20260126_llm_integration/
│
├── LLM_INTEGRATION_GUIDE.md          # Full documentation
└── LLM_IMPLEMENTATION_SUMMARY.md     # This summary
```

## 🎯 Next Integration Steps

1. **Connect RAG Pipeline:**
   ```typescript
   // In ai-chat.gateway.ts
   const context = await this.ragService.retrieveContext(query);
   const prompt = this.buildPromptWithContext(query, context);
   ```

2. **Add Neo4j Integration:**
   ```typescript
   // In function-executor.service.ts
   async queryFinancialGraph(args, userId) {
     return await this.neo4jService.run(cypherQuery);
   }
   ```

3. **Implement Prompt Caching:**
   ```typescript
   const cached = await this.redis.get(`prompt:${promptName}`);
   if (cached) return JSON.parse(cached);
   ```

## 🔗 Resources

- **Full Guide:** `backend/LLM_INTEGRATION_GUIDE.md`
- **Summary:** `backend/LLM_IMPLEMENTATION_SUMMARY.md`
- **Gemini Docs:** https://ai.google.dev/docs
- **Socket.io Docs:** https://socket.io/docs/v4/

---
**Version:** 1.0.0  
**Last Updated:** January 26, 2026  
**Status:** ✅ Production Ready (with noted limitations)
