# LLM Integration Implementation Guide

## Overview

This guide covers the complete implementation of Gemini Pro LLM integration with advanced features including structured output, function calling, streaming responses, prompt management, A/B testing, and safety guardrails.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
pnpm install
```

New dependencies added:
- `@nestjs/websockets` - WebSocket support
- `@nestjs/platform-socket.io` - Socket.io platform adapter
- `socket.io` - Real-time bidirectional event-based communication
- `zod` - Schema validation for structured output

### 2. Environment Configuration

Add to your `.env` file:

```env
# Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-pro
GEMINI_TEMPERATURE=0.3
GEMINI_MAX_TOKENS=8192

# Frontend URL for WebSocket CORS
FRONTEND_URL=http://localhost:3000
```

### 3. Run Database Migration

```bash
# Generate Prisma client with new models
pnpm prisma generate

# Run migration to create prompt registry tables
pnpm prisma migrate dev --name llm_integration
```

### 4. Start the Server

```bash
pnpm dev
```

## 📁 Architecture Overview

### Module Structure

```
backend/src/
├── core/
│   └── integrations/
│       └── gemini/
│           ├── gemini.service.ts          # Enhanced with streaming, function calling
│           └── gemini.module.ts
│
└── modules/
    └── ai-reasoning/
        ├── domain/
        │   └── services/
        │       ├── function-registry.service.ts      # Financial tools registry
        │       └── function-executor.service.ts      # Function execution router
        │
        ├── infrastructure/
        │   └── services/
        │       ├── prompt-management.service.ts      # Prompt versioning & A/B testing
        │       ├── safety-guardrails.service.ts      # Safety checks
        │       └── streaming-response.service.ts     # Streaming logic
        │
        ├── presentation/
        │   ├── llm.controller.ts                     # REST API endpoints
        │   └── gateways/
        │       └── ai-chat.gateway.ts                # WebSocket gateway
        │
        └── ai-reasoning.module.ts                    # Module configuration
```

## 🔧 Core Features Implementation

### 1. Enhanced Gemini Service

**Location:** `core/integrations/gemini/gemini.service.ts`

**Features:**
- ✅ Structured JSON output with Zod schema validation
- ✅ Function calling with tool execution
- ✅ Streaming response generation
- ✅ Exponential backoff retry logic
- ✅ Safety settings configuration
- ✅ Token usage tracking

**Usage Example:**

```typescript
// Structured Output
const investmentSchema = z.object({
  recommendations: z.array(z.object({
    action: z.string(),
    amount: z.number(),
    rationale: z.string(),
  })),
  confidence: z.number(),
});

const result = await geminiService.generateStructuredOutput(
  'Recommend investments for ₹50,000',
  investmentSchema,
);

// Function Calling
const tools = functionRegistry.getAllFunctions();
const response = await geminiService.generateWithFunctionCalling(
  'Calculate EMI for ₹1000000 at 8.5% for 20 years',
  tools,
);

// Streaming
const stream = geminiService.generateContentStream(prompt);
for await (const chunk of stream) {
  console.log(chunk.text);
}
```

### 2. Prompt Registry System

**Location:** `modules/ai-reasoning/infrastructure/services/prompt-management.service.ts`

**Features:**
- ✅ Semantic versioning (1.0.0)
- ✅ Status lifecycle: draft → testing → canary → production → deprecated
- ✅ Rollout percentage control
- ✅ A/B testing with consistent user bucketing
- ✅ Statistical significance calculation
- ✅ Rollback capability

**Database Schema:**

```sql
-- Prompt Registry
prompt_registry (
  id, promptName, version, promptText, systemInstruction,
  temperature, topP, topK, maxTokens, model,
  status, rolloutPercentage, createdBy, createdAt,
  deployedAt, deprecatedAt, performanceMetrics, rollbackTrigger
)

-- A/B Tests
prompt_ab_tests (
  id, testName, controlPromptId, treatmentPromptId,
  trafficSplitPercentage, status, startDate, endDate,
  metrics, winner
)

-- Execution Logs
prompt_executions (
  id, promptId, userId, inputText, outputText,
  tokensUsed, latencyMs, confidenceScore, userFeedback,
  safetyTriggered, safetyReason, ragContextUsed,
  functionCallsExecuted, traceId, createdAt
)
```

**Workflow:**

1. **Create Prompt Version:**
```bash
POST /api/v1/ai/prompts
{
  "promptName": "financial_advisor",
  "version": "1.0.0",
  "promptText": "You are a helpful financial advisor...",
  "temperature": 0.3
}
```

2. **Deploy to Canary (5% traffic):**
```bash
PUT /api/v1/ai/prompts/{promptId}/status
{ "status": "canary" }
```

3. **Promote to Production:**
```bash
PUT /api/v1/ai/prompts/{promptId}/status
{ "status": "production" }
```

4. **Rollback if Issues:**
```bash
POST /api/v1/ai/prompts/financial_advisor/rollback
{
  "targetVersion": "0.9.0",
  "reason": "High refusal rate in production"
}
```

### 3. A/B Testing Framework

**How it Works:**

1. **Start A/B Test:**
```bash
POST /api/v1/ai/prompts/ab-tests
{
  "testName": "advisor_tone_test",
  "controlPromptId": "prompt-v1",
  "treatmentPromptId": "prompt-v2",
  "trafficSplit": 50
}
```

2. **User Bucketing:**
- Uses SHA256 hash of userId
- Consistent assignment (same user always gets same variant)
- Traffic split determines percentage to treatment

3. **Metrics Tracked:**
- Average confidence score
- Refusal rate (safety blocks)
- Average latency
- User satisfaction (thumbs up/down)
- Statistical significance (Chi-square test)

4. **Get Results:**
```bash
GET /api/v1/ai/prompts/ab-tests/{testId}
```

Response:
```json
{
  "control": {
    "avgConfidence": 0.85,
    "refusalRate": 0.02,
    "avgLatency": 2500,
    "satisfaction": 0.82,
    "totalExecutions": 1000
  },
  "treatment": {
    "avgConfidence": 0.88,
    "refusalRate": 0.01,
    "avgLatency": 2300,
    "satisfaction": 0.87,
    "totalExecutions": 1000
  },
  "statisticalSignificance": 2.5
}
```

5. **Conclude Test:**
```bash
POST /api/v1/ai/prompts/ab-tests/{testId}/conclude
{ "winner": "treatment" }
```

### 4. Safety & Guardrails

**Location:** `modules/ai-reasoning/infrastructure/services/safety-guardrails.service.ts`

**Pre-LLM Checks:**
- ✅ PII Detection (PAN, Aadhaar, Credit Cards, Email, Phone)
- ✅ Harmful Intent Detection (scams, fraud keywords)
- ✅ Input Length Validation
- ✅ Consent Verification for sensitive operations

**Post-LLM Checks:**
- ✅ Fact Verification against RAG context
- ✅ Hallucination Detection (unsupported claims)
- ✅ Harmful Financial Advice Detection
- ✅ Disclaimer Injection

**Blocked Patterns:**
- "Guaranteed returns", "Risk-free investment"
- "Insider trading", "Ponzi scheme"
- "Put all your money in X"
- "Borrow money to invest"

**Usage:**

```typescript
// Input Safety
const inputCheck = await safetyService.checkInputSafety(userQuery, userId);
if (!inputCheck.safe) {
  return { error: inputCheck.reason };
}

// Output Safety
const outputCheck = await safetyService.checkOutputSafety(
  llmResponse,
  ragContext,
);
if (outputCheck.modifiedResponse) {
  // Disclaimer was injected
  finalResponse = outputCheck.modifiedResponse;
}
```

### 5. WebSocket Streaming

**Location:** `modules/ai-reasoning/presentation/gateways/ai-chat.gateway.ts`

**Features:**
- ✅ Real-time bidirectional communication
- ✅ Sentence-based chunking
- ✅ Connection lifecycle management
- ✅ Per-socket rate limiting
- ✅ Stream cancellation
- ✅ User feedback collection

**Client Connection:**

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001/ai-chat');

// Send query
socket.emit('query', {
  query: 'How should I invest ₹50,000?',
  userId: 'user123',
  promptName: 'financial_advisor',
});

// Receive chunks
socket.on('response_chunk', (data) => {
  console.log(data.text); // Display chunk
});

// Stream complete
socket.on('stream_complete', (data) => {
  console.log('Tokens:', data.tokenCount);
  console.log('Latency:', data.latencyMs);
});

// Send feedback
socket.emit('feedback', {
  traceId: data.traceId,
  feedback: 1, // 1 = thumbs up, -1 = thumbs down
});

// Cancel stream
socket.emit('cancel_stream');
```

### 6. Function Calling

**Location:** `modules/ai-reasoning/domain/services/`

**Registered Functions:**

1. **query_financial_graph** - Query Neo4j for user data
2. **calculate_emi** - EMI calculator
3. **run_monte_carlo_simulation** - Financial simulations
4. **calculate_compound_interest** - Compound interest
5. **calculate_tax** - Indian tax calculation
6. **analyze_spending_pattern** - Spending analysis
7. **check_goal_progress** - Goal tracking
8. **calculate_sip_returns** - SIP returns
9. **assess_loan_affordability** - Loan affordability (FOIR)
10. **optimize_portfolio** - Portfolio allocation

**Example Flow:**

User: "Can I afford a ₹1 crore home loan with ₹1 lakh monthly salary?"

LLM calls: `assess_loan_affordability`
```json
{
  "monthly_income": 100000,
  "existing_emis": 0,
  "loan_amount": 10000000,
  "rate": 8.5,
  "tenure_months": 240
}
```

Function returns:
```json
{
  "proposed_emi": 86782,
  "foir": "86.78%",
  "is_affordable": false,
  "recommendation": "Loan may strain finances. Consider reducing loan amount..."
}
```

LLM response:
"Based on your ₹1 lakh monthly income, a ₹1 crore home loan would require an EMI of ₹86,782, which is 86.78% of your income. This exceeds the recommended FOIR limit of 50%. I suggest reducing the loan amount or extending the tenure."

## 🌐 API Reference

### REST Endpoints

#### 1. Generate Response

```http
POST /api/v1/ai/generate
Content-Type: application/json

{
  "query": "How should I diversify my portfolio?",
  "userId": "user-123",
  "promptName": "financial_advisor"
}
```

Response:
```json
{
  "success": true,
  "response": "Based on your risk profile...",
  "confidence": 0.85,
  "latencyMs": 2500,
  "promptVersion": "1.2.0"
}
```

#### 2. Generate Structured Output

```http
POST /api/v1/ai/generate/structured
Content-Type: application/json

{
  "query": "Recommend 3 investment options",
  "userId": "user-123",
  "schema": {
    "recommendations": { "type": "array" },
    "confidence": { "type": "number" }
  }
}
```

#### 3. Generate with Tools

```http
POST /api/v1/ai/generate/with-tools
```

#### 4. List Functions

```http
GET /api/v1/ai/functions
```

#### 5. Safety Check

```http
POST /api/v1/ai/safety-check
{
  "text": "Share your credit card number",
  "type": "input"
}
```

### WebSocket Events

#### Client → Server

- `query` - Send user query
- `cancel_stream` - Cancel active stream
- `feedback` - Submit feedback
- `ping` - Health check

#### Server → Client

- `connection_established` - Connection successful
- `stream_started` - Stream beginning
- `response_chunk` - Text chunk
- `stream_complete` - Stream finished
- `error` - Error occurred
- `safety_blocked` - Safety check failed
- `pong` - Ping response

## 📊 Monitoring & Metrics

### Execution Logging

Every LLM interaction is logged to `prompt_executions` table:

```sql
SELECT 
  promptId,
  AVG(latencyMs) as avg_latency,
  AVG(tokensUsed) as avg_tokens,
  COUNT(*) as total_executions,
  SUM(CASE WHEN safetyTriggered THEN 1 ELSE 0 END) as safety_blocks
FROM prompt_executions
WHERE createdAt >= NOW() - INTERVAL '24 hours'
GROUP BY promptId;
```

### Cost Tracking

```typescript
// Estimate cost per execution
const tokenCost = {
  'gemini-1.5-pro': { input: 0.0025, output: 0.01 }, // per 1K tokens
  'gemini-1.5-flash': { input: 0.00025, output: 0.001 },
};

const calculateCost = (promptTokens, outputTokens, model) => {
  const rates = tokenCost[model];
  return (
    (promptTokens / 1000) * rates.input +
    (outputTokens / 1000) * rates.output
  );
};
```

### Prometheus Metrics (TODO)

```typescript
// To be implemented
const llmLatency = new Histogram({
  name: 'llm_request_duration_seconds',
  help: 'LLM request duration',
  labelNames: ['model', 'prompt_name'],
});

const llmTokens = new Counter({
  name: 'llm_tokens_total',
  help: 'Total tokens consumed',
  labelNames: ['model', 'type'], // type: input/output
});

const llmSafetyBlocks = new Counter({
  name: 'llm_safety_blocks_total',
  help: 'Total safety blocks',
  labelNames: ['reason', 'category'],
});
```

## 🧪 Testing

### Unit Tests

```typescript
describe('PromptManagementService', () => {
  it('should bucket users consistently', () => {
    const userId = 'user-123';
    const bucket1 = service.getPromptForUser(userId, 'advisor');
    const bucket2 = service.getPromptForUser(userId, 'advisor');
    expect(bucket1.id).toBe(bucket2.id);
  });
});

describe('SafetyGuardrailsService', () => {
  it('should detect PII in input', () => {
    const result = service.detectPII('My PAN is ABCDE1234F');
    expect(result.safe).toBe(false);
    expect(result.blockedTerms).toContain('panCard');
  });
});
```

### Integration Tests

```typescript
describe('AI Chat E2E', () => {
  it('should stream response via WebSocket', (done) => {
    const client = io('http://localhost:3001/ai-chat');
    const chunks = [];

    client.emit('query', {
      query: 'Test query',
      userId: 'test-user',
    });

    client.on('response_chunk', (data) => {
      chunks.push(data.text);
    });

    client.on('stream_complete', () => {
      expect(chunks.length).toBeGreaterThan(0);
      done();
    });
  });
});
```

## 🚨 Troubleshooting

### Common Issues

**1. WebSocket Connection Refused**
```bash
# Check FRONTEND_URL in .env matches client origin
FRONTEND_URL=http://localhost:3000
```

**2. Safety Blocks Too Aggressive**
```typescript
// Adjust thresholds in safety-guardrails.service.ts
private readonly harmfulTerms = [
  // Remove overly restrictive terms
];
```

**3. High Latency**
- Use `gemini-1.5-flash` for simple queries
- Implement prompt caching (3-hour TTL)
- Reduce `maxOutputTokens`

**4. A/B Test Not Working**
```sql
-- Check if test is active
SELECT * FROM prompt_ab_tests WHERE status = 'running';

-- Verify prompt statuses
SELECT promptName, version, status FROM prompt_registry;
```

## 📈 Performance Optimization

### 1. Prompt Caching

```typescript
// Cache system instructions in Redis
const cachedPrompt = await redis.get(`prompt:${promptName}`);
if (cachedPrompt) {
  return JSON.parse(cachedPrompt);
}
```

### 2. Semantic Deduplication

```typescript
// Detect similar queries
const embedding = await generateEmbedding(query);
const similar = await qdrant.search(embedding, { limit: 1, threshold: 0.95 });
if (similar.length > 0) {
  return getCachedResponse(similar[0].id);
}
```

### 3. Model Selection

```typescript
// Use Flash for simple queries
const isSimple = query.length < 100 && !query.includes('analyze');
const model = isSimple ? 'gemini-1.5-flash' : 'gemini-1.5-pro';
```

## 🔐 Security Best Practices

1. **Never log sensitive data:**
```typescript
this.logger.debug(`Query: ${safetyService.sanitizePII(query)}`);
```

2. **Rate limiting per user:**
```typescript
@UseGuards(ThrottlerGuard)
@Throttle(10, 60) // 10 requests per minute
```

3. **Validate all inputs:**
```typescript
@IsString()
@MaxLength(10000)
query: string;
```

4. **Sanitize LLM outputs:**
```typescript
const sanitized = DOMPurify.sanitize(llmResponse);
```

## 📚 Next Steps

1. **Integrate with RAG Pipeline** - Pass retrieved context to LLM
2. **Implement Neo4j Function Calling** - Execute graph queries
3. **Add Prometheus Metrics** - Complete monitoring setup
4. **Fine-tune Prompts** - Optimize for financial advice
5. **Implement Prompt Caching** - Reduce costs
6. **Add Multi-turn Conversations** - Chat history support

## 🤝 Contributing

When adding new functions:

1. Define in `function-registry.service.ts`
2. Implement in `function-executor.service.ts`
3. Add unit tests
4. Update this documentation

## 📞 Support

For issues or questions:
- Check logs: `pm2 logs backend`
- Review execution traces: `SELECT * FROM prompt_executions WHERE traceId = 'xxx'`
- Test safety: `POST /api/v1/ai/safety-check`
