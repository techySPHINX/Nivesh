"""
Quick validation script for common import issues
"""
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("Testing critical imports...")
print("-" * 60)

errors = []

# Test 1: Shared module
try:
    from shared import config, get_logger
    print("✅ shared module (config, get_logger)")
except Exception as e:
    print(f"❌ shared module: {e}")
    errors.append(("shared", str(e)))

# Test 2: Shared utilities
try:
    from shared.mlflow_utils import create_experiment
    print("✅ shared.mlflow_utils")
except Exception as e:
    print(f"❌ shared.mlflow_utils: {e}")
    errors.append(("shared.mlflow_utils", str(e)))

# Test 3: Intent classifier
try:
    from intent_classifier.model import IntentClassifier
    print("✅ intent_classifier.model")
except Exception as e:
    print(f"❌ intent_classifier.model: {e}")
    errors.append(("intent_classifier", str(e)))

# Test 4: Financial NER
try:
    from financial_ner.model import FinancialNER
    print("✅ financial_ner.model")
except Exception as e:
    print(f"❌ financial_ner.model: {e}")
    errors.append(("financial_ner", str(e)))

# Test 5: Feature store
try:
    from feature_store.store import FeatureStore
    from feature_store.builders import build_user_financial_features
    print("✅ feature_store (store, builders)")
except Exception as e:
    print(f"❌ feature_store: {e}")
    errors.append(("feature_store", str(e)))

# Test 6: Anomaly detector
try:
    from anomaly_detector.model import AnomalyDetector
    print("✅ anomaly_detector.model")
except Exception as e:
    print(f"❌ anomaly_detector.model: {e}")
    errors.append(("anomaly_detector", str(e)))

# Test 7: Credit risk scorer
try:
    from credit_risk_scorer.model import CreditRiskScorer
    print("✅ credit_risk_scorer.model")
except Exception as e:
    print(f"❌ credit_risk_scorer.model: {e}")
    errors.append(("credit_risk_scorer", str(e)))

# Test 8: Spending predictor
try:
    from spending_predictor.model import SpendingPredictor
    print("✅ spending_predictor.model")
except Exception as e:
    print(f"❌ spending_predictor.model: {e}")
    errors.append(("spending_predictor", str(e)))

# Test 9: Gemini advisor
try:
    from gemini_advisor.model import GeminiFinancialAdvisor
    print("✅ gemini_advisor.model")
except Exception as e:
    print(f"❌ gemini_advisor.model: {e}")
    errors.append(("gemini_advisor", str(e)))

print("-" * 60)

if errors:
    print(f"\n❌ {len(errors)} module(s) failed to import")
    print("\nMissing dependencies:")
    for module, error in errors:
        if "No module named" in error:
            # Extract the missing package name
            missing = error.split("'")[1] if "'" in error else "unknown"
            print(f"  • {missing} (needed by {module})")
    print("\nRun: pip install -r requirements.txt")
    sys.exit(1)
else:
    print("\n✅ All critical modules imported successfully!")
    print("All import paths are correct.")
    sys.exit(0)
