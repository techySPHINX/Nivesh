"""
Training script for Intent Classification model
"""
import os
import argparse
import mlflow
from model import IntentClassifier
from ..shared import config, get_logger
from ..shared.mlflow_utils import (
    create_experiment,
    log_model_params,
    log_model_metrics,
    register_model
)


logger = get_logger(__name__)


def train_intent_classifier(
    data_path: str,
    output_dir: str = './models/intent_classifier',
    experiment_name: str = 'intent_classification'
):
    """
    Train and register intent classification model
    
    Args:
        data_path: Path to training data JSON
        output_dir: Directory to save model
        experiment_name: MLflow experiment name
    """
    logger.info("=" * 80)
    logger.info("Starting Intent Classification Training")
    logger.info("=" * 80)
    
    # Create experiment
    create_experiment(experiment_name, tags={'model_type': 'intent_classifier'})
    mlflow.set_experiment(experiment_name)
    
    # Start MLflow run
    with mlflow.start_run(run_name='intent_classifier_training'):
        # Initialize classifier
        classifier = IntentClassifier()
        classifier.load_model()
        
        # Log parameters
        params = {
            'model_name': classifier.model_name,
            'num_labels': classifier.num_labels,
            'max_length': config.intent_max_length,
            'batch_size': config.training_batch_size,
            'epochs': config.training_epochs,
            'learning_rate': config.learning_rate
        }
        log_model_params(params)
        
        # Prepare data
        train_dataset, val_dataset, test_dataset = classifier.prepare_data(data_path)
        
        # Log dataset info
        mlflow.log_param('train_size', len(train_dataset))
        mlflow.log_param('val_size', len(val_dataset))
        mlflow.log_param('test_size', len(test_dataset))
        
        # Train
        train_metrics = classifier.train(
            train_dataset,
            val_dataset,
            output_dir=output_dir
        )
        
        # Log training metrics
        log_model_metrics({
            'train_loss': train_metrics['train_loss'],
            'eval_accuracy': train_metrics['eval_accuracy'],
            'eval_f1': train_metrics['eval_f1'],
            'eval_loss': train_metrics['eval_loss']
        })
        
        # Evaluate on test set
        test_metrics = classifier.evaluate(test_dataset)
        
        # Log test metrics
        log_model_metrics({
            'test_accuracy': test_metrics['accuracy'],
            'test_f1': test_metrics['f1_score']
        })
        
        # Log classification report as artifact
        import json
        report_path = os.path.join(output_dir, 'classification_report.json')
        with open(report_path, 'w') as f:
            json.dump(test_metrics['classification_report'], f, indent=2)
        mlflow.log_artifact(report_path)
        
        # Log confusion matrix
        import matplotlib.pyplot as plt
        import seaborn as sns
        
        cm = test_metrics['confusion_matrix']
        plt.figure(figsize=(12, 10))
        sns.heatmap(
            cm,
            annot=True,
            fmt='d',
            cmap='Blues',
            xticklabels=classifier.id_to_label.values(),
            yticklabels=classifier.id_to_label.values()
        )
        plt.title('Intent Classification Confusion Matrix')
        plt.ylabel('True Intent')
        plt.xlabel('Predicted Intent')
        plt.tight_layout()
        
        cm_path = os.path.join(output_dir, 'confusion_matrix.png')
        plt.savefig(cm_path)
        mlflow.log_artifact(cm_path)
        plt.close()
        
        # Export to ONNX
        onnx_path = os.path.join(output_dir, 'model.onnx')
        classifier.export_onnx(onnx_path)
        mlflow.log_artifact(onnx_path)
        
        # Log PyTorch model
        mlflow.pytorch.log_model(
            classifier.model,
            'model',
            registered_model_name='intent_classifier'
        )
        
        logger.info("=" * 80)
        logger.info("Training Complete!")
        logger.info(f"Test Accuracy: {test_metrics['accuracy']:.4f}")
        logger.info(f"Test F1 Score: {test_metrics['f1_score']:.4f}")
        logger.info(f"Model saved to: {output_dir}")
        logger.info("=" * 80)
        
        return test_metrics


def main():
    """Main training function"""
    parser = argparse.ArgumentParser(description='Train Intent Classification Model')
    parser.add_argument('--data-path', type=str, required=True, help='Path to training data JSON')
    parser.add_argument('--output-dir', type=str, default='./models/intent_classifier', help='Output directory')
    parser.add_argument('--experiment', type=str, default='intent_classification', help='MLflow experiment name')
    
    args = parser.parse_args()
    
    train_intent_classifier(
        data_path=args.data_path,
        output_dir=args.output_dir,
        experiment_name=args.experiment
    )


if __name__ == '__main__':
    main()
