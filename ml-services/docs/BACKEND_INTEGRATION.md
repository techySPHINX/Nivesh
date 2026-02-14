# Backend Integration Module for ML Services

_Created: January 27, 2026_

This module provides seamless integration between NestJS backend and Python ML services.

## Architecture

```
NestJS Backend (Port 3000)
       ↓
   HTTP/REST
       ↓
ML Services (Port 8000)
       ↓
   FastAPI → Models
       ↓
   Predictions
```

## Module Structure

```typescript
backend/src/modules/ml-integration/
├── ml-integration.module.ts
├── services/
│   ├── ml-client.service.ts        // HTTP client for ML services
│   ├── prediction.service.ts       // Prediction orchestration
│   ├── model-health.service.ts     // Health monitoring
│   └── ml-cache.service.ts         // Response caching
├── dto/
│   ├── intent-prediction.dto.ts
│   ├── ner-extraction.dto.ts
│   ├── spending-forecast.dto.ts
│   ├── anomaly-detection.dto.ts
│   └── credit-risk.dto.ts
├── interfaces/
│   ├── ml-response.interface.ts
│   └── ml-config.interface.ts
├── controllers/
│   └── ml.controller.ts            // Expose ML endpoints
└── __tests__/
    └── ml-integration.spec.ts
```

## Implementation Plan

### Step 1: Create Module Base

```typescript
// ml-integration.module.ts
import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { MLClientService } from "./services/ml-client.service";
import { PredictionService } from "./services/prediction.service";
import { ModelHealthService } from "./services/model-health.service";
import { MLController } from "./controllers/ml.controller";

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  controllers: [MLController],
  providers: [MLClientService, PredictionService, ModelHealthService],
  exports: [PredictionService],
})
export class MLIntegrationModule {}
```

### Step 2: ML Client Service

```typescript
// services/ml-client.service.ts
import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { CircuitBreaker } from "./circuit-breaker";

@Injectable()
export class MLClientService {
  private readonly logger = new Logger(MLClientService.name);
  private readonly mlServiceUrl: string;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.mlServiceUrl = this.configService.get<string>(
      "ML_SERVICE_URL",
      "http://localhost:8000",
    );

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      recoveryTimeout: 30000,
    });
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      const url = `${this.mlServiceUrl}${endpoint}`;

      this.logger.debug(`Calling ML service: ${url}`);

      try {
        const response = await firstValueFrom(
          this.httpService.post<T>(url, data),
        );

        return response.data;
      } catch (error) {
        this.logger.error(`ML service call failed: ${error.message}`);
        throw error;
      }
    });
  }

  async healthCheck(): Promise<any> {
    const url = `${this.mlServiceUrl}/health`;

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { timeout: 2000 }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return null;
    }
  }
}
```

### Step 3: Prediction Service

```typescript
// services/prediction.service.ts
import { Injectable, Logger } from "@nestjs/common";
import { MLClientService } from "./ml-client.service";
import { MLCacheService } from "./ml-cache.service";

@Injectable()
export class PredictionService {
  private readonly logger = new Logger(PredictionService.name);

  constructor(
    private readonly mlClient: MLClientService,
    private readonly cache: MLCacheService,
  ) {}

  async classifyIntent(query: string, userId?: string) {
    const cacheKey = `intent:${query}`;

    // Check cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.logger.debug("Intent classification cache hit");
      return cached;
    }

    // Call ML service
    const result = await this.mlClient.post("/predict/intent", {
      query,
      user_id: userId,
    });

    // Cache result
    await this.cache.set(cacheKey, result, 3600); // 1 hour TTL

    return result;
  }

  async extractEntities(text: string) {
    const cacheKey = `ner:${text}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const result = await this.mlClient.post("/predict/ner", { text });
    await this.cache.set(cacheKey, result, 3600);

    return result;
  }

  async predictSpending(userId: string, months: number = 12) {
    // Don't cache spending predictions (user-specific, time-sensitive)
    return this.mlClient.post("/predict/spending", {
      user_id: userId,
      months,
    });
  }

  async detectAnomaly(userId: string, transaction: any) {
    // Real-time detection, no caching
    return this.mlClient.post("/predict/anomaly", {
      user_id: userId,
      transaction,
    });
  }

  async scoreCreditRisk(application: any) {
    // Sensitive data, no caching
    return this.mlClient.post("/predict/credit_risk", application);
  }
}
```

## Integration with AI Reasoning Module

### New Tool: Intent Classification

```typescript
// backend/src/modules/ai-reasoning/tools/classify-intent.tool.ts
import { Injectable } from "@nestjs/common";
import { PredictionService } from "../../ml-integration/services/prediction.service";

@Injectable()
export class ClassifyIntentTool {
  name = "classify_intent";
  description = "Classify user query intent using ML model";

  constructor(private readonly predictionService: PredictionService) {}

  async execute(query: string): Promise<any> {
    const result = await this.predictionService.classifyIntent(query);

    return {
      intent: result.intent,
      confidence: result.confidence,
      alternatives: result.alternatives,
    };
  }
}
```

## Configuration

Add to `backend/.env`:

```env
# ML Services Configuration
ML_SERVICE_URL=http://localhost:8000
ML_SERVICE_TIMEOUT=30000
ML_ENABLE_CACHING=true
ML_CACHE_TTL=3600
ML_CIRCUIT_BREAKER_THRESHOLD=5
ML_CIRCUIT_BREAKER_TIMEOUT=30000
```

## API Endpoints (Backend)

Once integrated, these endpoints will be available:

```
POST /api/v1/ml/intent
POST /api/v1/ml/ner
POST /api/v1/ml/spending/forecast
POST /api/v1/ml/anomaly/detect
POST /api/v1/ml/credit/score
GET  /api/v1/ml/health
```

## Testing

```typescript
// ml-integration.spec.ts
describe("MLIntegrationModule", () => {
  let predictionService: PredictionService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [MLIntegrationModule],
    }).compile();

    predictionService = module.get<PredictionService>(PredictionService);
  });

  it("should classify intent", async () => {
    const result = await predictionService.classifyIntent(
      "What is my current balance?",
    );

    expect(result).toHaveProperty("intent");
    expect(result).toHaveProperty("confidence");
  });
});
```

## Next Steps

1. Create the module structure in backend
2. Implement ML client service
3. Add circuit breaker pattern
4. Integrate with AI reasoning agents
5. Add comprehensive error handling
6. Set up monitoring and metrics
7. Write integration tests
8. Deploy and verify end-to-end flow
