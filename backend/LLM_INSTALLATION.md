# 🚀 LLM Integration - Installation Instructions

## Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js 20+ installed
- ✅ pnpm package manager
- ✅ PostgreSQL database running
- ✅ Gemini API key (Get from: https://makersuite.google.com/app/apikey)

## Step-by-Step Installation

### Step 1: Install New Dependencies

```bash
cd backend
pnpm install
```

This will install:
- `@nestjs/websockets` - WebSocket support
- `@nestjs/platform-socket.io` - Socket.io adapter
- `socket.io` - Real-time communication
- `zod` - Schema validation
- Type definitions for socket.io

**Expected Output:**
```
Progress: resolved XXX, reused XXX, downloaded X, added 4
Done in Xs
```

### Step 2: Configure Environment Variables

Edit `backend/.env` (or `.env.local`) and add:

```env
# ============================================
# Gemini API Configuration
# ============================================
GEMINI_API_KEY=AIzaSy...your_api_key_here
GEMINI_MODEL=gemini-1.5-pro
GEMINI_TEMPERATURE=0.3
GEMINI_MAX_TOKENS=8192

# ============================================
# WebSocket Configuration
# ============================================
FRONTEND_URL=http://localhost:3000
```

**Get Gemini API Key:**
1. Visit: https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy and paste into .env file

### Step 3: Regenerate Prisma Client

```bash
# Regenerate Prisma client with new models
pnpm prisma generate
```

This will generate TypeScript types for:
- `PromptRegistry`
- `PromptABTest`
- `PromptExecution`

**Expected Output:**
```
✔ Generated Prisma Client (5.x.x) to ./node_modules/@prisma/client
```

### Step 4: Run Database Migration

```bash
# Create migration and apply to database
pnpm prisma migrate dev --name llm_integration
```

This will:
1. Create 3 new tables in PostgreSQL
2. Add foreign key constraints
3. Create indexes for performance

**Expected Output:**
```
Applying migration `20260126_llm_integration`
The following migration has been applied:
✔ 20260126_llm_integration

Your database is now in sync with your schema.
```

**Verify Migration:**
```bash
psql -d your_database_name -c "\dt prompt*"
```

You should see:
- `prompt_registry`
- `prompt_ab_tests`
- `prompt_executions`

### Step 5: Seed Initial Prompt (Optional)

Create a default prompt for testing:

```sql
-- Connect to your database
psql -d your_database_name

-- Insert default prompt
INSERT INTO prompt_registry (
  id,
  "promptName",
  version,
  "promptText",
  "systemInstruction",
  temperature,
  "topP",
  "topK",
  "maxTokens",
  model,
  status,
  "rolloutPercentage",
  "createdBy",
  "createdAt"
) VALUES (
  gen_random_uuid(),
  'default_financial_advisor',
  '1.0.0',
  'Provide personalized financial advice based on user queries.',
  'You are a helpful financial advisor for Nivesh, an AI-native financial planning platform.

Your role:
- Provide personalized financial advice based on user''s data
- Be clear, concise, and actionable
- Always cite sources when using retrieved context
- If uncertain, clearly state assumptions
- Never guarantee investment returns
- Always include appropriate disclaimers',
  0.3,
  0.9,
  40,
  2048,
  'gemini-1.5-pro',
  'production',
  100,
  'system',
  NOW()
);
```

### Step 6: Start Development Server

```bash
# Start in watch mode
pnpm dev
```

**Expected Output:**
```
[Nest] INFO [NestFactory] Starting Nest application...
[Nest] INFO [InstanceLoader] GeminiModule dependencies initialized
[Nest] INFO [InstanceLoader] AiReasoningModule dependencies initialized
[Nest] INFO [GeminiService] Gemini AI service initialized
[Nest] INFO [NestApplication] Nest application successfully started
[Nest] INFO Server running on http://localhost:3001
```

### Step 7: Verify Installation

#### Test 1: Check Gemini Service
```bash
curl http://localhost:3001/api/v1/ai/functions
```

**Expected:** List of 10 functions

#### Test 2: Test REST Endpoint
```bash
curl -X POST http://localhost:3001/api/v1/ai/generate \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is an EMI?",
    "userId": "test-user"
  }'
```

**Expected:** JSON response with `success: true`

#### Test 3: Check Database
```bash
psql -d your_database_name -c "SELECT * FROM prompt_registry;"
```

**Expected:** See your seeded prompt

#### Test 4: WebSocket Connection

Create a simple test file `test-websocket.js`:

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:3001/ai-chat');

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket');
  
  socket.emit('query', {
    query: 'Calculate EMI for ₹100000 at 8% for 12 months',
    userId: 'test-user'
  });
});

socket.on('response_chunk', (data) => {
  process.stdout.write(data.text);
});

socket.on('stream_complete', (data) => {
  console.log(`\n✅ Stream complete. Latency: ${data.latencyMs}ms`);
  process.exit(0);
});

socket.on('error', (error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
```

Run: `node test-websocket.js`

## 🐛 Troubleshooting

### Error: "Cannot find module 'zod'"
**Solution:**
```bash
pnpm install zod
```

### Error: "Property 'promptRegistry' does not exist"
**Solution:**
```bash
pnpm prisma generate
```

### Error: "Gemini AI is not configured"
**Solution:**
Check that `GEMINI_API_KEY` is set in `.env`

### Error: "WebSocket connection refused"
**Solution:**
1. Check `FRONTEND_URL` in `.env`
2. Ensure server is running
3. Check firewall/CORS settings

### Error: "Table prompt_registry does not exist"
**Solution:**
```bash
pnpm prisma migrate dev --name llm_integration
```

### Error: "Rate limit exceeded" (from Gemini)
**Solution:**
1. Wait 60 seconds
2. Reduce request frequency
3. Check API quota limits

## ✅ Installation Checklist

Before marking as complete, verify:

- [ ] Dependencies installed (`pnpm install` successful)
- [ ] Environment variables configured
- [ ] Prisma client regenerated
- [ ] Database migration applied
- [ ] Default prompt seeded (optional)
- [ ] Server starts without errors
- [ ] REST endpoint responds
- [ ] WebSocket connects successfully
- [ ] Function list returns 10 tools
- [ ] Database tables exist

## 📊 Verification Commands

Run all these to confirm setup:

```bash
# 1. Check dependencies
pnpm list zod socket.io

# 2. Check Prisma schema
cat prisma/schema.prisma | grep "model Prompt"

# 3. Check database
psql -d your_db -c "SELECT COUNT(*) FROM prompt_registry;"

# 4. Check server health
curl http://localhost:3001/health

# 5. List available AI functions
curl http://localhost:3001/api/v1/ai/functions | jq '.functions[].name'
```

## 🎯 Expected Results

After successful installation, you should have:

1. **14 new files** created/modified
2. **3 database tables** (prompt_registry, prompt_ab_tests, prompt_executions)
3. **9 REST endpoints** under `/api/v1/ai/`
4. **1 WebSocket namespace** at `/ai-chat`
5. **10 financial functions** registered
6. **0 compile errors** (after prisma generate)

## 📚 Next Steps

After installation, refer to:

1. **Quick Reference:** `LLM_QUICK_REFERENCE.md` - Common commands
2. **Full Guide:** `LLM_INTEGRATION_GUIDE.md` - Complete documentation
3. **Summary:** `LLM_IMPLEMENTATION_SUMMARY.md` - Architecture overview

## 🆘 Need Help?

**Check Logs:**
```bash
pm2 logs backend
# or
tail -f logs/backend.log
```

**Database Connection:**
```bash
psql -d your_database -c "SELECT version();"
```

**Server Health:**
```bash
curl http://localhost:3001/health
```

---

**Installation Time:** ~5-10 minutes  
**Difficulty:** ⭐⭐☆☆☆ (Intermediate)  
**Support:** See LLM_INTEGRATION_GUIDE.md for troubleshooting

**Status After Installation:** ✅ Ready for Testing
