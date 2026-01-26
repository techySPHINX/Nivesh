"""
Training script for Financial NER model
"""
from shared.mlflow_utils import create_experiment, log_model_params, log_model_metrics
from shared import get_logger
from financial_ner.model import FinancialNER
import os
import sys
import argparse
import mlflow

# Add parent directory to path
sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..')))


logger = get_logger(__name__)


def train_financial_ner(
    data_path: str,
    output_dir: str = './models/financial_ner',
    n_iter: int = 30,
    test_split: float = 0.2
):
    """
    Train and register Financial NER model

    Args:
        data_path: Path to training data JSON
        output_dir: Directory to save model
        n_iter: Number of training iterations
        test_split: Test set proportion
    """
    logger.info("=" * 80)
    logger.info("Starting Financial NER Training")
    logger.info("=" * 80)

    # Create experiment
    create_experiment('financial_ner', tags={'model_type': 'ner'})
    mlflow.set_experiment('financial_ner')

    with mlflow.start_run(run_name='financial_ner_training'):
        # Initialize NER
        ner = FinancialNER()
        ner.create_blank_model()

        # Log parameters
        params = {
            'n_iterations': n_iter,
            'entity_types': ','.join(ner.entity_types),
            'test_split': test_split
        }
        log_model_params(params)

        # Load training data
        data = ner.prepare_training_data(data_path)

        # Split train/test
        split_idx = int(len(data) * (1 - test_split))
        train_data = data[:split_idx]
        test_data = data[split_idx:]

        mlflow.log_param('train_size', len(train_data))
        mlflow.log_param('test_size', len(test_data))

        # Train
        train_metrics = ner.train(
            train_data, n_iter=n_iter, output_dir=output_dir)

        # Log training metrics
        log_model_metrics({
            'final_loss': train_metrics['final_loss'],
            'avg_loss': train_metrics['avg_loss']
        })

        # Evaluate
        eval_metrics = ner.evaluate(test_data)

        # Log evaluation metrics
        log_model_metrics({
            'precision': eval_metrics['overall_precision'],
            'recall': eval_metrics['overall_recall'],
            'f1': eval_metrics['overall_f1']
        })

        # Log per-entity scores
        for entity_type, scores in eval_metrics['entity_scores'].items():
            mlflow.log_metrics({
                f'{entity_type}_precision': scores['precision'],
                f'{entity_type}_recall': scores['recall'],
                f'{entity_type}_f1': scores['f1']
            })

        # Log model to MLflow
        mlflow.spacy.log_model(
            ner.nlp, 'model', registered_model_name='financial_ner')

        logger.info("=" * 80)
        logger.info("Training Complete!")
        logger.info(f"Precision: {eval_metrics['overall_precision']:.3f}")
        logger.info(f"Recall: {eval_metrics['overall_recall']:.3f}")
        logger.info(f"F1: {eval_metrics['overall_f1']:.3f}")
        logger.info(f"Model saved to: {output_dir}")
        logger.info("=" * 80)

        return eval_metrics


def main():
    """Main training function"""
    parser = argparse.ArgumentParser(description='Train Financial NER Model')
    parser.add_argument('--data-path', type=str, required=True,
                        help='Path to training data JSON')
    parser.add_argument('--output-dir', type=str,
                        default='./models/financial_ner', help='Output directory')
    parser.add_argument('--iterations', type=int, default=30,
                        help='Number of training iterations')
    parser.add_argument('--test-split', type=float,
                        default=0.2, help='Test set proportion')

    args = parser.parse_args()

    train_financial_ner(
        data_path=args.data_path,
        output_dir=args.output_dir,
        n_iter=args.iterations,
        test_split=args.test_split
    )


if __name__ == '__main__':
    main()
