# Grafana Dashboards for Nivesh ML Services

Pre-configured Grafana dashboards for monitoring ML model performance, drift detection, and API health.

## Quick Start

### Access Grafana

1. **Start services**:
   ```bash
   docker-compose up -d grafana prometheus
   ```

2. **Open Grafana**:
   - URL: `http://localhost:3001`
   - Username: `admin`
   - Password: `admin`
   - Change password on first login

3. **View Dashboards**:
   - Navigate to **Dashboards** → **ML Services**
   - Pre-configured: **ML Model Performance**

## Available Dashboards

### 1. ML Model Performance (`ml-performance.json`)

Real-time monitoring of model prediction performance.

**Panels**:

1. **Prediction Request Rate** (Line Chart)
   - Metric: `rate(ml_predictions_total[5m])`
   - Shows: Requests per second by model
   - Use: Monitor traffic patterns and peaks

2. **P95 Prediction Latency** (Gauge)
   - Metric: `histogram_quantile(0.95, rate(ml_prediction_latency_seconds_bucket[5m]))`
   - Threshold: Green (<100ms), Yellow (<500ms), Red (>500ms)
   - Use: Ensure SLA compliance

3. **Prediction Error Rate** (Stacked Line Chart)
   - Metric: `rate(ml_prediction_errors_total[5m])`
   - Shows: Errors by model and error type
   - Use: Identify failing models

4. **Data Drift Score** (Bar Gauge)
   - Metric: `model_drift_score`
   - Threshold: Green (<0.1), Yellow (<0.3), Orange (<0.5), Red (>0.5)
   - Use: Detect models needing retraining

5. **Request Distribution** (Pie Chart)
   - Metric: `sum(rate(ml_predictions_total[5m])) by (model_name)`
   - Shows: Which models receive most traffic
   - Use: Capacity planning

6. **Dataset Drift Status** (Stat)
   - Metric: `model_dataset_drift`
   - Shows: 0 = No Drift, 1 = Drift Detected
   - Use: Quick drift overview

7. **Drifted Features Count** (Stat)
   - Metric: `model_drifted_features`
   - Threshold: Green (<5), Yellow (<10), Red (>10)
   - Use: Severity of drift

8. **Total Predictions** (Stat)
   - Metric: `sum(ml_predictions_total)`
   - Shows: All-time prediction count
   - Use: Usage statistics

**Refresh Rate**: 5 seconds (configurable)

**Time Range**: Last 1 hour (adjustable in time picker)

## Datasource Configuration

Prometheus is configured automatically via `datasources/prometheus.yml`:

```yaml
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    isDefault: true
```

No manual configuration needed.

## Metrics Reference

### Model Server Metrics

Collected from `ml-services/model_server/app.py`:

```python
# Request counter
ml_predictions_total{model_name="intent_classifier"}

# Latency histogram
ml_prediction_latency_seconds_bucket{model_name="intent_classifier", le="0.1"}
ml_prediction_latency_seconds_sum{model_name="intent_classifier"}
ml_prediction_latency_seconds_count{model_name="intent_classifier"}

# Error counter
ml_prediction_errors_total{model_name="intent_classifier", error_type="ValueError"}
```

### Drift Detection Metrics

Collected from `ml-services/drift_detection/drift_endpoints.py`:

```python
# Drift score (0-1)
model_drift_score{model_name="spending_predictor"} 0.42

# Dataset drift detected (0=no, 1=yes)
model_dataset_drift{model_name="spending_predictor"} 1

# Number of drifted features
model_drifted_features{model_name="spending_predictor"} 3
```

## Alert Rules

Configured in `prometheus/prometheus.yml`:

### High Drift Alert

```yaml
groups:
  - name: ml_drift
    interval: 5m
    rules:
      - alert: HighModelDrift
        expr: model_drift_score > 0.3
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High drift detected on {{ $labels.model_name }}"
          description: "Drift score {{ $value }} exceeds threshold 0.3"
```

### Critical Drift Alert

```yaml
- alert: CriticalModelDrift
  expr: model_drift_score > 0.5
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "CRITICAL drift on {{ $labels.model_name }}"
    description: "Drift score {{ $value }} - immediate retraining required"
```

### High Error Rate Alert

```yaml
- alert: HighPredictionErrors
  expr: rate(ml_prediction_errors_total[5m]) > 0.05
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "High error rate on {{ $labels.model_name }}"
    description: "Error rate {{ $value }}/sec exceeds threshold"
```

### High Latency Alert

```yaml
- alert: HighPredictionLatency
  expr: histogram_quantile(0.95, rate(ml_prediction_latency_seconds_bucket[5m])) > 1.0
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High latency on {{ $labels.model_name }}"
    description: "P95 latency {{ $value }}s exceeds 1s SLA"
```

## Customization

### Modify Dashboard

1. **Via UI**:
   - Open dashboard → Click **Settings** (gear icon)
   - Edit panels, add new panels
   - **Save** dashboard
   - Export JSON: **Share** → **Export** → **Save to file**

2. **Via JSON**:
   - Edit `ml-performance.json`
   - Reload Grafana: `docker-compose restart grafana`

### Add New Panel

**Example: Cache Hit Rate**

```json
{
  "datasource": {
    "type": "prometheus",
    "uid": "prometheus"
  },
  "targets": [
    {
      "expr": "rate(ml_cache_hits_total[5m]) / (rate(ml_cache_hits_total[5m]) + rate(ml_cache_misses_total[5m]))",
      "refId": "A",
      "legendFormat": "{{model_name}}"
    }
  ],
  "title": "Cache Hit Rate",
  "type": "timeseries"
}
```

### Change Refresh Rate

In dashboard JSON:

```json
{
  "refresh": "10s",  // Options: "5s", "10s", "30s", "1m", "5m", false
  ...
}
```

## Troubleshooting

### Dashboard Not Loading

**Symptoms**: Blank dashboard or "No data" message

**Solutions**:

1. **Check Prometheus**:
   ```bash
   curl http://localhost:9090/-/healthy
   ```

2. **Verify metrics exist**:
   ```bash
   curl http://localhost:9090/api/v1/query?query=ml_predictions_total
   ```

3. **Check Grafana logs**:
   ```bash
   docker logs nivesh-grafana
   ```

4. **Verify datasource**:
   - Grafana UI → **Configuration** → **Data sources**
   - Click **Prometheus**
   - Click **Test** button

### Metrics Not Appearing

**Symptoms**: Panels show "No data"

**Solutions**:

1. **Generate some traffic**:
   ```bash
   curl -X POST http://localhost:8000/predict/intent \
     -H "Content-Type: application/json" \
     -d '{"query": "show my spending"}'
   ```

2. **Check model server**:
   ```bash
   docker logs nivesh-ml-api
   curl http://localhost:8000/metrics
   ```

3. **Verify Prometheus scraping**:
   - Open `http://localhost:9090/targets`
   - Check `ml-api` target status

### Drift Metrics Missing

**Symptoms**: Drift panels show no data

**Solutions**:

1. **Run drift detection**:
   ```bash
   docker exec -it nivesh-ml-api python /app/drift_detection/run_drift_check.py --all
   ```

2. **Or use API**:
   ```bash
   curl -X POST http://localhost:8000/monitoring/drift/spending_predictor/check \
     -H "Content-Type: application/json" \
     -d '{"days": 7}'
   ```

3. **Check drift metrics endpoint**:
   ```bash
   curl http://localhost:8000/monitoring/drift/metrics
   ```

## Best Practices

1. **Set Time Range**: Use appropriate time ranges for different analyses
   - Real-time monitoring: Last 5-15 minutes
   - Performance trends: Last 24 hours
   - Weekly patterns: Last 7 days

2. **Use Variables**: Create dashboard variables for dynamic filtering
   ```json
   {
     "templating": {
       "list": [
         {
           "name": "model",
           "type": "query",
           "query": "label_values(ml_predictions_total, model_name)"
         }
       ]
     }
   }
   ```

3. **Set Alerts**: Configure alert rules in Prometheus
4. **Regular Review**: Check dashboards daily for anomalies
5. **Baseline Metrics**: Establish normal ranges for each metric
6. **Document Thresholds**: Keep threshold rationale documented

## Next Steps

- [ ] Add Airflow task execution dashboard
- [ ] Create model accuracy tracking dashboard
- [ ] Add infrastructure metrics (CPU, memory, disk)
- [ ] Configure Slack/email alert notifications
- [ ] Create mobile-friendly dashboard layouts
- [ ] Add prediction cost tracking (API costs)
- [ ] Create SLA compliance dashboard

## Additional Resources

- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Query Language](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Alerting](https://grafana.com/docs/grafana/latest/alerting/)
