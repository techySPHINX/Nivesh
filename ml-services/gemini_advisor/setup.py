"""
Setup and testing script for Local LLM Financial Advisor.

Uses LLaMA-3-8B-Instruct (primary) or Mistral-7B-Instruct (fallback) via Ollama.
No API keys needed - runs 100% locally.

Usage:
    python setup.py --test
    python setup.py --create-dataset
    python setup.py --ollama-url http://localhost:11434 --test
"""

import argparse
import logging
import sys
import os
from pathlib import Path
from typing import Optional

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from gemini_advisor.model import (
    LocalFinancialAdvisor,
    create_fine_tuning_dataset,
    evaluate_responses
)
from shared.config import MLConfig

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def test_advisor(ollama_url: Optional[str] = None):
    """Test local LLM advisor with sample queries."""
    logger.info("=" * 80)
    logger.info("Testing Local LLM Financial Advisor")
    logger.info("Models: LLaMA-3-8B-Instruct (primary) / Mistral-7B-Instruct (fallback)")
    logger.info("=" * 80)

    # Initialize advisor (no API key needed!)
    advisor = LocalFinancialAdvisor(ollama_base_url=ollama_url)
    logger.info(f"Active model: {advisor.get_active_model()}")

    # Test queries
    test_queries = [
        "I earn ₹50,000 per month. How should I start investing?",
        "What is the difference between PPF and EPF?",
        "Should I take a personal loan to pay off credit card debt?",
        "How much emergency fund should I maintain?",
        "Is it a good time to invest in mutual funds?",
    ]

    # User profile
    user_profile = {
        'age': 28,
        'monthly_income': 50000,
        'savings': 100000,
        'debt': 0,
        'risk_tolerance': 'moderate',
        'goals': ['retirement', 'house_purchase']
    }

    logger.info(f"\nRunning {len(test_queries)} test queries...")

    for i, query in enumerate(test_queries, 1):
        logger.info(f"\n{'='*60}")
        logger.info(f"Query {i}: {query}")
        logger.info('='*60)

        response = advisor.generate_response(
            query,
            user_profile=user_profile if i == 1 else None
        )

        if response.get('blocked'):
            logger.warning(f"Response blocked: {response.get('finish_reason')}")
        elif response.get('error'):
            logger.error(f"Error: {response.get('error')}")
        else:
            model = response.get('model', 'unknown')
            tokens = response.get('tokens', {})
            logger.info(f"\nModel: {model}")
            logger.info(f"Tokens: {tokens.get('total', 'N/A')}")
            logger.info(f"\nResponse:\n{response['response']}\n")

    # Usage stats
    stats = advisor.get_usage_stats()
    logger.info("\n" + "=" * 80)
    logger.info("Usage Statistics")
    logger.info("=" * 80)
    logger.info(f"Total Prompts: {stats['total_prompts']}")
    logger.info(f"Total Completions: {stats['total_completions']}")
    logger.info(f"Total Tokens: {stats['total_tokens']}")
    logger.info(f"Active Model: {advisor.get_active_model()}")

    # Evaluate
    evaluation = evaluate_responses(advisor, test_queries)
    logger.info("\n" + "=" * 80)
    logger.info("Evaluation Metrics")
    logger.info("=" * 80)
    logger.info(f"Success Rate: {evaluation['success_rate']:.2%}")
    logger.info(f"Successful: {evaluation['successful_responses']}")
    logger.info(f"Blocked: {evaluation['blocked_responses']}")
    logger.info(f"Errors: {evaluation['errors']}")
    logger.info(f"Avg Response Length: {evaluation['avg_response_length']:.0f} chars")
    logger.info(f"Model Used: {evaluation['model_used']}")

    # Save conversation
    os.makedirs('conversations', exist_ok=True)
    advisor.save_conversation('conversations/test_conversation.json')
    logger.info("\nConversation saved to conversations/test_conversation.json")


def create_dataset():
    """Create sample fine-tuning dataset."""
    logger.info("Creating fine-tuning dataset...")

    # Sample conversations for fine-tuning
    conversations = [
        {
            "query": "How much should I save each month from my ₹60,000 salary?",
            "response": "As a general rule, aim to save 20-30% of your monthly income. From a ₹60,000 salary, you should target saving ₹12,000-18,000 per month."
        },
        {
            "query": "Should I invest in stocks or mutual funds?",
            "response": "For most individuals, mutual funds are a better starting point than direct stock investing due to professional management and diversification."
        },
        {
            "query": "What is PPF and should I invest in it?",
            "response": "PPF (Public Provident Fund) is a government-backed long-term savings scheme with ~7.1% tax-free returns and Section 80C benefits."
        },
        {
            "query": "I have ₹2 lakh credit card debt. What should I do?",
            "response": "Credit card debt at 36-42% annual interest is extremely expensive. Stop using cards, consider balance transfer or personal loan at lower rate."
        },
        {
            "query": "How much life insurance do I need?",
            "response": "Life insurance should be 15-20x your annual income. Buy term insurance, NOT endowment/ULIP plans."
        },
    ]

    # Create dataset
    dataset_path = 'data/llm_fine_tuning_dataset.jsonl'
    os.makedirs('data', exist_ok=True)
    create_fine_tuning_dataset(conversations, dataset_path)

    logger.info(f"Fine-tuning dataset created: {dataset_path}")
    logger.info(f"Contains {len(conversations)} high-quality financial Q&A pairs")
    logger.info("\nTo fine-tune your local model:")
    logger.info("1. Use HuggingFace transformers with LoRA/QLoRA for efficient fine-tuning")
    logger.info("2. Or create an Ollama Modelfile with custom system prompts")
    logger.info("3. Or use llama.cpp for GGUF-based fine-tuning")
    logger.info("4. See: https://github.com/ollama/ollama/blob/main/docs/modelfile.md")


def main():
    """Main setup function."""
    parser = argparse.ArgumentParser(description='Setup Local LLM Financial Advisor')
    parser.add_argument(
        '--ollama-url',
        type=str,
        default=None,
        help='Ollama server URL (default: http://localhost:11434)'
    )
    parser.add_argument(
        '--test',
        action='store_true',
        help='Run tests with sample queries'
    )
    parser.add_argument(
        '--create-dataset',
        action='store_true',
        help='Create fine-tuning dataset'
    )
    parser.add_argument(
        '--model',
        type=str,
        choices=['llama3', 'mistral'],
        default=None,
        help='Force specific model (llama3 or mistral)'
    )

    args = parser.parse_args()

    if args.create_dataset:
        create_dataset()
        return

    if args.test:
        test_advisor(args.ollama_url)
    else:
        logger.info("Local LLM Financial Advisor Setup")
        logger.info("=" * 50)
        logger.info("Models: LLaMA-3-8B-Instruct (primary), Mistral-7B-Instruct (fallback)")
        logger.info("Runtime: Ollama (100% local, no API keys)")
        logger.info("")
        logger.info("Prerequisites:")
        logger.info("  1. Install Ollama: curl -fsSL https://ollama.ai/install.sh | sh")
        logger.info("  2. Pull primary model: ollama pull llama3:8b-instruct-q4_K_M")
        logger.info("  3. Pull fallback: ollama pull mistral:7b-instruct-q4_K_M")
        logger.info("")
        logger.info("Usage:")
        logger.info("  python setup.py --test")
        logger.info("  python setup.py --create-dataset")
        logger.info("  python setup.py --ollama-url http://custom-host:11434 --test")


if __name__ == '__main__':
    main()
