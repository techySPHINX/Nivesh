# Nivesh ML — Fine-Tuning Pipeline

End-to-end fine-tuning infrastructure for all 6 local ML models used in the Nivesh personal-finance platform. The pipeline generates high-quality **synthetic Indian-financial data**, runs **Optuna-based hyperparameter optimisation**, evaluates models against **quality gates**, and exports production-ready artefacts.

---

## Models Fine-Tuned

| # | Model | Framework | What it does |
|---|-------|-----------|-------------|
| 1 | **Intent Classifier** | DistilBERT (HuggingFace) | Classifies user queries into 14 financial intents |
| 2 | **Financial NER** | SpaCy | Extracts MONEY, DATE, CATEGORY, MERCHANT, ACCOUNT entities |
| 3 | **Anomaly Detector** | Isolation Forest (scikit-learn) | Flags suspicious transactions |
| 4 | **Credit Risk Scorer** | XGBoost | Predicts loan default probability |
| 5 | **Spending Predictor** | Prophet | Forecasts per-category monthly spend with Indian holidays |
| 6 | **LLM Financial Advisor** | QLoRA on LLaMA-3 / Mistral | Indian-context financial advice via Ollama |

---

## Directory Layout

```
finetuning/
├── __init__.py                  # Package init
├── config.py                    # All configs & hyperparameter ranges
├── data_generators.py           # Synthetic data generators (intent, NER, transactions, credit, LLM Q&A)
├── evaluation.py                # Model evaluation & quality gate checks
├── run_pipeline.py              # End-to-end orchestrator (CLI)
├── requirements-finetune.txt    # Extra pip dependencies
├── README.md                    # ← you are here
│
├── finetune_intent.py           # DistilBERT fine-tuning + ONNX export
├── finetune_ner.py              # SpaCy NER fine-tuning
├── finetune_anomaly.py          # Isolation Forest fine-tuning
├── finetune_credit_risk.py      # XGBoost fine-tuning + fairness audit
├── finetune_spending.py         # Prophet fine-tuning (per-category)
└── finetune_llm.py              # QLoRA fine-tuning + GGUF/Ollama export
```

Generated artefacts go to:
```
ml-services/
├── synthetic_data/         # Generated training datasets
├── finetuned_models/       # Trained model checkpoints
└── eval_results/           # Evaluation reports (JSON)
```

---

## Quick Start

### 1. Install dependencies

```bash
cd ml-services
pip install -r requirements.txt
pip install -r finetuning/requirements-finetune.txt
python -m spacy download en_core_web_sm
```

### 2. Run the full pipeline

```bash
# Fine-tune ALL models (data gen → train → evaluate)
python -m finetuning.run_pipeline

# Quick test (smaller data, 5 HPO trials)
python -m finetuning.run_pipeline --quick

# Fine-tune only specific models
python -m finetuning.run_pipeline --models intent ner credit

# Skip data generation (reuse existing synthetic data)
python -m finetuning.run_pipeline --skip-data-gen

# Dry run — show plan without executing
python -m finetuning.run_pipeline --dry-run
```

### 3. Fine-tune a single model manually

```python
from finetuning.config import IntentFinetuneConfig
from finetuning.finetune_intent import finetune_intent

config = IntentFinetuneConfig()
config.n_trials = 10          # Optuna HPO trials
result = finetune_intent(config)
print(result["test_metrics"])
```

---

## Synthetic Data

The existing training data in `data/` is far too small for production use:

| Dataset | Original size | Generated size |
|---------|--------------|----------------|
| Intent training | 42 samples (3 per class) | **2,100** (150 per class) |
| NER training | 20 sentences | **1,500** sentences |
| Transactions | ~100 rows | **50,000** transactions |
| Credit apps | 20 records | **5,000** applications |
| LLM Q&A | 5 pairs | **2,000** instruction pairs |

All synthetic data is **Indian-financial context**: ₹ amounts, Indian merchants, SIP/PPF/ELSS/NPS instruments, Diwali/Holi seasonal patterns, Section 80C references, CIBIL scores, etc.

Generate data independently:

```python
from finetuning.data_generators import generate_all_synthetic_data
from finetuning.config import DataGenConfig

stats = generate_all_synthetic_data(DataGenConfig())
```

---

## Per-Model Details

### Intent Classifier
- **Base**: `distilbert-base-uncased` → fine-tuned DistilBERT
- **HPO**: Optuna tunes learning rate, batch size, weight decay, warmup ratio, epochs
- **Export**: Best checkpoint + ONNX for fast inference
- **Threshold**: accuracy ≥ 0.90, F1-macro ≥ 0.85

### Financial NER
- **Base**: blank SpaCy `en` model (option to upgrade to transformer-based)
- **HPO**: Optuna tunes dropout, learning rate, iterations
- **Metrics**: Per-entity P/R/F1 (MONEY, DATE, CATEGORY, MERCHANT, ACCOUNT)
- **Threshold**: overall F1 ≥ 0.80, precision ≥ 0.75

### Anomaly Detector
- **Algorithm**: Isolation Forest with feature engineering (z-scores, velocity, time patterns)
- **HPO**: Optuna tunes n_estimators, max_samples, contamination, max_features
- **Validation**: StratifiedKFold cross-validation
- **Threshold**: AUC ≥ 0.85, precision ≥ 0.70

### Credit Risk Scorer
- **Algorithm**: XGBoost with 30+ engineered features
- **HPO**: 100 Optuna trials with early stopping
- **Fairness**: Validated across age groups and employment types
- **Threshold**: AUC ≥ 0.80, F1 ≥ 0.75

### Spending Predictor
- **Algorithm**: Facebook Prophet with Indian holiday calendar
- **Approach**: Per-category + overall aggregate models
- **Validation**: Prophet cross-validation (horizon = 30 days)
- **Threshold**: MAPE ≤ 20%

### LLM Financial Advisor
- **Base**: `meta-llama/Meta-Llama-3-8B-Instruct` (or `mistralai/Mistral-7B-Instruct-v0.2`)
- **Method**: QLoRA (4-bit NF4, LoRA r=64, α=128, all attention + MLP modules)
- **Export**: Merged model → GGUF (Q4_K_M) → Ollama Modelfile
- **VRAM**: ~8 GB for training, ~6 GB for inference
- **Alternative**: Ollama-only setup (no training, just custom Modelfile with system prompt)

```bash
# After fine-tuning, import into Ollama:
ollama create nivesh-advisor -f finetuned_models/llm_advisor/Modelfile
ollama run nivesh-advisor "How should I start investing with ₹10,000/month?"
```

---

## Quality Gates

Every model must pass threshold checks before deployment:

```
Intent Classifier  → accuracy ≥ 0.90, F1-macro ≥ 0.85
Financial NER      → F1 ≥ 0.80, precision ≥ 0.75
Anomaly Detector   → AUC ≥ 0.85, precision ≥ 0.70, recall ≥ 0.60
Credit Risk        → AUC ≥ 0.80, F1 ≥ 0.75
Spending Predictor → MAPE ≤ 20%
LLM Advisor        → relevance ≥ 0.80, safety ≥ 0.90
```

The evaluation report is saved to `eval_results/evaluation_report.json`.

---

## MLflow Tracking

All experiments are logged to MLflow (if configured). View the dashboard:

```bash
mlflow ui --port 5000
```

Each run logs: hyperparameters, metrics, model artefacts, and confusion matrices.

---

## GPU / Hardware Requirements

| Model | CPU time | GPU time | VRAM |
|-------|----------|----------|------|
| Intent | ~10 min | ~2 min | 2 GB |
| NER | ~5 min | N/A (SpaCy) | — |
| Anomaly | ~3 min | N/A | — |
| Credit Risk | ~5 min | N/A | — |
| Spending | ~8 min | N/A | — |
| LLM (QLoRA) | N/A | ~2-4 hrs | 8 GB |

Use `--quick` for a fast test run (~5 min total for non-LLM models).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `CUDA out of memory` | Reduce `per_device_train_batch_size` in `LLMFinetuneConfig` or use `--quick` |
| `No module named 'peft'` | `pip install -r finetuning/requirements-finetune.txt` |
| SpaCy model not found | `python -m spacy download en_core_web_sm` |
| Ollama not running | `ollama serve` in a separate terminal |
| Prophet installation fails | `pip install pystan==2.19.1.1` then retry |
| MLflow connection error | Set `MLFLOW_TRACKING_URI` or run `mlflow ui` locally |
