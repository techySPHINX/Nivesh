#!/usr/bin/env python3
"""
End-to-End Fine-Tuning Pipeline Orchestrator

Runs the complete fine-tuning pipeline:
  1. Generate synthetic training data
  2. Fine-tune each model (with HPO)
  3. Evaluate all models
  4. Generate consolidated report
  5. Optionally register models in MLflow

Usage:
  # Fine-tune all models
  python -m finetuning.run_pipeline

  # Fine-tune specific models only
  python -m finetuning.run_pipeline --models intent ner anomaly

  # Skip data generation (use existing synthetic data)
  python -m finetuning.run_pipeline --skip-data-gen

  # Quick mode (fewer trials, smaller data)
  python -m finetuning.run_pipeline --quick

  # Dry run (show what would be done)
  python -m finetuning.run_pipeline --dry-run
"""

import argparse
import json
import logging
import os
import sys
import time
import traceback
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

sys.path.insert(0, str(Path(__file__).parent.parent))

from finetuning.config import (
    DataGenConfig,
    IntentFinetuneConfig,
    NERFinetuneConfig,
    AnomalyFinetuneConfig,
    CreditRiskFinetuneConfig,
    SpendingFinetuneConfig,
    LLMFinetuneConfig,
    EvalThresholds,
    SYNTHETIC_DATA_DIR,
    FINETUNED_MODELS_DIR,
    EVAL_RESULTS_DIR,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger("finetuning.pipeline")

# ---------------------------------------------------------------------------
# Model Registry: maps short names → fine-tune function + config class
# ---------------------------------------------------------------------------
MODEL_REGISTRY = {
    "intent": {
        "name": "Intent Classifier (DistilBERT)",
        "module": "finetuning.finetune_intent",
        "function": "finetune_intent",
        "config_class": IntentFinetuneConfig,
    },
    "ner": {
        "name": "Financial NER (SpaCy)",
        "module": "finetuning.finetune_ner",
        "function": "finetune_ner",
        "config_class": NERFinetuneConfig,
    },
    "anomaly": {
        "name": "Anomaly Detector (IsolationForest)",
        "module": "finetuning.finetune_anomaly",
        "function": "finetune_anomaly",
        "config_class": AnomalyFinetuneConfig,
    },
    "credit": {
        "name": "Credit Risk Scorer (XGBoost)",
        "module": "finetuning.finetune_credit_risk",
        "function": "finetune_credit_risk",
        "config_class": CreditRiskFinetuneConfig,
    },
    "spending": {
        "name": "Spending Predictor (Prophet)",
        "module": "finetuning.finetune_spending",
        "function": "finetune_spending",
        "config_class": SpendingFinetuneConfig,
    },
    "llm": {
        "name": "LLM Advisor (QLoRA)",
        "module": "finetuning.finetune_llm",
        "function": "finetune_llm",
        "config_class": LLMFinetuneConfig,
    },
}


def _import_function(module_path: str, func_name: str):
    """Dynamically import a fine-tuning function."""
    import importlib
    mod = importlib.import_module(module_path)
    return getattr(mod, func_name)


def generate_data(config: DataGenConfig, quick: bool = False) -> Dict:
    """Step 1: Generate synthetic training data."""
    logger.info("=" * 60)
    logger.info("STEP 1: Generating Synthetic Training Data")
    logger.info("=" * 60)

    if quick:
        config.intent_samples_per_class = 30
        config.ner_samples = 200
        config.transaction_count = 5000
        config.credit_applications = 500
        config.llm_qa_pairs = 200
        logger.info("Quick mode: reduced data generation sizes")

    from finetuning.data_generators import generate_all_synthetic_data
    stats = generate_all_synthetic_data(config)

    logger.info(f"Data generation complete. Stats: {json.dumps(stats, indent=2)}")
    return stats


def finetune_model(model_key: str, quick: bool = False) -> Dict:
    """Fine-tune a single model."""
    entry = MODEL_REGISTRY[model_key]
    logger.info(f"\n{'—'*60}")
    logger.info(f"Fine-tuning: {entry['name']}")
    logger.info(f"{'—'*60}")

    config = entry["config_class"]()

    # Quick mode: reduce HPO trials and epochs
    if quick:
        if hasattr(config, "n_trials"):
            config.n_trials = min(config.n_trials, 5)
        if hasattr(config, "optuna_trials"):
            config.optuna_trials = min(config.optuna_trials, 5)
        if hasattr(config, "max_epochs"):
            config.max_epochs = min(config.max_epochs, 2)
        if hasattr(config, "num_epochs"):
            config.num_epochs = min(config.num_epochs, 2)

    func = _import_function(entry["module"], entry["function"])
    result = func(config)

    return result


def evaluate_models(results: Dict) -> Dict:
    """Step 3: Evaluate all fine-tuned models."""
    logger.info("\n" + "=" * 60)
    logger.info("STEP 3: Evaluating All Models")
    logger.info("=" * 60)

    from finetuning.evaluation import evaluate_all_models
    report = evaluate_all_models(results)
    return report


def run_pipeline(
    models: Optional[List[str]] = None,
    skip_data_gen: bool = False,
    quick: bool = False,
    dry_run: bool = False,
    fail_fast: bool = False,
):
    """
    Execute the full fine-tuning pipeline.

    Args:
        models: List of model keys to fine-tune. None = all models.
        skip_data_gen: Skip synthetic data generation.
        quick: Quick mode with reduced data & HPO trials.
        dry_run: Only show plan, don't execute.
        fail_fast: Stop on first model failure.
    """
    start_time = time.time()

    # Resolve model list
    if models is None:
        models = list(MODEL_REGISTRY.keys())
    else:
        for m in models:
            if m not in MODEL_REGISTRY:
                logger.error(f"Unknown model: '{m}'. Available: {list(MODEL_REGISTRY.keys())}")
                sys.exit(1)

    # Plan
    logger.info("\n" + "╔" + "═" * 58 + "╗")
    logger.info("║" + "  NIVESH ML FINE-TUNING PIPELINE".center(58) + "║")
    logger.info("╠" + "═" * 58 + "╣")
    logger.info(f"║  Models:       {', '.join(models):<42}║")
    logger.info(f"║  Data gen:     {'skip' if skip_data_gen else 'yes':<42}║")
    logger.info(f"║  Quick mode:   {str(quick):<42}║")
    logger.info(f"║  Fail fast:    {str(fail_fast):<42}║")
    logger.info("╚" + "═" * 58 + "╝")

    if dry_run:
        logger.info("\n[DRY RUN] Pipeline plan displayed. Exiting.")
        return

    # ----- Step 1: Data Generation -----
    data_stats = {}
    if not skip_data_gen:
        try:
            data_stats = generate_data(DataGenConfig(), quick=quick)
        except Exception as e:
            logger.error(f"Data generation failed: {e}")
            if fail_fast:
                raise
            logger.warning("Continuing without fresh data (using existing if available)")
    else:
        logger.info("Skipping data generation (--skip-data-gen)")

    # ----- Step 2: Fine-tune Models -----
    logger.info("\n" + "=" * 60)
    logger.info("STEP 2: Fine-Tuning Models")
    logger.info("=" * 60)

    finetune_results = {}
    model_times = {}

    for model_key in models:
        model_start = time.time()
        try:
            result = finetune_model(model_key, quick=quick)
            finetune_results[_canonical_name(model_key)] = result
            elapsed = time.time() - model_start
            model_times[model_key] = elapsed
            logger.info(f"  ✅ {MODEL_REGISTRY[model_key]['name']} — {elapsed:.0f}s")
        except Exception as e:
            elapsed = time.time() - model_start
            model_times[model_key] = elapsed
            logger.error(f"  ❌ {MODEL_REGISTRY[model_key]['name']} FAILED: {e}")
            logger.error(traceback.format_exc())
            finetune_results[_canonical_name(model_key)] = {"error": str(e)}
            if fail_fast:
                raise

    # ----- Step 3: Evaluation -----
    eval_report = evaluate_models(finetune_results)

    # ----- Summary -----
    total_time = time.time() - start_time
    logger.info("\n" + "╔" + "═" * 58 + "╗")
    logger.info("║" + "  PIPELINE COMPLETE".center(58) + "║")
    logger.info("╠" + "═" * 58 + "╣")
    logger.info(f"║  Total time:   {total_time:.0f}s ({total_time/60:.1f}min)".ljust(59) + "║")
    for mk, t in model_times.items():
        logger.info(f"║    {MODEL_REGISTRY[mk]['name']:<36} {t:.0f}s".ljust(59) + "║")

    summary = eval_report.get("summary", {})
    logger.info(f"║  Pass rate:    {summary.get('passed', 0)}/{summary.get('total_models', 0)}".ljust(59) + "║")
    logger.info("╚" + "═" * 58 + "╝")

    # Save pipeline run metadata
    EVAL_RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    run_meta = {
        "timestamp": datetime.now().isoformat(),
        "models": models,
        "quick_mode": quick,
        "skip_data_gen": skip_data_gen,
        "data_stats": data_stats,
        "model_times": model_times,
        "total_time": total_time,
        "evaluation_summary": summary,
    }
    meta_path = EVAL_RESULTS_DIR / "pipeline_run.json"
    with open(meta_path, "w") as f:
        json.dump(run_meta, f, indent=2, default=str)

    return eval_report


def _canonical_name(model_key: str) -> str:
    """Map short key to canonical model name used in evaluator."""
    mapping = {
        "intent": "intent_classifier",
        "ner": "financial_ner",
        "anomaly": "anomaly_detector",
        "credit": "credit_risk_scorer",
        "spending": "spending_predictor",
        "llm": "llm_advisor",
    }
    return mapping.get(model_key, model_key)


def main():
    parser = argparse.ArgumentParser(
        description="Nivesh ML Fine-Tuning Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Fine-tune everything
  python -m finetuning.run_pipeline

  # Only intent and NER models
  python -m finetuning.run_pipeline --models intent ner

  # Quick test run
  python -m finetuning.run_pipeline --quick --models intent

  # Use pre-generated data
  python -m finetuning.run_pipeline --skip-data-gen

  # See what would happen
  python -m finetuning.run_pipeline --dry-run
        """,
    )
    parser.add_argument(
        "--models",
        nargs="+",
        choices=list(MODEL_REGISTRY.keys()),
        default=None,
        help="Models to fine-tune (default: all)",
    )
    parser.add_argument(
        "--skip-data-gen",
        action="store_true",
        help="Skip synthetic data generation",
    )
    parser.add_argument(
        "--quick",
        action="store_true",
        help="Quick mode: fewer HPO trials, smaller data",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show plan without executing",
    )
    parser.add_argument(
        "--fail-fast",
        action="store_true",
        help="Stop pipeline on first failure",
    )

    args = parser.parse_args()

    run_pipeline(
        models=args.models,
        skip_data_gen=args.skip_data_gen,
        quick=args.quick,
        dry_run=args.dry_run,
        fail_fast=args.fail_fast,
    )


if __name__ == "__main__":
    main()
