"""
Feature Builders - Functions to compute features from raw data
"""
from shared import get_logger, FEATURE_SCHEMAS
import pandas as pd
import numpy as np
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..')))


logger = get_logger(__name__)


def build_user_financial_features(
    user_id: str,
    db_connection: Any = None
) -> Dict[str, Any]:
    """
    Build financial profile features for a user

    Args:
        user_id: User identifier
        db_connection: Database connection (optional)

    Returns:
        Dictionary of financial features
    """
    logger.info(f"Building financial features for user {user_id}")

    # Initialize with default values
    features = {
        "monthly_income": 0.0,
        "avg_monthly_expense": 0.0,
        "debt_to_income_ratio": 0.0,
        "emergency_fund_months": 0.0,
        "spending_volatility": 0.0,
        "income_volatility": 0.0,
        "existing_loans": 0,
        "payment_on_time_percentage": 100.0,
        "credit_utilization": 0.0,
        "last_updated": datetime.now().isoformat()
    }

    # If database connection provided, fetch real data
    if db_connection is not None:
        try:
            # Query user's transactions
            query = """
                SELECT 
                    date,
                    amount,
                    type,
                    category
                FROM transactions
                WHERE user_id = %s
                AND date >= NOW() - INTERVAL '90 days'
                ORDER BY date DESC
            """

            df = pd.read_sql(query, db_connection, params=(user_id,))

            if not df.empty:
                # Calculate income
                income_df = df[df['type'] == 'income']
                if not income_df.empty:
                    features['monthly_income'] = income_df['amount'].mean()
                    features['income_volatility'] = income_df['amount'].std(
                    ) / features['monthly_income'] if features['monthly_income'] > 0 else 0.0

                # Calculate expenses
                expense_df = df[df['type'] == 'expense']
                if not expense_df.empty:
                    features['avg_monthly_expense'] = expense_df['amount'].mean()
                    features['spending_volatility'] = expense_df['amount'].std(
                    ) / features['avg_monthly_expense'] if features['avg_monthly_expense'] > 0 else 0.0

                # Debt-to-income ratio
                if features['monthly_income'] > 0:
                    debt_payments = expense_df[expense_df['category'].isin(
                        ['loan', 'emi', 'credit_card'])]['amount'].sum()
                    features['debt_to_income_ratio'] = debt_payments / \
                        features['monthly_income']

                # Emergency fund calculation (would need savings account balance)
                # features['emergency_fund_months'] = savings_balance / features['avg_monthly_expense']

        except Exception as e:
            logger.error(f"Failed to build features from database: {e}")

    return features


def build_transaction_features(
    transaction: Dict[str, Any],
    user_history: Optional[pd.DataFrame] = None
) -> Dict[str, Any]:
    """
    Build features for a single transaction

    Args:
        transaction: Transaction data
        user_history: User's transaction history (optional)

    Returns:
        Dictionary of transaction features
    """
    features = {
        "amount": transaction.get("amount", 0.0),
        "amount_zscore": 0.0,
        "merchant_frequency": 0,
        "time_of_day": 0,
        "day_of_week": 0,
        "category_deviation": 0.0,
        "is_recurring": False,
        "days_since_last_transaction": 0
    }

    # Extract time features
    if "timestamp" in transaction or "date" in transaction:
        timestamp = transaction.get("timestamp") or transaction.get("date")
        if isinstance(timestamp, str):
            timestamp = pd.to_datetime(timestamp)

        features["time_of_day"] = timestamp.hour
        features["day_of_week"] = timestamp.weekday()

    # If we have user history, calculate comparative features
    if user_history is not None and not user_history.empty:
        amount = features["amount"]

        # Z-score of amount
        mean_amount = user_history["amount"].mean()
        std_amount = user_history["amount"].std()
        if std_amount > 0:
            features["amount_zscore"] = (amount - mean_amount) / std_amount

        # Merchant frequency
        merchant = transaction.get("merchant")
        if merchant:
            features["merchant_frequency"] = len(
                user_history[user_history["merchant"] == merchant])

        # Category deviation
        category = transaction.get("category")
        if category:
            category_amounts = user_history[user_history["category"]
                                            == category]["amount"]
            if not category_amounts.empty:
                category_mean = category_amounts.mean()
                category_std = category_amounts.std()
                if category_std > 0:
                    features["category_deviation"] = abs(
                        (amount - category_mean) / category_std)

        # Recurring transaction detection (simple heuristic)
        if merchant and len(user_history[user_history["merchant"] == merchant]) >= 3:
            merchant_txns = user_history[user_history["merchant"] == merchant]
            amount_variance = merchant_txns["amount"].std(
            ) / merchant_txns["amount"].mean()
            if amount_variance < 0.1:  # Low variance
                features["is_recurring"] = True

        # Days since last transaction
        if "timestamp" in transaction or "date" in transaction:
            last_date = user_history["date"].max()
            current_date = pd.to_datetime(transaction.get(
                "timestamp") or transaction.get("date"))
            features["days_since_last_transaction"] = (
                current_date - last_date).days

    return features


def build_spending_pattern_features(
    user_id: str,
    category: str,
    db_connection: Any = None,
    lookback_days: int = 90
) -> Dict[str, Any]:
    """
    Build spending pattern features for a category

    Args:
        user_id: User identifier
        category: Spending category
        db_connection: Database connection (optional)
        lookback_days: Number of days to look back

    Returns:
        Dictionary of spending pattern features
    """
    features = {
        "category": category,
        "avg_amount": 0.0,
        "frequency": 0,
        "seasonality_index": 1.0,
        "trend": 0.0,
        "last_updated": datetime.now().isoformat()
    }

    if db_connection is not None:
        try:
            query = """
                SELECT 
                    date,
                    amount
                FROM transactions
                WHERE user_id = %s
                AND category = %s
                AND type = 'expense'
                AND date >= NOW() - INTERVAL '%s days'
                ORDER BY date
            """

            df = pd.read_sql(
                query,
                db_connection,
                params=(user_id, category, lookback_days)
            )

            if not df.empty:
                features["avg_amount"] = df["amount"].mean()
                features["frequency"] = len(df)

                # Calculate trend (simple linear regression)
                df["days"] = (df["date"] - df["date"].min()).dt.days
                if len(df) > 1:
                    from scipy import stats
                    slope, intercept, r_value, p_value, std_err = stats.linregress(
                        df["days"], df["amount"]
                    )
                    features["trend"] = slope

                # Seasonality (compare last 30 days to previous 60 days)
                recent = df[df["date"] >= df["date"].max() -
                            timedelta(days=30)]
                older = df[df["date"] < df["date"].max() - timedelta(days=30)]

                if not recent.empty and not older.empty:
                    recent_avg = recent["amount"].mean()
                    older_avg = older["amount"].mean()
                    if older_avg > 0:
                        features["seasonality_index"] = recent_avg / older_avg

        except Exception as e:
            logger.error(f"Failed to build spending pattern features: {e}")

    return features


def build_credit_risk_features(
    user_id: str,
    db_connection: Any = None
) -> Dict[str, Any]:
    """
    Build credit risk features for a user

    Args:
        user_id: User identifier
        db_connection: Database connection (optional)

    Returns:
        Dictionary of credit risk features
    """
    # Start with financial features
    features = build_user_financial_features(user_id, db_connection)

    # Add additional credit-specific features
    features.update({
        "total_debt": 0.0,
        "late_payments_count": 0,
        "credit_history_months": 0,
        "loan_to_value_ratio": 0.0,
        "default_risk_score": 0.0
    })

    # Query loan and payment history from database if connection provided
    if db_connection is not None:
        try:
            # Query loan information
            loan_query = """
                SELECT 
                    SUM(amount) as total_debt,
                    COUNT(*) as loan_count,
                    MIN(start_date) as first_loan_date
                FROM loans
                WHERE user_id = %s
                AND status IN ('active', 'pending')
            """

            loan_df = pd.read_sql(loan_query, db_connection, params=(user_id,))

            if not loan_df.empty and loan_df['total_debt'].iloc[0] is not None:
                features['total_debt'] = float(loan_df['total_debt'].iloc[0])

                # Calculate credit history months
                first_loan_date = loan_df['first_loan_date'].iloc[0]
                if first_loan_date is not None:
                    features['credit_history_months'] = (
                        datetime.now() - first_loan_date).days / 30.0

            # Query payment history
            payment_query = """
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'late') as late_count,
                    COUNT(*) as total_payments
                FROM loan_payments
                WHERE user_id = %s
                AND payment_date >= NOW() - INTERVAL '12 months'
            """

            payment_df = pd.read_sql(
                payment_query, db_connection, params=(user_id,))

            if not payment_df.empty:
                features['late_payments_count'] = int(
                    payment_df['late_count'].iloc[0] or 0)

            # Calculate loan to value ratio if we have asset information
            if features['monthly_income'] > 0:
                annual_income = features['monthly_income'] * 12
                features['loan_to_value_ratio'] = features['total_debt'] / \
                    annual_income if annual_income > 0 else 0.0

        except Exception as e:
            logger.error(
                f"Failed to build credit risk features from database: {e}")

    return features
