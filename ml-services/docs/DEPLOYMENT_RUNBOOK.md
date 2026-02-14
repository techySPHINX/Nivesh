# MLOps Deployment Runbook

## Overview

This runbook provides step-by-step procedures for deploying, managing, and troubleshooting the Nivesh ML infrastructure.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Model Deployment](#model-deployment)
4. [Health Checks](#health-checks)
5. [Rollback Procedures](#rollback-procedures)
6. [Incident Response](#incident-response)
7. [Maintenance Tasks](#maintenance-tasks)

---

## Pre-Deployment Checklist

### Environment Validation

- [ ] Python 3.9+ installed
- [ ] Docker and Docker Compose installed
- [ ] PostgreSQL database accessible
- [ ] Environment variables configured
- [ ] Network ports available (5000, 6379, 8000, 9090, 3001)

### Configuration Files

- [ ] `.env` file created with all required variables
- [ ] `docker-compose.yml` reviewed
- [ ] Prometheus config validated
- [ ] Database migrations ready

### Model Artifacts

- [ ] Training completed successfully
- [ ] Models registered in MLflow
- [ ] Evaluation metrics meet thresholds
- [ ] ONNX exports generated (where applicable)

---

## Infrastructure Setup

### Step 1: Start Infrastructure Services

```bash
cd ml-services

# Start all services
docker-compose up -d

# Verify services are running
docker-compose ps
```

**Expected Output:**
```
NAME                COMMAND             STATUS       PORTS
mlflow-server       "mlflow server..."  Up          0.0.0.0:5000->5000/tcp
redis-feature-store "redis-server..."   Up          0.0.0.0:6379->6379/tcp
prometheus          "prometheus..."     Up          0.0.0.0:9090->9090/tcp
grafana             "grafana..."        Up          0.0.0.0:3001->3000/tcp
```

### Step 2: Verify Service Health

**MLflow:**
```bash
curl http://localhost:5000/health
# Expected: HTTP 200 OK
```

**Redis:**
```bash
redis-cli -h localhost -p 6379 ping
# Expected: PONG
```

**Prometheus:**
```bash
curl http://localhost:9090/-/healthy
# Expected: Prometheus is Healthy.
```

### Step 3: Initialize Database

```bash
cd ../backend

# Run Prisma migrations
npx prisma migrate deploy

# Verify tables created
npx prisma db push
```

**Verify model registry tables:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('model_registry', 'model_deployments', 'model_predictions', 'training_datasets');
```

### Step 4: Setup MLflow Experiments

```bash
cd ../ml-services

# Initialize experiments
python -c "from shared.mlflow_utils import setup_experiments; setup_experiments()"
```

**Verify:**
```bash
curl http://localhost:5000/api/2.0/mlflow/experiments/list
```

---

## Model Deployment

### Deployment Process

#### 1. Train Model

```bash
cd ml-services/intent_classifier

# Train
python train.py --data-path ../data/intents.json

# Verify MLflow run
# Visit http://localhost:5000 and check experiments
```

#### 2. Evaluate Model

**Acceptance Criteria:**
- Intent Classifier: Accuracy >99%, F1 >0.95
- Financial NER: F1 >0.90 per entity
- Credit Risk: AUC-ROC >0.85
- Anomaly Detection: FPR <1%, Detection >95%

```python
# Check metrics in MLflow
from shared.mlflow_utils import get_client

client = get_client()
runs = client.search_runs(experiment_ids=['1'], order_by=['metrics.accuracy DESC'])
best_run = runs[0]

print(f"Best run accuracy: {best_run.data.metrics['accuracy']}")
```

#### 3. Register Model

```python
from shared.mlflow_utils import register_model

model_version = register_model(
    model_name='intent_classifier',
    model_uri='runs:/YOUR_RUN_ID/model',
    tags={'version': 'v1.2.0', 'deployment_date': '2026-01-25'},
    description='Intent classifier with 99.2% accuracy'
)
```

#### 4. Deploy to Staging

```python
from shared.mlflow_utils import transition_model_stage

transition_model_stage(
    model_name='intent_classifier',
    version='3',
    stage='Staging',
    archive_existing=False
)
```

#### 5. Validation Testing

**Create test script:**
```python
# test_staging.py
from intent_classifier import IntentClassifier

classifier = IntentClassifier()
# Load from MLflow staging
# ... perform validation tests

test_queries = [
    "Can I afford a ₹50L loan?",
    "Help me save for retirement",
    "Where is my money going?"
]

for query in test_queries:
    result = classifier.predict(query)
    print(f"{query} → {result['intent']} ({result['confidence']:.2f})")
```

**Run validation:**
```bash
python test_staging.py
```

**Checklist:**
- [ ] All test queries classified correctly
- [ ] Confidence scores >0.7
- [ ] No errors or exceptions
- [ ] Latency <200ms (p95)

#### 6. Production Deployment

**Promote to Production:**
```python
transition_model_stage(
    model_name='intent_classifier',
    version='3',
    stage='Production',
    archive_existing=True  # Archive previous production version
)
```

**Update database:**
```sql
INSERT INTO model_deployments (model_id, environment, endpoint_url, traffic_percentage, status)
VALUES (
    (SELECT id FROM model_registry WHERE model_name = 'intent_classifier' AND version = 'v1.2.0'),
    'production',
    'http://model-server:8000/predict/intent',
    100,
    'active'
);
```

#### 7. Start Model Server

```bash
cd ml-services/model_server

# Start server
uvicorn app:app --host 0.0.0.0 --port 8000 --workers 4

# Or with Docker
docker-compose up -d model-server
```

**Verify server:**
```bash
curl http://localhost:8000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "models_loaded": 1,
  "feature_store_connected": true,
  "mlflow_connected": true
}
```

### Canary Deployment (Advanced)

**For gradual rollout:**

1. Deploy new version to `canary` environment
2. Route 10% of traffic to canary
3. Monitor metrics for 24 hours
4. If metrics stable, increase to 50%
5. If metrics stable, promote to 100%

```python
# Set canary traffic percentage
import psycopg2

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

cur.execute("""
    UPDATE model_deployments
    SET traffic_percentage = 10
    WHERE model_id = (SELECT id FROM model_registry WHERE model_name = 'intent_classifier' AND version = 'v1.3.0')
    AND environment = 'canary'
""")

conn.commit()
```

---

## Health Checks

### Service Health

**Model Server:**
```bash
curl http://localhost:8000/health
```

**MLflow:**
```bash
curl http://localhost:5000/health
```

**Redis Feature Store:**
```bash
curl http://localhost:8000/admin/feature-store/stats
```

**Expected Response:**
```json
{
  "connected": true,
  "user_features": 150,
  "model_features": 20,
  "total_keys": 170,
  "used_memory": "2.5M",
  "uptime_seconds": 86400
}
```

### Model Performance Metrics

**Via Prometheus:**
```bash
# Check prediction counts
curl 'http://localhost:9090/api/v1/query?query=ml_predictions_total'

# Check latencies
curl 'http://localhost:9090/api/v1/query?query=ml_prediction_latency_seconds'

# Check error rates
curl 'http://localhost:9090/api/v1/query?query=rate(ml_errors_total[5m])'
```

**Acceptable Thresholds:**
- Prediction latency (p95): <200ms
- Error rate: <0.1%
- Availability: >99.9%

### Data Drift Monitoring

```bash
cd ml-services/monitoring

# Run drift detection
python check_drift.py --model intent_classifier --days 7
```

**Drift Alert Thresholds:**
- Low: <0.1 (no action)
- Medium: 0.1-0.3 (monitor)
- High: >0.3 (retrain immediately)

---

## Rollback Procedures

### Immediate Rollback (Critical Issue)

**Step 1: Identify Current Production Version**
```python
from shared.mlflow_utils import get_latest_version

current_version = get_latest_version('intent_classifier', 'Production')
print(f"Current: {current_version}")
```

**Step 2: Determine Rollback Target**
```sql
SELECT version, metrics, deployed_at
FROM model_registry
WHERE model_name = 'intent_classifier'
AND status = 'production'
ORDER BY deployed_at DESC
LIMIT 5;
```

**Step 3: Execute Rollback**
```python
# Transition back to previous version
transition_model_stage(
    model_name='intent_classifier',
    version='2',  # Previous stable version
    stage='Production',
    archive_existing=True
)
```

**Step 4: Restart Model Server**
```bash
# Reload models
curl -X POST http://localhost:8000/admin/reload-model?model_name=intent_classifier&stage=Production

# Or restart server
docker-compose restart model-server
```

**Step 5: Verify Rollback**
```bash
# Test endpoint
curl -X POST http://localhost:8000/predict/intent \
  -H "Content-Type: application/json" \
  -d '{"query": "test query"}'

# Check version
curl http://localhost:8000/models
```

**Step 6: Update Database**
```sql
UPDATE model_deployments
SET status = 'rolled_back'
WHERE model_id = (SELECT id FROM model_registry WHERE version = 'v1.3.0');

UPDATE model_deployments
SET status = 'active', traffic_percentage = 100
WHERE model_id = (SELECT id FROM model_registry WHERE version = 'v1.2.0');
```

### Gradual Rollback (Non-Critical)

1. Reduce traffic to new version: 100% → 50% → 10%
2. Monitor metrics after each reduction
3. Complete rollback when traffic at 0%

---

## Incident Response

### Common Issues & Solutions

#### Issue: High Prediction Latency

**Symptoms:**
- p95 latency >500ms
- Timeout errors
- User complaints

**Diagnosis:**
```bash
# Check server load
docker stats model-server

# Check Redis latency
redis-cli --latency

# Check model size
ls -lh ml-services/models/
```

**Solutions:**
1. Scale model server horizontally:
   ```bash
   docker-compose up -d --scale model-server=3
   ```

2. Optimize model:
   ```python
   # Export to ONNX for faster inference
   classifier.export_onnx('model.onnx')
   ```

3. Increase cache TTL:
   ```python
   # In config.py
   feature_ttl_seconds = 7200  # 2 hours
   ```

#### Issue: High Error Rate

**Symptoms:**
- Errors >1% of requests
- 500 errors in logs
- MLflow tracking failures

**Diagnosis:**
```bash
# Check logs
docker-compose logs model-server --tail=100

# Check Prometheus
curl 'http://localhost:9090/api/v1/query?query=ml_errors_total'
```

**Solutions:**
1. Check model integrity:
   ```python
   from shared.mlflow_utils import load_model
   try:
       model = load_model('intent_classifier', 'Production')
   except Exception as e:
       print(f"Model load failed: {e}")
   ```

2. Verify feature store:
   ```bash
   redis-cli -h localhost -p 6379
   > PING
   > KEYS features:*
   ```

3. Rollback if necessary (see above)

#### Issue: Data Drift Detected

**Symptoms:**
- Drift score >0.3
- Accuracy drop in production
- Unusual input distributions

**Response:**
1. **Immediate** (if accuracy drop >5%):
   - Trigger automated retraining
   - Alert ML team
   - Consider temporary fallback to rule-based system

2. **Planned** (if drift moderate):
   - Schedule retraining within 48 hours
   - Collect new training data
   - Update feature engineering if needed

**Retraining Workflow:**
```bash
# Extract recent production data
python scripts/export_production_data.py --days 30

# Retrain model
cd intent_classifier
python train.py --data-path ../data/intents_updated.json

# Evaluate and deploy
# ... follow standard deployment process
```

#### Issue: Out of Memory (OOM)

**Symptoms:**
- Model server crashes
- Docker container restarts
- OOM errors in logs

**Solutions:**
1. Increase container memory:
   ```yaml
   # docker-compose.yml
   model-server:
     deploy:
       resources:
         limits:
           memory: 4G
   ```

2. Reduce model cache size:
   ```python
   # config.py
   model_cache_size = 5  # Reduce from 10
   ```

3. Use model quantization:
   ```python
   # Quantize PyTorch model
   model_int8 = torch.quantization.quantize_dynamic(
       model, {torch.nn.Linear}, dtype=torch.qint8
   )
   ```

---

## Maintenance Tasks

### Daily Tasks

- [ ] Check Grafana dashboards for anomalies
- [ ] Review error logs
- [ ] Verify all services running
- [ ] Check disk space (MLflow artifacts)

```bash
# Automated health check script
./scripts/daily_health_check.sh
```

### Weekly Tasks

- [ ] Run drift detection on all models
- [ ] Review prediction quality metrics
- [ ] Clean up old MLflow runs (keep last 50)
- [ ] Backup model registry database
- [ ] Update model performance reports

```bash
# Weekly maintenance script
./scripts/weekly_maintenance.sh
```

### Monthly Tasks

- [ ] Review and update training data
- [ ] Retrain models if accuracy degraded
- [ ] Optimize infrastructure costs
- [ ] Update documentation
- [ ] Security patches and dependency updates

### Backup & Recovery

**Backup MLflow:**
```bash
# Backup artifacts
tar -czf mlflow_backup_$(date +%Y%m%d).tar.gz mlruns/ mlartifacts/

# Upload to S3
aws s3 cp mlflow_backup_$(date +%Y%m%d).tar.gz s3://nivesh-backups/mlflow/
```

**Backup Model Registry:**
```bash
pg_dump -h localhost -U postgres -d nivesh \
  -t model_registry -t model_deployments -t model_predictions \
  > model_registry_backup_$(date +%Y%m%d).sql
```

**Restore:**
```bash
# Restore MLflow
tar -xzf mlflow_backup_20260125.tar.gz

# Restore database
psql -h localhost -U postgres -d nivesh < model_registry_backup_20260125.sql
```

---

## Contact & Escalation

### On-Call Escalation

**Level 1** (Model Server Issues):
- Contact: ML Platform Team
- Response Time: 15 minutes
- Escalate after: 30 minutes

**Level 2** (Data/Model Quality Issues):
- Contact: ML Engineering Team
- Response Time: 1 hour
- Escalate after: 4 hours

**Level 3** (Infrastructure Outage):
- Contact: DevOps/SRE Team
- Response Time: 5 minutes
- Escalate after: 15 minutes

### Communication Channels

- **Slack:** #nivesh-ml-ops
- **PagerDuty:** ML Platform Service
- **Email:** mlops@nivesh.ai

---

## Appendix

### Useful Commands Reference

```bash
# View all running models
curl http://localhost:8000/models

# Clear model cache
curl -X DELETE http://localhost:8000/admin/clear-cache

# Reload specific model
curl -X POST http://localhost:8000/admin/reload-model?model_name=intent_classifier

# View Prometheus targets
curl http://localhost:9090/api/v1/targets

# Export Grafana dashboard
curl -u admin:admin http://localhost:3001/api/dashboards/uid/ml-overview
```

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MLFLOW_TRACKING_URI` | MLflow server URL | `http://localhost:5000` |
| `REDIS_HOST` | Redis hostname | `localhost` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://...` |
| `MODEL_STORAGE_BACKEND` | Storage type | `local`, `s3`, `gcs` |
| `GOOGLE_API_KEY` | Gemini API key | `AIza...` |

### SLO/SLA Targets

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| Availability | 99.9% | <99.5% |
| Latency (p95) | <200ms | >500ms |
| Error Rate | <0.1% | >1% |
| Accuracy | Intent >99% | <97% |
| Drift Score | <0.1 | >0.3 |

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-25  
**Owner:** ML Platform Team
