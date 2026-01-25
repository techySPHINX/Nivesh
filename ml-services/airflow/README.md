# Apache Airflow Training Pipelines

Automated ML model training orchestration using Apache Airflow for Nivesh.

## Overview

Apache Airflow manages automated retraining pipelines for all 6 ML models:
- **Intent Classifier** (DistilBERT)
- **Financial NER** (spaCy)
- **Spending Predictor** (Prophet)
- **Anomaly Detector** (Isolation Forest)
- **Credit Risk Scorer** (XGBoost)
- **Gemini Advisor** (API-based, no retraining needed)

## Architecture

```
┌──────────────────────────────────────────────┐
│         Master Training Pipeline              │
│         (Mondays 1:00 AM)                     │
└────────┬─────────────────────────────────────┘
         │
         ├─────────────────┬────────────────────┐
         ▼                 ▼                    ▼
┌─────────────────┐ ┌─────────────────┐ ┌──────────────┐
│ Intent          │ │ Credit Risk     │ │ Spending     │
│ Classifier      │ │ Scorer          │ │ Predictor    │
│ (Sun 2 AM)      │ │ (Sat 3 AM)      │ │ (Fri 4 AM)   │
└────────┬────────┘ └────────┬────────┘ └──────┬───────┘
         │                   │                   │
         └───────────────────┴───────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │ Drift Detection      │
                  │ (All Models)         │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │ Notification         │
                  │ (Slack/Email)        │
                  └──────────────────────┘
```

## Installation

Airflow is configured in `docker-compose.yml` with 4 containers:

1. **airflow-postgres**: Metadata database
2. **airflow-init**: One-time initialization
3. **airflow-webserver**: Web UI (port 8080)
4. **airflow-scheduler**: DAG execution engine

### Start Airflow

```bash
# Start all services including Airflow
docker-compose up -d

# Check Airflow containers
docker ps | grep airflow

# View Airflow logs
docker logs nivesh-airflow-webserver
docker logs nivesh-airflow-scheduler
```

### Access Web UI

URL: `http://localhost:8080`
- Username: `admin`
- Password: `admin`

## DAG Overview

### 1. Intent Classifier Training (`intent_classifier_training.py`)

**Schedule**: Weekly on Sundays at 2:00 AM  
**Duration**: ~30-45 minutes  
**Model**: DistilBERT for intent classification

**Pipeline Steps**:
1. **validate_data**: Check data quality and completeness
2. **check_drift**: Detect data drift since last training
3. **train_model**: Train DistilBERT model with MLflow tracking
4. **evaluate_model**: Validate accuracy (≥85%) and F1 (≥80%)
5. **register_model**: Register in MLflow Model Registry
6. **deploy_to_production**: Promote to production, archive old version
7. **send_notification**: Send completion notification

**Performance Thresholds**:
- Minimum Accuracy: 85%
- Minimum F1 Score: 80%

**Failure Handling**:
- 2 retries with 5-minute delay
- Email alert on final failure
- Previous production model remains active

### 2. Credit Risk Training (`credit_risk_training.py`)

**Schedule**: Weekly on Saturdays at 3:00 AM  
**Duration**: ~1-2 hours  
**Model**: XGBoost for credit risk scoring

**Pipeline Steps**:
1. **validate_data**: Validate credit application data
2. **validate_features**: Check feature engineering (debt-to-income, etc.)
3. **train_model**: Train XGBoost classifier
4. **validate_fairness**: Check fairness across demographic groups
5. **evaluate_model**: Validate accuracy, precision, recall, AUC-ROC
6. **register_model**: Register in MLflow
7. **deploy_to_production**: Deploy to production

**Performance Thresholds**:
- Minimum Accuracy: 75%
- Minimum Precision: 70%
- Minimum Recall: 65%
- Minimum AUC-ROC: 0.75

**Fairness Validation**:
- Check performance across age groups
- Ensure minimum representation (≥5 samples per group)
- Log disparate impact metrics

### 3. Master Training Pipeline (`master_training_pipeline.py`)

**Schedule**: Weekly on Mondays at 1:00 AM  
**Duration**: ~3-4 hours (parallel execution)  
**Purpose**: Orchestrate all model training

**Pipeline Steps**:
1. **check_data_freshness**: Verify data updated within 30 days
2. **Parallel Execution**:
   - trigger_intent_classifier
   - trigger_credit_risk
   - trigger_spending (when DAG created)
   - trigger_anomaly (when DAG created)
   - trigger_ner (when DAG created)
3. **run_drift_detection**: Run drift detection on all models
4. **send_summary**: Send comprehensive training summary

**Benefits**:
- Single scheduling point
- Parallel execution reduces total time
- Coordinated drift detection
- Unified notification

## Configuration

### Environment Variables

Set in `docker-compose.yml` under `airflow-*` services:

```yaml
environment:
  AIRFLOW__CORE__EXECUTOR: LocalExecutor
  AIRFLOW__DATABASE__SQL_ALCHEMY_CONN: postgresql+psycopg2://airflow:airflow@airflow-postgres/airflow
  AIRFLOW__CORE__DAGS_ARE_PAUSED_AT_CREATION: 'true'
  AIRFLOW__CORE__LOAD_EXAMPLES: 'false'
  MLFLOW_TRACKING_URI: http://mlflow:5000
```

### DAG Configuration

Each DAG has configurable parameters in `default_args`:

```python
default_args = {
    'owner': 'ml-team',
    'email': ['ml-ops@nivesh.ai'],
    'email_on_failure': True,
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
    'execution_timeout': timedelta(hours=2),
}
```

### Custom Schedules

Modify `schedule_interval` in DAG definition:

```python
dag = DAG(
    'my_model_training',
    schedule_interval='0 2 * * 0',  # Cron: Sundays at 2 AM
    # or
    schedule_interval='@daily',     # Daily at midnight
    # or
    schedule_interval=None,         # Manual trigger only
)
```

## Usage

### Trigger Manual Training

**Via Web UI**:
1. Open http://localhost:8080
2. Navigate to DAG (e.g., `intent_classifier_training`)
3. Click **Play** button → **Trigger DAG**
4. Monitor progress in Graph/Tree view

**Via CLI**:
```bash
# Trigger specific DAG
docker exec -it nivesh-airflow-scheduler airflow dags trigger intent_classifier_training

# Trigger with custom config
docker exec -it nivesh-airflow-scheduler airflow dags trigger credit_risk_training \
  --conf '{"data_path": "/custom/path.json"}'

# List all DAGs
docker exec -it nivesh-airflow-scheduler airflow dags list

# View DAG status
docker exec -it nivesh-airflow-scheduler airflow dags state intent_classifier_training
```

### Monitor Execution

**Web UI**:
- **Graph View**: Visualize task dependencies and status
- **Tree View**: Historical run timeline
- **Gantt View**: Task duration analysis
- **Code**: View DAG source code
- **Logs**: Individual task logs

**CLI**:
```bash
# View task logs
docker exec -it nivesh-airflow-scheduler airflow tasks logs \
  intent_classifier_training train_model 2024-01-15

# List task instances
docker exec -it nivesh-airflow-scheduler airflow tasks list intent_classifier_training

# Test individual task
docker exec -it nivesh-airflow-scheduler airflow tasks test \
  intent_classifier_training validate_data 2024-01-15
```

### Pause/Unpause DAGs

```bash
# Pause DAG (prevent scheduled runs)
docker exec -it nivesh-airflow-scheduler airflow dags pause intent_classifier_training

# Unpause DAG
docker exec -it nivesh-airflow-scheduler airflow dags unpause intent_classifier_training
```

## Integration with MLflow

All training DAGs integrate with MLflow for experiment tracking:

### Tracking Training Runs

```python
def train_model(**context):
    import mlflow
    
    mlflow.set_tracking_uri('http://mlflow:5000')
    
    # Training code logs metrics automatically
    run_id, model_uri, metrics = train_intent_classifier(
        run_name=f"airflow_training_{context['ds']}"
    )
    
    # Pass to downstream tasks
    context['ti'].xcom_push(key='run_id', value=run_id)
```

### Model Registration

```python
def register_model(**context):
    import mlflow
    
    run_id = context['ti'].xcom_pull(key='run_id', task_ids='train_model')
    
    result = mlflow.register_model(
        model_uri=f"runs:/{run_id}/model",
        name="intent_classifier",
        tags={'trained_date': context['ds']}
    )
```

### Model Deployment

```python
def deploy_to_production(**context):
    client = mlflow.tracking.MlflowClient()
    
    # Archive current production
    prod_versions = client.get_latest_versions(
        "intent_classifier",
        stages=["Production"]
    )
    
    for v in prod_versions:
        client.transition_model_version_stage(
            name="intent_classifier",
            version=v.version,
            stage="Archived"
        )
    
    # Promote new version
    client.transition_model_version_stage(
        name="intent_classifier",
        version=new_version,
        stage="Production"
    )
```

## Notifications

### Email Alerts

Configure SMTP in Airflow:

```python
# airflow.cfg or environment variables
AIRFLOW__SMTP__SMTP_HOST=smtp.gmail.com
AIRFLOW__SMTP__SMTP_PORT=587
AIRFLOW__SMTP__SMTP_USER=ml-ops@nivesh.ai
AIRFLOW__SMTP__SMTP_PASSWORD=***
AIRFLOW__SMTP__SMTP_MAIL_FROM=ml-ops@nivesh.ai
```

### Slack Alerts

Install Slack provider:

```python
# In DAG
from airflow.providers.slack.operators.slack_webhook import SlackWebhookOperator

notify_slack = SlackWebhookOperator(
    task_id='slack_notification',
    http_conn_id='slack_webhook',
    message="""
    Intent Classifier Training Completed
    Version: {{ ti.xcom_pull(key='model_version') }}
    Accuracy: {{ ti.xcom_pull(key='accuracy') }}
    """,
)
```

## Troubleshooting

### Issue: DAG not appearing in UI

**Symptoms**: DAG file exists but not visible in Airflow UI

**Solutions**:
1. Check DAG syntax:
   ```bash
   docker exec -it nivesh-airflow-scheduler python /opt/airflow/dags/intent_classifier_training.py
   ```

2. View scheduler logs:
   ```bash
   docker logs nivesh-airflow-scheduler | grep ERROR
   ```

3. Check DAG bag:
   ```bash
   docker exec -it nivesh-airflow-scheduler airflow dags list-import-errors
   ```

### Issue: Task fails with import error

**Symptoms**: Python import fails in task

**Solutions**:
1. Ensure module path is added:
   ```python
   import sys
   sys.path.insert(0, '/opt/airflow/ml-services/intent_classifier')
   ```

2. Install dependencies in Airflow container:
   ```bash
   docker exec -it nivesh-airflow-scheduler pip install evidently
   ```

3. Create custom Airflow image with dependencies

### Issue: MLflow connection fails

**Symptoms**: `Connection refused` to MLflow

**Solutions**:
1. Verify MLflow is running:
   ```bash
   docker ps | grep mlflow
   ```

2. Check network:
   ```bash
   docker exec -it nivesh-airflow-scheduler ping mlflow
   ```

3. Update tracking URI:
   ```python
   mlflow.set_tracking_uri('http://mlflow:5000')
   ```

### Issue: Data file not found

**Symptoms**: `FileNotFoundError` for training data

**Solutions**:
1. Check volume mount in docker-compose.yml:
   ```yaml
   volumes:
     - ./ml-services:/opt/airflow/ml-services
   ```

2. Verify file exists in container:
   ```bash
   docker exec -it nivesh-airflow-scheduler ls -la /opt/airflow/ml-services/data/
   ```

3. Use absolute paths:
   ```python
   data_path = '/opt/airflow/ml-services/data/intents.json'
   ```

## Best Practices

1. **Data Validation First**: Always validate data before training
2. **Drift Detection**: Run drift checks before expensive training
3. **Performance Thresholds**: Set minimum performance requirements
4. **Gradual Rollout**: Deploy to staging before production
5. **Rollback Plan**: Keep previous production model archived
6. **Monitoring**: Track training duration and resource usage
7. **Notifications**: Alert on failures immediately
8. **Documentation**: Document DAG purpose and parameters
9. **Testing**: Test tasks individually before full DAG run
10. **Version Control**: Track DAG changes in git

## Performance Optimization

### Parallel Task Execution

```python
# These tasks can run in parallel
[validate_data, check_drift] >> train_model

# Fan-out pattern
train_model >> [evaluate, fairness_check] >> deploy
```

### Resource Limits

```python
# Set task-level limits
train = PythonOperator(
    task_id='train_model',
    python_callable=train_model,
    pool='training_pool',  # Limit concurrent training jobs
    queue='ml_queue',      # Dedicated queue for ML tasks
)
```

### Caching with XCom

```python
# Push intermediate results
context['ti'].xcom_push(key='model_uri', value=model_uri)

# Pull in downstream tasks
model_uri = context['ti'].xcom_pull(key='model_uri', task_ids='train_model')
```

## Extending

### Adding New Model DAG

1. Create new DAG file:
   ```bash
   cp ml-services/airflow/dags/intent_classifier_training.py \
      ml-services/airflow/dags/my_model_training.py
   ```

2. Update DAG parameters:
   ```python
   dag = DAG(
       'my_model_training',
       schedule_interval='0 5 * * 2',  # Tuesdays at 5 AM
   )
   ```

3. Update training logic:
   ```python
   def train_model(**context):
       from my_model.train import train_my_model
       run_id, model_uri, metrics = train_my_model(...)
   ```

4. Add to master pipeline:
   ```python
   trigger_my_model = TriggerDagRunOperator(
       task_id='trigger_my_model',
       trigger_dag_id='my_model_training',
   )
   ```

### Custom Operators

```python
from airflow.models.baseoperator import BaseOperator

class DriftDetectionOperator(BaseOperator):
    def __init__(self, model_name, threshold=0.3, **kwargs):
        super().__init__(**kwargs)
        self.model_name = model_name
        self.threshold = threshold
    
    def execute(self, context):
        # Custom drift detection logic
        pass
```

## Next Steps

- [ ] Add Spending Predictor training DAG
- [ ] Add Anomaly Detector training DAG
- [ ] Add Financial NER training DAG
- [ ] Set up production email/Slack alerts
- [ ] Create Grafana dashboard for Airflow metrics
- [ ] Implement automatic data refresh pipelines
- [ ] Add A/B testing deployment strategy
