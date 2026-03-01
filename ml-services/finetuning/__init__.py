"""
Nivesh ML Fine-Tuning Pipeline

End-to-end fine-tuning infrastructure for all local ML models:
- Intent Classifier (DistilBERT)
- Financial NER (SpaCy)
- Anomaly Detector (Isolation Forest)
- Credit Risk Scorer (XGBoost)
- Spending Predictor (Prophet)
- LLM Financial Advisor (LLaMA-3 / Mistral via Ollama + QLoRA)

Includes:
- High-quality synthetic data generation (Indian financial context)
- Hyperparameter optimization (Optuna)
- Model evaluation & benchmarking
- MLflow experiment tracking
- ONNX export for production serving
"""

__version__ = "1.0.0"

SUPPORTED_MODELS = [
    "intent",
    "ner",
    "anomaly",
    "credit",
    "spending",
    "llm",
]
