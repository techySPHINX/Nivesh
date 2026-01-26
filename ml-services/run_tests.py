"""
Comprehensive Test Suite for ML Services

Run this to validate the entire ML services stack.
"""

import sys
import os
from pathlib import Path
import subprocess


def run_command(cmd, description):
    """Run a command and return success status."""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"{'='*60}")
    try:
        result = subprocess.run(
            cmd, shell=True, check=True, capture_output=True, text=True)
        print(result.stdout)
        print(f"✅ {description} - PASSED")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} - FAILED")
        print(f"Error: {e.stderr}")
        return False


def main():
    """Run comprehensive tests."""
    print("="*60)
    print("ML Services Comprehensive Test Suite")
    print("="*60)

    tests = []

    # 1. Import validation
    tests.append(run_command(
        f"{sys.executable} test_imports.py",
        "Module Import Validation"
    ))

    # 2. Code formatting check
    print("\nChecking code formatting...")
    if Path("shared").exists():
        tests.append(run_command(
            f"{sys.executable} -m black --check shared/ intent_classifier/ financial_ner/ anomaly_detector/ credit_risk_scorer/ spending_predictor/ gemini_advisor/ feature_store/ drift_detection/ model_server/",
            "Code Formatting (Black)"
        ))

    # 3. Linting
    print("\nRunning linter...")
    tests.append(run_command(
        f"{sys.executable} -m flake8 shared/ --max-line-length=120 --ignore=E203,W503",
        "Linting (Flake8)"
    ))

    # 4. Type checking
    print("\nType checking...")
    tests.append(run_command(
        f"{sys.executable} -m mypy shared/ --ignore-missing-imports",
        "Type Checking (MyPy)"
    ))

    # Summary
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)

    passed = sum(tests)
    total = len(tests)

    print(f"\nPassed: {passed}/{total}")
    print(f"Failed: {total - passed}/{total}")

    if passed == total:
        print("\n✅ All tests passed!")
        return 0
    else:
        print(f"\n❌ {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
