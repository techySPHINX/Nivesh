"""
Data Schema Definitions
Pydantic models for data validation
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class TransactionCategory(str, Enum):
    """Transaction categories"""
    FOOD = "food"
    TRANSPORT = "transport"
    SHOPPING = "shopping"
    BILLS = "bills"
    ENTERTAINMENT = "entertainment"
    HEALTH = "health"
    OTHER = "other"


class Transaction(BaseModel):
    """Transaction data schema"""
    id: Optional[str] = None
    user_id: str
    amount: float = Field(
        gt=0, description="Transaction amount (must be positive)")
    category: TransactionCategory
    merchant: Optional[str] = None
    description: Optional[str] = None
    timestamp: datetime
    location: Optional[str] = None

    @validator('amount')
    def validate_amount(cls, v):
        if v > 1000000:
            raise ValueError('Amount exceeds maximum limit')
        return v


class IntentQuery(BaseModel):
    """Intent classification query schema"""
    query: str = Field(min_length=3, max_length=512)
    user_id: Optional[str] = None
    context: Optional[dict] = None

    @validator('query')
    def validate_query(cls, v):
        if not v.strip():
            raise ValueError('Query cannot be empty')
        return v.strip()


class CreditApplication(BaseModel):
    """Credit risk application schema"""
    applicant_id: str
    income: float = Field(gt=0)
    employment_length: int = Field(ge=0, description="Months of employment")
    credit_history: float = Field(ge=0, le=850, description="Credit score")
    existing_loans: int = Field(ge=0)
    loan_amount: float = Field(gt=0)
    loan_purpose: str

    @validator('income')
    def validate_income(cls, v):
        if v < 10000:
            raise ValueError('Income too low for credit application')
        return v


class SpendingForecastRequest(BaseModel):
    """Spending forecast request schema"""
    user_id: str
    months: int = Field(ge=1, le=24, default=12)
    categories: Optional[List[TransactionCategory]] = None
