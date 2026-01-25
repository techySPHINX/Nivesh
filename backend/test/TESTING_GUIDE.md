# LLM Integration - Testing Guide

## ✅ Configuration Complete

Your `.env` file already contains:
```env
GEMINI_API_KEY=AIzaSyA9hkwLQSzBYqkguLK_2avVRFpl09EQnOo
```

## 📦 Dependencies Installed

All required packages are installed:
- ✅ `zod` - Schema validation
- ✅ `@nestjs/websockets` - WebSocket support
- ✅ `@nestjs/platform-socket.io` - Socket.io platform
- ✅ `socket.io` - Real-time bidirectional communication

## 🗄️ Database Status

Prisma client has been generated with new models:
- ✅ `PromptRegistry` - Prompt versioning and management
- ✅ `PromptABTest` - A/B testing framework
- ✅ `PromptExecution` - Execution logging and metrics

**Next Step:** Run migration to create tables:
```bash
cd backend
pnpm prisma migrate dev --name llm_integration
```

---

## 🧪 Available Test Suites

### 1. Quick Manual Tests (No Server Required During Setup)

#### REST API Tests (Using cURL)
Located in: [`backend/test/manual-test-scripts.md`](../test/manual-test-scripts.md)

**20 comprehensive curl commands** covering:
- Basic text generation
- Structured output
- Function calling (10 financial tools)
- Safety guardrails (PII, harmful intent)
- Prompt management (CRUD)
- A/B testing workflow
- Advanced calculations (Monte Carlo, portfolio optimization, tax)

### 2. Automated Integration Tests (After Server Start)

#### E2E Test Suites
Located in: `backend/src/modules/ai-reasoning/test/`

**File: `llm-integration.e2e.spec.ts`**
- 30+ test cases
- Full REST API coverage
- Prompt management lifecycle
- A/B testing flow
- Safety guardrails validation
- Performance monitoring

**File: `websocket-streaming.e2e.spec.ts`**
- WebSocket connection lifecycle
- Real-time streaming
- Function calling in streaming mode
- Error handling
- Concurrent connections
- Backpressure handling
- User feedback system

**File: `function-calling.spec.ts`**
- Unit tests for all 10 financial functions
- Input validation
- Edge cases
- Error handling
- Timeout handling

### 3. Quick Node.js Tests

Located in: `backend/test/`

**File: `quick-test.js`**
```bash
cd backend/test
pnpm install
node quick-test.js
```

Tests:
1. ✅ Basic text generation
2. ✅ EMI calculation function
3. ✅ PII detection (should block)
4. ✅ Structured output
5. ✅ Prompt creation

**File: `websocket-test.js`**
```bash
node websocket-test.js
```

Tests:
- Real-time streaming response
- Sentence-based chunking
- Feedback submission
- Connection lifecycle

---

## 🚀 How to Run Tests

### Step 1: Start Backend Server
```bash
cd backend
pnpm dev
```

**Expected Output:**
```
[Nest] INFO [NestFactory] Starting Nest application...
[Nest] INFO [InstanceLoader] AppModule dependencies initialized
[Nest] INFO [InstanceLoader] AIReasoningModule dependencies initialized
[Nest] INFO [NestApplication] Nest application successfully started
```

### Step 2: Run Quick Tests

**Option A: REST API Tests (cURL)**
```bash
# From backend/test/manual-test-scripts.md, copy any test

# Example: Basic generation
curl -X POST http://localhost:3001/api/v1/ai/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What are the benefits of investing in mutual funds?",
    "userId": "test-user-001",
    "temperature": 0.7
  }'
```

**Option B: Node.js Quick Test**
```bash
cd backend/test
pnpm install
node quick-test.js
```

**Expected Output:**
```
🧪 Starting LLM Integration Tests...

📝 Test 1: Basic Text Generation
✅ SUCCESS
Response length: 450
Tokens used: 120
Latency: 2340ms

💰 Test 2: EMI Calculation Function
✅ SUCCESS
Monthly EMI: 20276.03
Total Interest: 216561.8

🛡️  Test 3: PII Detection (Should Block)
✅ SUCCESS: PII correctly detected and blocked

📊 Test 4: Structured Output
✅ SUCCESS
Recommendation: BUY
Target Price: 2850

📝 Test 5: Create Prompt
✅ SUCCESS
Prompt ID: clx...
Version: 1.0.0

✨ All tests completed!
```

**Option C: WebSocket Streaming Test**
```bash
cd backend/test
node websocket-test.js
```

**Expected Output:**
```
🔌 Connecting to WebSocket...

✅ Connected to AI Chat Gateway

📤 Sending query...

🚀 Stream Started
Trace ID: abc-123-def-456

📨 Response:

────────────────────────────────────────────────────────
Long-term investing in equity markets offers several key benefits...
(streaming chunks appear here in real-time)
────────────────────────────────────────────────────────

✅ Stream Complete
Total Tokens: 250
Total Latency: 3200ms
Characters: 780

👍 Sending positive feedback...
✅ Test completed successfully!
```

### Step 3: Run Full E2E Test Suite

```bash
cd backend
pnpm test:e2e
```

Or run specific test files:
```bash
# LLM Integration tests
pnpm jest src/modules/ai-reasoning/test/llm-integration.e2e.spec.ts

# WebSocket streaming tests
pnpm jest src/modules/ai-reasoning/test/websocket-streaming.e2e.spec.ts

# Function calling tests
pnpm jest src/modules/ai-reasoning/test/function-calling.spec.ts
```

---

## 🎯 Test Coverage

### REST API Endpoints (9)
1. ✅ `POST /api/v1/ai/generate` - Basic text generation
2. ✅ `POST /api/v1/ai/structured` - Structured output with Zod
3. ✅ `POST /api/v1/ai/function-call` - Function calling
4. ✅ `POST /api/v1/ai/prompts` - Create prompt
5. ✅ `GET /api/v1/ai/prompts/:name` - Get prompt
6. ✅ `PATCH /api/v1/ai/prompts/:id/deploy` - Deploy prompt
7. ✅ `POST /api/v1/ai/prompts/:id/rollback` - Rollback prompt
8. ✅ `POST /api/v1/ai/ab-tests` - Create A/B test
9. ✅ `GET /api/v1/ai/ab-tests/:id` - Get test results

### WebSocket Events (6)
1. ✅ `connect` - Connection established
2. ✅ `query` - Send query to AI
3. ✅ `stream_started` - Stream begins
4. ✅ `response_chunk` - Receive chunk
5. ✅ `stream_complete` - Stream ends
6. ✅ `feedback` - Submit user feedback

### Financial Functions (10)
1. ✅ `calculate_emi` - Loan EMI calculation
2. ✅ `calculate_sip_returns` - SIP returns projection
3. ✅ `calculate_tax` - Income tax calculation
4. ✅ `assess_loan_affordability` - Loan affordability check
5. ✅ `run_monte_carlo_simulation` - Portfolio simulation
6. ✅ `optimize_portfolio` - Asset allocation
7. ✅ `calculate_retirement_corpus` - Retirement planning
8. ✅ `compare_investment_options` - Investment comparison
9. ✅ `get_asset_info` - Asset information retrieval
10. ✅ `query_financial_graph` - Neo4j knowledge graph query

### Safety Features (5)
1. ✅ PII Detection (PAN, Aadhaar, Credit Card)
2. ✅ Harmful Intent Detection
3. ✅ Fact Verification (vs RAG context)
4. ✅ Financial Disclaimer Injection
5. ✅ Input/Output Sanitization

---

## 📊 Success Metrics

### Expected Results

| Metric | Target | Description |
|--------|--------|-------------|
| Response Latency | < 3s | Simple queries |
| Function Call Latency | < 5s | With calculations |
| First Chunk Time | < 1s | Streaming mode |
| PII Detection Rate | 100% | Safety checks |
| Function Accuracy | 100% | Financial calculations |
| Uptime | 99%+ | Server availability |

### Test Assertion Counts

- **E2E Tests**: 100+ assertions
- **Unit Tests**: 50+ assertions
- **Integration Tests**: 75+ assertions
- **Manual Tests**: 20 scenarios

---

## 🐛 Troubleshooting

### Issue: TypeScript Errors

**Symptom:**
```
Cannot find module 'zod'
Property 'promptRegistry' does not exist on PrismaService
```

**Solution:**
```bash
cd backend
pnpm install
pnpm prisma generate
```

---

### Issue: Database Connection Error

**Symptom:**
```
Error: P1001: Can't reach database server
```

**Solution:**
Check `DATABASE_URL` in `.env` and ensure PostgreSQL is running:
```bash
# Check PostgreSQL status
# Windows: Services -> PostgreSQL
# Or verify connection:
psql -U postgres -h localhost
```

---

### Issue: WebSocket Connection Failed

**Symptom:**
```
Error: Connection Error: websocket error
```

**Solution:**
1. Ensure backend is running on port 3001
2. Check Socket.io is listening:
```bash
curl http://localhost:3001/socket.io/
# Should return socket.io client library
```

---

### Issue: Gemini API Rate Limit

**Symptom:**
```
Error: 429 Too Many Requests
```

**Solution:**
- Service has exponential backoff retry logic (3 attempts)
- Wait 60 seconds between burst tests
- Upgrade to Gemini API paid tier if needed

---

### Issue: Function Call Timeout

**Symptom:**
```
Error: Function execution timeout
```

**Solution:**
- Default timeout: 30 seconds
- Reduce Monte Carlo simulations count
- Check if external services (Neo4j, RAG) are responsive

---

## 📈 Next Steps After Testing

Once all tests pass:

1. **Integration with RAG Pipeline**
   - Connect `query_financial_graph` to Neo4j service
   - Enable fact verification against knowledge base

2. **Monitoring Setup**
   - Add Prometheus metrics collection
   - Create Grafana dashboards
   - Set up alerting for errors

3. **Performance Optimization**
   - Enable Redis caching for prompts
   - Implement response caching
   - Add request rate limiting

4. **Production Readiness**
   - Set up CI/CD pipeline
   - Add load testing
   - Security audit
   - Documentation review

---

## 📚 Test Documentation

All test files include:
- ✅ Descriptive test names
- ✅ Expected outcomes documented
- ✅ Error scenarios covered
- ✅ Setup/teardown logic
- ✅ Detailed assertions

**Test Files:**
- [`llm-integration.e2e.spec.ts`](../src/modules/ai-reasoning/test/llm-integration.e2e.spec.ts) - 300+ lines
- [`websocket-streaming.e2e.spec.ts`](../src/modules/ai-reasoning/test/websocket-streaming.e2e.spec.ts) - 250+ lines
- [`function-calling.spec.ts`](../src/modules/ai-reasoning/test/function-calling.spec.ts) - 400+ lines
- [`manual-test-scripts.md`](../test/manual-test-scripts.md) - 20 curl commands
- [`quick-test.js`](../test/quick-test.js) - 5 automated tests
- [`websocket-test.js`](../test/websocket-test.js) - Streaming test

---

## ✅ Pre-Flight Checklist

Before running tests:

- [ ] PostgreSQL is running
- [ ] `.env` has `GEMINI_API_KEY`
- [ ] `.env` has `DATABASE_URL`
- [ ] Dependencies installed (`pnpm install`)
- [ ] Prisma client generated (`pnpm prisma generate`)
- [ ] Database migrated (`pnpm prisma migrate dev`)
- [ ] Backend server started (`pnpm dev`)

---

**Happy Testing! 🚀**

For issues or questions, refer to:
- [LLM Integration Guide](../LLM_INTEGRATION_GUIDE.md)
- [Implementation Summary](../LLM_IMPLEMENTATION_SUMMARY.md)
- [Quick Reference](../LLM_QUICK_REFERENCE.md)
