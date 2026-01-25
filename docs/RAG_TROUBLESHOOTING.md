# RAG Pipeline Troubleshooting Guide

## Quick Diagnostics

### Health Check Command

```bash
# Check all RAG components
curl http://localhost:3000/api/v1/rag/health

# Expected output:
{
  "status": "healthy",
  "components": {
    "qdrant": { "status": "up" },
    "redis": { "status": "up" },
    "embeddingService": { "status": "up" }
  }
}
```

---

## Common Issues

### 1. Qdrant Connection Failed

**Symptoms:**
```
Error: Qdrant connection failed: connect ECONNREFUSED 127.0.0.1:6333
```

**Diagnosis:**

```bash
# Check if Qdrant is running
docker ps | grep qdrant

# Check Qdrant logs
docker logs nivesh-qdrant-1

# Test Qdrant directly
curl http://localhost:6333/collections
```

**Solutions:**

**A. Start Qdrant**
```bash
cd C:\Users\tesseractS\Desktop\Nivesh
docker-compose up -d qdrant
```

**B. Check docker-compose.yml**
```yaml
services:
  qdrant:
    image: qdrant/qdrant:v1.7.4
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_storage:/qdrant/storage
```

**C. Verify network connectivity**
```bash
# From backend container
docker exec -it nivesh-backend-1 curl http://qdrant:6333/collections
```

**D. Check firewall/antivirus**
- Windows Defender may block port 6333
- Add exception for Docker

---

### 2. Collection Not Found

**Symptoms:**
```
Error: Collection 'user_financial_context' does not exist
```

**Diagnosis:**

```bash
# List existing collections
curl http://localhost:6333/collections

# Check collection details
curl http://localhost:6333/collections/user_financial_context
```

**Solutions:**

**A. Auto-create on startup**
```typescript
// backend/src/core/config/qdrant.config.ts
export const QDRANT_COLLECTIONS = [
  {
    name: 'user_financial_context',
    vectorSize: 384,
    distance: 'Cosine',
    // Auto-created on first index
  }
];
```

**B. Manual creation**
```bash
curl -X PUT http://localhost:6333/collections/user_financial_context \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 384,
      "distance": "Cosine"
    }
  }'
```

**C. Restart backend** (triggers collection creation)
```bash
docker-compose restart backend
```

---

### 3. Slow Embedding Generation

**Symptoms:**
- Embedding generation takes > 500ms per query
- `/search` endpoint times out

**Diagnosis:**

```bash
# Check embedding service performance
curl -X POST http://localhost:3000/api/v1/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "userId": "test"}' \
  -w "\nTime: %{time_total}s\n"

# Check cache hit rate
curl http://localhost:3000/api/v1/rag/stats | jq '.data.cacheHitRate'
```

**Solutions:**

**A. Check Redis cache**
```bash
# Verify Redis is running
docker ps | grep redis

# Check Redis memory
docker exec -it nivesh-redis-1 redis-cli INFO memory

# Check cache keys
docker exec -it nivesh-redis-1 redis-cli KEYS "embedding:*" | wc -l
```

**B. Increase cache TTL**
```typescript
// backend/src/core/config/redis.config.ts
export const REDIS_CONFIG = {
  db: 2,
  ttl: 7 * 24 * 60 * 60, // 7 days → 14 days
};
```

**C. Pre-warm cache**
```typescript
// Index common queries
const commonQueries = [
  "What are my recent transactions?",
  "Show me my budget",
  "Investment portfolio"
];

for (const query of commonQueries) {
  await embeddingService.generateEmbedding(query);
}
```

**D. Use GPU acceleration** (if available)
```typescript
// backend/src/modules/rag-pipeline/application/services/local-embedding.service.ts
const pipeline = await transformers.pipeline('feature-extraction', model, {
  device: 'cuda', // Enable GPU
});
```

---

### 4. Low Relevance Scores

**Symptoms:**
- Search returns results with scores < 0.5
- Irrelevant results in top-10

**Diagnosis:**

```bash
# Search with debug info
curl -X POST http://localhost:3000/api/v1/rag/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "credit card payment",
    "userId": "user_123",
    "config": {"topK": 10}
  }' | jq '.data.results[] | {score, text}'
```

**Solutions:**

**A. Adjust score threshold**
```typescript
// Increase threshold to filter low-quality results
const config = {
  scoreThreshold: 0.75, // From 0.7 to 0.75
};
```

**B. Improve indexing quality**
```typescript
// Build richer text descriptions
const transactionText = `
  Transaction: ₹${amount} spent on ${category}
  Merchant: ${merchantName}
  Date: ${formatDate(date)}
  Payment: ${paymentMethod}
  Notes: ${description}
`;
// More context = better embeddings
```

**C. Re-rank results**
```typescript
// Increase similarity weight
const weights = {
  recencyWeight: 0.1,      // Reduce from 0.2
  diversityWeight: 0.1,    // Reduce from 0.2
  // More weight on similarity (0.8 vs 0.6)
};
```

**D. Use query expansion**
```typescript
// Expand user query with synonyms
const expandedQuery = await expandQuery(query);
// "credit card" → "credit card OR debit card OR payment card"
```

---

### 5. Redis Connection Error

**Symptoms:**
```
Error: Redis connection to localhost:6379 failed - connect ECONNREFUSED
```

**Diagnosis:**

```bash
# Check Redis status
docker ps | grep redis

# Test Redis connection
docker exec -it nivesh-redis-1 redis-cli PING
# Expected: PONG

# Check Redis logs
docker logs nivesh-redis-1
```

**Solutions:**

**A. Start Redis**
```bash
docker-compose up -d redis
```

**B. Verify configuration**
```typescript
// backend/src/core/config/redis.config.ts
export const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: 2, // Embeddings cache
};
```

**C. Check environment variables**
```bash
# .env file
REDIS_HOST=redis  # Docker service name
REDIS_PORT=6379
```

**D. Test connection manually**
```bash
# From host
redis-cli -h localhost -p 6379 PING

# From backend container
docker exec -it nivesh-backend-1 redis-cli -h redis -p 6379 PING
```

---

### 6. High Memory Usage

**Symptoms:**
- Qdrant container uses > 4GB RAM
- OOM (Out of Memory) errors

**Diagnosis:**

```bash
# Check container memory
docker stats nivesh-qdrant-1

# Check collection sizes
curl http://localhost:6333/collections | jq '.result.collections[] | {name, points_count}'

# Estimate memory usage
# Formula: points_count × 384 dims × 4 bytes + overhead
```

**Solutions:**

**A. Add memory limit**
```yaml
# docker-compose.yml
services:
  qdrant:
    mem_limit: 4g
    mem_reservation: 2g
```

**B. Enable mmap storage**
```yaml
services:
  qdrant:
    environment:
      - QDRANT__STORAGE__MMAP_THRESHOLD_KB=1024
    # Store vectors on disk, load on demand
```

**C. Delete old data**
```bash
# Delete vectors older than 90 days
curl -X POST http://localhost:6333/collections/user_financial_context/points/delete \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {
      "must": [{
        "key": "date",
        "range": {
          "lt": "2025-10-01T00:00:00Z"
        }
      }]
    }
  }'
```

**D. Use quantization**
```typescript
// Reduce vector precision (384 × 4 bytes → 384 × 1 byte)
const collection = {
  quantization_config: {
    scalar: {
      type: "int8",
      quantile: 0.99
    }
  }
};
```

---

### 7. Indexing Job Failures

**Symptoms:**
```
Error: Failed to index transaction tx_123
Status: FAILED in vector_indexing_jobs table
```

**Diagnosis:**

```sql
-- Check failed jobs
SELECT * FROM vector_indexing_jobs 
WHERE status = 'FAILED' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check error messages
SELECT error_message, COUNT(*) 
FROM vector_indexing_jobs 
WHERE status = 'FAILED' 
GROUP BY error_message;
```

**Solutions:**

**A. Retry failed jobs**
```typescript
// backend/src/modules/rag-pipeline/application/services/vector-indexer.service.ts
@Cron('*/5 * * * *') // Every 5 minutes
async retryFailedJobs() {
  const failed = await this.prisma.vectorIndexingJob.findMany({
    where: { 
      status: 'FAILED',
      retryCount: { lt: 3 }
    }
  });
  
  for (const job of failed) {
    await this.retryIndexing(job);
  }
}
```

**B. Validate input data**
```typescript
// Ensure all required fields
if (!transaction.amount || !transaction.category) {
  throw new Error('Missing required fields');
}

// Sanitize data
const sanitized = {
  amount: parseFloat(transaction.amount),
  category: transaction.category.trim(),
  date: new Date(transaction.date).toISOString()
};
```

**C. Check queue backlogs**
```bash
# Check Kafka lag (if using event-driven indexing)
docker exec -it nivesh-kafka-1 kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --describe --group rag-indexer
```

---

### 8. Search Returns Empty Results

**Symptoms:**
- `/search` returns `totalResults: 0` despite indexed data

**Diagnosis:**

```bash
# Check collection count
curl http://localhost:6333/collections/user_financial_context | jq '.result.points_count'

# Verify userId filter
curl -X POST http://localhost:6333/collections/user_financial_context/points/scroll \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {
      "must": [{"key": "userId", "match": {"value": "user_123"}}]
    },
    "limit": 10
  }'

# Test without filters
curl -X POST http://localhost:3000/api/v1/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "userId": "user_123", "config": {"scoreThreshold": 0.0}}'
```

**Solutions:**

**A. Check userId consistency**
```typescript
// Ensure userId format is consistent
const userId = user.id.toString(); // Not user._id or user.uid
```

**B. Lower score threshold**
```typescript
const config = {
  scoreThreshold: 0.5, // From 0.7 to 0.5 (testing)
};
```

**C. Verify indexing**
```bash
# Index test data
curl -X POST http://localhost:3000/api/v1/rag/index/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "transactionId": "test_tx",
    "amount": 1000,
    "category": "Test",
    "description": "Test transaction",
    "date": "2026-01-25T10:00:00Z"
  }'

# Search for it
curl -X POST http://localhost:3000/api/v1/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test transaction", "userId": "user_123"}'
```

**D. Check payload indexing**
```bash
# Ensure metadata fields are indexed in Qdrant
curl http://localhost:6333/collections/user_financial_context | jq '.result.payload_schema'

# Should show: userId, contextType, category, etc.
```

---

### 9. Embedding Model Not Loading

**Symptoms:**
```
Error: Model 'sentence-transformers/all-MiniLM-L6-v2' not found
Error: Failed to load tokenizer
```

**Diagnosis:**

```bash
# Check model cache
ls -lh ~/.cache/huggingface/hub/

# Check internet connectivity (model downloads on first use)
curl -I https://huggingface.co

# Check disk space
df -h ~/.cache
```

**Solutions:**

**A. Pre-download model**
```bash
# Inside backend container
docker exec -it nivesh-backend-1 node -e "
  const transformers = require('@xenova/transformers');
  transformers.pipeline('feature-extraction', 'sentence-transformers/all-MiniLM-L6-v2')
    .then(() => console.log('Model loaded'))
    .catch(console.error);
"
```

**B. Mount model cache volume**
```yaml
# docker-compose.yml
services:
  backend:
    volumes:
      - huggingface_cache:/root/.cache/huggingface

volumes:
  huggingface_cache:
```

**C. Use local model**
```typescript
// Download model manually
// Place in backend/models/all-MiniLM-L6-v2/

const pipeline = await transformers.pipeline(
  'feature-extraction',
  './models/all-MiniLM-L6-v2'
);
```

**D. Increase timeout**
```typescript
// backend/src/modules/rag-pipeline/application/services/local-embedding.service.ts
const pipeline = await transformers.pipeline(
  'feature-extraction',
  model,
  { timeout: 300000 } // 5 minutes for first download
);
```

---

### 10. API Returns 503 Service Unavailable

**Symptoms:**
```
HTTP 503: Service Temporarily Unavailable
Error: Qdrant is not healthy
```

**Diagnosis:**

```bash
# Full health check
curl http://localhost:3000/api/v1/rag/health | jq '.'

# Check individual components
curl http://localhost:6333/healthz  # Qdrant
redis-cli PING                      # Redis
```

**Solutions:**

**A. Wait for services to start**
```bash
# Services may take 30-60s to fully start
docker-compose logs -f qdrant redis backend
```

**B. Restart services**
```bash
docker-compose restart qdrant redis backend
```

**C. Check dependencies**
```typescript
// backend/src/modules/rag-pipeline/rag-pipeline.module.ts
@Module({
  imports: [
    RedisModule,        // Required
    DatabaseModule,     // Required
    IntegrationsModule  // For Gemini (optional)
  ]
})
```

**D. Graceful degradation**
```typescript
// Fall back to non-RAG mode if Qdrant is down
try {
  const context = await this.semanticRetriever.retrieveContext(query);
} catch (err) {
  this.logger.warn('RAG unavailable, using LLM without context');
  // Proceed without retrieved context
}
```

---

## Performance Tuning

### 1. Optimize Search Latency

```typescript
// Reduce topK for faster search
const config = { topK: 5 }; // From 10 to 5

// Use pagination instead of large topK
const page1 = await search({ topK: 5, offset: 0 });
const page2 = await search({ topK: 5, offset: 5 });

// Apply filters to reduce search space
const config = {
  filters: {
    dateFrom: '2025-12-01', // Only search recent data
    category: 'Groceries'    // Specific category
  }
};
```

### 2. Batch Indexing

```typescript
// Index in batches of 100
const batchSize = 100;
for (let i = 0; i < transactions.length; i += batchSize) {
  const batch = transactions.slice(i, i + batchSize);
  await ragClient.post('/index/batch', { documents: batch });
}

// Better: use event-driven indexing (automatic batching)
eventBus.publish('transaction.created', transaction);
```

### 3. Cache Warming

```typescript
// Pre-generate embeddings for common queries
const commonQueries = [
  "recent transactions",
  "monthly budget",
  "savings goal",
  "investment portfolio"
];

for (const query of commonQueries) {
  await embeddingService.generateEmbedding(query);
}
```

### 4. Collection Optimization

```bash
# Optimize collection (rebuild indices)
curl -X POST http://localhost:6333/collections/user_financial_context/optimize

# Create payload indices for fast filtering
curl -X PUT http://localhost:6333/collections/user_financial_context/index \
  -H "Content-Type: application/json" \
  -d '{
    "field_name": "userId",
    "field_schema": "keyword"
  }'
```

---

## Monitoring Best Practices

### 1. Set Up Alerts

```yaml
# prometheus.yml
groups:
  - name: rag_alerts
    rules:
      - alert: HighRetrievalLatency
        expr: avg_retrieval_time_ms > 500
        for: 5m
        
      - alert: LowCacheHitRate
        expr: cache_hit_rate < 0.6
        for: 10m
        
      - alert: QdrantDown
        expr: up{job="qdrant"} == 0
        for: 1m
```

### 2. Log Analysis

```bash
# Check for errors in logs
docker-compose logs backend | grep "ERROR"

# Track slow queries
docker-compose logs backend | grep "retrievalTime" | awk '{print $NF}' | sort -n

# Count indexing failures
docker-compose logs backend | grep "indexing failed" | wc -l
```

### 3. Database Queries

```sql
-- Slowest retrievals
SELECT query, retrieval_time_ms, avg_score 
FROM retrieval_metrics 
WHERE retrieval_time_ms > 500 
ORDER BY retrieval_time_ms DESC 
LIMIT 10;

-- Failed jobs by error type
SELECT error_message, COUNT(*) 
FROM vector_indexing_jobs 
WHERE status = 'FAILED' 
GROUP BY error_message;

-- Cache performance
SELECT 
  COUNT(*) FILTER (WHERE cache_hit = true) * 100.0 / COUNT(*) as hit_rate
FROM retrieval_metrics
WHERE created_at > NOW() - INTERVAL '1 hour';
```

---

## Development Tips

### 1. Reset Everything

```bash
# Nuclear option: delete all data
docker-compose down -v

# Delete Qdrant collections
curl -X DELETE http://localhost:6333/collections/user_financial_context
curl -X DELETE http://localhost:6333/collections/financial_knowledge
curl -X DELETE http://localhost:6333/collections/conversation_history

# Clear Redis cache
docker exec -it nivesh-redis-1 redis-cli FLUSHDB

# Reset PostgreSQL tables
docker exec -it nivesh-postgres-1 psql -U postgres -d nivesh -c "
  TRUNCATE vector_indexing_jobs, embedding_cache, retrieval_metrics, knowledge_base_articles RESTART IDENTITY CASCADE;
"
```

### 2. Enable Debug Logging

```typescript
// backend/src/main.ts
app.useLogger(new Logger('verbose')); // 'log' | 'error' | 'warn' | 'debug' | 'verbose'

// backend/src/modules/rag-pipeline/application/services/semantic-retriever.service.ts
this.logger.debug(`Search query: ${query}`);
this.logger.debug(`Retrieved ${results.length} results`);
this.logger.debug(`Re-ranked scores: ${results.map(r => r.score)}`);
```

### 3. Test in Isolation

```bash
# Test embedding service only
curl -X POST http://localhost:3000/api/v1/rag/test/embed \
  -d '{"text": "test query"}'

# Test Qdrant directly
curl -X POST http://localhost:6333/collections/user_financial_context/points/search \
  -d '{"vector": [...], "limit": 5}'

# Test Redis cache
docker exec -it nivesh-redis-1 redis-cli GET "embedding:sha256_hash"
```

---

## Getting Help

### 1. Check Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f qdrant
docker-compose logs -f redis

# Last 100 lines
docker-compose logs --tail=100 backend
```

### 2. Health Checks

```bash
# Full health check
curl http://localhost:3000/api/v1/rag/health | jq '.'

# Component-specific
curl http://localhost:6333/healthz           # Qdrant
redis-cli PING                               # Redis
curl http://localhost:3000/health            # Backend
```

### 3. Collect Debug Info

```bash
# Create debug report
./scripts/debug-report.sh

# Includes:
# - Docker container status
# - Service logs (last 500 lines)
# - Qdrant collection info
# - Redis stats
# - PostgreSQL table counts
# - Network diagnostics
```

### 4. Report Issues

When reporting issues, include:

1. **Error message** (full stack trace)
2. **Reproduction steps**
3. **Environment**:
   ```bash
   docker --version
   docker-compose --version
   node --version
   ```
4. **Service status**:
   ```bash
   docker ps
   curl http://localhost:3000/api/v1/rag/health
   ```
5. **Relevant logs**:
   ```bash
   docker-compose logs backend | tail -100
   ```

---

## FAQ

**Q: Why is search slow?**  
A: Check cache hit rate, reduce `topK`, apply filters, ensure Qdrant has enough memory.

**Q: Why are results irrelevant?**  
A: Increase `scoreThreshold`, improve indexing text quality, adjust re-ranking weights.

**Q: How to delete all user data?**  
A: 
```bash
curl -X POST http://localhost:6333/collections/user_financial_context/points/delete \
  -d '{"filter": {"must": [{"key": "userId", "match": {"value": "user_123"}}]}}'
```

**Q: How to back up Qdrant data?**  
A:
```bash
docker exec nivesh-qdrant-1 tar -czf /tmp/qdrant-backup.tar.gz /qdrant/storage
docker cp nivesh-qdrant-1:/tmp/qdrant-backup.tar.gz ./backups/
```

**Q: Can I use a different embedding model?**  
A: Yes, modify `local-embedding.service.ts`:
```typescript
const model = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2';
// Update vectorSize in qdrant.config.ts accordingly
```

---

**Last Updated**: January 25, 2026  
**Version**: 1.0.0
