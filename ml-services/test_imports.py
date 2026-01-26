"""
Module Import Validation Script

Tests that all ML service modules can be imported without errors.
"""

import sys
import os
import importlib
from pathlib import Path

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def test_import(module_name):
    """Test if a module can be imported."""
    try:
        importlib.import_module(module_name)
        print(f"✅ {module_name}")
        return True
    except Exception as e:
        print(f"❌ {module_name}: {e}")
        return False


def main():
    """Main validation function."""
    print("=" * 60)
    print("ML Services Module Import Validation")
    print("=" * 60)

    modules_to_test = [
        # Shared modules
        "shared",
        "shared.config",
        "shared.logger",
        "shared.metrics",
        "shared.mlflow_utils",

        # Feature store
        "feature_store",
        "feature_store.store",
        "feature_store.builders",

        # ML Models
        "intent_classifier",
        "intent_classifier.model",
        "intent_classifier.train",

        "financial_ner",
        "financial_ner.model",
        "financial_ner.train",

        "anomaly_detector",
        "anomaly_detector.model",
        "anomaly_detector.train",

        "credit_risk_scorer",
        "credit_risk_scorer.model",
        "credit_risk_scorer.train",

        "spending_predictor",
        "spending_predictor.model",
        "spending_predictor.train",

        "gemini_advisor",
        "gemini_advisor.model",

        # Drift detection
        "drift_detection",
        "drift_detection.drift_monitor",

        # Model server
        "model_server",
        "model_server.app",
    ]

    print("\nTesting module imports...\n")

    results = []
    for module in modules_to_test:
        results.append((module, test_import(module)))

    # Summary
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)

    passed = sum(1 for _, success in results if success)
    total = len(results)

    print(f"\nPassed: {passed}/{total}")

    failed_modules = [module for module, success in results if not success]
    if failed_modules:
        print("\n❌ Failed modules:")
        for module in failed_modules:
            print(f"  - {module}")
        return 1
    else:
        print("\n✅ All modules imported successfully!")
        return 0


if __name__ == "__main__":
    sys.exit(main())
