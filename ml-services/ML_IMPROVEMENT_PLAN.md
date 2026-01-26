# ML Services Comprehensive Improvement Plan

_Status: Ready for Execution_  
_Created: January 27, 2026_

## 🎯 Executive Summary

This document outlines a **4-phase strategic plan** to transform ml-services into a production-ready, enterprise-grade ML platform with proper backend integration, MLOps practices, and training infrastructure.

### Current State Assessment

✅ **Strengths:**

- Strong foundational architecture with 6 ML models
- MLflow experiment tracking configured
- Feature store (Redis) architecture in place
- FastAPI model server scaffolding
- Comprehensive requirements.txt with modern ML stack

⚠️ **Critical Gaps:**

- ❌ No backend integration layer (NestJS → ML Services)
- ❌ Incomplete dependency installation (PyTorch, SpaCy, Prophet)
- ❌ Missing .env configuration
- ❌ No health check endpoints for backend connectivity
- ❌ Airflow DAGs not fully tested
- ❌ No data validation pipelines
- ❌ Missing model versioning strategy
- ❌ No CI/CD for model deployment
- ❌ Lack of model monitoring dashboards
- ❌ No backup/rollback mechanisms

---

## 📋 4-Phase Execution Plan

### **PHASE 1: Foundation & Environment Setup** 🏗️

**Duration:** 2-3 days  
**Goal:** Complete dependency installation, configuration, and basic connectivity

#### 1.1 Dependencies Resolution

- [ ] Complete PyTorch installation (CPU/CUDA based on hardware)
- [ ] Install all NLP libraries (SpaCy, sentence-transformers)
- [ ] Download SpaCy language models
- [ ] Install Prophet and time-series dependencies
- [ ] Verify XGBoost, LightGBM, CatBoost compatibility
- [ ] Install Airflow with all providers
- [ ] Configure Redis with persistence

#### 1.2 Environment Configuration

- [ ] Create `.env` from `.env.example`
- [ ] Configure database connections (PostgreSQL for MLflow)
- [ ] Set up Redis credentials and connection pooling
- [ ] Configure Google AI API keys (Gemini)
- [ ] Set MLflow tracking URI
- [ ] Configure model storage (local/S3/GCS)
- [ ] Set Prometheus metrics endpoints

#### 1.3 Basic Connectivity Tests

- [ ] Test Redis connection and caching
- [ ] Verify PostgreSQL connection for MLflow
- [ ] Check MLflow UI accessibility
- [ ] Validate FastAPI server startup
- [ ] Test health check endpoints

**Deliverables:**

- ✅ All dependencies installed
- ✅ `.env` file configured
- ✅ All services connectable
- ✅ Health check passing

---

### **PHASE 2: Backend Integration & API Layer** 🔗

**Duration:** 3-4 days  
**Goal:** Seamless NestJS ↔ ML Services communication

#### 2.1 ML Service REST API Enhancement

- [ ] Implement comprehensive health checks
  - Model loading status
  - Redis connectivity
  - MLflow availability
- [ ] Add authentication middleware (JWT from backend)
- [ ] Implement request validation with Pydantic v2
- [ ] Add rate limiting for predictions
- [ ] Create batch prediction endpoints
- [ ] Add async prediction queues (Celery/RQ)

#### 2.2 Backend Integration Module

**Create:** `backend/src/modules/ml-integration/`

```typescript
// Structure:
ml-integration/
├── ml-integration.module.ts
├── services/
│   ├── ml-client.service.ts       // HTTP client for ML services
│   ├── prediction.service.ts      // Prediction orchestration
│   └── model-health.service.ts    // Model health monitoring
├── dto/
│   ├── intent-prediction.dto.ts
│   ├── ner-extraction.dto.ts
│   ├── spending-forecast.dto.ts
│   ├── anomaly-detection.dto.ts
│   └── credit-risk.dto.ts
└── interfaces/
    └── ml-response.interface.ts
```

**Key Features:**

- Circuit breaker pattern for resilience
- Request/response caching
- Fallback mechanisms
- Error handling and retries
- Metrics collection

#### 2.3 Integration Points in AI-Reasoning Module

- [ ] Add ML predictions to agent tools
- [ ] Create `IntentClassificationTool`
- [ ] Create `FinancialNERTool`
- [ ] Create `SpendingPredictionTool`
- [ ] Create `AnomalyDetectionTool`
- [ ] Integrate with `FinancialPlanningAgent`

#### 2.4 API Gateway Configuration

- [ ] Update `docker-compose.yml` with ml-services
- [ ] Configure reverse proxy (if using Nginx)
- [ ] Set up service discovery
- [ ] Add CORS configuration

**Deliverables:**

- ✅ ML Integration module in backend
- ✅ All prediction endpoints accessible from NestJS
- ✅ Circuit breaker and caching working
- ✅ E2E integration tests passing

---

### **PHASE 3: MLOps Infrastructure & Training Pipelines** 🚀

**Duration:** 4-5 days  
**Goal:** Production-grade ML operations with automated training

#### 3.1 Enhanced MLflow Setup

- [ ] Configure MLflow with PostgreSQL backend
- [ ] Set up model registry
- [ ] Implement model promotion workflow (dev → staging → prod)
- [ ] Add model signatures and schemas
- [ ] Create model versioning strategy (semantic versioning)
- [ ] Set up experiment comparison dashboards

#### 3.2 Feature Store Enhancement

**Implement:** `feature_store/advanced_store.py`

```python
class AdvancedFeatureStore:
    - Feature versioning
    - Feature lineage tracking
    - Point-in-time correctness
    - Feature monitoring
    - Offline/online consistency
    - Feature serving API
```

#### 3.3 Data Validation & Quality

**Create:** `ml-services/data_validation/`

- [ ] Implement data schema validation (Pydantic)
- [ ] Add data drift detection (Evidently)
- [ ] Create data quality reports
- [ ] Set up automated data ingestion
- [ ] Add data versioning (DVC or similar)

#### 3.4 Training Pipeline Orchestration

**Enhance Airflow DAGs:**

1. **Master Training Pipeline**
   - Scheduled weekly retraining
   - Parallel model training
   - Model evaluation and comparison
   - Automated model registration
   - Promotion to staging/prod

2. **Model-Specific DAGs**
   - Intent classifier training
   - Credit risk scorer training
   - Anomaly detector training
   - Spending predictor training
   - NER model training

3. **Data Pipeline DAG**
   - Data extraction from backend DB
   - Feature engineering
   - Data validation
   - Feature store update

#### 3.5 Model Monitoring

**Create:** `ml-services/monitoring/`

- [ ] Prediction latency monitoring
- [ ] Model accuracy tracking
- [ ] Data drift detection
- [ ] Concept drift alerts
- [ ] Feature importance monitoring
- [ ] A/B testing framework

**Prometheus Metrics:**

```python
- ml_prediction_latency_seconds
- ml_prediction_total
- ml_model_accuracy
- ml_data_drift_score
- ml_feature_missing_rate
- ml_cache_hit_rate
```

#### 3.6 Model Testing Framework

**Create:** `ml-services/tests/`

```
tests/
├── unit/
│   ├── test_models.py
│   ├── test_feature_engineering.py
│   └── test_preprocessing.py
├── integration/
│   ├── test_api_endpoints.py
│   ├── test_mlflow_integration.py
│   └── test_redis_cache.py
└── performance/
    ├── test_prediction_latency.py
    ├── test_batch_processing.py
    └── test_model_accuracy.py
```

**Deliverables:**

- ✅ MLflow fully configured with registry
- ✅ Feature store with versioning
- ✅ Data validation pipeline
- ✅ Airflow DAGs operational
- ✅ Monitoring dashboards live
- ✅ Comprehensive test suite (>80% coverage)

---

### **PHASE 4: Production Readiness & Training Execution** 🎓

**Duration:** 3-4 days  
**Goal:** Deploy models, execute training, and prepare for ML engineering

#### 4.1 Model Training Execution

**For Each Model:**

1. **Intent Classifier (DistilBERT)**

   ```bash
   python intent_classifier/train.py \
     --data-path ./data/intents.json \
     --epochs 5 \
     --batch-size 32 \
     --learning-rate 2e-5
   ```

2. **Financial NER (SpaCy)**

   ```bash
   python financial_ner/train.py \
     --data-path ./data/ner_training.json \
     --iterations 30
   ```

3. **Spending Predictor (Prophet)**

   ```bash
   python spending_predictor/train.py \
     --data-path ./data/transactions.json \
     --forecast-horizon 365
   ```

4. **Anomaly Detector (Isolation Forest)**

   ```bash
   python anomaly_detector/train.py \
     --data-path ./data/transactions.json \
     --contamination 0.01
   ```

5. **Credit Risk Scorer (XGBoost)**
   ```bash
   python credit_risk_scorer/train.py \
     --data-path ./data/credit_applications.json \
     --max-depth 6 \
     --n-estimators 100
   ```

#### 4.2 Model Evaluation & Registration

- [ ] Evaluate each model on test set
- [ ] Compare against baseline metrics
- [ ] Register best models in MLflow
- [ ] Generate model cards (documentation)
- [ ] Create ONNX exports for cross-platform inference
- [ ] Set up model serving endpoints

#### 4.3 Deployment Configuration

**Docker:**

```dockerfile
# Multi-stage build for ML services
FROM python:3.10-slim as builder
FROM python:3.10-slim as runtime
```

**docker-compose.yml enhancement:**

```yaml
services:
  ml-services:
    build: ./ml-services
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_HOST=redis
      - MLFLOW_TRACKING_URI=http://mlflow:5000
    depends_on:
      - redis
      - mlflow
      - postgres
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

#### 4.4 CI/CD Pipeline

**GitHub Actions:** `.github/workflows/ml-services.yml`

```yaml
name: ML Services CI/CD

on:
  push:
    paths:
      - "ml-services/**"
  pull_request:
    paths:
      - "ml-services/**"

jobs:
  test:
    - Lint (black, flake8, mypy)
    - Unit tests
    - Integration tests
    - Model validation tests

  train:
    - Trigger training pipelines
    - Evaluate models
    - Register if better than baseline

  deploy:
    - Build Docker image
    - Push to registry
    - Deploy to staging
    - Run smoke tests
    - Deploy to production
```

#### 4.5 ML Engineer Documentation

**Create:** `ml-services/docs/ML_ENGINEER_GUIDE.md`

**Contents:**

- Architecture overview
- Model training procedures
- Hyperparameter tuning guide
- Model evaluation metrics
- Deployment workflow
- Monitoring and alerting
- Troubleshooting guide
- API documentation
- Experiment tracking guide
- Feature engineering guide

#### 4.6 Operational Runbooks

**Create:** `ml-services/docs/RUNBOOKS/`

1. `MODEL_DEPLOYMENT.md` - How to deploy new models
2. `INCIDENT_RESPONSE.md` - How to handle model failures
3. `RETRAINING.md` - When and how to retrain
4. `ROLLBACK.md` - How to rollback models
5. `MONITORING.md` - What to monitor and alert on

**Deliverables:**

- ✅ All 5 models trained and evaluated
- ✅ Models registered in MLflow with metadata
- ✅ Docker images built and tested
- ✅ CI/CD pipeline operational
- ✅ Comprehensive documentation
- ✅ Monitoring dashboards configured
- ✅ Production deployment completed

---

## 🔧 Implementation Details

### Technology Stack Validation

```yaml
Core ML:
  - PyTorch: 2.2.0 (Deep Learning)
  - Transformers: 4.37.0 (NLP)
  - SpaCy: 3.7.2 (NER)
  - Prophet: 1.1.5 (Time Series)
  - XGBoost: 2.0.3 (Gradient Boosting)
  - Scikit-learn: 1.4.0 (Traditional ML)

MLOps:
  - MLflow: 2.10.0 (Experiment Tracking & Registry)
  - Airflow: 2.8.0 (Orchestration)
  - Evidently: 0.4.13 (Monitoring)
  - Redis: 5.0.1 (Feature Store)

Serving:
  - FastAPI: 0.109.0 (API Framework)
  - Uvicorn: 0.27.0 (ASGI Server)
  - Prometheus: Client 0.19.0 (Metrics)

Backend Integration:
  - NestJS: HTTP Module (REST Client)
  - Bull: Queue Management (Optional)
```

### File Structure Enhancements

```
ml-services/
├── .github/
│   └── workflows/
│       └── ml-services.yml           # CI/CD pipeline
├── models/                            # Trained model artifacts
│   ├── intent_classifier/
│   ├── financial_ner/
│   ├── spending_predictor/
│   ├── anomaly_detector/
│   └── credit_risk_scorer/
├── data_validation/                   # NEW
│   ├── __init__.py
│   ├── schemas.py
│   ├── validators.py
│   └── drift_detector.py
├── monitoring/                        # ENHANCED
│   ├── __init__.py
│   ├── model_monitor.py
│   ├── performance_tracker.py
│   ├── alert_manager.py
│   └── dashboards/
│       ├── model_performance.json
│       └── data_quality.json
├── tests/                             # NEW
│   ├── unit/
│   ├── integration/
│   └── performance/
├── docs/                              # ENHANCED
│   ├── ML_ENGINEER_GUIDE.md
│   ├── API_REFERENCE.md
│   ├── TRAINING_GUIDE.md
│   └── RUNBOOKS/
├── scripts/                           # NEW
│   ├── train_all_models.sh
│   ├── deploy_model.sh
│   ├── rollback_model.sh
│   └── health_check.sh
└── .env                               # Configuration
```

---

## 🎯 Success Criteria

### Phase 1 ✅

- [ ] All Python packages installed without errors
- [ ] `.env` configured with valid credentials
- [ ] Redis, PostgreSQL, MLflow accessible
- [ ] FastAPI server starts successfully

### Phase 2 ✅

- [ ] Backend can call ML services via HTTP
- [ ] All 5 prediction endpoints respond correctly
- [ ] Integration tests pass (>95% success rate)
- [ ] Circuit breaker prevents cascading failures

### Phase 3 ✅

- [ ] MLflow tracks experiments and registers models
- [ ] Airflow DAGs execute without errors
- [ ] Feature store serves features <50ms latency
- [ ] Monitoring dashboards show real-time metrics

### Phase 4 ✅

- [ ] All models trained with acceptable accuracy:
  - Intent Classifier: >95% accuracy
  - Financial NER: >90% F1 score
  - Spending Predictor: <15% MAPE
  - Anomaly Detector: >85% AUC
  - Credit Risk Scorer: >80% AUC
- [ ] Models deployed and serving predictions
- [ ] CI/CD pipeline completes end-to-end
- [ ] Documentation complete and reviewed

---

## 🚨 Risk Mitigation

### Identified Risks & Solutions

1. **Dependency Conflicts**
   - **Risk:** PyTorch, TensorFlow version conflicts
   - **Mitigation:** Use virtual environment, pin versions
   - **Fallback:** Use Docker for isolated environment

2. **Backend Integration Failures**
   - **Risk:** Network timeouts, API changes
   - **Mitigation:** Circuit breaker, retry logic, health checks
   - **Fallback:** Cached predictions, graceful degradation

3. **Training Data Quality**
   - **Risk:** Insufficient or biased training data
   - **Mitigation:** Data validation, augmentation, bias detection
   - **Fallback:** Use synthetic data, transfer learning

4. **Model Performance Degradation**
   - **Risk:** Drift, concept change
   - **Mitigation:** Continuous monitoring, automated retraining
   - **Fallback:** Rollback to previous model version

5. **Resource Constraints**
   - **Risk:** CPU/memory limitations during training
   - **Mitigation:** Batch processing, model quantization
   - **Fallback:** Cloud training (GCP Vertex AI)

---

## 📈 Metrics & KPIs

### Operational Metrics

- **Prediction Latency:** <100ms (p95)
- **Throughput:** >1000 req/sec
- **Availability:** 99.9% uptime
- **Error Rate:** <0.1%
- **Cache Hit Rate:** >80%

### Model Performance Metrics

- **Intent Classifier:** Accuracy, F1, Confusion Matrix
- **Financial NER:** Precision, Recall, F1 per entity type
- **Spending Predictor:** MAPE, RMSE, MAE
- **Anomaly Detector:** AUC-ROC, Precision@K
- **Credit Risk Scorer:** AUC-ROC, Gini, KS Statistic

### MLOps Metrics

- **Training Frequency:** Weekly automated
- **Model Deployment Time:** <30 minutes
- **Experiment Tracking:** 100% coverage
- **Model Registry:** All models versioned
- **Monitoring Coverage:** 100% of endpoints

---

## 🛠️ Tools & Resources

### Required Access

- [ ] GitHub repository access
- [ ] PostgreSQL database credentials
- [ ] Redis server access
- [ ] Google Cloud Platform (for Gemini API)
- [ ] MLflow server (if hosted)
- [ ] Airflow UI credentials

### Development Environment

- Python 3.10+
- Node.js 18+ (for backend)
- Docker & Docker Compose
- Git
- VS Code / PyCharm

### External Services

- MLflow Tracking Server
- Redis Cache
- PostgreSQL Database
- Prometheus + Grafana (monitoring)
- Airflow Scheduler

---

## 📞 Support & Escalation

### Phase 1-2: Foundation Issues

- **Contact:** DevOps Lead
- **Escalation:** CTO

### Phase 3-4: ML Engineering Issues

- **Contact:** ML Lead / Data Scientist
- **Escalation:** Head of AI

### Production Incidents

- **On-call:** ML Engineer (24/7)
- **Severity 1:** Page immediately
- **Severity 2:** Alert within 15 min

---

## 📅 Timeline Summary

| Phase   | Duration | Dependencies | Team                  |
| ------- | -------- | ------------ | --------------------- |
| Phase 1 | 2-3 days | None         | DevOps + ML Engineer  |
| Phase 2 | 3-4 days | Phase 1      | Backend + ML Engineer |
| Phase 3 | 4-5 days | Phase 1      | ML Engineer + MLOps   |
| Phase 4 | 3-4 days | Phase 1-3    | ML Engineer           |

**Total Estimated Time:** 12-16 days

---

## ✅ Next Steps

1. **Review this plan** with team leads
2. **Assign owners** for each phase
3. **Set up project tracking** (Jira/Linear)
4. **Begin Phase 1** immediately
5. **Schedule daily standups** during execution
6. **Prepare rollback plans** before production deployment

---

_This plan represents a comprehensive approach to making ml-services production-ready with proper backend integration, following MLOps best practices._

**Status:** ✅ Ready for Execution  
**Last Updated:** January 27, 2026  
**Version:** 1.0  
**Authors:** ML Team + DevOps Team
