# Drift Detection System

Automated data and prediction drift monitoring for all Nivesh ML models using Evidently AI.

## Overview

The drift detection system monitors model performance degradation by detecting changes in:
- **Data Drift**: Feature distributions changing over time
- **Prediction Drift**: Target distributions changing
- **Data Quality**: Missing values, duplicates, constant features

## Components

### 1. DriftMonitor (`drift_monitor.py`)
Core drift detection class using Evidently AI.

**Features:**
- Data drift detection with statistical tests
- Target drift detection
- Comprehensive HTML reports
- Automated test suites
- Prometheus metrics export
- Alert generation with severity levels

**Usage:**
```python
from drift_monitor import DriftMonitor

# Initialize monitor
monitor = DriftMonitor(
    model_name='spending_predictor',
    reference_data=training_data,
    drift_threshold=0.3  # Alert if drift > 30%
)

# Detect drift
drift_summary = monitor.detect_data_drift(production_data)

# Check for alerts
alert = monitor.check_drift_alert(drift_summary)

if alert['alert_triggered']:
    print(f"Severity: {alert['severity']}")
    print(f"Recommendation: {alert['recommendation']}")

# Generate comprehensive report
report_path = monitor.create_comprehensive_report(production_data)
```

### 2. Drift Check Script (`run_drift_check.py`)
CLI tool for running drift detection on individual or all models.

**Commands:**
```bash
# Check single model
python run_drift_check.py --model spending_predictor --days 7

# Check all models
python run_drift_check.py --all

# Custom time window
python run_drift_check.py --model credit_risk --days 30
```

**Supported Models:**
- `intent_classifier` - Text classification drift
- `financial_ner` - Named entity recognition drift
- `spending_predictor` - Time series forecast drift
- `anomaly_detector` - Anomaly detection drift
- `credit_risk` - Credit risk model drift

### 3. API Endpoints (`drift_endpoints.py`)
FastAPI routes for drift detection integrated into model server.

**Endpoints:**
```bash
# Run drift check for a model
POST /monitoring/drift/{model_name}/check
{
  "days": 7,
  "drift_threshold": 0.3
}

# Get latest drift status
GET /monitoring/drift/{model_name}

# Get all active alerts
GET /monitoring/drift/alerts

# Clear alerts
DELETE /monitoring/drift/alerts

# Get Prometheus metrics
GET /monitoring/drift/metrics

# Check all models
POST /monitoring/drift/check-all
```

**Example:**
```bash
# Check spending predictor for drift
curl -X POST http://localhost:8000/monitoring/drift/spending_predictor/check \
  -H "Content-Type: application/json" \
  -d '{"days": 7, "drift_threshold": 0.3}'

# Get drift metrics for Prometheus
curl http://localhost:8000/monitoring/drift/metrics
```

## Drift Detection Workflow

```
┌─────────────────────┐
│ Reference Data      │
│ (Training Dataset)  │
└──────┬──────────────┘
       │
       ├───────────────────────────┐
       │                           │
       ▼                           ▼
┌──────────────────┐      ┌──────────────────┐
│ Production Data  │      │ Statistical      │
│ (Last N days)    │─────▶│ Comparison       │
└──────────────────┘      └────────┬─────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │ Drift Score     │
                          │ (0.0 - 1.0)     │
                          └────────┬────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
             ┌──────────┐   ┌──────────┐  ┌──────────┐
             │ LOW      │   │ MEDIUM   │  │ HIGH     │
             │ < 0.1    │   │ < 0.3    │  │ < 0.5    │
             └──────────┘   └──────────┘  └──────────┘
                  │              │              │
                  ▼              ▼              ▼
             Monitor      Investigate    Retrain Soon
```

## Alert Severity Levels

| Drift Score | Severity | Action Required |
|-------------|----------|-----------------|
| < 0.1 | LOW | Continue monitoring |
| 0.1 - 0.3 | MEDIUM | Investigate drifted features |
| 0.3 - 0.5 | HIGH | Retrain within 7 days |
| > 0.5 | CRITICAL | Retrain immediately |

## Reports Generated

Each drift check generates:

1. **Data Drift Report** (`data_drift_YYYYMMDD_HHMMSS.html`)
   - Feature-by-feature drift analysis
   - Statistical test results (KS test, Chi-square, etc.)
   - Distribution visualizations
   - Drift score per feature

2. **Target Drift Report** (`target_drift_YYYYMMDD_HHMMSS.html`)
   - Target distribution changes
   - Prediction drift analysis

3. **Comprehensive Report** (`comprehensive_YYYYMMDD_HHMMSS.html`)
   - Combined data drift + data quality
   - Missing values analysis
   - Duplicate detection
   - Constant feature identification

4. **Test Report** (`tests_YYYYMMDD_HHMMSS.html`)
   - Pass/fail for automated tests
   - Data quality checks
   - Drift threshold violations

Reports are saved to: `ml-services/reports/{model_name}/`

## Prometheus Integration

Drift metrics are exported in Prometheus format:

```prometheus
# Drift score (0-1)
model_drift_score{spending_predictor} 0.42

# Dataset drift detected (0=no, 1=yes)
model_dataset_drift{spending_predictor} 1

# Number of drifted features
model_drifted_features{spending_predictor} 3
```

**Grafana Dashboard Queries:**
```promql
# Alert on high drift
model_drift_score > 0.3

# Track drift over time
rate(model_drift_score[1h])

# Models with active drift
count(model_dataset_drift == 1)
```

## Automated Scheduling

### Weekly Drift Checks (Cron)
```bash
# Add to crontab for weekly Sunday 2 AM checks
0 2 * * 0 cd /path/to/ml-services/drift_detection && python run_drift_check.py --all
```

### Airflow DAG (See Task 13)
```python
from airflow import DAG
from airflow.operators.bash_operator import BashOperator

drift_check_dag = DAG(
    'drift_detection',
    schedule_interval='@weekly',
    catchup=False
)

check_drift = BashOperator(
    task_id='check_all_models',
    bash_command='cd /ml-services/drift_detection && python run_drift_check.py --all',
    dag=drift_check_dag
)
```

## Customization

### Custom Drift Threshold
```python
monitor = DriftMonitor(
    model_name='my_model',
    reference_data=reference_df,
    drift_threshold=0.25  # More sensitive (25%)
)
```

### Custom Column Mapping
```python
from evidently import ColumnMapping

column_mapping = ColumnMapping(
    target='will_default',
    prediction='predicted_default',
    numerical_features=['income', 'debt', 'credit_score'],
    categorical_features=['employment_type', 'loan_purpose']
)

drift_summary = monitor.detect_data_drift(
    production_data,
    column_mapping=column_mapping
)
```

### Production Data Loader
Replace `simulate_production_data()` in `run_drift_check.py`:

```python
def load_production_data_from_db(model_name: str, days: int = 7):
    """Load real production data from database."""
    from datetime import datetime, timedelta
    import psycopg2
    
    conn = psycopg2.connect(DATABASE_URL)
    
    start_date = datetime.now() - timedelta(days=days)
    
    query = f"""
    SELECT * FROM {model_name}_predictions
    WHERE created_at >= %s
    """
    
    df = pd.read_sql(query, conn, params=[start_date])
    conn.close()
    
    return df
```

## Testing

```bash
# Test drift detection locally
cd ml-services/drift_detection

# Single model
python run_drift_check.py --model spending_predictor --days 7

# All models
python run_drift_check.py --all

# Check generated reports
ls -la reports/spending_predictor/
```

## Troubleshooting

### Issue: No drift detected when expected
**Solution:** Lower drift threshold or check reference data freshness
```python
monitor.drift_threshold = 0.2  # More sensitive
```

### Issue: Too many false alarms
**Solution:** Increase threshold or update reference data
```python
# Update reference data with recent production data
monitor.set_reference_data(recent_production_data)
```

### Issue: Reports not generating
**Solution:** Check write permissions
```bash
mkdir -p ml-services/reports/{model_name}
chmod 755 ml-services/reports
```

## Best Practices

1. **Weekly Drift Checks**: Run automated checks every 7 days
2. **Update Reference Data**: Retrain and update reference data quarterly
3. **Monitor Alerts**: Set up Slack/email notifications for CRITICAL alerts
4. **Drift History**: Keep drift history for trend analysis
5. **Seasonal Patterns**: Account for seasonal spending patterns (festivals, etc.)
6. **Feature-Level Analysis**: Investigate individual drifted features before retraining
7. **A/B Testing**: Test retrained models with A/B deployment before full rollout

## Dependencies

- `evidently==0.4.13` - Drift detection library
- `pandas>=2.0.0` - Data manipulation
- `numpy>=1.24.0` - Numerical operations

Already included in `ml-services/requirements.txt`.

## Next Steps

- [ ] Integrate with Airflow for automated scheduling (Task 13)
- [ ] Create Grafana dashboards for drift visualization (Task 14)
- [ ] Set up Slack alerts for drift notifications
- [ ] Implement automatic model retraining triggers
