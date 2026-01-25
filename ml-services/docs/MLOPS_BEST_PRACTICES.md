# MLOps Best Practices for Nivesh

## Table of Contents

1. [Model Development](#model-development)
2. [Experiment Tracking](#experiment-tracking)
3. [Data Management](#data-management)
4. [Model Versioning](#model-versioning)
5. [Testing & Validation](#testing--validation)
6. [Deployment](#deployment)
7. [Monitoring & Observability](#monitoring--observability)
8. [Security & Compliance](#security--compliance)
9. [Team Collaboration](#team-collaboration)
10. [Performance Optimization](#performance-optimization)

---

## Model Development

### 1. Start with Clear Objectives

**DO:**
- ✅ Define success metrics before training (accuracy, F1, AUC, latency)
- ✅ Document business requirements and constraints
- ✅ Establish baseline performance (simple heuristics)
- ✅ Set realistic targets based on data quality

**DON'T:**
- ❌ Optimize for metrics that don't align with business goals
- ❌ Chase state-of-the-art without understanding tradeoffs
- ❌ Ignore computational and latency constraints

**Example:**
```python
# Good: Clear objectives documented
MODEL_OBJECTIVES = {
    'intent_classifier': {
        'accuracy_target': 0.99,
        'latency_target_ms': 100,
        'min_confidence': 0.70,
        'business_impact': 'Improve user routing accuracy by 20%'
    }
}
```

### 2. Iterate Rapidly

**DO:**
- ✅ Start with simple models (logistic regression, decision trees)
- ✅ Use small datasets for quick iteration
- ✅ Fail fast and learn from errors
- ✅ Track all experiments, even failed ones

**DON'T:**
- ❌ Jump to complex models immediately
- ❌ Train on full dataset before validating approach
- ❌ Ignore simple baselines

**Example Workflow:**
```
1. Baseline: Rule-based classifier (1 day)
2. V1: Logistic regression on TF-IDF (2 days)
3. V2: Simple LSTM (3 days)
4. V3: DistilBERT fine-tuned (5 days)
```

### 3. Reproducibility First

**DO:**
- ✅ Set random seeds everywhere
- ✅ Pin all dependency versions
- ✅ Version training data
- ✅ Log environment details

**DON'T:**
- ❌ Use floating versions (`torch>=1.0`)
- ❌ Train without fixing random state
- ❌ Forget to document preprocessing steps

**Template:**
```python
import random
import numpy as np
import torch

def set_seeds(seed=42):
    """Set all random seeds for reproducibility"""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True

# Always call at start of training
set_seeds(42)
```

---

## Experiment Tracking

### 1. Log Everything

**What to Log:**
- Hyperparameters (learning rate, batch size, epochs)
- Model architecture details
- Training data version & size
- Evaluation metrics (train, val, test)
- System information (GPU, memory)
- Training time & cost
- Code version (git commit hash)

**MLflow Template:**
```python
import mlflow
from shared.mlflow_utils import create_experiment, log_model_params, log_model_metrics

create_experiment('intent_classification')
mlflow.set_experiment('intent_classification')

with mlflow.start_run(run_name=f'distilbert_{datetime.now().strftime("%Y%m%d_%H%M")}'):
    # 1. Log parameters
    log_model_params({
        'model': 'distilbert-base-uncased',
        'max_length': 128,
        'batch_size': 16,
        'learning_rate': 2e-5,
        'epochs': 3,
        'optimizer': 'AdamW',
        'weight_decay': 0.01
    })
    
    # 2. Log dataset info
    mlflow.log_params({
        'train_size': len(train_dataset),
        'val_size': len(val_dataset),
        'test_size': len(test_dataset),
        'data_version': 'v1.2.0',
        'num_labels': 14
    })
    
    # 3. Log system info
    mlflow.log_params({
        'gpu': torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU',
        'python_version': sys.version,
        'pytorch_version': torch.__version__
    })
    
    # 4. Train model
    train_start = time.time()
    model = train_model()
    train_time = time.time() - train_start
    
    # 5. Log metrics
    log_model_metrics({
        'train_accuracy': train_acc,
        'train_loss': train_loss,
        'val_accuracy': val_acc,
        'val_f1': val_f1,
        'test_accuracy': test_acc,
        'test_f1': test_f1,
        'train_time_seconds': train_time
    })
    
    # 6. Log artifacts
    mlflow.log_artifact('confusion_matrix.png')
    mlflow.log_artifact('feature_importance.png')
    mlflow.log_artifact('training_curves.png')
    
    # 7. Log model
    mlflow.pytorch.log_model(model, 'model', registered_model_name='intent_classifier')
    
    # 8. Add tags
    mlflow.set_tags({
        'stage': 'experimental',
        'developer': 'ml-team',
        'git_commit': subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode().strip()
    })
```

### 2. Organize Experiments

**Naming Convention:**
```
{model_type}_{variant}_{date}_{iteration}

Examples:
- intent_classifier_distilbert_20260125_v1
- ner_spacy_large_20260125_v2
- credit_risk_xgboost_tuned_20260126_v1
```

**Experiment Hierarchy:**
```
nivesh/
├── intent_classification/
│   ├── baseline_experiments/
│   ├── distilbert_experiments/
│   ├── hyperparameter_tuning/
│   └── production_candidates/
├── financial_ner/
│   ├── spacy_small/
│   ├── spacy_large/
│   └── transformer_based/
└── credit_risk/
    ├── logistic_regression/
    ├── random_forest/
    └── xgboost/
```

### 3. Compare Experiments

**MLflow UI Usage:**
```bash
# Start MLflow UI
mlflow ui --backend-store-uri sqlite:///mlruns/mlflow.db

# Visit http://localhost:5000
# Use "Compare" feature to visualize multiple runs
```

**Programmatic Comparison:**
```python
from mlflow.tracking import MlflowClient

client = MlflowClient()

# Get best run by accuracy
runs = client.search_runs(
    experiment_ids=['1'],
    filter_string="",
    order_by=['metrics.test_accuracy DESC'],
    max_results=10
)

# Compare top 3 runs
for idx, run in enumerate(runs[:3], 1):
    print(f"\n#{idx} Run: {run.info.run_id}")
    print(f"  Accuracy: {run.data.metrics['test_accuracy']:.4f}")
    print(f"  F1: {run.data.metrics['test_f1']:.4f}")
    print(f"  Training Time: {run.data.metrics['train_time_seconds']:.1f}s")
    print(f"  Learning Rate: {run.data.params['learning_rate']}")
```

---

## Data Management

### 1. Version Training Data

**DO:**
- ✅ Use semantic versioning (v1.0.0, v1.1.0, v2.0.0)
- ✅ Store data in immutable storage (S3, GCS)
- ✅ Track data lineage (sources, transformations)
- ✅ Document schema changes

**DON'T:**
- ❌ Overwrite existing data files
- ❌ Use relative paths without version
- ❌ Mix multiple data versions in training

**Data Versioning Schema:**
```python
DATA_VERSIONS = {
    'v1.0.0': {
        'path': 's3://nivesh-data/intents/v1.0.0/intents.json',
        'size': 1000,
        'created': '2026-01-15',
        'description': 'Initial intent dataset',
        'schema_version': '1.0',
        'sources': ['user_queries', 'manual_labels']
    },
    'v1.1.0': {
        'path': 's3://nivesh-data/intents/v1.1.0/intents.json',
        'size': 1500,
        'created': '2026-01-25',
        'description': 'Added 500 new intents from production',
        'schema_version': '1.0',
        'sources': ['user_queries', 'manual_labels', 'production_corrections']
    }
}
```

### 2. Data Quality Checks

**Automated Validation:**
```python
import pandas as pd
from typing import Dict, Any

def validate_intent_data(data_path: str) -> Dict[str, Any]:
    """Validate intent training data"""
    with open(data_path) as f:
        data = json.load(f)
    
    issues = []
    stats = {}
    
    # 1. Check for duplicates
    queries = [item['query'] for item in data]
    duplicates = len(queries) - len(set(queries))
    if duplicates > 0:
        issues.append(f"Found {duplicates} duplicate queries")
    
    # 2. Check label distribution
    intents = [item['intent'] for item in data]
    intent_counts = pd.Series(intents).value_counts()
    stats['label_distribution'] = intent_counts.to_dict()
    
    # Warn if imbalanced
    if intent_counts.max() / intent_counts.min() > 10:
        issues.append("High class imbalance detected")
    
    # 3. Check for missing/empty fields
    for idx, item in enumerate(data):
        if not item.get('query', '').strip():
            issues.append(f"Empty query at index {idx}")
        if not item.get('intent'):
            issues.append(f"Missing intent at index {idx}")
    
    # 4. Check query lengths
    query_lengths = [len(q.split()) for q in queries]
    stats['avg_query_length'] = sum(query_lengths) / len(query_lengths)
    stats['min_query_length'] = min(query_lengths)
    stats['max_query_length'] = max(query_lengths)
    
    return {
        'valid': len(issues) == 0,
        'issues': issues,
        'stats': stats
    }

# Run validation
validation = validate_intent_data('../data/intents.json')
if not validation['valid']:
    print("⚠️ Data quality issues found:")
    for issue in validation['issues']:
        print(f"  - {issue}")
else:
    print("✅ Data validation passed")
```

### 3. Feature Store Best Practices

**DO:**
- ✅ Use consistent feature names across models
- ✅ Document feature definitions and transformations
- ✅ Compute features offline for training, cache for serving
- ✅ Monitor feature drift

**DON'T:**
- ❌ Recompute features every prediction
- ❌ Use different logic for training vs serving
- ❌ Store raw data in feature store

**Feature Definition Template:**
```python
FEATURE_DEFINITIONS = {
    'monthly_income': {
        'type': 'float',
        'source': 'transactions',
        'computation': 'SUM(amount) WHERE type=income AND date >= NOW() - INTERVAL 30 days',
        'update_frequency': 'daily',
        'nullable': False,
        'default': 0.0
    },
    'debt_to_income_ratio': {
        'type': 'float',
        'source': 'derived',
        'computation': 'monthly_debt_payments / monthly_income',
        'update_frequency': 'daily',
        'nullable': True,
        'default': None,
        'dependencies': ['monthly_debt_payments', 'monthly_income']
    }
}
```

---

## Model Versioning

### 1. Semantic Versioning

**Format:** `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (different input/output format)
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, performance improvements

**Examples:**
- `1.0.0` → `1.0.1`: Fixed preprocessing bug
- `1.0.1` → `1.1.0`: Added new intent category
- `1.1.0` → `2.0.0`: Changed from classification to multi-label

### 2. Model Registry

**Register Every Model:**
```python
from shared.mlflow_utils import register_model

model_version = register_model(
    model_name='intent_classifier',
    model_uri='runs:/abc123/model',
    tags={
        'version': 'v1.2.0',
        'algorithm': 'DistilBERT',
        'accuracy': '0.992',
        'deployment_date': '2026-01-25',
        'deprecated': 'false'
    },
    description="""
    Intent classifier v1.2.0
    
    Changes from v1.1.0:
    - Added 500 new training examples
    - Improved accuracy from 98.5% to 99.2%
    - Reduced latency by 15%
    
    Training:
    - Dataset: intents_v1.1.0.json (1500 examples)
    - Framework: PyTorch 2.0 + Transformers 4.35
    - Training time: 45 minutes on T4 GPU
    
    Performance:
    - Accuracy: 99.2%
    - F1 Score: 0.987
    - Latency (p95): 85ms
    """
)
```

### 3. Model Lifecycle

**Stages:**
```
Development → Staging → Production → Archived
```

**Stage Transitions:**
```python
# 1. New model starts in Development (implicit)
# After training and initial validation

# 2. Promote to Staging
transition_model_stage('intent_classifier', version='3', stage='Staging')

# 3. Run staging tests for 24-48 hours
# Monitor metrics, run A/B tests

# 4. Promote to Production
transition_model_stage('intent_classifier', version='3', stage='Production', archive_existing=True)

# 5. Archive old version after 30 days
transition_model_stage('intent_classifier', version='2', stage='Archived')
```

---

## Testing & Validation

### 1. Multi-Level Testing

**Unit Tests:**
```python
# test_intent_classifier.py
import pytest
from intent_classifier import IntentClassifier

def test_classifier_initialization():
    classifier = IntentClassifier()
    assert classifier.num_labels == 14
    assert classifier.label_to_id['affordability_check'] == 0

def test_prediction_format():
    classifier = IntentClassifier()
    classifier.load_model()
    
    result = classifier.predict("Can I afford a loan?")
    
    assert 'intent' in result
    assert 'confidence' in result
    assert 'alternatives' in result
    assert 0 <= result['confidence'] <= 1

def test_edge_cases():
    classifier = IntentClassifier()
    classifier.load_model()
    
    # Empty query
    result = classifier.predict("")
    assert result is not None
    
    # Very long query
    long_query = "test " * 1000
    result = classifier.predict(long_query)
    assert result is not None
```

**Integration Tests:**
```python
# test_model_server.py
from fastapi.testclient import TestClient
from model_server.app import app

client = TestClient(app)

def test_intent_endpoint():
    response = client.post(
        "/predict/intent",
        json={"query": "Can I afford a car loan?"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data['intent'] == 'affordability_check'
    assert data['confidence'] > 0.7

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data['status'] in ['healthy', 'degraded']
```

**Load Tests:**
```python
# locustfile.py
from locust import HttpUser, task, between

class MLModelUser(HttpUser):
    wait_time = between(1, 3)
    
    @task(3)
    def predict_intent(self):
        self.client.post("/predict/intent", json={
            "query": "Can I afford a ₹50L loan?"
        })
    
    @task(1)
    def health_check(self):
        self.client.get("/health")

# Run: locust -f locustfile.py --host=http://localhost:8000
# Target: 100 predictions/second with p95 latency <200ms
```

### 2. Validation Strategy

**Holdout Test Set:**
- Reserve 20% of data, never touch during development
- Only evaluate final model on test set once

**Cross-Validation:**
```python
from sklearn.model_selection import StratifiedKFold

skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

cv_scores = []
for fold, (train_idx, val_idx) in enumerate(skf.split(X, y)):
    X_train, X_val = X[train_idx], X[val_idx]
    y_train, y_val = y[train_idx], y[val_idx]
    
    model = train_model(X_train, y_train)
    score = evaluate_model(model, X_val, y_val)
    cv_scores.append(score)
    
    print(f"Fold {fold+1}: {score:.4f}")

print(f"Mean CV Score: {np.mean(cv_scores):.4f} ± {np.std(cv_scores):.4f}")
```

**Temporal Validation** (for time-series data):
```python
# Train on Jan-Nov, test on Dec
train_data = df[df['date'] < '2025-12-01']
test_data = df[df['date'] >= '2025-12-01']
```

### 3. Model Bias & Fairness

**Check for Bias:**
```python
from sklearn.metrics import classification_report

# Evaluate across demographic groups
for segment in ['high_income', 'medium_income', 'low_income']:
    segment_data = test_data[test_data['income_segment'] == segment]
    predictions = model.predict(segment_data)
    
    print(f"\n{segment}:")
    print(classification_report(segment_data['true_label'], predictions))

# Flag if accuracy difference >5% between segments
```

---

## Deployment

### 1. Deployment Checklist

- [ ] Model meets accuracy thresholds
- [ ] Latency tested at scale
- [ ] All dependencies pinned
- [ ] Integration tests pass
- [ ] Load tests pass (target: 100 req/s)
- [ ] Rollback plan documented
- [ ] Monitoring configured
- [ ] Stakeholders notified

### 2. Deployment Strategies

**Blue-Green Deployment:**
```
Production (Blue) ← 100% traffic
Staging (Green) ← 0% traffic

Switch:
Production (Blue) ← 0% traffic
Staging (Green) ← 100% traffic
```

**Canary Deployment:**
```
Day 1: New model ← 10% traffic
Day 2: New model ← 25% traffic
Day 3: New model ← 50% traffic
Day 4: New model ← 100% traffic

(Rollback at any point if metrics degrade)
```

### 3. Feature Flags

```python
# config.py
FEATURE_FLAGS = {
    'use_new_intent_classifier': {
        'enabled': True,
        'rollout_percentage': 50,  # 50% of users
        'whitelist_users': ['user_123', 'user_456']
    }
}

# Usage
if should_use_feature('use_new_intent_classifier', user_id):
    prediction = new_model.predict(query)
else:
    prediction = old_model.predict(query)
```

---

## Monitoring & Observability

### 1. Four Golden Signals

**Latency:**
```python
from prometheus_client import Histogram

prediction_latency = Histogram(
    'model_prediction_latency_seconds',
    'Model prediction latency',
    ['model_name']
)

@prediction_latency.labels(model_name='intent_classifier').time()
def predict(query):
    return model.predict(query)
```

**Traffic:**
```python
from prometheus_client import Counter

prediction_count = Counter(
    'model_predictions_total',
    'Total predictions',
    ['model_name', 'status']
)

prediction_count.labels(model_name='intent_classifier', status='success').inc()
```

**Errors:**
```python
try:
    result = model.predict(query)
    prediction_count.labels(model_name='intent_classifier', status='success').inc()
except Exception as e:
    prediction_count.labels(model_name='intent_classifier', status='error').inc()
    logger.error(f"Prediction failed: {e}")
    raise
```

**Saturation:**
```python
from prometheus_client import Gauge

active_models = Gauge('active_models_count', 'Number of loaded models')
memory_usage = Gauge('model_memory_mb', 'Model memory usage in MB')

active_models.set(len(loaded_models))
memory_usage.set(get_memory_usage_mb())
```

### 2. Model-Specific Metrics

**Prediction Distribution:**
```python
# Log prediction distribution every hour
intent_distribution = Counter(
    'intent_predictions_by_label',
    'Predictions by intent label',
    ['intent']
)

for result in predictions:
    intent_distribution.labels(intent=result['intent']).inc()
```

**Confidence Distribution:**
```python
confidence_histogram = Histogram(
    'prediction_confidence',
    'Distribution of prediction confidence scores',
    ['model_name'],
    buckets=[0.0, 0.5, 0.7, 0.8, 0.9, 0.95, 1.0]
)

confidence_histogram.labels(model_name='intent_classifier').observe(result['confidence'])
```

### 3. Alerting Rules

**Prometheus Alerts:**
```yaml
# prometheus_alerts.yml
groups:
  - name: ml_models
    rules:
      - alert: HighErrorRate
        expr: rate(ml_errors_total[5m]) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate for {{ $labels.model_name }}"
          
      - alert: HighLatency
        expr: histogram_quantile(0.95, ml_prediction_latency_seconds) > 0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High latency (p95) for {{ $labels.model_name }}"
      
      - alert: AccuracyDrop
        expr: ml_model_accuracy < 0.95
        for: 1h
        labels:
          severity: critical
        annotations:
          summary: "Accuracy dropped below 95% for {{ $labels.model_name }}"
```

---

## Security & Compliance

### 1. Model Security

**Protect API Endpoints:**
```python
from fastapi import Depends, HTTPException, Security
from fastapi.security import APIKeyHeader

API_KEY_HEADER = APIKeyHeader(name='X-API-Key')

def verify_api_key(api_key: str = Security(API_KEY_HEADER)):
    if api_key != os.getenv('ML_API_KEY'):
        raise HTTPException(status_code=403, detail="Invalid API key")
    return api_key

@app.post("/predict/intent")
async def predict_intent(
    request: IntentRequest,
    api_key: str = Depends(verify_api_key)
):
    # ... prediction logic
```

**Input Validation:**
```python
from pydantic import BaseModel, validator

class IntentRequest(BaseModel):
    query: str
    
    @validator('query')
    def validate_query(cls, v):
        if not v or not v.strip():
            raise ValueError('Query cannot be empty')
        if len(v) > 500:
            raise ValueError('Query too long (max 500 characters)')
        return v.strip()
```

### 2. Data Privacy

**PII Handling:**
```python
def anonymize_query(query: str) -> str:
    """Remove PII from user queries before logging"""
    # Replace email addresses
    query = re.sub(r'\S+@\S+', '[EMAIL]', query)
    
    # Replace phone numbers
    query = re.sub(r'\b\d{10}\b', '[PHONE]', query)
    
    # Replace Aadhaar numbers
    query = re.sub(r'\b\d{12}\b', '[AADHAAR]', query)
    
    return query

# Log anonymized version
mlflow.log_param('example_query', anonymize_query(query))
```

### 3. Model Compliance

**Model Cards:**
```markdown
# Intent Classifier Model Card

## Model Details
- **Name**: Intent Classifier v1.2.0
- **Type**: Text Classification (DistilBERT)
- **Owner**: ML Platform Team
- **Date**: 2026-01-25

## Intended Use
- **Primary Use**: Classify user financial queries into intent categories
- **Out-of-Scope**: Medical advice, legal advice, non-financial queries

## Training Data
- **Source**: User queries (anonymized)
- **Size**: 1500 examples
- **Limitations**: Limited to English, Indian financial context

## Evaluation
- **Accuracy**: 99.2%
- **F1 Score**: 0.987
- **Tested on**: 300 holdout examples

## Ethical Considerations
- **Bias**: Evaluated across income segments, no significant bias detected
- **Privacy**: No PII stored, all queries anonymized

## Caveats & Recommendations
- Confidence threshold: Use 0.70 as minimum
- Fallback: Route to human agent if confidence <0.70
```

---

## Team Collaboration

### 1. Code Reviews

**ML Code Review Checklist:**
- [ ] Code follows style guidelines (PEP 8 for Python)
- [ ] Unit tests included and passing
- [ ] Experiment logged in MLflow
- [ ] Model versioned correctly
- [ ] Documentation updated
- [ ] Performance tested (latency, memory)
- [ ] Security reviewed (input validation)

### 2. Documentation

**Required Documentation:**
- Model card (intended use, limitations)
- Training guide (how to reproduce)
- API documentation (endpoints, schemas)
- Deployment runbook (how to deploy, rollback)
- Troubleshooting guide (common issues)

### 3. Knowledge Sharing

**Regular Activities:**
- Weekly ML sync (15 min): Share progress, blockers
- Monthly model review (1 hour): Deep dive into new models
- Quarterly retrospective (2 hours): Lessons learned
- On-demand brown bags: Deep dives into techniques

---

## Performance Optimization

### 1. Model Optimization

**Techniques:**

**1. Quantization:**
```python
# PyTorch dynamic quantization
import torch.quantization

model_int8 = torch.quantization.quantize_dynamic(
    model,
    {torch.nn.Linear},
    dtype=torch.qint8
)

# Size reduction: ~4x
# Inference speed: ~2x faster
# Accuracy loss: <1%
```

**2. Pruning:**
```python
import torch.nn.utils.prune as prune

# Prune 30% of weights
for module in model.modules():
    if isinstance(module, torch.nn.Linear):
        prune.l1_unstructured(module, name='weight', amount=0.3)

# Remove pruning masks
for module in model.modules():
    if isinstance(module, torch.nn.Linear):
        prune.remove(module, 'weight')
```

**3. Distillation:**
```python
# Train smaller student model from larger teacher
student = DistilBertModel(...)
teacher = BertModel(...)  # Pre-trained

# Knowledge distillation loss
def distillation_loss(student_logits, teacher_logits, labels, temperature=3.0):
    soft_loss = F.kl_div(
        F.log_softmax(student_logits / temperature, dim=1),
        F.softmax(teacher_logits / temperature, dim=1),
        reduction='batchmean'
    ) * (temperature ** 2)
    
    hard_loss = F.cross_entropy(student_logits, labels)
    
    return 0.7 * soft_loss + 0.3 * hard_loss
```

**4. ONNX Export:**
```python
# Export to ONNX for faster inference
torch.onnx.export(
    model,
    dummy_input,
    'model.onnx',
    opset_version=14,
    input_names=['input_ids', 'attention_mask'],
    output_names=['logits'],
    dynamic_axes={'input_ids': {0: 'batch'}, 'logits': {0: 'batch'}}
)

# Load with ONNX Runtime (2-3x faster)
import onnxruntime as ort
session = ort.InferenceSession('model.onnx')
```

### 2. Infrastructure Optimization

**Horizontal Scaling:**
```yaml
# docker-compose.yml
model-server:
  image: nivesh-ml-server
  deploy:
    replicas: 3
    resources:
      limits:
        cpus: '2'
        memory: 4G
```

**Caching Strategy:**
```python
from functools import lru_cache

@lru_cache(maxsize=1000)
def predict_with_cache(query: str):
    """Cache predictions for repeated queries"""
    return model.predict(query)

# Clear cache periodically (every 1 hour)
import threading

def clear_cache_periodically():
    while True:
        time.sleep(3600)
        predict_with_cache.cache_clear()

threading.Thread(target=clear_cache_periodically, daemon=True).start()
```

**Batch Inference:**
```python
def predict_batch(queries: List[str], batch_size: int = 32):
    """Process queries in batches for efficiency"""
    results = []
    
    for i in range(0, len(queries), batch_size):
        batch = queries[i:i + batch_size]
        batch_results = model.predict_batch(batch)
        results.extend(batch_results)
    
    return results
```

---

## Appendix: Useful Resources

### Tools
- [MLflow](https://mlflow.org/)
- [Evidently AI](https://evidentlyai.com/)
- [Prometheus](https://prometheus.io/)
- [Grafana](https://grafana.com/)

### Learning Resources
- [Google's ML Best Practices](https://developers.google.com/machine-learning/guides/rules-of-ml)
- [AWS ML Best Practices](https://docs.aws.amazon.com/wellarchitected/latest/machine-learning-lens/machine-learning-lens.html)
- [Microsoft ML Best Practices](https://github.com/microsoft/recommenders)

### Books
- "Machine Learning Design Patterns" by Lakshmanan et al.
- "Building Machine Learning Powered Applications" by Ameisen
- "Designing Machine Learning Systems" by Huyen

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-25  
**Contributors:** ML Platform Team
