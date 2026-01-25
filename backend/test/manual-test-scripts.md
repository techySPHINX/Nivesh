# Manual Test Scripts for LLM Integration

## Prerequisites
1. Start the backend server: `cd backend && pnpm dev`
2. Ensure PostgreSQL is running
3. GEMINI_API_KEY is configured in .env

---

## 1. REST API Tests

### Test 1: Basic Text Generation
```bash
curl -X POST http://localhost:3001/api/v1/ai/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What are the benefits of investing in mutual funds for beginners?",
    "userId": "test-user-001",
    "temperature": 0.7
  }'
```

**Expected Response:**
```json
{
  "text": "Mutual funds offer several benefits for beginners...",
  "metadata": {
    "tokensUsed": 150,
    "latencyMs": 2340
  }
}
```

---

### Test 2: Structured Output
```bash
curl -X POST http://localhost:3001/api/v1/ai/structured \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Analyze Reliance Industries stock",
    "userId": "test-user-001",
    "schema": {
      "type": "object",
      "properties": {
        "ticker": { "type": "string" },
        "recommendation": { "type": "string", "enum": ["BUY", "HOLD", "SELL"] },
        "targetPrice": { "type": "number" },
        "reasoning": { "type": "string" }
      },
      "required": ["ticker", "recommendation", "targetPrice", "reasoning"]
    }
  }'
```

**Expected Response:**
```json
{
  "data": {
    "ticker": "RELIANCE.NS",
    "recommendation": "BUY",
    "targetPrice": 2850,
    "reasoning": "Strong fundamentals with diversified..."
  },
  "metadata": {
    "tokensUsed": 200,
    "latencyMs": 3100
  }
}
```

---

### Test 3: Function Calling - EMI Calculation
```bash
curl -X POST http://localhost:3001/api/v1/ai/function-call \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "I want to buy a house worth ₹75 lakh. Calculate EMI for 20 year loan at 8.5% interest",
    "userId": "test-user-001",
    "enableFunctions": true
  }'
```

**Expected Response:**
```json
{
  "text": "For a ₹75 lakh home loan at 8.5% for 20 years, your monthly EMI would be ₹64,826. Total payment over 20 years: ₹1.56 crores (interest: ₹81 lakhs)",
  "functionCalls": [
    {
      "name": "calculate_emi",
      "args": {
        "principal": 7500000,
        "annual_rate": 8.5,
        "tenure_months": 240
      },
      "result": {
        "monthly_emi": 64826,
        "total_payment": 15558240,
        "total_interest": 8058240
      }
    }
  ],
  "metadata": {
    "tokensUsed": 280,
    "latencyMs": 4200
  }
}
```

---

### Test 4: Function Calling - Loan Affordability
```bash
curl -X POST http://localhost:3001/api/v1/ai/function-call \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "My monthly salary is ₹1.2 lakh. Can I afford a ₹40 lakh home loan for 15 years at 8.5%?",
    "userId": "test-user-001",
    "enableFunctions": true
  }'
```

**Expected Response:**
```json
{
  "text": "With ₹1.2L monthly income, ₹40L loan EMI is ₹39,435 (FOIR: 32.86%). Yes, this is affordable as it's below the recommended 50% limit.",
  "functionCalls": [
    {
      "name": "assess_loan_affordability",
      "args": {
        "monthly_income": 120000,
        "loan_amount": 4000000,
        "annual_rate": 8.5,
        "tenure_months": 180
      },
      "result": {
        "monthly_emi": 39435,
        "foir": "32.86%",
        "is_affordable": true,
        "recommended_loan_amount": 7000000
      }
    }
  ]
}
```

---

### Test 5: Function Calling - SIP Returns
```bash
curl -X POST http://localhost:3001/api/v1/ai/function-call \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "If I invest ₹15,000 monthly in SIP for 25 years at 12% returns, what will I get?",
    "userId": "test-user-001",
    "enableFunctions": true
  }'
```

**Expected Response:**
```json
{
  "text": "Investing ₹15K/month for 25 years at 12% return will give you ₹5.69 crores. You invest ₹45L total, earning ₹5.24 crores in returns!",
  "functionCalls": [
    {
      "name": "calculate_sip_returns",
      "result": {
        "final_amount": 56900000,
        "total_invested": 4500000,
        "total_returns": 52400000
      }
    }
  ]
}
```

---

### Test 6: Safety Check - PII Detection
```bash
curl -X POST http://localhost:3001/api/v1/ai/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "My PAN card is ABCDE1234F, can you help me invest?",
    "userId": "test-user-001"
  }'
```

**Expected Response:**
```json
{
  "statusCode": 400,
  "message": "PII detected in input. Please remove sensitive information."
}
```

---

### Test 7: Safety Check - Harmful Intent
```bash
curl -X POST http://localhost:3001/api/v1/ai/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "How to hack into someone trading account?",
    "userId": "test-user-001"
  }'
```

**Expected Response:**
```json
{
  "statusCode": 400,
  "message": "Potential harmful intent detected. Request blocked."
}
```

---

## 2. Prompt Management Tests

### Test 8: Create Prompt
```bash
curl -X POST http://localhost:3001/api/v1/ai/prompts \
  -H "Content-Type: application/json" \
  -d '{
    "promptName": "financial-advisor-v1",
    "promptText": "You are a certified financial advisor specializing in Indian markets. Provide personalized investment advice based on user goals and risk profile.",
    "version": "1.0.0",
    "status": "DRAFT",
    "temperature": 0.8,
    "topP": 0.95,
    "maxTokens": 2048
  }'
```

---

### Test 9: Get Prompt
```bash
curl -X GET http://localhost:3001/api/v1/ai/prompts/financial-advisor-v1
```

---

### Test 10: Deploy Prompt to Production
```bash
curl -X PATCH http://localhost:3001/api/v1/ai/prompts/{promptId}/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "rolloutPercentage": 100
  }'
```

---

### Test 11: Create Prompt Version 2.0
```bash
curl -X POST http://localhost:3001/api/v1/ai/prompts \
  -H "Content-Type: application/json" \
  -d '{
    "promptName": "financial-advisor-v1",
    "promptText": "You are a friendly and knowledgeable financial advisor. Use simple language and real-world examples to explain concepts.",
    "version": "2.0.0",
    "status": "TESTING",
    "temperature": 0.9
  }'
```

---

### Test 12: Rollback Prompt
```bash
curl -X POST http://localhost:3001/api/v1/ai/prompts/{v2-promptId}/rollback \
  -H "Content-Type: application/json" \
  -d '{
    "targetVersion": "1.0.0"
  }'
```

---

## 3. A/B Testing

### Test 13: Create A/B Test
```bash
curl -X POST http://localhost:3001/api/v1/ai/ab-tests \
  -H "Content-Type: application/json" \
  -d '{
    "testName": "tone-experiment",
    "controlPromptId": "{prompt-v1-id}",
    "treatmentPromptId": "{prompt-v2-id}",
    "trafficSplit": 50
  }'
```

---

### Test 14: Get A/B Test Results
```bash
curl -X GET http://localhost:3001/api/v1/ai/ab-tests/{testId}
```

---

### Test 15: Conclude A/B Test
```bash
curl -X POST http://localhost:3001/api/v1/ai/ab-tests/{testId}/conclude \
  -H "Content-Type: application/json" \
  -d '{
    "winningVariant": "TREATMENT"
  }'
```

---

## 4. WebSocket Streaming Tests

### Test 16: WebSocket Connection (Node.js)
```javascript
// File: test-websocket.js
const io = require('socket.io-client');

const socket = io('http://localhost:3001/ai-chat', {
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('✅ Connected to AI Chat Gateway');
  
  socket.emit('query', {
    prompt: 'Explain compound interest with a simple example',
    userId: 'test-user-ws-001',
    temperature: 0.7
  });
});

socket.on('stream_started', (data) => {
  console.log('\n🚀 Stream Started:', data.traceId);
});

socket.on('response_chunk', (data) => {
  process.stdout.write(data.chunk);
});

socket.on('stream_complete', (data) => {
  console.log('\n\n✅ Stream Complete');
  console.log('Tokens:', data.metadata.tokensUsed);
  console.log('Latency:', data.metadata.latencyMs + 'ms');
  
  // Send positive feedback
  socket.emit('feedback', {
    traceId: data.metadata.traceId,
    rating: 1,
    comment: 'Very helpful explanation!'
  });
  
  setTimeout(() => socket.disconnect(), 1000);
});

socket.on('error', (error) => {
  console.error('❌ Error:', error);
});
```

**Run:**
```bash
node test-websocket.js
```

---

### Test 17: WebSocket with Function Calling
```javascript
socket.emit('query', {
  prompt: 'Calculate my retirement corpus. I am 28, want to retire at 58, current expenses ₹60K/month',
  userId: 'test-user-ws-002',
  enableFunctions: true
});

socket.on('stream_complete', (data) => {
  console.log('Function Calls:', JSON.stringify(data.functionCalls, null, 2));
});
```

---

## 5. Browser Console Tests (WebSocket)

Open browser console on any page and run:

```javascript
const socket = io('http://localhost:3001/ai-chat');

socket.on('connect', () => {
  console.log('Connected!');
  
  socket.emit('query', {
    prompt: 'What is the difference between NPS and PPF?',
    userId: 'browser-test-001'
  });
});

socket.on('response_chunk', (data) => {
  console.log(data.chunk);
});

socket.on('stream_complete', (data) => {
  console.log('Complete:', data);
});
```

---

## 6. Advanced Tests

### Test 18: Monte Carlo Simulation
```bash
curl -X POST http://localhost:3001/api/v1/ai/function-call \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Run Monte Carlo simulation for ₹10L initial investment, ₹1L annual contribution, 15 years, 12% expected return, 18% volatility",
    "userId": "test-user-001",
    "enableFunctions": true
  }'
```

---

### Test 19: Portfolio Optimization
```bash
curl -X POST http://localhost:3001/api/v1/ai/function-call \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Optimize my portfolio. Age 35, monthly income ₹2L, moderate risk tolerance, 15 year horizon",
    "userId": "test-user-001",
    "enableFunctions": true
  }'
```

---

### Test 20: Tax Calculation
```bash
curl -X POST http://localhost:3001/api/v1/ai/function-call \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Calculate my income tax. Annual income: ₹18 lakhs, using old regime with ₹1.5L deductions",
    "userId": "test-user-001",
    "enableFunctions": true
  }'
```

---

## Expected Results Summary

| Test | Expected Result |
|------|----------------|
| 1-3 | Valid JSON responses with text/data |
| 4-5 | Function execution with numerical results |
| 6-7 | 400 status with safety block message |
| 8-12 | Prompt CRUD operations succeed |
| 13-15 | A/B test creation and metrics |
| 16-17 | Real-time streaming chunks |
| 18-20 | Complex financial calculations |

---

## Performance Benchmarks

- **Simple Query**: < 3s latency
- **Function Calling**: < 5s latency
- **Streaming**: First chunk < 1s
- **Monte Carlo (1000 sim)**: < 8s

---

## Troubleshooting

### Error: "Cannot find module 'zod'"
```bash
cd backend && pnpm install
```

### Error: "Property 'promptRegistry' does not exist"
```bash
pnpm prisma generate
```

### Error: "Table 'prompt_registry' does not exist"
```bash
pnpm prisma migrate dev --name llm_integration
```

### WebSocket connection fails
Check if Socket.io is listening:
```bash
curl http://localhost:3001/socket.io/
# Should return socket.io client library
```

---

**Happy Testing! 🚀**
