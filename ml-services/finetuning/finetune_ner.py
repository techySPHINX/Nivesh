"""
Financial NER Fine-Tuning

Fine-tunes SpaCy NER model on synthetic Indian financial entity data with:
- Pretrained en_core_web_sm base (instead of blank model)
- Automated entity span validation
- Per-entity-type metrics (precision/recall/F1)
- MLflow tracking
- Optuna dropout & learning rate optimization
"""

import json
import logging
import os
import sys
import random
from pathlib import Path
from typing import Dict, List, Tuple, Optional

import spacy
from spacy.training import Example
from spacy.util import minibatch, compounding
import mlflow
import mlflow.spacy
import optuna
import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))

from finetuning.config import (
    NERFinetuneConfig, SYNTHETIC_DATA_DIR, FINETUNED_MODELS_DIR,
    EVAL_RESULTS_DIR, EvalThresholds
)

logger = logging.getLogger(__name__)


def load_ner_data(data_path: str) -> List[Tuple[str, Dict]]:
    """Load NER training data from JSON."""
    with open(data_path, "r", encoding="utf-8") as f:
        raw = json.load(f)
    
    data = []
    skipped = 0
    for item in raw:
        text = item["text"]
        entities = item.get("entities", [])
        
        # Validate spans
        valid_ents = []
        for ent in entities:
            start, end, label = ent[0], ent[1], ent[2]
            if 0 <= start < end <= len(text):
                span_text = text[start:end].strip()
                if span_text:
                    valid_ents.append((start, end, label))
            else:
                skipped += 1
        
        # Check for overlaps
        valid_ents.sort(key=lambda x: x[0])
        non_overlapping = []
        last_end = 0
        for start, end, label in valid_ents:
            if start >= last_end:
                non_overlapping.append((start, end, label))
                last_end = end
        
        data.append((text, {"entities": non_overlapping}))
    
    if skipped:
        logger.warning(f"Skipped {skipped} invalid entity spans")
    
    return data


def split_ner_data(data, train_ratio=0.8, val_ratio=0.1):
    """Split NER data into train/val/test sets."""
    random.shuffle(data)
    n = len(data)
    train_end = int(n * train_ratio)
    val_end = train_end + int(n * val_ratio)
    return data[:train_end], data[train_end:val_end], data[val_end:]


def evaluate_ner(nlp, test_data: List[Tuple[str, Dict]]) -> Dict:
    """Evaluate NER model with per-entity metrics."""
    from collections import defaultdict
    
    tp = defaultdict(int)
    fp = defaultdict(int)
    fn = defaultdict(int)
    
    for text, annotations in test_data:
        doc = nlp(text)
        predicted = {(ent.start_char, ent.end_char, ent.label_) for ent in doc.ents}
        gold = {(e[0], e[1], e[2]) for e in annotations["entities"]}
        
        for ent in predicted:
            if ent in gold:
                tp[ent[2]] += 1
            else:
                fp[ent[2]] += 1
        
        for ent in gold:
            if ent not in predicted:
                fn[ent[2]] += 1
    
    metrics = {}
    all_labels = set(list(tp.keys()) + list(fp.keys()) + list(fn.keys()))
    
    total_tp, total_fp, total_fn = 0, 0, 0
    for label in sorted(all_labels):
        precision = tp[label] / max(tp[label] + fp[label], 1)
        recall = tp[label] / max(tp[label] + fn[label], 1)
        f1 = 2 * precision * recall / max(precision + recall, 1e-8)
        metrics[label] = {"precision": precision, "recall": recall, "f1": f1}
        total_tp += tp[label]
        total_fp += fp[label]
        total_fn += fn[label]
    
    # Overall metrics
    overall_precision = total_tp / max(total_tp + total_fp, 1)
    overall_recall = total_tp / max(total_tp + total_fn, 1)
    overall_f1 = 2 * overall_precision * overall_recall / max(overall_precision + overall_recall, 1e-8)
    metrics["overall"] = {
        "precision": overall_precision,
        "recall": overall_recall,
        "f1": overall_f1,
    }
    
    return metrics


def train_ner_model(
    nlp,
    train_data: List[Tuple[str, Dict]],
    val_data: List[Tuple[str, Dict]],
    n_iter: int = 30,
    dropout: float = 0.35,
    learn_rate: float = 0.001,
    batch_start: int = 4,
    batch_end: int = 32,
    batch_compound: float = 1.001,
) -> Tuple:
    """Train SpaCy NER model with validation monitoring."""
    
    other_pipes = [pipe for pipe in nlp.pipe_names if pipe != "ner"]
    with nlp.disable_pipes(*other_pipes):
        optimizer = nlp.begin_training()
        optimizer.learn_rate = learn_rate
        
        best_f1 = 0
        best_model_bytes = None
        patience = 5
        no_improve = 0
        
        for iteration in range(n_iter):
            random.shuffle(train_data)
            losses = {}
            
            batches = minibatch(
                train_data,
                size=compounding(batch_start, batch_end, batch_compound)
            )
            
            for batch in batches:
                examples = []
                for text, annotations in batch:
                    doc = nlp.make_doc(text)
                    example = Example.from_dict(doc, annotations)
                    examples.append(example)
                
                nlp.update(examples, sgd=optimizer, drop=dropout, losses=losses)
            
            # Validate
            val_metrics = evaluate_ner(nlp, val_data)
            val_f1 = val_metrics["overall"]["f1"]
            
            logger.info(
                f"Iteration {iteration + 1}/{n_iter} | "
                f"Loss: {losses.get('ner', 0):.4f} | "
                f"Val F1: {val_f1:.4f}"
            )
            
            if val_f1 > best_f1:
                best_f1 = val_f1
                best_model_bytes = nlp.to_bytes()
                no_improve = 0
            else:
                no_improve += 1
            
            if no_improve >= patience:
                logger.info(f"Early stopping at iteration {iteration + 1}")
                break
        
        # Restore best model
        if best_model_bytes:
            nlp.from_bytes(best_model_bytes)
    
    return nlp, best_f1


def finetune_ner(
    config: Optional[NERFinetuneConfig] = None,
    data_path: Optional[str] = None,
    output_dir: Optional[str] = None,
    run_hpo: bool = True,
    n_trials: int = 15,
) -> Dict:
    """
    Full fine-tuning pipeline for Financial NER.
    
    Returns:
        Dict with metrics, model path, and run info
    """
    config = config or NERFinetuneConfig()
    data_path = data_path or str(SYNTHETIC_DATA_DIR / "ner_training_data.json")
    output_dir = output_dir or str(FINETUNED_MODELS_DIR / "financial_ner")
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Load and split data
    all_data = load_ner_data(data_path)
    train_data, val_data, test_data = split_ner_data(all_data)
    logger.info(f"Data splits: train={len(train_data)}, val={len(val_data)}, test={len(test_data)}")
    
    # ─── Optuna HPO ───
    best_params = {}
    if run_hpo:
        logger.info(f"Starting NER HPO with {n_trials} trials...")
        
        def objective(trial):
            dropout = trial.suggest_float("dropout", 0.2, 0.5)
            learn_rate = trial.suggest_float("learn_rate", 0.0005, 0.005, log=True)
            n_iter = trial.suggest_int("n_iter", 20, 50)
            
            # Create fresh model
            nlp = spacy.blank("en")
            ner = nlp.add_pipe("ner")
            for ent_type in config.entity_types:
                ner.add_label(ent_type)
            
            _, best_f1 = train_ner_model(
                nlp, train_data, val_data,
                n_iter=n_iter, dropout=dropout, learn_rate=learn_rate,
            )
            return best_f1
        
        study = optuna.create_study(direction="maximize")
        study.optimize(objective, n_trials=n_trials, show_progress_bar=True)
        best_params = study.best_params
        logger.info(f"Best NER HPO params: {best_params}")
    
    # ─── Final Training ───
    dropout = best_params.get("dropout", config.dropout)
    learn_rate = best_params.get("learn_rate", config.learn_rate)
    n_iter = best_params.get("n_iter", config.n_iter)
    
    mlflow.set_experiment("nivesh-financial-ner-finetuning")
    with mlflow.start_run(run_name="ner-final-training"):
        mlflow.log_params({
            "base_model": config.base_model,
            "entity_types": config.entity_types,
            "dropout": dropout,
            "learn_rate": learn_rate,
            "n_iter": n_iter,
            "train_size": len(train_data),
            "hpo_trials": n_trials if run_hpo else 0,
        })
        
        # Create model
        try:
            nlp = spacy.load(config.base_model)
            logger.info(f"Loaded pretrained base: {config.base_model}")
            if "ner" not in nlp.pipe_names:
                ner = nlp.add_pipe("ner")
            else:
                ner = nlp.get_pipe("ner")
        except OSError:
            logger.info("Creating blank model")
            nlp = spacy.blank("en")
            ner = nlp.add_pipe("ner")
        
        for ent_type in config.entity_types:
            ner.add_label(ent_type)
        
        # Train
        nlp, best_val_f1 = train_ner_model(
            nlp, train_data, val_data,
            n_iter=n_iter, dropout=dropout, learn_rate=learn_rate,
            batch_start=config.batch_size_start,
            batch_end=config.batch_size_end,
            batch_compound=config.batch_compound,
        )
        
        # Evaluate on test set
        test_metrics = evaluate_ner(nlp, test_data)
        logger.info(f"Test metrics: {json.dumps(test_metrics, indent=2)}")
        
        # Log metrics
        for label, m in test_metrics.items():
            for metric_name, value in m.items():
                mlflow.log_metric(f"test_{label}_{metric_name}", value)
        
        # Save model
        model_path = os.path.join(output_dir, "best_model")
        nlp.to_disk(model_path)
        mlflow.spacy.log_model(nlp, "model")
        
        # Save eval results
        eval_dir = EVAL_RESULTS_DIR / "financial_ner"
        eval_dir.mkdir(parents=True, exist_ok=True)
        with open(eval_dir / "test_metrics.json", "w") as f:
            json.dump(test_metrics, f, indent=2)
        mlflow.log_artifact(str(eval_dir / "test_metrics.json"))
        
        # Quality gate
        thresholds = EvalThresholds()
        overall = test_metrics.get("overall", {})
        passed = (
            overall.get("f1", 0) >= thresholds.ner_f1
            and overall.get("precision", 0) >= thresholds.ner_precision
        )
        
        result = {
            "model_path": model_path,
            "test_metrics": test_metrics,
            "best_hpo_params": best_params,
            "quality_gate_passed": passed,
            "mlflow_run_id": mlflow.active_run().info.run_id,
        }
        
        if passed:
            logger.info("✅ Financial NER passed quality gate!")
        else:
            logger.warning(
                f"⚠️ Quality gate failed: F1={overall.get('f1', 0):.3f} "
                f"(need {thresholds.ner_f1}), "
                f"Precision={overall.get('precision', 0):.3f} (need {thresholds.ner_precision})"
            )
    
    return result


if __name__ == "__main__":
    import argparse
    
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    
    parser = argparse.ArgumentParser(description="Fine-tune Financial NER")
    parser.add_argument("--data-path", type=str, default=None)
    parser.add_argument("--output-dir", type=str, default=None)
    parser.add_argument("--no-hpo", action="store_true")
    parser.add_argument("--hpo-trials", type=int, default=15)
    args = parser.parse_args()
    
    result = finetune_ner(
        data_path=args.data_path,
        output_dir=args.output_dir,
        run_hpo=not args.no_hpo,
        n_trials=args.hpo_trials,
    )
    print(f"\nResult: quality_gate_passed={result['quality_gate_passed']}")
    print(f"Model saved: {result['model_path']}")
