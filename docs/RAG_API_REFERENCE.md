# RAG Pipeline API Reference

## Base URL

```
http://localhost:3000/api/v1/rag
```

## Authentication

All endpoints require JWT authentication (temporarily commented for development).

```bash
# Add Bearer token to requests
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" ...
```

---

## Endpoints

### 1. Semantic Search

**POST** `/search`

Perform semantic search across user's financial context, knowledge base, and conversation history.

#### Request Body

```typescript
{
  query: string;                // Natural language search query
  userId: string;               // User identifier
  config?: {
    topK?: number;              // Number of results (default: 10, max: 50)
    scoreThreshold?: number;    // Min relevance score (0-1, default: 0.7)
    collections?: string[];     // Collections to search (default: all)
    filters?: {                 // Optional filters
      contextType?: string;     // 'transaction' | 'goal' | 'budget'
      dateFrom?: string;        // ISO date
      dateTo?: string;
      category?: string;
      amountMin?: number;
      amountMax?: number;
    };
    weights?: {                 // Re-ranking weights
      recencyWeight?: number;   // 0-1, default: 0.2
      diversityWeight?: number; // 0-1, default: 0.2
    };
  };
}
```

#### Example Request

```bash
curl -X POST http://localhost:3000/api/v1/rag/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How much did I spend on groceries last month?",
    "userId": "user_123",
    "config": {
      "topK": 5,
      "scoreThreshold": 0.75,
      "filters": {
        "contextType": "transaction",
        "category": "Groceries",
        "dateFrom": "2025-12-01",
        "dateTo": "2025-12-31"
      }
    }
  }'
```

#### Response

```json
{
  "success": true,
  "data": {
    "query": "How much did I spend on groceries last month?",
    "results": [
      {
        "id": "vec_abc123",
        "score": 0.92,
        "text": "₹15,000 spent on Groceries at BigBasket on 15-12-2025",
        "metadata": {
          "userId": "user_123",
          "contextType": "transaction",
          "entityId": "tx_456",
          "amount": 15000,
          "category": "Groceries",
          "date": "2025-12-15T10:30:00Z"
        },
        "collection": "user_financial_context"
      },
      {
        "id": "vec_def456",
        "score": 0.88,
        "text": "₹8,500 spent on Groceries at Reliance Fresh on 08-12-2025",
        "metadata": {
          "userId": "user_123",
          "contextType": "transaction",
          "entityId": "tx_789",
          "amount": 8500,
          "category": "Groceries",
          "date": "2025-12-08T14:20:00Z"
        },
        "collection": "user_financial_context"
      }
    ],
    "totalResults": 2,
    "collectionStats": {
      "user_financial_context": 2,
      "financial_knowledge": 0,
      "conversation_history": 0
    },
    "retrievalTime": 142
  }
}
```

---

### 2. Index Transaction

**POST** `/index/transaction`

Index a financial transaction into the vector database.

#### Request Body

```typescript
{
  userId: string;
  transactionId: string;
  amount: number;
  category: string;
  description: string;
  date: string;              // ISO date
  merchantName?: string;
  paymentMethod?: string;
}
```

#### Example Request

```bash
curl -X POST http://localhost:3000/api/v1/rag/index/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "transactionId": "tx_001",
    "amount": 2500,
    "category": "Dining",
    "description": "Dinner at Taj Restaurant",
    "date": "2026-01-25T19:30:00Z",
    "merchantName": "Taj Restaurant",
    "paymentMethod": "Credit Card"
  }'
```

#### Response

```json
{
  "success": true,
  "data": {
    "vectorId": "vec_xyz789",
    "indexedAt": "2026-01-25T20:00:00Z",
    "collection": "user_financial_context"
  }
}
```

---

### 3. Index Goal

**POST** `/index/goal`

Index a financial goal.

#### Request Body

```typescript
{
  userId: string;
  goalId: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;          // ISO date
  category?: string;         // 'savings' | 'investment' | 'debt-payoff'
  priority?: number;         // 1-5
}
```

#### Example Request

```bash
curl -X POST http://localhost:3000/api/v1/rag/index/goal \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "goalId": "goal_001",
    "title": "Emergency Fund",
    "description": "Build 6-month emergency corpus for family",
    "targetAmount": 600000,
    "currentAmount": 150000,
    "deadline": "2026-12-31T23:59:59Z",
    "category": "savings",
    "priority": 5
  }'
```

#### Response

```json
{
  "success": true,
  "data": {
    "vectorId": "vec_goal123",
    "indexedAt": "2026-01-25T20:05:00Z",
    "collection": "user_financial_context"
  }
}
```

---

### 4. Index Knowledge Article

**POST** `/index/knowledge`

Index a knowledge base article (FAQs, regulations, products).

#### Request Body

```typescript
{
  knowledgeType: string;     // 'faq' | 'regulation' | 'product' | 'strategy'
  question: string;
  answer: string;
  tags: string[];
  source: string;            // 'RBI' | 'SEBI' | 'Internal'
  authority?: string;
  version?: string;
}
```

#### Example Request

```bash
curl -X POST http://localhost:3000/api/v1/rag/index/knowledge \
  -H "Content-Type: application/json" \
  -d '{
    "knowledgeType": "regulation",
    "question": "What is the maximum 80C deduction limit for FY 2025-26?",
    "answer": "The maximum deduction under Section 80C is ₹1.5 lakhs per financial year. This includes investments in ELSS, PPF, EPF, NSC, and life insurance premiums.",
    "tags": ["tax", "80C", "deduction", "ELSS"],
    "source": "Income Tax Act",
    "authority": "Government of India",
    "version": "2025"
  }'
```

#### Response

```json
{
  "success": true,
  "data": {
    "vectorId": "vec_kb456",
    "indexedAt": "2026-01-25T20:10:00Z",
    "collection": "financial_knowledge"
  }
}
```

---

### 5. Index Conversation

**POST** `/index/conversation`

Index a user conversation for future context.

#### Request Body

```typescript
{
  userId: string;
  query: string;
  response: string;
  intent?: string;
  sessionId?: string;
  feedbackScore?: number;    // -1, 0, 1
  contextUsed?: string[];    // Vector IDs used in generation
}
```

#### Example Request

```bash
curl -X POST http://localhost:3000/api/v1/rag/index/conversation \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "query": "Should I invest in ELSS or PPF?",
    "response": "Based on your tax bracket and goals, ELSS offers higher returns but comes with market risk...",
    "intent": "investment_advice",
    "feedbackScore": 1,
    "contextUsed": ["vec_kb456", "vec_goal123"]
  }'
```

#### Response

```json
{
  "success": true,
  "data": {
    "vectorId": "vec_conv789",
    "indexedAt": "2026-01-25T20:15:00Z",
    "collection": "conversation_history"
  }
}
```

---

### 6. Batch Index

**POST** `/index/batch`

Index multiple documents in a single request (optimized for bulk operations).

#### Request Body

```typescript
{
  userId: string;
  documents: Array<{
    type: 'transaction' | 'goal' | 'knowledge' | 'conversation';
    data: any;               // Type-specific payload
  }>;
}
```

#### Example Request

```bash
curl -X POST http://localhost:3000/api/v1/rag/index/batch \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "documents": [
      {
        "type": "transaction",
        "data": {
          "transactionId": "tx_001",
          "amount": 5000,
          "category": "Shopping",
          "description": "Amazon purchase",
          "date": "2026-01-20T10:00:00Z"
        }
      },
      {
        "type": "goal",
        "data": {
          "goalId": "goal_002",
          "title": "Vacation Fund",
          "description": "Europe trip savings",
          "targetAmount": 300000,
          "currentAmount": 50000,
          "deadline": "2026-06-30T23:59:59Z"
        }
      }
    ]
  }'
```

#### Response

```json
{
  "success": true,
  "data": {
    "indexed": 2,
    "failed": 0,
    "vectorIds": ["vec_001", "vec_002"],
    "totalTime": 95
  }
}
```

---

### 7. Get Document by ID

**GET** `/documents/:vectorId`

Retrieve a specific document by its vector ID.

#### Example Request

```bash
curl http://localhost:3000/api/v1/rag/documents/vec_abc123
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": "vec_abc123",
    "text": "₹15,000 spent on Groceries at BigBasket on 15-12-2025",
    "metadata": {
      "userId": "user_123",
      "contextType": "transaction",
      "entityId": "tx_456",
      "amount": 15000,
      "category": "Groceries",
      "date": "2025-12-15T10:30:00Z"
    },
    "collection": "user_financial_context",
    "createdAt": "2025-12-15T10:31:00Z"
  }
}
```

---

### 8. Delete Document

**DELETE** `/documents/:vectorId`

Delete a document from the vector database.

#### Example Request

```bash
curl -X DELETE http://localhost:3000/api/v1/rag/documents/vec_abc123
```

#### Response

```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

---

### 9. Get User Statistics

**GET** `/metrics/user/:userId`

Get indexing and retrieval statistics for a specific user.

#### Example Request

```bash
curl http://localhost:3000/api/v1/rag/metrics/user/user_123
```

#### Response

```json
{
  "success": true,
  "data": {
    "userId": "user_123",
    "totalDocuments": 450,
    "documentsByType": {
      "transaction": 380,
      "goal": 12,
      "budget": 8,
      "conversation": 50
    },
    "avgRetrievalTime": 135,
    "avgRelevanceScore": 0.85,
    "totalSearches": 120,
    "lastIndexed": "2026-01-25T19:45:00Z"
  }
}
```

---

### 10. Get Global Statistics

**GET** `/stats`

Get global RAG pipeline statistics.

#### Example Request

```bash
curl http://localhost:3000/api/v1/rag/stats
```

#### Response

```json
{
  "success": true,
  "data": {
    "totalDocuments": 125000,
    "collectionSizes": {
      "user_financial_context": 95000,
      "financial_knowledge": 15000,
      "conversation_history": 15000
    },
    "totalSearches": 45000,
    "avgRetrievalTime": 142,
    "cacheHitRate": 0.82,
    "uptime": 7200,
    "lastUpdated": "2026-01-25T20:00:00Z"
  }
}
```

---

### 11. Health Check

**GET** `/health`

Check health status of RAG pipeline components.

#### Example Request

```bash
curl http://localhost:3000/api/v1/rag/health
```

#### Response

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "components": {
      "qdrant": {
        "status": "up",
        "latency": 12,
        "collections": ["user_financial_context", "financial_knowledge", "conversation_history"]
      },
      "redis": {
        "status": "up",
        "latency": 3,
        "cacheSize": 45000
      },
      "embeddingService": {
        "status": "up",
        "modelLoaded": true,
        "avgGenerationTime": 48
      }
    },
    "timestamp": "2026-01-25T20:00:00Z"
  }
}
```

---

### 12. Clear Embedding Cache

**POST** `/cache/clear`

Clear the Redis embedding cache (admin operation).

#### Request Body

```typescript
{
  pattern?: string;            // Optional key pattern (default: all)
}
```

#### Example Request

```bash
# Clear all cache
curl -X POST http://localhost:3000/api/v1/rag/cache/clear

# Clear specific pattern
curl -X POST http://localhost:3000/api/v1/rag/cache/clear \
  -H "Content-Type: application/json" \
  -d '{"pattern": "embedding:user_123:*"}'
```

#### Response

```json
{
  "success": true,
  "data": {
    "keysCleared": 1250,
    "memoryFreed": "45MB"
  }
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "query",
        "message": "query should not be empty"
      }
    ]
  },
  "timestamp": "2026-01-25T20:00:00Z"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request body or parameters |
| `NOT_FOUND` | 404 | Document or resource not found |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `VECTOR_STORE_ERROR` | 503 | Qdrant unavailable or error |
| `EMBEDDING_ERROR` | 500 | Embedding generation failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/search` | 100 requests | 1 minute |
| `/index/*` | 50 requests | 1 minute |
| `/index/batch` | 10 requests | 1 minute |
| `/cache/clear` | 5 requests | 1 hour |

---

## Best Practices

### 1. Search Optimization

- Set appropriate `scoreThreshold` to filter irrelevant results (0.7-0.8 is good)
- Use `topK` conservatively (5-10 for most use cases)
- Apply filters to reduce search space:
  ```json
  {
    "filters": {
      "dateFrom": "2025-12-01",  // Search only recent data
      "category": "Groceries"     // Narrow by category
    }
  }
  ```

### 2. Indexing Best Practices

- Use batch indexing for bulk operations (> 10 documents)
- Index immediately after entity creation for real-time retrieval
- Provide rich metadata for better filtering:
  ```json
  {
    "metadata": {
      "category": "Investment",
      "tags": ["ELSS", "tax-saving"],
      "priority": 5
    }
  }
  ```

### 3. Caching Strategy

- Reuse common queries (cache hit rate improves over time)
- Clear cache selectively (not globally) to preserve hot data
- Monitor cache hit rate via `/stats` endpoint

### 4. Error Handling

```javascript
try {
  const response = await fetch('/api/v1/rag/search', {
    method: 'POST',
    body: JSON.stringify(searchRequest)
  });
  
  if (!response.ok) {
    const error = await response.json();
    if (error.error.code === 'VECTOR_STORE_ERROR') {
      // Retry with exponential backoff
    } else if (error.error.code === 'VALIDATION_ERROR') {
      // Show validation errors to user
    }
  }
} catch (err) {
  // Network error
}
```

---

## Swagger UI

Interactive API documentation available at:

```
http://localhost:3000/api
```

Includes:
- Request/response schemas
- Try-it-out functionality
- Authentication configuration
- Example payloads

---

## SDK Examples

### TypeScript/JavaScript

```typescript
import axios from 'axios';

const ragClient = axios.create({
  baseURL: 'http://localhost:3000/api/v1/rag',
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Search
const searchResults = await ragClient.post('/search', {
  query: 'How much did I save last month?',
  userId: 'user_123',
  config: { topK: 5 }
});

// Index transaction
await ragClient.post('/index/transaction', {
  userId: 'user_123',
  transactionId: 'tx_001',
  amount: 5000,
  category: 'Savings',
  description: 'Monthly SIP',
  date: new Date().toISOString()
});
```

### Python

```python
import requests

BASE_URL = 'http://localhost:3000/api/v1/rag'
HEADERS = {
    'Authorization': f'Bearer {JWT_TOKEN}',
    'Content-Type': 'application/json'
}

# Search
response = requests.post(f'{BASE_URL}/search', json={
    'query': 'Show me my investment portfolio',
    'userId': 'user_123',
    'config': {'topK': 10}
}, headers=HEADERS)

results = response.json()['data']['results']

# Index goal
requests.post(f'{BASE_URL}/index/goal', json={
    'userId': 'user_123',
    'goalId': 'goal_001',
    'title': 'Retirement Fund',
    'targetAmount': 10000000,
    'currentAmount': 500000,
    'deadline': '2045-12-31T23:59:59Z'
}, headers=HEADERS)
```

---

## Postman Collection

Download the complete Postman collection:

```
GET /api/v1/rag/postman-collection
```

Import into Postman for quick testing.

---

## Support

For API issues or questions:
- GitHub Issues: [Nivesh Issues](https://github.com/your-org/nivesh/issues)
- Email: support@nivesh.ai
- Slack: #rag-pipeline

---

**Last Updated**: January 25, 2026  
**Version**: 1.0.0
