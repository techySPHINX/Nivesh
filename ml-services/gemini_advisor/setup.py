"""
Setup and testing script for Gemini Financial Advisor.

Usage:
    python setup.py --api-key YOUR_API_KEY
    python setup.py --api-key YOUR_API_KEY --test
"""

import argparse
import logging
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from gemini_advisor.model import (
    GeminiFinancialAdvisor,
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


def test_advisor(api_key: str):
    """Test Gemini advisor with sample queries."""
    logger.info("=" * 80)
    logger.info("Testing Gemini Financial Advisor")
    logger.info("=" * 80)
    
    # Initialize advisor
    advisor = GeminiFinancialAdvisor(api_key=api_key)
    
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
            user_profile=user_profile if i == 1 else None  # Only first query gets profile
        )
        
        if response.get('blocked'):
            logger.warning(f"Response blocked: {response.get('finish_reason')}")
        elif response.get('error'):
            logger.error(f"Error: {response.get('error')}")
        else:
            logger.info(f"\nResponse:\n{response['response']}\n")
    
    # Usage stats
    stats = advisor.get_usage_stats()
    logger.info("\n" + "=" * 80)
    logger.info("Usage Statistics")
    logger.info("=" * 80)
    logger.info(f"Total Prompts: {stats['total_prompts']}")
    logger.info(f"Total Completions: {stats['total_completions']}")
    
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
    
    # Save conversation
    advisor.save_conversation('conversations/test_conversation.json')
    logger.info("\nConversation saved to conversations/test_conversation.json")


def create_dataset():
    """Create sample fine-tuning dataset."""
    logger.info("Creating fine-tuning dataset...")
    
    # Sample conversations for fine-tuning
    conversations = [
        {
            "query": "How much should I save each month from my ₹60,000 salary?",
            "response": "As a general rule, aim to save 20-30% of your monthly income. From a ₹60,000 salary, you should target saving ₹12,000-18,000 per month. Here's a suggested breakdown:\n\n1. Emergency Fund: ₹5,000/month (build 6 months' expenses)\n2. Retirement (PPF/NPS): ₹4,000/month\n3. Short-term Goals (FD/Liquid Funds): ₹3,000/month\n4. Investments (Mutual Funds): ₹3,000/month\n\nAdjust based on your expenses, existing debts, and financial goals. Start with what you can manage and increase gradually."
        },
        {
            "query": "Should I invest in stocks or mutual funds?",
            "response": "For most individuals, mutual funds are a better choice than direct stock investing. Here's why:\n\n**Mutual Funds:**\n- Professional management by experienced fund managers\n- Diversification across multiple stocks\n- Lower risk due to portfolio spread\n- Systematic investment (SIP) option\n- Better for beginners\n\n**Direct Stocks:**\n- Requires research and market knowledge\n- Higher risk and volatility\n- Need to actively monitor\n- Better for experienced investors\n\nI recommend starting with equity mutual funds through SIP (₹500-5,000/month based on income). Once you build knowledge, you can allocate 10-20% to direct stocks. Always maintain diversification and invest for 5+ years horizon."
        },
        {
            "query": "What is PPF and should I invest in it?",
            "response": "PPF (Public Provident Fund) is a government-backed long-term savings scheme ideal for retirement planning.\n\n**Key Features:**\n- 15-year lock-in period (extendable)\n- Current interest: ~7.1% per annum (tax-free)\n- Maximum investment: ₹1.5 lakh/year\n- Section 80C tax deduction\n- EEE (Exempt-Exempt-Exempt) status\n- Very safe investment\n\n**Who Should Invest:**\n- Risk-averse investors\n- Those seeking tax-free returns\n- Long-term savers (retirement)\n- Individuals in high tax brackets\n\n**Limitations:**\n- Lower returns than equity\n- Long lock-in period\n- Limited liquidity (partial withdrawal after 7 years)\n\nPPF should be part of your portfolio (20-30%) for stability, combined with equity mutual funds for growth."
        },
        {
            "query": "I have ₹2 lakh credit card debt. What should I do?",
            "response": "Credit card debt at 36-42% annual interest is extremely expensive. Here's an action plan:\n\n**Immediate Actions:**\n1. Stop using credit cards immediately\n2. Pay more than minimum due (aim for maximum possible)\n3. List all debts with interest rates\n\n**Debt Repayment Strategy:**\n1. **Balance Transfer:** Transfer to 0% interest card (12-18 months)\n2. **Personal Loan:** Consider ₹2L loan at 12-16% to pay off cards\n3. **Snowball Method:** Pay minimums on all, extra on smallest debt\n4. **Avalanche Method:** Pay minimums on all, extra on highest interest\n\n**Budget Adjustments:**\n- Cut non-essential expenses by 30-40%\n- Take up side income if possible\n- Use savings (keep 2 months emergency only)\n\n**Timeline:** Target 12-18 months for full repayment. Once cleared, build emergency fund and NEVER carry credit card balance. This is your #1 financial priority."
        },
        {
            "query": "How much life insurance do I need?",
            "response": "Life insurance should cover your family's financial needs if you're not there. Here's how to calculate:\n\n**Income Replacement Method:**\n- Annual income × 15-20 years\n- Example: ₹6L salary × 20 = ₹1.2 crore\n\n**Needs-Based Method:**\n1. Outstanding debts (home loan, car loan): ₹X\n2. Children's education: ₹Y\n3. Family expenses (10-15 years): ₹Z\n4. Total = X + Y + Z\n\n**Recommended Coverage:**\n- Minimum: 10x annual income\n- Ideal: 15-20x annual income\n\n**Type of Insurance:**\n- Term Insurance (NOT endowment/ULIP)\n- Pure protection, low premium\n- ₹1 crore cover costs ~₹12-15k/year (30-year-old)\n\n**Example:** ₹50,000 monthly income (₹6L/year)\n- Recommended: ₹90L - ₹1.2 crore term insurance\n- Premium: ~₹10-15k annually\n\nBuy term insurance early for lower premiums. Review every 3-5 years."
        }
    ]
    
    # Create dataset
    dataset_path = 'data/gemini_fine_tuning_dataset.jsonl'
    os.makedirs('data', exist_ok=True)
    create_fine_tuning_dataset(conversations, dataset_path)
    
    logger.info(f"Fine-tuning dataset created: {dataset_path}")
    logger.info(f"Contains {len(conversations)} high-quality financial Q&A pairs")
    logger.info("\nTo fine-tune Gemini:")
    logger.info("1. Visit https://ai.google.dev/gemini-api/docs/model-tuning")
    logger.info("2. Upload this dataset")
    logger.info("3. Configure tuning parameters")
    logger.info("4. Deploy tuned model")


def main():
    """Main setup function."""
    parser = argparse.ArgumentParser(description='Setup Gemini Financial Advisor')
    parser.add_argument(
        '--api-key',
        type=str,
        help='Google API key for Gemini'
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
    
    args = parser.parse_args()
    
    # Get API key from args or environment
    api_key = args.api_key or os.getenv('GOOGLE_API_KEY')
    
    if args.create_dataset:
        create_dataset()
        return
    
    if not api_key:
        logger.error("API key required. Set GOOGLE_API_KEY environment variable or use --api-key")
        sys.exit(1)
    
    if args.test:
        test_advisor(api_key)
    else:
        logger.info("Gemini Financial Advisor setup complete!")
        logger.info("\nUsage:")
        logger.info("  python setup.py --api-key YOUR_KEY --test")
        logger.info("  python setup.py --create-dataset")


if __name__ == '__main__':
    main()
