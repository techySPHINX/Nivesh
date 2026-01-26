# ML Services - Developer Quick Reference

## Setup & Installation

```bash
# 1. Navigate to ml-services
cd ml-services

# 2. Create virtual environment
python -m venv venv

# 3. Activate virtual environment
# Windows PowerShell
.\venv\Scripts\Activate.ps1

# Linux/Mac
source venv/bin/activate

# 4. Run setup script
python setup.py

# 5. Configure environment
cp .env.example .env
# Edit .env with your settings

# 6. Validate setup
python test_imports.py
```

## Fixed Issues Summary

### ✅ Critical Fixes Applied

1. **Pydantic V2 Compatibility**
   - Fixed: `BaseSettings` import in `shared/config.py`
   - Added: `pydantic-settings==2.1.0` to requirements

2. **Feature Store TODOs**
   - Completed: Database integration in `feature_store/builders.py`
   - Added: Loan and payment history queries
   - Added: Credit risk feature computation

3. **Missing Package Files**
   - Created: `__init__.py` files for all directories
   - Fixed: Import path issues

4. **Configuration Management**
   - Created: `.env.example` template
   - Added: All required environment variables

## Module Structure

```
ml-services/
├── shared/              # Shared utilities
│   ├── config.py       # ✅ FIXED: Pydantic imports
│   ├── logger.py       # Logging utilities
│   ├── metrics.py      # Prometheus metrics
│   └── mlflow_utils.py # MLflow helpers
│
├── feature_store/       # Feature engineering
│   ├── builders.py     # ✅ FIXED: Database integration
│   └── store.py        # Redis-based feature store
│
├── intent_classifier/   # DistilBERT for intent classification
├── financial_ner/       # spaCy NER for financial entities
├── anomaly_detector/    # Isolation Forest for anomaly detection
├── credit_risk_scorer/  # XGBoost for credit risk
├── spending_predictor/  # Prophet for spending forecasting
├── gemini_advisor/      # Gemini Pro integration
│
├── drift_detection/     # ✅ NEW: __init__.py added
├── model_server/        # ✅ NEW: __init__.py added
│   └── app.py          # FastAPI server
│
└── airflow/             # ✅ NEW: __init__.py added
    └── dags/            # Training pipelines
```

## Common Commands

### Development

```bash
# Format code
python -m black .

# Lint code
python -m flake8 . --max-line-length=120

# Type check
python -m mypy shared/ --ignore-missing-imports

# Run all tests
python run_tests.py
```

### MLflow

```bash
# Start MLflow server
mlflow server --host 0.0.0.0 --port 5000 --backend-store-uri sqlite:///mlflow.db

# View UI
# http://localhost:5000
```

### Model Server

```bash
# Start development server
uvicorn model_server.app:app --reload --port 8000

# Start production server
uvicorn model_server.app:app --host 0.0.0.0 --port 8000 --workers 4

# API docs
# http://localhost:8000/docs
```

### Training Models

```bash
# Train intent classifier
python -m intent_classifier.train --data data/intents.json

# Train NER
python -m financial_ner.train --data data/ner_training.json

# Train anomaly detector
python -m anomaly_detector.train --data data/transactions.json

# Train credit risk scorer
python -m credit_risk_scorer.train --data data/credit_applications.json

# Train spending predictor
python -m spending_predictor.train --data data/transactions.json
```

## Environment Variables

### Required

```env
# MLflow
MLFLOW_TRACKING_URI=http://localhost:5000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/nivesh

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password

# Google AI (for Gemini)
GOOGLE_API_KEY=your_api_key_here
```

### Optional

```env
# Model Storage
MODEL_STORAGE_BACKEND=local  # or s3, gcs
MODEL_STORAGE_PATH=./models

# Training
TRAINING_BATCH_SIZE=16
TRAINING_EPOCHS=3
LEARNING_RATE=2e-5
```

## API Endpoints

### Health & Metrics

```bash
# Health check
curl http://localhost:8000/health

# Prometheus metrics
curl http://localhost:8000/metrics
```

### Model Predictions

```bash
# Intent classification
curl -X POST http://localhost:8000/predict/intent \
  -H "Content-Type: application/json" \
  -d '{"query": "Can I afford a new car?"}'

# Financial NER
curl -X POST http://localhost:8000/predict/ner \
  -H "Content-Type: application/json" \
  -d '{"text": "I spent ₹5000 on groceries at BigBasket"}'

# Anomaly detection
curl -X POST http://localhost:8000/predict/anomaly \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user123", "transaction": {"amount": 50000, "merchant": "Unknown"}}'

# Credit risk
curl -X POST http://localhost:8000/predict/credit-risk \
  -H "Content-Type: application/json" \
  -d '{"applicant_data": {"annual_income": 600000, "credit_score": 750}}'

# Spending prediction
curl -X POST http://localhost:8000/predict/spending \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user123", "months": 6}'
```

## Troubleshooting

### Import Errors

```bash
# Run import validation
python test_imports.py

# Check Python path
python -c "import sys; print(sys.path)"

# Reinstall package in development mode
pip install -e .
```

### Database Connection

```bash
# Test database connection
python -c "from shared.config import config; print(config.database_url)"

# Check PostgreSQL
psql -h localhost -U postgres -d nivesh
```

### Redis Connection

```bash
# Test Redis connection
python -c "import redis; r=redis.Redis(host='localhost', port=6379); print(r.ping())"

# Check Redis
redis-cli ping
```

### MLflow Issues

```bash
# Check MLflow server
curl http://localhost:5000/health

# List experiments
mlflow experiments list --tracking-uri http://localhost:5000

# Clear cache
rm -rf mlruns/
```

## Testing

### Unit Tests (To Be Added)

```bash
# Run all tests
pytest tests/ -v

# Run specific test
pytest tests/unit/test_intent_classifier.py -v

# With coverage
pytest tests/ --cov=. --cov-report=html
```

### Load Testing

```bash
# Using locust
locust -f tests/load/locustfile.py --host http://localhost:8000
```

## Docker

```bash
# Build image
docker build -t nivesh-ml-services .

# Run container
docker run -p 8000:8000 --env-file .env nivesh-ml-services

# Docker Compose
docker-compose up -d
```

## Monitoring

### Prometheus Queries

```promql
# Prediction rate
rate(ml_predictions_total[5m])

# Prediction latency (p95)
histogram_quantile(0.95, ml_prediction_latency_seconds)

# Error rate
rate(ml_errors_total[5m])
```

### Grafana Dashboard

- Import dashboard from `monitoring/grafana/dashboards/ml-services.json`

## Deployment

### Local Development

```bash
# Start all services
docker-compose up

# Or manually
mlflow server --host 0.0.0.0 --port 5000 &
redis-server &
uvicorn model_server.app:app --reload
```

### Production (Kubernetes)

```bash
# Apply manifests
kubectl apply -f k8s/

# Check status
kubectl get pods -l app=ml-services

# View logs
kubectl logs -l app=ml-services -f
```

## Best Practices

### Code Quality

- ✅ Use type hints
- ✅ Write docstrings
- ✅ Format with Black
- ✅ Lint with Flake8
- ✅ Type check with MyPy

### ML Development

- ✅ Track experiments with MLflow
- ✅ Version datasets
- ✅ Log hyperparameters
- ✅ Monitor model performance
- ✅ Implement drift detection

### Production

- ✅ Use environment variables
- ✅ Implement health checks
- ✅ Add monitoring
- ✅ Set up alerting
- ✅ Document runbooks

## Resources

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [MLflow Docs](https://mlflow.org/docs/latest/index.html)
- [Transformers Docs](https://huggingface.co/docs/transformers)
- [Prophet Docs](https://facebook.github.io/prophet/)
- [spaCy Docs](https://spacy.io/)

## Support

- **Issues**: Create GitHub issue
- **Questions**: Check ML_REVIEW_REPORT.md
- **Contributing**: See CONTRIBUTING.md

---

## Summary of Fixes

### Before

- ❌ Pydantic import errors
- ❌ Incomplete database integration
- ❌ Missing package files
- ❌ No environment configuration
- ❌ No validation scripts

### After

- ✅ All imports working
- ✅ Full database integration
- ✅ Complete package structure
- ✅ Comprehensive .env template
- ✅ Setup and validation scripts
- ✅ Developer documentation
- ✅ Testing framework

**Status**: Ready for Development! 🚀
