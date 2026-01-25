# Nivesh MLOps - Model Training Guide

## Overview

This guide covers training, evaluating, and deploying machine learning models for the Nivesh financial advisor platform.

## Prerequisites

1. **Python Environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Infrastructure Services**
   ```bash
   cd ml-services
   docker-compose up -d
   ```

   This starts:
   - MLflow tracking server (port 5000)
   - Redis feature store (port 6379)
   - Prometheus metrics (port 9090)
   - Grafana dashboards (port 3001)

3. **Database Setup**
   ```bash
   cd ../backend
   npx prisma migrate deploy
   ```

## Model Training Workflows

### 1. Intent Classification Model

**Purpose:** Classify user financial queries into 14 intent categories

**Training:**

```bash
cd ml-services/intent_classifier
python train.py --data-path ../data/intents.json
```

**Output:**
- Trained model in `./models/intent_classifier/`
- MLflow experiment logged
- ONNX export for fast inference
- Confusion matrix visualization
- Classification report (JSON)

**Metrics:**
- Target Accuracy: >99%
- Target F1 Score: >0.95

**Evaluation:**

```python
from intent_classifier import IntentClassifier

# Load trained model
classifier = IntentClassifier()
classifier.load_model()
classifier.model = torch.load('./models/intent_classifier/pytorch_model.bin')

# Predict
result = classifier.predict("Can I afford a ₹50L loan?")
print(result)
# {'intent': 'affordability_check', 'confidence': 0.98, 'alternatives': [...]}
```

### 2. Financial NER (Named Entity Recognition)

**Purpose:** Extract financial entities from text

**Entity Types:**
- `MONEY`: ₹50,000, $100
- `DATE`: next month, in 2 years
- `CATEGORY`: groceries, EMI
- `MERCHANT`: Swiggy, Amazon
- `ACCOUNT`: savings account, credit card

**Training:**

```bash
cd ml-services/financial_ner
python train.py --data-path ../data/ner_training.json --iterations 30
```

**Output:**
- SpaCy model in `./models/financial_ner/`
- MLflow experiment with per-entity metrics

**Metrics:**
- Target F1 per entity: >0.90
- Overall F1: >0.92

**Evaluation:**

```python
from financial_ner import FinancialNER

ner = FinancialNER()
ner.load_model('./models/financial_ner')

entities = ner.predict("I spent ₹5000 on groceries last month")
print(entities)
# [
#   {'text': '₹5000', 'label': 'MONEY', 'start': 9, 'end': 14},
#   {'text': 'groceries', 'label': 'CATEGORY', 'start': 18, 'end': 27},
#   {'text': 'last month', 'label': 'DATE', 'start': 28, 'end': 38}
# ]
```

### 3. Spending Pattern Prediction (Prophet)

**Purpose:** Forecast user spending for next 6-12 months

**Training:**

```bash
cd ml-services/spending_predictor
python train.py --user-id all --horizon 365
```

**Features:**
- Historical spending by category
- Seasonality (monthly, yearly)
- Special events (festivals, holidays)
- Income changes

**Output:**
- Per-user or segment-level Prophet models
- Forecast with confidence intervals
- Seasonality components visualization

### 4. Anomaly Detection (Isolation Forest)

**Purpose:** Detect unusual transactions

**Training:**

```bash
cd ml-services/anomaly_detector
python train.py --contamination 0.01
```

**Features:**
- Transaction amount z-score
- Merchant frequency
- Time of day/week
- Category deviation from average

**Metrics:**
- False Positive Rate: <1%
- Detection Rate: >95%

### 5. Credit Risk Scoring (XGBoost)

**Purpose:** Predict loan default probability

**Training:**

```bash
cd ml-services/credit_risk
python train.py --data-path ../data/loan_applications.csv
```

**Features:**
- Debt-to-income ratio
- Income stability
- Existing loan count
- Payment history (on-time %)
- Emergency fund coverage
- Credit utilization

**Metrics:**
- Target AUC-ROC: >0.85
- Fairness metrics validated

### 6. Fine-tuned Gemini Pro

**Purpose:** Domain-specific financial advisor

**Fine-tuning:**

```bash
cd ml-services/gemini_tuning
python tune.py --data-path ../data/financial_advice.jsonl
```

**Training Data Format:**

```jsonl
{"instruction": "User asks about tax-saving", "input": "How can I save tax?", "output": "You can save tax through:\n1. Section 80C: ₹1.5L deduction..."}
```

## MLflow Workflow

### Experiment Tracking

```python
import mlflow
from shared.mlflow_utils import create_experiment, log_model_params, log_model_metrics

# Create experiment
create_experiment('my_experiment', tags={'version': '1.0'})
mlflow.set_experiment('my_experiment')

# Start run
with mlflow.start_run(run_name='training_run_1'):
    # Log parameters
    log_model_params({
        'learning_rate': 0.001,
        'batch_size': 32,
        'epochs': 10
    })
    
    # Train model
    model = train_model()
    
    # Log metrics
    log_model_metrics({
        'accuracy': 0.95,
        'f1_score': 0.93
    })
    
    # Log artifacts
    mlflow.log_artifact('confusion_matrix.png')
    
    # Log model
    mlflow.pytorch.log_model(model, 'model')
```

### Model Registry

```python
from shared.mlflow_utils import register_model, transition_model_stage

# Register model
model_version = register_model(
    model_name='intent_classifier',
    model_uri='runs:/<run_id>/model',
    description='Intent classifier v1.2.0'
)

# Transition to staging
transition_model_stage(
    model_name='intent_classifier',
    version='2',
    stage='Staging'
)

# After validation, promote to production
transition_model_stage(
    model_name='intent_classifier',
    version='2',
    stage='Production',
    archive_existing=True
)
```

## Feature Store

### Save Features

```python
from feature_store import feature_store, build_user_financial_features

# Compute features
features = build_user_financial_features(user_id='user_123')

# Save to Redis
feature_store.save_features(user_id='user_123', features=features, ttl=3600)
```

### Retrieve Features

```python
# Get cached features
features = feature_store.get_features(user_id='user_123')

# Or compute if missing
features = feature_store.compute_if_missing(
    user_id='user_123',
    compute_fn=build_user_financial_features
)
```

### Batch Operations

```python
# Save batch
feature_store.save_batch_features({
    'user_1': features_1,
    'user_2': features_2,
    'user_3': features_3
})

# Get batch
results = feature_store.get_batch_features(['user_1', 'user_2', 'user_3'])
```

## Model Serving

### Start Model Server

```bash
cd ml-services/model_server
uvicorn app:app --host 0.0.0.0 --port 8000
```

Or with Docker:

```bash
docker-compose up model-server
```

### API Endpoints

**Intent Classification:**
```bash
curl -X POST http://localhost:8000/predict/intent \
  -H "Content-Type: application/json" \
  -d '{"query": "Can I afford a car loan?"}'
```

**NER:**
```bash
curl -X POST http://localhost:8000/predict/ner \
  -H "Content-Type: application/json" \
  -d '{"text": "I spent ₹5000 on groceries"}'
```

**Credit Risk:**
```bash
curl -X POST http://localhost:8000/predict/credit-risk \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user_123", "loan_amount": 500000, "loan_tenure_months": 60}'
```

## Monitoring

### Prometheus Metrics

Access at: http://localhost:9090

**Available Metrics:**
- `ml_predictions_total{model_name, status}` - Total predictions
- `ml_prediction_latency_seconds{model_name}` - Prediction latency
- `ml_errors_total{model_name, error_type}` - Error counts
- `ml_model_accuracy{model_name}` - Current model accuracy
- `ml_drift_score{model_name, feature}` - Data drift scores
- `ml_active_models` - Number of loaded models

### Grafana Dashboards

Access at: http://localhost:3001 (admin/admin)

**Dashboards:**
1. Model Performance Overview
2. Prediction Latency & Throughput
3. Data Drift Monitoring
4. Error Rates & Types

## Drift Detection

```python
from monitoring.drift_detection import detect_model_drift
import pandas as pd

# Load reference data (training data)
reference_data = pd.read_csv('data/reference.csv')

# Load current production data
current_data = pd.read_csv('data/current_week.csv')

# Detect drift
drift_report = detect_model_drift(reference_data, current_data)

if drift_report['drift_detected']:
    print("Drift detected! Triggering retraining...")
    trigger_retraining_job()
```

## Best Practices

### 1. Version Control

- Tag each model version semantically (v1.0.0, v1.1.0, v2.0.0)
- Document changes in model card
- Track training data version

### 2. Experiment Hygiene

- Use descriptive run names
- Log all hyperparameters
- Save training scripts as artifacts
- Document preprocessing steps

### 3. Model Validation

- Always evaluate on held-out test set
- Check for data leakage
- Validate fairness metrics
- Test edge cases

### 4. Deployment Safety

- Use staging before production
- Implement canary deployments
- Monitor performance metrics
- Have rollback plan ready

### 5. Monitoring

- Set up alerts for accuracy drops
- Monitor data drift weekly
- Track prediction latencies
- Log all errors

## Troubleshooting

### MLflow Connection Issues

```bash
# Check MLflow server
curl http://localhost:5000/health

# Restart server
docker-compose restart mlflow
```

### Redis Connection Issues

```bash
# Test connection
redis-cli -h localhost -p 6379 ping

# Clear cache
redis-cli FLUSHDB
```

### Model Loading Errors

```python
# Check model registry
from shared.mlflow_utils import get_latest_version

version = get_latest_version('intent_classifier', 'Production')
print(f"Latest version: {version}")
```

## Additional Resources

- [MLflow Documentation](https://mlflow.org/docs/latest/index.html)
- [SpaCy NER Guide](https://spacy.io/usage/training#ner)
- [Prophet Forecasting](https://facebook.github.io/prophet/)
- [Evidently AI Drift Detection](https://docs.evidentlyai.com/)
