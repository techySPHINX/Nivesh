# ML Models Quick Start Guide

**Quick reference for training and using all 6 ML models**

---

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd ml-services
pip install -r requirements.txt

# Download SpaCy model for NER
python -m spacy download en_core_web_sm
```

### 2. Start Infrastructure
```bash
docker-compose up -d

# Verify services
docker-compose ps
```

### 3. Check MLflow
Open http://localhost:5000 to view experiment tracking

---

## 📊 Training All Models

### Intent Classification
```bash
cd ml-services
python intent_classifier/train.py --data-path data/intents.json

# View in MLflow: http://localhost:5000/#/experiments/intent_classifier
```
**Expected:** Accuracy >99%, Training time ~2 minutes

### Financial NER
```bash
python financial_ner/train.py --data-path data/ner_training.json

# View in MLflow: http://localhost:5000/#/experiments/financial_ner
```
**Expected:** F1 >0.90, Training time ~3 minutes

### Spending Pattern Prediction
```bash
python spending_predictor/train.py --data-path data/transactions.json

# Optional: Category-specific model
python spending_predictor/train.py --data-path data/transactions.json --category groceries
```
**Expected:** Training time ~1 minute

### Anomaly Detection
```bash
python anomaly_detector/train.py --data-path data/transactions.json

# Adjust contamination (expected anomaly rate)
python anomaly_detector/train.py --data-path data/transactions.json --contamination 0.02
```
**Expected:** Training time ~30 seconds

### Credit Risk Scoring
```bash
python credit_risk_scorer/train.py --data-path data/credit_applications.json

# Tune hyperparameters
python credit_risk_scorer/train.py \
  --data-path data/credit_applications.json \
  --max-depth 8 \
  --n-estimators 200 \
  --learning-rate 0.05
```
**Expected:** AUC-ROC >0.85, Training time ~1 minute

### Gemini Pro Advisor
```bash
# Create fine-tuning dataset
python gemini_advisor/setup.py --create-dataset

# Test with API key
export GOOGLE_API_KEY="your_api_key_here"
python gemini_advisor/setup.py --test

# Or inline
python gemini_advisor/setup.py --api-key YOUR_KEY --test
```
**Expected:** 5 successful responses

---

## 🎯 Using Models (Python)

### Intent Classification
```python
from intent_classifier import IntentClassifier

classifier = IntentClassifier()
classifier.load_model('models/intent_classifier')

result = classifier.predict("Can I afford a ₹50L home loan?")
print(f"Intent: {result['intent']}")  # affordability_check
print(f"Confidence: {result['confidence']:.2%}")  # 98.5%
```

### Financial NER
```python
from financial_ner import FinancialNER

ner = FinancialNER()
ner.load_model('models/financial_ner')

result = ner.predict("I spent ₹5000 at BigBazaar on groceries yesterday")
for entity in result['entities']:
    print(f"{entity['text']}: {entity['label']}")
# ₹5000: MONEY
# BigBazaar: MERCHANT
# groceries: CATEGORY
# yesterday: DATE
```

### Spending Prediction
```python
from spending_predictor import SpendingPredictor

predictor = SpendingPredictor.load('models/spending_predictor')

# Next 30 days
forecast = predictor.predict_next_month()
print(f"Predicted: ₹{forecast['total_predicted']:,.2f}")
print(f"Range: ₹{forecast['confidence_lower']:,.2f} - ₹{forecast['confidence_upper']:,.2f}")
```

### Anomaly Detection
```python
from anomaly_detector import AnomalyDetector

detector = AnomalyDetector.load('models/anomaly_detector')

transaction = {
    'amount': 50000,  # Unusually high
    'category': 'groceries',
    'merchant': 'Unknown Store',
    'date': '2026-01-25 23:30:00'  # Late night
}

result = detector.predict(transaction, return_score=True)
print(f"Is Anomaly: {result['is_anomaly']}")  # True
print(f"Score: {result['anomaly_score']:.4f}")  # -0.85 (negative = anomaly)
```

### Credit Risk Scoring
```python
from credit_risk_scorer import CreditRiskScorer

scorer = CreditRiskScorer.load('models/credit_risk_scorer')

applicant = {
    'age': 28,
    'monthly_income': 50000,
    'monthly_debt': 25000,
    'credit_limit': 100000,
    'credit_used': 95000,
    'loan_amount': 300000,
    'payments_missed': 3,
    'total_payments': 18,
    'months_employed': 24,
    'credit_history_months': 24,
    'num_credit_accounts': 5,
    'has_mortgage': False,
    'has_car_loan': True,
    'employment_type': 'salaried',
    'education': 'graduate'
}

result = scorer.predict(applicant, return_probability=True)
print(f"Risk Score: {result['risk_score']}/100")  # 75
print(f"Category: {result['risk_category']}")  # high
print(f"Default Probability: {result['default_probability']:.2%}")  # 75%
```

### Gemini Advisor
```python
from gemini_advisor import GeminiFinancialAdvisor

advisor = GeminiFinancialAdvisor(api_key='YOUR_API_KEY')

user_profile = {
    'age': 28,
    'monthly_income': 50000,
    'savings': 100000,
    'goals': ['retirement', 'house']
}

response = advisor.generate_response(
    query="How should I start investing for retirement?",
    user_profile=user_profile
)

print(response['response'])
# Detailed advice about PPF, NPS, mutual funds, etc.
```

---

## 🌐 Using Model Server API

### Start Server
```bash
cd ml-services/model_server
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

# Or with Docker
docker-compose up model-server
```

### API Endpoints

**Intent Classification**
```bash
curl -X POST http://localhost:8000/predict/intent \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Can I afford a loan?",
    "user_id": "user123"
  }'
```

**NER Extraction**
```bash
curl -X POST http://localhost:8000/predict/ner \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I spent ₹5000 on groceries"
  }'
```

**Spending Prediction**
```bash
curl -X POST http://localhost:8000/predict/spending \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "months": 6
  }'
```

**Anomaly Detection**
```bash
curl -X POST http://localhost:8000/predict/anomaly \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "transaction": {
      "amount": 50000,
      "category": "groceries",
      "merchant": "Unknown",
      "date": "2026-01-25 23:30:00"
    }
  }'
```

**Credit Risk**
```bash
curl -X POST http://localhost:8000/predict/credit-risk \
  -H "Content-Type: application/json" \
  -d '{
    "applicant_data": {
      "age": 28,
      "monthly_income": 50000,
      "monthly_debt": 25000,
      "credit_used": 95000,
      "credit_limit": 100000,
      ...
    }
  }'
```

**Health Check**
```bash
curl http://localhost:8000/health

# Response:
# {
#   "status": "healthy",
#   "models_loaded": 5,
#   "mlflow_connected": true
# }
```

**List Models**
```bash
curl http://localhost:8000/models/list
```

**View Metrics**
```bash
curl http://localhost:8000/metrics
# Prometheus format
```

---

## 🔧 Common Operations

### Clear Model Cache
```bash
curl -X POST http://localhost:8000/cache/clear
```

### View MLflow UI
```bash
open http://localhost:5000
```

### View Prometheus Metrics
```bash
open http://localhost:9090
```

### View Grafana Dashboards
```bash
open http://localhost:3001
# Default credentials: admin/admin
```

### Check Redis
```bash
redis-cli -h localhost -p 6379
> PING
PONG
> KEYS features:*
```

---

## 📈 Performance Optimization

### ONNX Export (Intent Classifier)
```python
from intent_classifier import IntentClassifier

classifier = IntentClassifier()
classifier.load_model('models/intent_classifier')
classifier.export_onnx('models/intent_classifier_onnx')

# 2-3x faster inference!
```

### Model Quantization (XGBoost)
```python
# Already optimized - XGBoost is inherently efficient
# For further optimization, reduce max_depth and n_estimators
```

### Feature Caching
```python
from feature_store import FeatureStore

store = FeatureStore()

# Save user features
store.save_features(
    user_id='user123',
    features={'monthly_income': 50000, ...},
    ttl=3600  # 1 hour cache
)

# Retrieve (fast!)
features = store.get_features('user123')
```

---

## 🐛 Troubleshooting

### Model Not Loading
```bash
# Check MLflow
curl http://localhost:5000/health

# Verify model registered
curl http://localhost:5000/api/2.0/mlflow/registered-models/list

# Re-train if needed
python {model}/train.py --data-path data/{dataset}.json
```

### API Errors
```bash
# Check logs
docker-compose logs model-server

# Restart server
docker-compose restart model-server
```

### Redis Connection Failed
```bash
# Restart Redis
docker-compose restart redis-feature-store

# Verify
redis-cli -h localhost -p 6379 PING
```

---

## 📚 More Documentation

- **Training Guide:** [docs/TRAINING_GUIDE.md](docs/TRAINING_GUIDE.md)
- **Deployment Runbook:** [docs/DEPLOYMENT_RUNBOOK.md](docs/DEPLOYMENT_RUNBOOK.md)
- **Best Practices:** [docs/MLOPS_BEST_PRACTICES.md](docs/MLOPS_BEST_PRACTICES.md)
- **Phase 2 Summary:** [PHASE_2_COMPLETE.md](PHASE_2_COMPLETE.md)

---

**Happy ML Model Training! 🚀**
