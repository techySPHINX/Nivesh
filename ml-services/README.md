# Nivesh ML Services

Machine Learning and MLOps infrastructure for Nivesh financial advisor.

## Architecture

```
ml-services/
├── intent_classifier/      # Intent classification model (DistilBERT)
├── financial_ner/          # Named Entity Recognition (SpaCy)
├── spending_predictor/     # Spending forecasting (Prophet)
├── anomaly_detector/       # Transaction anomaly detection (Isolation Forest)
├── credit_risk/            # Credit risk scoring (XGBoost)
├── gemini_tuning/          # Fine-tuned Gemini Pro
├── feature_store/          # Feature engineering and Redis store
├── model_server/           # FastAPI serving layer
├── monitoring/             # Drift detection and monitoring
├── pipelines/              # Airflow training pipelines
├── shared/                 # Shared utilities
└── data/                   # Training datasets
```

## Models

### 1. Intent Classification
- **Purpose:** Classify user queries into intent categories
- **Architecture:** DistilBERT fine-tuned
- **Accuracy Target:** 99%+
- **Endpoint:** `POST /predict/intent`

### 2. Financial NER
- **Purpose:** Extract financial entities (amounts, dates, categories, merchants)
- **Architecture:** SpaCy with custom entity types
- **Entities:** MONEY, DATE, CATEGORY, MERCHANT, ACCOUNT
- **Endpoint:** `POST /predict/ner`

### 3. Spending Pattern Prediction
- **Purpose:** Forecast future spending
- **Architecture:** Facebook Prophet + LSTM
- **Horizon:** 6-12 months
- **Endpoint:** `POST /predict/spending`

### 4. Anomaly Detection
- **Purpose:** Detect unusual transactions
- **Architecture:** Isolation Forest + Autoencoders
- **False Positive Rate:** <1%
- **Endpoint:** `POST /predict/anomaly`

### 5. Credit Risk Scoring
- **Purpose:** Predict loan default probability
- **Architecture:** XGBoost classifier
- **AUC Target:** >0.85
- **Endpoint:** `POST /predict/credit_risk`

### 6. Fine-tuned Gemini Pro
- **Purpose:** Domain-specific financial advisor
- **Base Model:** Gemini 1.5 Pro
- **Training Data:** Indian financial advice corpus
- **Endpoint:** `POST /api/v1/gemini/advice`

## MLOps Components

### Feature Store
- **Backend:** Redis
- **TTL:** 1 hour for real-time features
- **Versioning:** Feature set versions tracked in DB

### Experiment Tracking
- **Platform:** MLflow
- **Tracking URI:** `http://localhost:5000`
- **Registry:** PostgreSQL-backed

### Model Registry
- **Database:** PostgreSQL
- **Tables:** `model_registry`, `model_deployments`, `model_predictions`
- **Versioning:** Semantic versioning (v1.0.0, v1.1.0, etc.)

### Training Pipelines
- **Orchestrator:** Apache Airflow
- **Schedule:** Weekly automated retraining
- **Triggers:** Drift detection, performance degradation

### Monitoring
- **Metrics:** Prometheus
- **Dashboards:** Grafana
- **Drift Detection:** Evidently
- **Alerts:** Slack, Email, PagerDuty

## Getting Started

### Prerequisites

```bash
# Install Python dependencies
pip install -r requirements.txt

# Start MLflow server
docker run -d -p 5000:5000 \
  -v $(pwd)/mlruns:/mlruns \
  --name mlflow-server \
  ghcr.io/mlflow/mlflow:latest \
  mlflow server --host 0.0.0.0

# Start Redis (feature store)
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Start model server
cd model_server
python app.py
```

### Training a Model

```bash
# Train intent classifier
cd intent_classifier
python train.py --config config.yaml

# Train financial NER
cd financial_ner
python train.py --data-path ../data/ner_training.json

# Train spending predictor
cd spending_predictor
python train.py --user-id all --horizon 12
```

### Deploying a Model

```bash
# Register model in MLflow
mlflow models serve -m models:/intent_classifier/production -p 8001

# Or deploy via API
curl -X POST http://localhost:8000/admin/deploy \
  -H "Content-Type: application/json" \
  -d '{"model_name": "intent_classifier", "version": "v1.2.0", "environment": "production"}'
```

## API Documentation

See [API_REFERENCE.md](./docs/API_REFERENCE.md) for complete endpoint documentation.

## Development

### Running Tests

```bash
# Unit tests
pytest tests/unit

# Integration tests
pytest tests/integration

# Load tests
locust -f tests/load/locustfile.py
```

### Code Quality

```bash
# Linting
pylint ml-services/

# Type checking
mypy ml-services/

# Format
black ml-services/
```

## Deployment

### Docker

```bash
# Build image
docker build -t nivesh-ml-services:latest .

# Run container
docker run -d -p 8000:8000 \
  -e MLFLOW_TRACKING_URI=http://mlflow:5000 \
  -e REDIS_HOST=redis \
  nivesh-ml-services:latest
```

### Kubernetes

```bash
# Deploy
kubectl apply -f k8s/

# Scale
kubectl scale deployment ml-server --replicas=3
```

## Monitoring & Alerts

### Key Metrics

- **Latency:** p50, p95, p99 per endpoint
- **Throughput:** Requests/second
- **Accuracy:** Per-model accuracy on validation set
- **Drift Score:** Data drift magnitude
- **Error Rate:** 4xx, 5xx errors

### SLOs

- **Availability:** 99.9%
- **Latency (p95):** <200ms
- **Accuracy:** Intent >99%, NER >95%, Credit Risk AUC >85%
- **Drift Detection:** Alert within 24 hours

## Troubleshooting

See [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)

## License

See [LICENSE](../LICENSE)
