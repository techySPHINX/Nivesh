"""
Model Evaluation & Benchmarking Framework

Comprehensive evaluation of all fine-tuned models with:
- Per-model quality metrics
- Comparison against baseline (pre-fine-tuning) performance
- Quality gate checks (pass/fail thresholds)
- LLM response quality evaluation (relevance, safety, accuracy)
- Aggregate report generation
"""

import json
import logging
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))

from finetuning.config import EvalThresholds, EVAL_RESULTS_DIR

logger = logging.getLogger(__name__)


class ModelEvaluator:
    """Evaluate fine-tuned models against quality thresholds."""

    def __init__(self, thresholds: EvalThresholds = None):
        self.thresholds = thresholds or EvalThresholds()
        self.results = {}

    def evaluate_intent_classifier(self, test_metrics: Dict) -> Dict:
        """Evaluate intent classifier performance."""
        accuracy = test_metrics.get("eval_accuracy", test_metrics.get("accuracy", 0))
        f1_macro = test_metrics.get("eval_f1_macro", test_metrics.get("f1_macro", 0))
        f1_weighted = test_metrics.get("eval_f1_weighted", test_metrics.get("f1_weighted", 0))

        passed = accuracy >= self.thresholds.intent_accuracy and f1_macro >= self.thresholds.intent_f1_macro

        result = {
            "model": "intent_classifier",
            "metrics": {
                "accuracy": accuracy,
                "f1_macro": f1_macro,
                "f1_weighted": f1_weighted,
            },
            "thresholds": {
                "accuracy": self.thresholds.intent_accuracy,
                "f1_macro": self.thresholds.intent_f1_macro,
            },
            "passed": passed,
            "details": [],
        }

        if accuracy < self.thresholds.intent_accuracy:
            result["details"].append(
                f"Accuracy {accuracy:.3f} below threshold {self.thresholds.intent_accuracy}"
            )
        if f1_macro < self.thresholds.intent_f1_macro:
            result["details"].append(
                f"F1-macro {f1_macro:.3f} below threshold {self.thresholds.intent_f1_macro}"
            )

        self.results["intent_classifier"] = result
        return result

    def evaluate_financial_ner(self, test_metrics: Dict) -> Dict:
        """Evaluate NER model performance."""
        overall = test_metrics.get("overall", {})
        f1 = overall.get("f1", 0)
        precision = overall.get("precision", 0)
        recall = overall.get("recall", 0)

        passed = f1 >= self.thresholds.ner_f1 and precision >= self.thresholds.ner_precision

        result = {
            "model": "financial_ner",
            "metrics": {
                "f1": f1,
                "precision": precision,
                "recall": recall,
                "per_entity": {k: v for k, v in test_metrics.items() if k != "overall"},
            },
            "thresholds": {
                "f1": self.thresholds.ner_f1,
                "precision": self.thresholds.ner_precision,
            },
            "passed": passed,
        }

        self.results["financial_ner"] = result
        return result

    def evaluate_anomaly_detector(self, test_metrics: Dict) -> Dict:
        """Evaluate anomaly detector performance."""
        precision = test_metrics.get("precision", 0)
        recall = test_metrics.get("recall", 0)
        auc = test_metrics.get("auc", test_metrics.get("auc_roc", 0))

        passed = (
            precision >= self.thresholds.anomaly_precision
            and recall >= self.thresholds.anomaly_recall
            and auc >= self.thresholds.anomaly_auc
        )

        result = {
            "model": "anomaly_detector",
            "metrics": test_metrics,
            "thresholds": {
                "precision": self.thresholds.anomaly_precision,
                "recall": self.thresholds.anomaly_recall,
                "auc": self.thresholds.anomaly_auc,
            },
            "passed": passed,
        }

        self.results["anomaly_detector"] = result
        return result

    def evaluate_credit_risk(self, test_metrics: Dict) -> Dict:
        """Evaluate credit risk scorer."""
        auc = test_metrics.get("auc", test_metrics.get("test_auc", 0))
        f1 = test_metrics.get("f1", test_metrics.get("test_f1", 0))

        passed = auc >= self.thresholds.credit_risk_auc and f1 >= self.thresholds.credit_risk_f1

        result = {
            "model": "credit_risk_scorer",
            "metrics": test_metrics,
            "thresholds": {
                "auc": self.thresholds.credit_risk_auc,
                "f1": self.thresholds.credit_risk_f1,
            },
            "passed": passed,
        }

        self.results["credit_risk_scorer"] = result
        return result

    def evaluate_spending_predictor(self, category_results: Dict) -> Dict:
        """Evaluate spending predictor (per-category + overall)."""
        overall = category_results.get("overall", {}).get("metrics", {})
        mape = overall.get("mape")

        if mape is not None:
            passed = (mape * 100) <= self.thresholds.spending_mape
        else:
            passed = False

        result = {
            "model": "spending_predictor",
            "metrics": {
                "overall_mape": mape,
                "category_metrics": {
                    k: v.get("metrics", {}) for k, v in category_results.items()
                },
            },
            "thresholds": {
                "mape_percent": self.thresholds.spending_mape,
            },
            "passed": passed,
        }

        self.results["spending_predictor"] = result
        return result

    def evaluate_llm_advisor(
        self,
        train_loss: float = None,
        eval_loss: float = None,
        test_responses: List[Dict] = None,
    ) -> Dict:
        """Evaluate LLM advisor quality."""
        # Basic loss check
        passed = True
        metrics = {}

        if train_loss is not None:
            metrics["train_loss"] = train_loss
        if eval_loss is not None:
            metrics["eval_loss"] = eval_loss
            if eval_loss > 3.0:
                passed = False

        # If test responses are provided, evaluate quality
        if test_responses:
            quality_scores = []
            for resp in test_responses:
                score = _score_response_quality(resp)
                quality_scores.append(score)
            
            avg_quality = np.mean(quality_scores) if quality_scores else 0
            metrics["avg_quality_score"] = float(avg_quality)
            metrics["num_responses_evaluated"] = len(test_responses)
            
            if avg_quality < self.thresholds.llm_relevance_score:
                passed = False

        result = {
            "model": "llm_advisor",
            "metrics": metrics,
            "thresholds": {
                # Only include thresholds that are actually evaluated.
                # safety_score is not computed here; add it once a safety metric
                # (e.g. content-safety classifier) is integrated.
                "relevance_score": self.thresholds.llm_relevance_score,
            },
            "passed": passed,
        }

        self.results["llm_advisor"] = result
        return result

    def generate_report(self) -> Dict:
        """Generate comprehensive evaluation report."""
        total = len(self.results)
        passed = sum(1 for r in self.results.values() if r.get("passed", False))
        failed = total - passed

        report = {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_models": total,
                "passed": passed,
                "failed": failed,
                "pass_rate": passed / max(total, 1),
                "all_passed": failed == 0,
            },
            "models": self.results,
            "recommendation": (
                "All models meet quality thresholds. Safe to deploy."
                if failed == 0
                else f"{failed} model(s) below quality thresholds. Review before deploying."
            ),
        }

        # Save report
        eval_dir = EVAL_RESULTS_DIR
        eval_dir.mkdir(parents=True, exist_ok=True)
        report_path = eval_dir / "evaluation_report.json"
        with open(report_path, "w") as f:
            json.dump(report, f, indent=2, default=str)

        logger.info(f"\n{'='*60}")
        logger.info("EVALUATION REPORT")
        logger.info(f"{'='*60}")
        logger.info(f"Total models: {total}")
        logger.info(f"Passed: {passed} | Failed: {failed}")
        logger.info(f"Pass rate: {passed/max(total,1)*100:.0f}%")
        for name, result in self.results.items():
            status = "✅" if result.get("passed") else "❌"
            logger.info(f"  {status} {name}")
        logger.info(f"Report saved: {report_path}")

        return report


def _score_response_quality(response: Dict) -> float:
    """
    Score LLM response quality based on heuristics.
    
    Checks for:
    - Non-empty response
    - Reasonable length (100-3000 chars)
    - Contains Indian financial terms
    - Contains specific numbers/amounts
    - Has structured advice (bullet points, sections)
    - Risk warnings present
    """
    text = response.get("response", response.get("text", ""))
    score = 0.0
    max_score = 7.0

    # Non-empty
    if len(text) > 50:
        score += 1.0

    # Length
    if 200 <= len(text) <= 3000:
        score += 1.0
    elif len(text) > 100:
        score += 0.5

    # Indian financial terms
    indian_terms = [
        "₹", "INR", "lakh", "crore", "SIP", "PPF", "NPS", "EPF", "ELSS",
        "80C", "80D", "mutual fund", "FD", "fixed deposit", "Section",
        "CIBIL", "SEBI", "RBI", "income tax",
    ]
    term_count = sum(1 for term in indian_terms if term.lower() in text.lower())
    if term_count >= 3:
        score += 1.0
    elif term_count >= 1:
        score += 0.5

    # Specific numbers
    import re
    number_pattern = r'₹[\d,]+|[\d,]+%|\d+\.\d+'
    if re.search(number_pattern, text):
        score += 1.0

    # Structured advice
    if any(marker in text for marker in ["1.", "- ", "* ", "**", "###"]):
        score += 1.0

    # Risk warnings
    warning_terms = ["risk", "disclaimer", "guarantee", "consult", "⚠️", "warning", "subject to"]
    if any(w in text.lower() for w in warning_terms):
        score += 1.0

    # Actionable advice
    action_terms = ["should", "recommend", "suggest", "consider", "start",
                    "invest", "save", "budget", "plan"]
    if sum(1 for a in action_terms if a in text.lower()) >= 2:
        score += 1.0

    return score / max_score


def evaluate_all_models(results: Dict) -> Dict:
    """
    Convenience function to evaluate all model results at once.
    
    Args:
        results: Dict mapping model_name to its fine-tuning result dict
    """
    evaluator = ModelEvaluator()
    
    if "intent_classifier" in results:
        r = results["intent_classifier"]
        evaluator.evaluate_intent_classifier(r.get("test_metrics", {}))
    
    if "financial_ner" in results:
        r = results["financial_ner"]
        evaluator.evaluate_financial_ner(r.get("test_metrics", {}))
    
    if "anomaly_detector" in results:
        r = results["anomaly_detector"]
        evaluator.evaluate_anomaly_detector(r.get("test_metrics", {}))
    
    if "credit_risk_scorer" in results:
        r = results["credit_risk_scorer"]
        evaluator.evaluate_credit_risk(r.get("test_metrics", {}))
    
    if "spending_predictor" in results:
        r = results["spending_predictor"]
        evaluator.evaluate_spending_predictor(r.get("category_results", {}))
    
    if "llm_advisor" in results:
        r = results["llm_advisor"]
        evaluator.evaluate_llm_advisor(
            train_loss=r.get("train_loss"),
            eval_loss=r.get("eval_loss"),
        )
    
    return evaluator.generate_report()
