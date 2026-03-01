"""
Synthetic Data Generators for All Models

Generates high-quality, realistic Indian financial data for fine-tuning:
1. Intent Classification queries (14 classes, diverse paraphrases)
2. Financial NER annotated sentences (5 entity types)
3. Transaction data (multi-user, multi-category, realistic patterns)
4. Credit applications (balanced default/non-default)
5. LLM Q&A pairs (Indian personal finance)
"""

import json
import random
import hashlib
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from collections import defaultdict

import numpy as np

from finetuning.config import (
    DataGenConfig, SYNTHETIC_DATA_DIR, DATA_DIR
)

logger = logging.getLogger(__name__)
random.seed(42)
np.random.seed(42)


# ============================================================
# Indian Financial Context Data
# ============================================================

INDIAN_MERCHANTS = {
    "groceries": [
        "BigBazaar", "DMart", "Reliance Fresh", "More Megastore", "Spencer's",
        "Nature's Basket", "Star Bazaar", "Easyday", "Spar", "Heritage Fresh",
        "JioMart", "BigBasket", "Blinkit", "Zepto", "Swiggy Instamart",
    ],
    "dining": [
        "Swiggy", "Zomato", "Barbeque Nation", "Dominos", "Pizza Hut",
        "KFC", "McDonald's", "Haldiram's", "Saravana Bhavan", "Bikanervala",
        "Starbucks India", "Cafe Coffee Day", "Chaayos", "Punjab Grill", "ITC Hotels",
    ],
    "transport": [
        "Uber India", "Ola", "Rapido", "Indian Railways (IRCTC)", "IndiGo",
        "Air India", "SpiceJet", "BMTC", "Metro Rail", "BluSmart",
        "HP Petrol", "Indian Oil", "BPCL", "Bounce", "Yulu",
    ],
    "shopping": [
        "Amazon India", "Flipkart", "Myntra", "Ajio", "Nykaa",
        "Tata CLiQ", "Reliance Digital", "Croma", "Decathlon India", "IKEA India",
        "Shoppers Stop", "Lifestyle", "Westside", "Meesho", "FirstCry",
    ],
    "utilities": [
        "BSES Rajdhani", "Tata Power", "Adani Electricity", "Jio Fiber", "Airtel",
        "Vi (Vodafone Idea)", "MTNL", "Delhi Jal Board", "Mahanagar Gas",
        "Indane Gas", "Bharat Gas", "HP Gas", "ACT Fibernet", "Hathway",
        "BSNL",
    ],
    "entertainment": [
        "Netflix India", "Amazon Prime", "Disney+ Hotstar", "JioCinema", "SonyLIV",
        "Spotify India", "YouTube Premium", "BookMyShow", "PVR INOX", "Cinepolis",
        "Apple Music", "Audible India", "Gaana Plus", "Zee5", "MX Player",
    ],
    "healthcare": [
        "Apollo Pharmacy", "MedPlus", "Netmeds", "PharmEasy", "1mg (Tata)",
        "Apollo Hospital", "Fortis Healthcare", "Max Hospital", "Manipal Hospital",
        "AIIMS", "Practo", "MFine", "DocsApp", "Lenskart", "Dr. Lal PathLabs",
    ],
    "education": [
        "Coursera", "Udemy", "Unacademy", "BYJU'S", "Vedantu",
        "upGrad", "Simplilearn", "Great Learning", "edX", "Skillshare",
        "Physics Wallah", "Allen Career", "Aakash Institute", "FIITJEE", "LinkedIn Learning",
    ],
    "travel": [
        "MakeMyTrip", "Goibibo", "Yatra", "Cleartrip", "EaseMyTrip",
        "OYO Rooms", "Airbnb India", "Booking.com", "Taj Hotels", "ITC Hotels",
        "Thomas Cook India", "SOTC", "Treebo", "FabHotels", "Lemon Tree",
    ],
    "fitness": [
        "Cult.fit", "Gold's Gym India", "Anytime Fitness", "Talwalkars",
        "Snap Fitness", "Decathlon Sports", "Nike India", "Adidas India",
        "HealthKart", "MuscleBlaze", "GNC India", "MyProtein India",
        "Fitbit India", "Garmin India", "Apple Watch",
    ],
    "insurance": [
        "LIC", "HDFC Life", "SBI Life", "ICICI Prudential", "Max Life",
        "Star Health", "Care Health", "Niva Bupa", "Bajaj Allianz", "Tata AIG",
        "Digit Insurance", "Acko", "PolicyBazaar", "Kotak Life", "PNB MetLife",
    ],
    "investments": [
        "Zerodha", "Groww", "Upstox", "Angel One", "5paisa",
        "Paytm Money", "Kuvera", "ET Money", "INDmoney", "Coin by Zerodha",
        "SBI Mutual Fund", "HDFC AMC", "ICICI Prudential AMC", "Axis AMC", "Nippon India AMC",
    ],
}

INDIAN_NAMES = [
    "Aarav", "Vivaan", "Priya", "Ananya", "Rohan", "Rahul", "Sneha", "Pooja",
    "Arjun", "Kavya", "Amit", "Neha", "Vikram", "Divya", "Suresh", "Meera",
    "Aditya", "Riya", "Kiran", "Deepak", "Shruti", "Nikhil", "Saanvi", "Ishaan",
    "Tanvi", "Varun", "Sakshi", "Harsh", "Manisha", "Raj", "Simran", "Gaurav",
    "Pallavi", "Siddharth", "Nisha", "Akash", "Ritika", "Pranav", "Lavanya", "Dev",
]

ACCOUNT_TYPES = [
    "savings account", "current account", "credit card", "debit card",
    "PPF account", "NPS account", "EPF account", "fixed deposit",
    "recurring deposit", "SBI account", "HDFC account", "ICICI account",
    "Axis Bank account", "Kotak account", "mutual fund folio",
    "demat account", "trading account", "salary account",
]


# ============================================================
# 1. Intent Classification Data Generator
# ============================================================

INTENT_TEMPLATES = {
    "affordability_check": [
        "Can I afford a ₹{amount} {item}?",
        "Will I be able to take a {item} worth ₹{amount}?",
        "Is a ₹{amount} {item} within my budget?",
        "Can my salary support a ₹{amount} {item} EMI?",
        "With my income of ₹{salary}/month, can I buy a {item} for ₹{amount}?",
        "Am I financially ready for a ₹{amount} {item}?",
        "Can I manage EMIs for ₹{amount} {item} purchase?",
        "Is it wise to spend ₹{amount} on a {item} right now?",
        "How much {item} can I afford with ₹{salary} monthly income?",
        "Should I go for ₹{amount} {item} or is it too expensive?",
        "Check if ₹{amount} loan is affordable for me",
        "Calculate affordability for ₹{amount} {item}",
        "My budget analysis for buying {item} at ₹{amount}",
        "Will ₹{amount} {item} loan strain my finances?",
        "Evaluate if I can take ₹{amount} {item} loan",
    ],
    "goal_planning": [
        "Help me save for {goal}",
        "I want to save ₹{amount} in {duration}",
        "How can I plan for {goal}?",
        "Create a savings plan for {goal} worth ₹{amount}",
        "I need ₹{amount} for {goal} by {year}",
        "What's the best way to save for {goal}?",
        "Plan my finances for {goal}",
        "How much monthly SIP for ₹{amount} {goal} in {duration}?",
        "Set up a goal tracker for {goal}",
        "I want to achieve ₹{amount} corpus for {goal}",
        "Design a financial roadmap for {goal}",
        "Help create savings milestones for {goal}",
        "What investments will help me reach ₹{amount} for {goal}?",
        "Calculate SIP needed for {goal} worth ₹{amount}",
        "Show me a plan to accumulate ₹{amount} for {goal}",
    ],
    "spending_analysis": [
        "Where is my money going?",
        "Show me my spending patterns",
        "Why did I spend so much this month?",
        "Analyze my expenses for {month}",
        "Which category am I overspending in?",
        "Break down my spending for last {duration}",
        "Show my top spending categories",
        "How does my spending compare to last month?",
        "Am I spending too much on {category}?",
        "Give me a spending summary",
        "Track my daily expenses",
        "What's my average monthly spend on {category}?",
        "Identify my biggest expense areas",
        "Show spending trends over last {duration}",
        "How much did I spend on {category} this {month}?",
    ],
    "investment_advice": [
        "Should I invest in mutual funds?",
        "What are good investment options for me?",
        "Where should I invest my ₹{amount}?",
        "Is it a good time to invest in {instrument}?",
        "Suggest investments for ₹{amount} monthly SIP",
        "Compare {instrument} vs {instrument2} for investment",
        "How to diversify my ₹{amount} portfolio?",
        "Best investment for {duration} horizon",
        "Should I invest in {instrument} or {instrument2}?",
        "Recommend a balanced portfolio for ₹{amount} corpus",
        "What's the best SIP strategy for beginners?",
        "Is {instrument} giving good returns?",
        "How to start investing with ₹{amount}?",
        "Build an investment plan for {risk_level} risk profile",
        "Suggest tax-saving investments under Section 80C",
    ],
    "debt_management": [
        "How can I pay off my credit card debt?",
        "Help me manage my loans",
        "Should I consolidate my debts?",
        "I have ₹{amount} debt, what should I do?",
        "Which loan should I pay off first?",
        "How to become debt free in {duration}?",
        "Is balance transfer a good option for my ₹{amount} credit card debt?",
        "Suggest a debt repayment strategy",
        "Should I take personal loan to clear credit card dues?",
        "My EMIs are ₹{amount}/month, how to reduce them?",
        "Plan to clear my {item} loan of ₹{amount}",
        "Debt snowball vs avalanche - which is better for me?",
        "How to manage multiple EMIs totaling ₹{amount}?",
        "Is loan restructuring a good idea?",
        "Help with ₹{amount} outstanding debt management",
    ],
    "tax_planning": [
        "How can I save tax?",
        "What are tax saving options under 80C?",
        "Show me tax deductions available",
        "How much tax will I pay on ₹{salary} income?",
        "Suggest tax-saving investments for this year",
        "Can I claim HRA deduction?",
        "What's the benefit of NPS under Section 80CCD?",
        "Old regime vs new regime - which saves more tax?",
        "Tax implications of selling my {instrument}",
        "How to optimize my tax outgo?",
        "ELSS vs PPF for tax saving - which is better?",
        "Can I save tax on home loan interest?",
        "Help me plan tax for FY {year}",
        "What deductions am I missing?",
        "Calculate my total tax liability for ₹{salary} annual income",
    ],
    "emergency_fund": [
        "How much emergency fund do I need?",
        "Do I have enough savings for emergencies?",
        "Help me build an emergency fund",
        "Is ₹{amount} enough as emergency fund?",
        "Where should I keep my emergency fund?",
        "How many months' expenses should my emergency fund cover?",
        "Best place to park emergency money",
        "Should I use FD or liquid fund for emergency fund?",
        "My monthly expenses are ₹{amount}, what's ideal emergency fund?",
        "How to build ₹{amount} emergency fund in {duration}?",
        "Can I invest my emergency fund for better returns?",
        "Emergency fund calculator for ₹{salary} income",
        "Is keeping emergency fund in savings account wise?",
        "How to replenish emergency fund after using it?",
        "Ideal emergency fund size for a family of {num}",
    ],
    "retirement_planning": [
        "How much should I save for retirement?",
        "Am I on track for retirement?",
        "When can I retire comfortably?",
        "Retirement corpus needed for ₹{amount}/month expenses",
        "How much to invest monthly for retirement at {age}?",
        "EPF + PPF - is it enough for retirement?",
        "NPS vs mutual funds for retirement planning",
        "Calculate my retirement number",
        "I want to retire by {age}, what's the plan?",
        "Will pension be enough or do I need more savings?",
        "FIRE (Financial Independence Retire Early) plan for me",
        "How much corpus do I need to retire at {age}?",
        "Best retirement investment strategy for {age}-year-old",
        "Should I increase my EPF contribution?",
        "Plan retirement with ₹{salary} monthly income",
    ],
    "insurance_advice": [
        "Do I need health insurance?",
        "What insurance should I buy?",
        "Is my life insurance enough?",
        "Suggest health insurance for family of {num}",
        "Term insurance vs whole life - which is better?",
        "How much health insurance cover do I need?",
        "Should I buy top-up health insurance?",
        "Is ₹{amount} term plan sufficient?",
        "Compare {insurer} vs {insurer2} health plans",
        "Do I need critical illness cover?",
        "Best health insurance under ₹{amount} premium?",
        "Should I keep my employer's group insurance only?",
        "Super top-up vs base health plan",
        "Insurance for parents above {age} years",
        "How much cover for ₹{salary}/month income earner?",
    ],
    "transaction_query": [
        "Show my transactions from last {duration}",
        "What did I spend on {category}?",
        "Find my {merchant} payments",
        "List all UPI transactions this month",
        "Show credit card transactions above ₹{amount}",
        "When was my last {merchant} payment?",
        "Search transactions with {merchant}",
        "How many times did I order from {merchant}?",
        "Show transactions between ₹{amount} and ₹{amount2}",
        "Export my {month} transactions",
        "Find duplicate transactions",
        "List all recurring payments",
        "Show pending transactions",
        "What did I buy at {merchant} on {date}?",
        "Total {merchant} spend this month",
    ],
    "budget_creation": [
        "Create a budget for me",
        "Help me set spending limits",
        "I need a monthly budget plan",
        "Budget for ₹{salary} monthly income",
        "50/30/20 budget breakdown for my income",
        "Set category-wise spending limits",
        "How should I allocate my ₹{salary} salary?",
        "Create a zero-based budget",
        "Budget plan for newly married couple",
        "Monthly budget with ₹{amount} rent",
        "Adjust my budget to save ₹{amount} more",
        "Budget for someone earning ₹{salary} in {city}",
        "Help me stick to my budget this month",
        "Show me 50/30/20 rule applied to ₹{salary}",
        "Create budget including EMI of ₹{amount}",
    ],
    "savings_strategy": [
        "How can I save more money?",
        "Tips to increase my savings",
        "Where can I cut my expenses?",
        "Help me save ₹{amount} per month",
        "What expenses can I reduce?",
        "Automate my savings",
        "Best savings strategy for ₹{salary} income",
        "How to save when living paycheck to paycheck?",
        "Cut unnecessary subscriptions",
        "Save money on {category} expenses",
        "Challenge me to save ₹{amount} in {duration}",
        "Smart saving hacks for millennials",
        "How much should I save at age {age}?",
        "Saving vs investing - where to put ₹{amount}?",
        "Tips to reduce monthly expenses by ₹{amount}",
    ],
    "loan_inquiry": [
        "What are home loan interest rates?",
        "Should I take a personal loan?",
        "Compare education loan options",
        "Home loan EMI for ₹{amount} at {rate}%",
        "Which bank has cheapest {item} loan?",
        "Pre-approved loan offers for me",
        "Should I go for fixed or floating rate?",
        "Best car loan rates right now",
        "Am I eligible for ₹{amount} home loan?",
        "Refinance my existing loan at lower rate",
        "Gold loan vs personal loan - which is better?",
        "Education loan for studying abroad",
        "Loan against property vs personal loan",
        "Top-up loan on my existing home loan",
        "Compare SBI vs HDFC {item} loan rates",
    ],
    "general_question": [
        "What is SIP?",
        "Explain compound interest",
        "What is a credit score?",
        "Difference between {instrument} and {instrument2}",
        "What is CAGR?",
        "How does {instrument} work?",
        "What is {concept}?",
        "Explain {concept} in simple terms",
        "What are blue chip stocks?",
        "How is CIBIL score calculated?",
        "What is expense ratio in mutual funds?",
        "Difference between direct and regular mutual funds",
        "What is Section 80C?",
        "How does GST work?",
        "What is TDS and how to claim refund?",
    ],
}

# Fill-in values for templates
_AMOUNTS = [
    "5,000", "10,000", "15,000", "20,000", "25,000", "30,000", "50,000",
    "75,000", "1,00,000", "1,50,000", "2,00,000", "3,00,000", "5,00,000",
    "10,00,000", "15,00,000", "20,00,000", "25,00,000", "30,00,000",
    "40,00,000", "50,00,000", "75,00,000", "1,00,00,000",
]
_SALARIES = [
    "20,000", "25,000", "30,000", "35,000", "40,000", "50,000",
    "60,000", "75,000", "80,000", "1,00,000", "1,20,000", "1,50,000",
    "2,00,000", "2,50,000", "3,00,000",
]
_ITEMS = [
    "car", "house", "flat", "bike", "laptop", "phone",
    "home", "apartment", "property", "vehicle", "scooter",
]
_GOALS = [
    "house down payment", "child's education", "wedding", "foreign trip",
    "car purchase", "retirement", "higher studies", "business startup",
    "home renovation", "child's marriage", "emergency fund",
    "international vacation", "dream bike",
]
_DURATIONS = [
    "1 year", "2 years", "3 years", "5 years", "6 months",
    "18 months", "10 years", "7 years",
]
_MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
    "last month", "this month", "past 3 months", "past 6 months",
]
_CATEGORIES = [
    "groceries", "dining", "shopping", "transport", "entertainment",
    "utilities", "healthcare", "education", "travel", "fitness",
]
_INSTRUMENTS = [
    "mutual funds", "fixed deposits", "PPF", "NPS", "ELSS",
    "stocks", "gold", "bonds", "SIP", "FD", "RD",
    "Sovereign Gold Bonds", "government bonds", "real estate",
]
_CONCEPTS = [
    "SIP", "compound interest", "credit score", "CAGR",
    "expense ratio", "NAV", "AUM", "TDS", "HRA",
    "Section 80C", "NPS", "ELSS", "LTCG", "STCG",
    "inflation", "rupee cost averaging", "asset allocation",
]
_CITIES = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Pune", "Kolkata"]
_YEARS = ["2025", "2026", "2027", "2028", "2030"]
_AGES = ["25", "30", "35", "40", "45", "50", "55", "60"]
_RATES = ["7.5", "8.0", "8.5", "9.0", "9.5", "10.0", "10.5"]
_RISK_LEVELS = ["low", "moderate", "high", "aggressive", "conservative"]
_INSURERS = ["LIC", "HDFC Life", "Star Health", "Max Life", "ICICI Prudential"]
_MERCHANTS_FLAT = [m for mlist in INDIAN_MERCHANTS.values() for m in mlist]


def _fill_template(template: str) -> str:
    """Fill a template with random Indian financial context values."""
    result = template
    result = result.replace("{amount}", random.choice(_AMOUNTS))
    result = result.replace("{amount2}", random.choice(_AMOUNTS))
    result = result.replace("{salary}", random.choice(_SALARIES))
    result = result.replace("{item}", random.choice(_ITEMS))
    result = result.replace("{goal}", random.choice(_GOALS))
    result = result.replace("{duration}", random.choice(_DURATIONS))
    result = result.replace("{month}", random.choice(_MONTHS))
    result = result.replace("{category}", random.choice(_CATEGORIES))
    result = result.replace("{merchant}", random.choice(_MERCHANTS_FLAT))
    result = result.replace("{instrument}", random.choice(_INSTRUMENTS))
    result = result.replace("{instrument2}", random.choice(_INSTRUMENTS))
    result = result.replace("{concept}", random.choice(_CONCEPTS))
    result = result.replace("{city}", random.choice(_CITIES))
    result = result.replace("{year}", random.choice(_YEARS))
    result = result.replace("{age}", random.choice(_AGES))
    result = result.replace("{rate}", random.choice(_RATES))
    result = result.replace("{risk_level}", random.choice(_RISK_LEVELS))
    result = result.replace("{insurer}", random.choice(_INSURERS))
    result = result.replace("{insurer2}", random.choice(_INSURERS))
    result = result.replace("{date}", f"{random.randint(1,28)} {random.choice(_MONTHS[:12])}")
    result = result.replace("{num}", str(random.choice([2, 3, 4, 5])))
    return result


def generate_intent_data(config: DataGenConfig) -> List[Dict]:
    """
    Generate intent classification training data.
    
    Creates diverse paraphrases for each intent class using templates
    with randomized Indian financial context values.
    """
    logger.info("Generating intent classification data...")
    data = []
    seen = set()

    for intent, templates in INTENT_TEMPLATES.items():
        count = 0
        attempts = 0
        max_attempts = config.intent_samples_per_class * 20

        while count < config.intent_samples_per_class and attempts < max_attempts:
            template = random.choice(templates)
            query = _fill_template(template)

            # Deduplicate
            query_hash = hashlib.md5(query.lower().encode()).hexdigest()
            if query_hash not in seen:
                seen.add(query_hash)
                data.append({"query": query, "intent": intent})
                count += 1
            attempts += 1

    random.shuffle(data)
    logger.info(f"Generated {len(data)} intent samples across {len(INTENT_TEMPLATES)} classes")
    return data


# ============================================================
# 2. Financial NER Data Generator
# ============================================================

# NER template patterns with entity annotations
# Format: (template_text, [(entity_text, entity_type), ...])
NER_SENTENCE_PATTERNS = [
    # Money + Category + Date
    ("I spent {money} on {category} {date}", [("money", "MONEY"), ("category", "CATEGORY"), ("date", "DATE")]),
    ("Paid {money} for {category} {date}", [("money", "MONEY"), ("category", "CATEGORY"), ("date", "DATE")]),
    ("{category} expenses were {money} {date}", [("category", "CATEGORY"), ("money", "MONEY"), ("date", "DATE")]),
    ("My {category} bill is {money} this month", [("category", "CATEGORY"), ("money", "MONEY")]),
    
    # Money + Merchant + Date
    ("Paid {money} to {merchant} {date}", [("money", "MONEY"), ("merchant", "MERCHANT"), ("date", "DATE")]),
    ("{merchant} charged {money} {date}", [("merchant", "MERCHANT"), ("money", "MONEY"), ("date", "DATE")]),
    ("Spent {money} at {merchant} {date}", [("money", "MONEY"), ("merchant", "MERCHANT"), ("date", "DATE")]),
    ("Bought stuff from {merchant} for {money}", [("merchant", "MERCHANT"), ("money", "MONEY")]),
    ("My {merchant} order was {money}", [("merchant", "MERCHANT"), ("money", "MONEY")]),
    
    # Money + Account
    ("Transfer {money} from {account} to {account2}", [("money", "MONEY"), ("account", "ACCOUNT"), ("account2", "ACCOUNT")]),
    ("Deposit {money} in {account}", [("money", "MONEY"), ("account", "ACCOUNT")]),
    ("{account} balance is {money}", [("account", "ACCOUNT"), ("money", "MONEY")]),
    ("Withdrew {money} from {account}", [("money", "MONEY"), ("account", "ACCOUNT")]),
    ("Credited {money} to my {account}", [("money", "MONEY"), ("account", "ACCOUNT")]),
    
    # Complex - Multiple entity types
    ("Paid {money} {category} at {merchant} {date}", [("money", "MONEY"), ("category", "CATEGORY"), ("merchant", "MERCHANT"), ("date", "DATE")]),
    ("{merchant} {category} subscription of {money} debited from {account}", [("merchant", "MERCHANT"), ("category", "CATEGORY"), ("money", "MONEY"), ("account", "ACCOUNT")]),
    ("Transferred {money} from {account} for {category} {date}", [("money", "MONEY"), ("account", "ACCOUNT"), ("category", "CATEGORY"), ("date", "DATE")]),
    ("{date} {merchant} charged {money} on my {account}", [("date", "DATE"), ("merchant", "MERCHANT"), ("money", "MONEY"), ("account", "ACCOUNT")]),
    
    # Natural conversational patterns
    ("Can you show me {merchant} transactions above {money}?", [("merchant", "MERCHANT"), ("money", "MONEY")]),
    ("How much did I spend on {category} in {date}?", [("category", "CATEGORY"), ("date", "DATE")]),
    ("Find all {merchant} payments from my {account}", [("merchant", "MERCHANT"), ("account", "ACCOUNT")]),
    ("What's my {category} spend for {date}?", [("category", "CATEGORY"), ("date", "DATE")]),
    ("Show me all transactions above {money} {date}", [("money", "MONEY"), ("date", "DATE")]),
    ("I need to pay {money} for {category} from {account}", [("money", "MONEY"), ("category", "CATEGORY"), ("account", "ACCOUNT")]),
]

_MONEY_VALUES = [
    "₹500", "₹850", "₹1,200", "₹1,500", "₹2,000", "₹2,500", "₹3,000",
    "₹3,499", "₹4,200", "₹5,000", "₹6,500", "₹7,999", "₹8,000",
    "₹10,000", "₹12,000", "₹15,000", "₹20,000", "₹25,000", "₹30,000",
    "₹50,000", "₹75,000", "₹1,00,000", "₹1,50,000", "₹2,00,000",
    "$50", "$100", "$200", "$500", "$1000",
    "₹649", "₹999", "₹1,499", "₹2,999", "₹4,999", "₹11,999",
    "₹50 lakh", "₹1 crore", "₹30 lakh", "₹20 lakh",
]

_DATE_VALUES = [
    "yesterday", "last week", "last month", "this month", "today",
    "in January", "in February", "in March", "in April", "in May",
    "in June", "in July", "in August", "in September", "in October",
    "in November", "in December", "last 3 months", "last 6 months",
    "this quarter", "last quarter", "this year", "2024", "2025",
    "on 15th January", "on 1st March", "next month", "2 weeks ago",
    "past 30 days", "since January",
]

_CATEGORY_VALUES = [
    "groceries", "dining", "food", "transport", "shopping", "utilities",
    "entertainment", "healthcare", "medical bills", "education", "travel",
    "fitness", "gym", "rent", "EMI", "insurance premium", "fuel",
    "electricity", "mobile recharge", "subscription", "home loan",
    "car loan", "personal loan", "credit card bill", "gas bill",
    "water bill", "internet bill", "SIP", "investment",
]


def _build_ner_sample(pattern_text: str, entity_specs: List[Tuple[str, str]]) -> Optional[Dict]:
    """
    Build a NER training sample from a template.
    
    Replaces placeholders with real values and computes character-level
    entity span positions.
    """
    # Select random values for each placeholder
    replacements = {}
    for placeholder, entity_type in entity_specs:
        if placeholder.startswith("account"):
            replacements[placeholder] = random.choice(ACCOUNT_TYPES)
        elif entity_type == "MONEY":
            replacements[placeholder] = random.choice(_MONEY_VALUES)
        elif entity_type == "DATE":
            replacements[placeholder] = random.choice(_DATE_VALUES)
        elif entity_type == "CATEGORY":
            replacements[placeholder] = random.choice(_CATEGORY_VALUES)
        elif entity_type == "MERCHANT":
            all_merchants = [m for mlist in INDIAN_MERCHANTS.values() for m in mlist]
            replacements[placeholder] = random.choice(all_merchants)
        elif entity_type == "ACCOUNT":
            replacements[placeholder] = random.choice(ACCOUNT_TYPES)

    # Build the text and track positions
    text = pattern_text
    entities = []

    # Replace placeholders and track positions
    # We need to do this carefully to get correct character offsets
    for placeholder, entity_type in entity_specs:
        marker = "{" + placeholder + "}"
        value = replacements[placeholder]
        start = text.find(marker)
        if start == -1:
            continue
        end = start + len(value)
        text = text[:start] + value + text[start + len(marker):]
        entities.append([start, end, entity_type])

    # Validate no overlapping entities
    entities.sort(key=lambda x: x[0])
    for i in range(len(entities) - 1):
        if entities[i][1] > entities[i + 1][0]:
            return None  # Skip overlapping

    # Validate entity spans match text
    for start, end, label in entities:
        if start < 0 or end > len(text):
            return None
        extracted = text[start:end]
        if not extracted.strip():
            return None

    return {"text": text, "entities": entities}


def generate_ner_data(config: DataGenConfig) -> List[Dict]:
    """Generate NER training data with accurate entity annotations."""
    logger.info("Generating NER training data...")
    data = []
    seen_texts = set()

    attempts = 0
    max_attempts = config.ner_samples * 10

    while len(data) < config.ner_samples and attempts < max_attempts:
        pattern_text, entity_specs = random.choice(NER_SENTENCE_PATTERNS)
        sample = _build_ner_sample(pattern_text, entity_specs)

        if sample:
            text_hash = hashlib.md5(sample["text"].lower().encode()).hexdigest()
            if text_hash not in seen_texts:
                seen_texts.add(text_hash)
                data.append(sample)
        attempts += 1

    logger.info(f"Generated {len(data)} NER samples")
    return data


# ============================================================
# 3. Transaction Data Generator
# ============================================================

def _generate_user_profile() -> Dict:
    """Generate a realistic Indian user financial profile."""
    age = random.randint(22, 60)
    income_base = {
        range(22, 26): (20000, 45000),
        range(26, 31): (35000, 80000),
        range(31, 36): (50000, 150000),
        range(36, 46): (60000, 250000),
        range(46, 56): (70000, 300000),
        range(56, 61): (50000, 200000),
    }
    for age_range, (low, high) in income_base.items():
        if age in age_range:
            monthly_income = random.randint(low, high)
            break
    else:
        monthly_income = random.randint(30000, 100000)

    # Spending patterns based on income
    spending_ratio = random.uniform(0.4, 0.85)
    monthly_spend = int(monthly_income * spending_ratio)

    # Category spending distribution (Indian household)
    category_weights = {
        "groceries": random.uniform(0.15, 0.30),
        "dining": random.uniform(0.05, 0.15),
        "transport": random.uniform(0.05, 0.12),
        "shopping": random.uniform(0.05, 0.20),
        "utilities": random.uniform(0.08, 0.15),
        "entertainment": random.uniform(0.02, 0.08),
        "healthcare": random.uniform(0.02, 0.08),
        "education": random.uniform(0.00, 0.10),
        "travel": random.uniform(0.02, 0.10),
        "fitness": random.uniform(0.01, 0.05),
    }
    # Normalize
    total_weight = sum(category_weights.values())
    category_weights = {k: v / total_weight for k, v in category_weights.items()}

    return {
        "user_id": f"USR{random.randint(1000, 9999)}",
        "name": random.choice(INDIAN_NAMES),
        "age": age,
        "monthly_income": monthly_income,
        "monthly_spend": monthly_spend,
        "category_weights": category_weights,
    }


def generate_transaction_data(config: DataGenConfig) -> List[Dict]:
    """
    Generate realistic Indian transaction data.
    
    Includes:
    - Multi-user with distinct spending patterns
    - Seasonal variations (Diwali, festivals)
    - Weekend/weekday patterns
    - Salary-day spikes
    - Realistic anomalies (fraud, unusual amounts)
    """
    logger.info("Generating transaction data...")
    users = [_generate_user_profile() for _ in range(config.num_users)]
    transactions = []
    
    start_date = datetime(2023, 1, 1)
    end_date = start_date + timedelta(days=config.date_range_months * 30)

    # Festival months with spending multipliers
    festival_multipliers = {
        10: 1.4,  # October - Navratri/Dussehra
        11: 1.6,  # November - Diwali
        12: 1.2,  # December - Christmas/New Year
        1: 1.1,   # January - New Year
        3: 1.15,  # March - Holi
        8: 1.1,   # August - Independence Day / Raksha Bandhan
    }

    txn_per_user = config.transaction_samples // config.num_users

    for user in users:
        for _ in range(txn_per_user):
            # Random date within range
            days_offset = random.randint(0, (end_date - start_date).days)
            txn_date = start_date + timedelta(days=days_offset)

            # Category selection based on user's spending pattern
            category = random.choices(
                list(user["category_weights"].keys()),
                weights=list(user["category_weights"].values()),
                k=1
            )[0]

            # Base amount for category
            category_amount_ranges = {
                "groceries": (200, 8000),
                "dining": (150, 15000),
                "transport": (50, 5000),
                "shopping": (500, 30000),
                "utilities": (200, 5000),
                "entertainment": (100, 3000),
                "healthcare": (200, 20000),
                "education": (500, 15000),
                "travel": (1000, 50000),
                "fitness": (500, 5000),
            }
            low, high = category_amount_ranges.get(category, (100, 5000))
            amount = round(random.uniform(low, high), 2)

            # Apply festival multiplier
            month = txn_date.month
            if month in festival_multipliers:
                amount *= festival_multipliers[month]

            # Weekend spending boost for dining/entertainment
            if txn_date.weekday() >= 5 and category in ["dining", "entertainment", "shopping"]:
                amount *= random.uniform(1.1, 1.5)

            # Salary day boost (1st or last day of month)
            if txn_date.day <= 5 and category == "shopping":
                amount *= random.uniform(1.1, 1.3)

            amount = round(amount, 2)
            merchant = random.choice(INDIAN_MERCHANTS.get(category, ["Unknown"]))

            # Decide if anomalous
            is_anomaly = random.random() < config.anomaly_ratio
            if is_anomaly:
                anomaly_type = random.choice(["high_amount", "unusual_time", "new_merchant", "rapid_fire"])
                if anomaly_type == "high_amount":
                    amount = round(amount * random.uniform(5, 20), 2)
                elif anomaly_type == "unusual_time":
                    txn_date = txn_date.replace(hour=random.randint(0, 4))
                elif anomaly_type == "new_merchant":
                    merchant = f"Unknown_Merchant_{random.randint(1,100)}"

            transactions.append({
                "transaction_id": f"TXN{len(transactions) + 1:06d}",
                "user_id": user["user_id"],
                "date": txn_date.strftime("%Y-%m-%d"),
                "amount": amount,
                "category": category,
                "merchant": merchant,
                "is_anomaly": 1 if is_anomaly else 0,
            })

    random.shuffle(transactions)
    logger.info(f"Generated {len(transactions)} transactions for {len(users)} users")
    anomaly_count = sum(1 for t in transactions if t["is_anomaly"] == 1)
    logger.info(f"Anomalies: {anomaly_count} ({anomaly_count/len(transactions)*100:.1f}%)")
    return transactions


# ============================================================
# 4. Credit Application Data Generator
# ============================================================

def generate_credit_data(config: DataGenConfig) -> List[Dict]:
    """
    Generate realistic Indian credit application data.
    
    Creates balanced dataset with realistic default patterns:
    - High debt-to-income → higher default probability
    - Low credit history → higher default probability
    - More missed payments → higher default probability
    - Employment stability affects risk
    """
    logger.info("Generating credit application data...")
    data = []
    
    employment_types = ["salaried", "self_employed", "govt_employee", "freelancer", "business_owner"]
    education_levels = ["undergraduate", "graduate", "post_graduate", "professional", "diploma"]
    
    for i in range(config.credit_application_samples):
        age = random.randint(21, 65)
        
        # Income correlated with age & education
        education = random.choice(education_levels)
        edu_multiplier = {
            "undergraduate": 0.7, "graduate": 1.0, "post_graduate": 1.3,
            "professional": 1.5, "diploma": 0.85,
        }[education]
        
        employment_type = random.choice(employment_types)
        emp_multiplier = {
            "salaried": 1.0, "self_employed": 1.1, "govt_employee": 0.95,
            "freelancer": 0.85, "business_owner": 1.3,
        }[employment_type]
        
        base_income = max(15000, int(np.random.lognormal(
            mean=10.5 + (age - 21) * 0.02,
            sigma=0.5
        )))
        monthly_income = int(base_income * edu_multiplier * emp_multiplier)
        monthly_income = min(monthly_income, 500000)
        
        # Debt level
        debt_ratio = random.betavariate(2, 5)  # Skewed toward lower debt
        monthly_debt = int(monthly_income * debt_ratio)
        
        # Credit
        credit_limit = int(monthly_income * random.uniform(1.5, 8))
        utilization = random.betavariate(2, 3)
        credit_used = int(credit_limit * utilization)
        
        # Loan
        loan_amount = int(monthly_income * random.uniform(3, 60))
        
        # Employment history
        max_months = min((age - 21) * 12, 480)
        months_employed = random.randint(1, max(2, max_months))
        
        # Credit history
        credit_history_months = random.randint(
            max(1, months_employed - 24),
            max(2, months_employed + 12)
        )
        
        # Payment history
        total_payments = random.randint(6, max(7, credit_history_months))
        
        # Default probability based on risk factors
        risk_score = 0.0
        
        # Debt-to-income risk
        dti = monthly_debt / max(monthly_income, 1)
        if dti > 0.5:
            risk_score += 0.25
        elif dti > 0.3:
            risk_score += 0.10
            
        # Credit utilization risk
        cu = credit_used / max(credit_limit, 1)
        if cu > 0.8:
            risk_score += 0.20
        elif cu > 0.5:
            risk_score += 0.08
            
        # Loan-to-income risk
        lti = loan_amount / max(monthly_income * 12, 1)
        if lti > 5:
            risk_score += 0.15
        elif lti > 3:
            risk_score += 0.05
            
        # Employment stability
        if months_employed < 12:
            risk_score += 0.15
        elif months_employed < 24:
            risk_score += 0.05
        
        # Credit history length
        if credit_history_months < 12:
            risk_score += 0.10
        elif credit_history_months < 24:
            risk_score += 0.03
            
        # Age factor
        if age < 25:
            risk_score += 0.05
            
        # Payment miss probability
        miss_prob = min(risk_score * 1.5, 0.8)
        payments_missed = np.random.binomial(total_payments, min(miss_prob * 0.3, 0.5))
        
        if payments_missed > 2:
            risk_score += 0.15
            
        # Determine default (binary classification target)
        default_prob = min(risk_score, 0.95)
        default = 1 if random.random() < default_prob else 0
        
        num_credit_accounts = random.randint(1, 8)
        has_mortgage = random.random() < 0.3
        has_car_loan = random.random() < 0.25
        
        data.append({
            "applicant_id": f"APP{i+1:04d}",
            "age": age,
            "monthly_income": monthly_income,
            "monthly_debt": monthly_debt,
            "credit_limit": credit_limit,
            "credit_used": credit_used,
            "loan_amount": loan_amount,
            "payments_missed": int(payments_missed),
            "total_payments": total_payments,
            "months_employed": months_employed,
            "credit_history_months": credit_history_months,
            "num_credit_accounts": num_credit_accounts,
            "has_mortgage": has_mortgage,
            "has_car_loan": has_car_loan,
            "employment_type": employment_type,
            "education": education,
            "default": default,
        })

    default_count = sum(1 for d in data if d["default"] == 1)
    logger.info(
        f"Generated {len(data)} credit applications "
        f"(default rate: {default_count/len(data)*100:.1f}%)"
    )
    return data


# ============================================================
# 5. LLM Fine-Tuning Q&A Data Generator
# ============================================================

LLM_QA_TEMPLATES = [
    # Budgeting & Savings
    {
        "category": "budgeting",
        "questions": [
            "How should I allocate my ₹{salary} monthly salary?",
            "Create a budget for someone earning ₹{salary} in {city}",
            "I save only ₹{amount} from ₹{salary} salary. How to improve?",
            "50/30/20 rule for ₹{salary} income breakdown",
            "Monthly budget plan for a {family} earning ₹{salary}",
        ],
        "answer_template": """Based on your ₹{salary} monthly income, here's a recommended allocation:

**Needs (50% = ₹{needs}):**
- Rent/Housing: ₹{rent} (25-30%)
- Groceries & Essentials: ₹{groceries}
- Utilities (electricity, water, internet): ₹{utilities}
- Transport: ₹{transport}
- Insurance premiums: ₹{insurance}

**Wants (30% = ₹{wants}):**
- Dining out & entertainment: ₹{dining}
- Shopping & subscriptions: ₹{shopping}
- Travel & leisure: ₹{travel}

**Savings & Investments (20% = ₹{savings}):**
- Emergency Fund (liquid fund): ₹{emergency}
- SIP in equity mutual funds: ₹{sip}
- PPF/NPS: ₹{ppf}
- Short-term goals: ₹{short_term}

**Key Tips:**
1. Build 6 months' emergency fund (₹{emergency_total}) first
2. Start SIPs for long-term wealth building
3. Use auto-debit for investments on salary day
4. Track expenses weekly to stay within budget

⚠️ This is general guidance. Adjust based on your specific obligations and goals."""
    },
    # Investment
    {
        "category": "investment",
        "questions": [
            "Where should I invest ₹{amount} for {duration}?",
            "Best SIP for ₹{amount} monthly investment?",
            "I'm {age} years old. How should I invest ₹{amount}?",
            "Compare mutual funds vs fixed deposits for ₹{amount}",
            "Investment strategy for {risk_level} risk profile",
        ],
        "answer_template": """For investing ₹{amount} with {duration} horizon and {risk_level} risk appetite:

**Recommended Portfolio Allocation:**
{allocation}

**Why this allocation:**
- {reason1}
- {reason2}
- {reason3}

**Specific Recommendations:**
1. **Equity Mutual Funds (SIP):** {equity_rec}
2. **Debt Instruments:** {debt_rec}
3. **Tax-saving:** ELSS funds (Section 80C benefit up to ₹1.5L)

**Expected Returns (estimates, not guaranteed):**
- Conservative: {conservative_return}% p.a.
- Moderate: {moderate_return}% p.a.
- Aggressive: {aggressive_return}% p.a.

**Important Disclaimers:**
⚠️ Past performance doesn't guarantee future returns
⚠️ Mutual fund investments are subject to market risks
⚠️ Consider consulting a SEBI-registered financial advisor
⚠️ Ensure adequate insurance coverage before aggressive investing"""
    },
    # Tax
    {
        "category": "tax",
        "questions": [
            "How to save tax on ₹{salary} annual income?",
            "Old tax regime vs new - which saves more for ₹{salary} income?",
            "Tax deductions I can claim under Section 80C",
            "HRA exemption calculation for ₹{amount} rent in {city}",
            "Tax planning tips for FY 2025-26",
        ],
        "answer_template": """Here's a comprehensive tax-saving approach for FY 2025-26:

**Section 80C (Limit: ₹1,50,000):**
- EPF contribution: Already deducted from salary
- PPF: ₹{ppf_amount} (7.1% tax-free returns, 15-year lock-in)
- ELSS Mutual Funds: ₹{elss_amount} (shortest lock-in at 3 years)
- Life Insurance Premium: Up to ₹{insurance_amount}
- Children's tuition fees: If applicable
- 5-year FD: Bank tax-saver FD

**Section 80D (Health Insurance):**
- Self & family: Up to ₹25,000 (₹50,000 if senior citizen)
- Parents: Additional ₹25,000-₹50,000

**Other Deductions:**
- Section 80CCD(1B): Additional ₹50,000 for NPS
- Section 24(b): Home loan interest up to ₹2,00,000
- Section 80E: Education loan interest (no limit)
- Section 80TTA: Savings bank interest up to ₹10,000

**Old vs New Regime Comparison for your income:**
{regime_comparison}

**Action Items:**
1. {action1}
2. {action2}
3. {action3}

⚠️ Tax laws change annually. Verify with a CA for your specific situation."""
    },
    # Loans
    {
        "category": "loans",
        "questions": [
            "Should I prepay my home loan of ₹{amount}?",
            "Home loan vs renting - what's better in {city}?",
            "Personal loan at {rate}% - should I take it?",
            "How to reduce my EMI burden of ₹{amount}?",
            "Best home loan rates comparison",
        ],
        "answer_template": """Here's my analysis on your loan situation:

**Current Loan Assessment:**
- Loan Amount: ₹{amount}
- EMI Impact: {emi_analysis}
- Interest Cost Over Tenure: {interest_cost}

**Recommendation:**
{main_recommendation}

**Prepayment Analysis:**
- If you prepay ₹{prepay_amount}: Save ₹{interest_saved} in interest
- Optimal strategy: {prepay_strategy}

**Key Considerations:**
1. {consideration1}
2. {consideration2}
3. {consideration3}

**Current Market Rates (approximate):**
| Bank | Home Loan | Personal Loan |
|------|-----------|---------------|
| SBI | 8.50% | 11.00% |
| HDFC | 8.75% | 10.50% |
| ICICI | 8.65% | 10.75% |
| Axis | 8.70% | 10.49% |
| Kotak | 8.75% | 10.99% |

**Tips:**
- {tip1}
- {tip2}

⚠️ Rates are indicative and change frequently. Check with banks for latest offers."""
    },
    # Retirement
    {
        "category": "retirement",
        "questions": [
            "I'm {age}, earning ₹{salary}/month. Am I on track for retirement?",
            "How much corpus do I need to retire at {retirement_age}?",
            "EPF + PPF - will it be enough for retirement?",
            "NPS vs mutual funds for retirement investment",
            "FIRE plan for someone earning ₹{salary}/month",
        ],
        "answer_template": """**Retirement Planning Analysis:**

**Assumptions:**
- Current age: {age} | Retirement age: {retirement_age}
- Years to retirement: {years_to_retirement}
- Current monthly expenses: ~₹{expenses}
- Inflation rate: 6% p.a.
- Post-retirement returns: 8% p.a.

**Required Corpus Calculation:**
- Monthly expenses at retirement (inflation-adjusted): ₹{future_expenses}
- Required corpus (25x annual expenses): **₹{required_corpus}**

**Current Trajectory:**
- EPF projection: ₹{epf_projection}
- PPF projection: ₹{ppf_projection}
- Other investments: ₹{other_investments}
- **Gap to fill: ₹{gap_amount}**

**Recommended Monthly Investment:**
- Additional SIP needed: **₹{monthly_sip}**
- Asset allocation: {allocation}

**Retirement Portfolio Strategy:**
| Age Range | Equity % | Debt % | Gold % |
|-----------|----------|--------|--------|
| 25-35 | 75 | 20 | 5 |
| 35-45 | 60 | 30 | 10 |
| 45-55 | 40 | 50 | 10 |
| 55+ | 20 | 70 | 10 |

**Action Steps:**
1. {step1}
2. {step2}
3. {step3}

⚠️ These are estimates. Actual results depend on market conditions and life events."""
    },
    # Insurance
    {
        "category": "insurance",
        "questions": [
            "How much term insurance do I need for ₹{salary} income?",
            "Best health insurance for family of {num} in {city}",
            "Term plan vs endowment - which should I buy?",
            "Should I increase my health insurance cover?",
            "Insurance planning for {age}-year-old with family",
        ],
        "answer_template": """**Insurance Recommendation:**

**Life Insurance (Term Plan):**
- Recommended cover: **₹{term_cover}** (15-20x annual income)
- Tenure: Until age 60-65
- Premium: ~₹{term_premium}/year for ₹{term_cover} cover
- Top picks: HDFC Click2Protect, ICICI iProtect, Max Life Online Term

**Why term insurance over endowment/ULIPs:**
- 10-15x cheaper premiums for same coverage
- Pure protection, no mixing of investment
- Higher claim settlement ratio

**Health Insurance:**
- Family floater: **₹{health_cover}** cover
- Super top-up: Additional ₹{topup_cover}
- Estimated premium: ₹{health_premium}/year

**Recommended setup:**
1. Base health plan: ₹{health_cover} family floater
2. Super top-up: ₹{topup_cover} (kicks in after base exhausted)
3. Total effective cover: ₹{total_health_cover}

**Riders to consider:**
- Critical illness cover
- Accidental death benefit
- Waiver of premium

⚠️ Buy insurance early - premiums increase with age
⚠️ Never surrender existing policies without expert advice
⚠️ Read policy documents carefully before buying"""
    },
    # Credit & Debt
    {
        "category": "debt",
        "questions": [
            "I have ₹{amount} credit card debt at 36%. What to do?",
            "Debt snowball vs avalanche for multiple loans",
            "Should I take personal loan to pay credit card debt?",
            "How to improve CIBIL score from {score}?",
            "Managing EMIs of ₹{amount}/month on ₹{salary} salary",
        ],
        "answer_template": """**Debt Management Strategy:**

**Current Situation Analysis:**
- Outstanding debt: ₹{amount}
- Interest rate: {rate}% p.a.
- Monthly EMI/minimum due: ₹{emi}
- Debt-to-income ratio: {dti}%

**Immediate Actions:**
1. **Stop using credit cards** for new purchases
2. **Pay more than minimum** - minimum payment is a debt trap
3. **Consider balance transfer** to lower interest rate

**Repayment Strategy ({strategy} Method):**
{repayment_plan}

**CIBIL Score Improvement:**
- Pay all EMIs on time (35% of score)
- Reduce credit utilization below 30% (30% of score)
- Don't close old credit cards (15% of score)
- Limit new credit applications (10% of score)
- Mix of credit types helps (10% of score)

**Timeline to Debt-Free:**
- With current payments: {current_timeline}
- With optimized strategy: {optimized_timeline}
- Interest saved: ₹{interest_saved}

⚠️ If debt is overwhelming, consider credit counseling
⚠️ Never take more debt to pay existing debt (except debt consolidation at lower rates)"""
    },
    # Emergency Fund
    {
        "category": "emergency_fund",
        "questions": [
            "How much emergency fund for ₹{salary} income?",
            "Where to park emergency fund for best returns?",
            "Building emergency fund while paying EMIs",
            "Is ₹{amount} enough as emergency fund?",
            "Emergency fund strategy for single-income family",
        ],
        "answer_template": """**Emergency Fund Planning:**

**Recommended Size:**
- Minimum: **₹{min_ef}** (3 months' expenses)
- Ideal: **₹{ideal_ef}** (6 months' expenses)
- Conservative: **₹{max_ef}** (9-12 months' expenses for single income)

**Where to Keep It:**
| Option | Returns | Liquidity | Recommendation |
|--------|---------|-----------|----------------|
| Savings A/C | 3-4% | Instant | Keep 1 month here |
| Liquid Fund | 5-6% | T+1 day | Keep 3-4 months |
| Short-term FD | 6-7% | 1 day penalty | Keep 2-3 months |
| Sweep FD | 5-6% | Instant | Good alternative |

**Building Strategy (₹{monthly_ef}/month):**
1. Month 1-3: Build 1-month buffer in savings account
2. Month 4-12: Liquid fund SIP for 3-month buffer
3. Month 13-18: Short-term FD for additional buffer

**When to Use:**
✅ Job loss or income disruption
✅ Medical emergencies
✅ Urgent home/vehicle repairs
✅ Unexpected family obligations

❌ Vacation or lifestyle expenses
❌ Investment opportunities
❌ Gadget purchases

⚠️ Replenish immediately after use
⚠️ Review size annually as expenses change"""
    },
]

def _generate_llm_qa_pair(template: Dict) -> Dict:
    """Generate a single Q&A pair from template with randomized values."""
    salary_val = random.choice([20000, 25000, 30000, 40000, 50000, 60000, 75000, 100000, 150000, 200000])
    amount_val = random.choice([50000, 100000, 200000, 500000, 1000000, 2000000, 5000000])
    age_val = random.choice(list(range(22, 60)))
    
    question = random.choice(template["questions"])
    question = question.replace("{salary}", f"{salary_val:,}")
    question = question.replace("{amount}", f"{amount_val:,}")
    question = question.replace("{age}", str(age_val))
    question = question.replace("{city}", random.choice(_CITIES))
    question = question.replace("{duration}", random.choice(_DURATIONS))
    question = question.replace("{rate}", random.choice(_RATES))
    question = question.replace("{risk_level}", random.choice(_RISK_LEVELS))
    question = question.replace("{num}", str(random.choice([2, 3, 4, 5])))
    question = question.replace("{family}", random.choice(["couple", "family of 3", "family of 4", "single earner family"]))
    question = question.replace("{score}", str(random.choice([550, 600, 650, 680, 700])))
    question = question.replace("{retirement_age}", str(random.choice([50, 55, 58, 60, 65])))
    
    # Generate answer with realistic values
    needs = int(salary_val * 0.5)
    wants = int(salary_val * 0.3)
    savings = int(salary_val * 0.2)
    
    answer = template["answer_template"]
    answer = answer.replace("{salary}", f"{salary_val:,}")
    answer = answer.replace("{amount}", f"{amount_val:,}")
    answer = answer.replace("{age}", str(age_val))
    answer = answer.replace("{needs}", f"{needs:,}")
    answer = answer.replace("{wants}", f"{wants:,}")
    answer = answer.replace("{savings}", f"{savings:,}")
    answer = answer.replace("{rent}", f"{int(salary_val * 0.27):,}")
    answer = answer.replace("{groceries}", f"{int(salary_val * 0.08):,}")
    answer = answer.replace("{utilities}", f"{int(salary_val * 0.05):,}")
    answer = answer.replace("{transport}", f"{int(salary_val * 0.05):,}")
    answer = answer.replace("{insurance}", f"{int(salary_val * 0.03):,}")
    answer = answer.replace("{dining}", f"{int(salary_val * 0.08):,}")
    answer = answer.replace("{shopping}", f"{int(salary_val * 0.07):,}")
    answer = answer.replace("{travel}", f"{int(salary_val * 0.05):,}")
    answer = answer.replace("{emergency}", f"{int(salary_val * 0.05):,}")
    answer = answer.replace("{sip}", f"{int(salary_val * 0.08):,}")
    answer = answer.replace("{ppf}", f"{int(salary_val * 0.04):,}")
    answer = answer.replace("{short_term}", f"{int(salary_val * 0.03):,}")
    answer = answer.replace("{emergency_total}", f"{int(salary_val * 6):,}")
    answer = answer.replace("{risk_level}", random.choice(_RISK_LEVELS))
    answer = answer.replace("{duration}", random.choice(_DURATIONS))
    answer = answer.replace("{expenses}", f"{int(salary_val * 0.7):,}")
    answer = answer.replace("{retirement_age}", str(random.choice([55, 58, 60])))
    answer = answer.replace("{years_to_retirement}", str(max(5, 60 - age_val)))
    answer = answer.replace("{future_expenses}", f"{int(salary_val * 0.7 * (1.06 ** max(5, 60 - age_val))):,}")
    answer = answer.replace("{required_corpus}", f"{int(salary_val * 0.7 * 12 * 25 * (1.06 ** max(5, 60 - age_val))):,}")
    answer = answer.replace("{epf_projection}", f"{int(salary_val * 0.12 * 12 * max(5, 60 - age_val) * 1.5):,}")
    answer = answer.replace("{ppf_projection}", f"{int(150000 * max(5, 60 - age_val) * 0.6):,}")
    answer = answer.replace("{other_investments}", f"{int(amount_val * 1.5):,}")
    answer = answer.replace("{gap_amount}", f"{int(salary_val * 100):,}")
    answer = answer.replace("{monthly_sip}", f"{int(salary_val * 0.15):,}")
    answer = answer.replace("{allocation}", "60% equity, 30% debt, 10% gold")
    
    # Fill remaining placeholders with reasonable defaults
    answer = answer.replace("{rate}", random.choice(_RATES))
    answer = answer.replace("{emi}", f"{int(amount_val * 0.02):,}")
    answer = answer.replace("{dti}", str(random.randint(20, 60)))
    answer = answer.replace("{strategy}", random.choice(["Avalanche", "Snowball"]))
    answer = answer.replace("{repayment_plan}", "Focus on highest-interest debt first while making minimum payments on others.")
    answer = answer.replace("{current_timeline}", f"{random.randint(24, 60)} months")
    answer = answer.replace("{optimized_timeline}", f"{random.randint(12, 36)} months")
    answer = answer.replace("{interest_saved}", f"{int(amount_val * 0.15):,}")
    answer = answer.replace("{min_ef}", f"{int(salary_val * 3):,}")
    answer = answer.replace("{ideal_ef}", f"{int(salary_val * 6):,}")
    answer = answer.replace("{max_ef}", f"{int(salary_val * 12):,}")
    answer = answer.replace("{monthly_ef}", f"{int(salary_val * 0.1):,}")
    answer = answer.replace("{term_cover}", f"{int(salary_val * 12 * 15):,}")
    answer = answer.replace("{term_premium}", f"{int(salary_val * 0.3):,}")
    answer = answer.replace("{health_cover}", f"{int(min(salary_val * 1.5, 2000000)):,}")
    answer = answer.replace("{topup_cover}", f"{int(min(salary_val * 5, 5000000)):,}")
    answer = answer.replace("{total_health_cover}", f"{int(min(salary_val * 6.5, 7000000)):,}")
    answer = answer.replace("{health_premium}", f"{int(salary_val * 0.24):,}")
    answer = answer.replace("{prepay_amount}", f"{int(amount_val * 0.1):,}")
    answer = answer.replace("{interest_cost}", f"₹{int(amount_val * 0.3):,}")
    answer = answer.replace("{emi_analysis}", f"₹{int(amount_val * 0.02):,}/month ({int(amount_val * 0.02 / salary_val * 100)}% of income)")
    answer = answer.replace("{main_recommendation}", "Focus on reducing high-interest debt first while maintaining essential investments.")
    answer = answer.replace("{prepay_strategy}", "Lump sum prepayment at year-end with bonus")
    
    # Fill numbered placeholders
    for key in ["reason1", "reason2", "reason3", "step1", "step2", "step3",
                 "action1", "action2", "action3", "consideration1", "consideration2",
                 "consideration3", "tip1", "tip2"]:
        answer = answer.replace("{" + key + "}", _get_financial_tip(key, template["category"]))
    
    # Fill remaining investment-specific
    answer = answer.replace("{equity_rec}", "Nifty 50 index fund + mid-cap fund via SIP")
    answer = answer.replace("{debt_rec}", "Liquid fund for short-term, gilt fund for long-term")
    answer = answer.replace("{conservative_return}", str(random.choice([7, 8, 9])))
    answer = answer.replace("{moderate_return}", str(random.choice([10, 11, 12])))
    answer = answer.replace("{aggressive_return}", str(random.choice([13, 14, 15])))
    
    # Tax specifics
    answer = answer.replace("{ppf_amount}", f"{random.choice([50000, 100000, 150000]):,}")
    answer = answer.replace("{elss_amount}", f"{random.choice([50000, 100000, 150000]):,}")
    answer = answer.replace("{insurance_amount}", f"{random.choice([15000, 25000, 50000]):,}")
    answer = answer.replace("{regime_comparison}", "For most salaried employees with deductions > ₹3.75L, old regime saves more.")
    
    return {
        "query": question,
        "response": answer,
        "category": template["category"],
    }


def _get_financial_tip(key: str, category: str) -> str:
    """Return contextual financial tips."""
    tips = {
        "budgeting": [
            "Track every expense for 30 days to understand spending patterns",
            "Use auto-debit for investments on salary day (pay yourself first)",
            "Review and cancel unused subscriptions quarterly",
            "Meal planning saves 20-30% on food expenses",
            "Use UPI cashback offers but don't overspend",
        ],
        "investment": [
            "Start with index funds for their low cost and diversification",
            "Never time the market - SIP gives rupee cost averaging",
            "Diversify across asset classes (equity, debt, gold, real estate)",
            "Review portfolio annually, not daily",
            "Tax efficiency matters - use ELSS, LTCG exemption",
        ],
        "tax": [
            "Invest in ELSS for 80C benefit with shortest 3-year lock-in",
            "Claim HRA if paying rent - even without rent receipts for <₹3000/month",
            "NPS gives additional ₹50,000 deduction under 80CCD(1B)",
            "Health insurance premium deduction under 80D applies to parents too",
            "Don't buy insurance just for tax saving - buy term + invest rest",
        ],
        "loans": [
            "Compare loan offers from at least 3 banks before applying",
            "Floating rate is better in falling interest rate environment",
            "Part-prepayment after each salary hike saves lakhs in interest",
            "Keep EMI-to-income ratio below 40% for healthy finances",
            "Check processing fees, hidden charges before signing",
        ],
        "retirement": [
            "Start early - ₹5000/month SIP from age 25 gives ₹5.2Cr at 60",
            "Increase SIP by 10% yearly to beat inflation",
            "Don't withdraw EPF when changing jobs",
            "NPS gives tax benefit but has lock-in till 60",
            "Create multiple income streams for retirement security",
        ],
        "insurance": [
            "Buy term insurance = 15-20x annual income",
            "Health insurance: minimum ₹10L cover for metro cities",
            "Super top-up is cost-effective way to increase cover",
            "Never mix insurance with investment (avoid ULIPs/endowment)",
            "Buy insurance before age 30 for lowest premiums",
        ],
        "debt": [
            "Credit card debt at 36-42% is the most expensive debt",
            "Balance transfer can save interest but watch the fee",
            "Debt avalanche method saves most interest overall",
            "Negotiate with banks for lower interest rates",
            "Track debt-to-income ratio monthly to gauge progress",
        ],
        "emergency_fund": [
            "Build emergency fund before aggressive investing",
            "Liquid funds give better returns than savings account with T+1 liquidity",
            "Automate emergency fund contributions via SIP",
            "Review and increase emergency fund when expenses change",
            "Don't invest emergency fund in stocks or volatile assets",
        ],
    }
    category_tips = tips.get(category, tips["budgeting"])
    return random.choice(category_tips)


def generate_llm_data(config: DataGenConfig) -> List[Dict]:
    """Generate LLM fine-tuning Q&A dataset."""
    logger.info("Generating LLM fine-tuning data...")
    data = []
    seen_queries = set()
    
    while len(data) < config.llm_qa_pairs:
        template = random.choice(LLM_QA_TEMPLATES)
        pair = _generate_llm_qa_pair(template)
        
        query_hash = hashlib.md5(pair["query"].encode()).hexdigest()
        if query_hash not in seen_queries:
            seen_queries.add(query_hash)
            data.append(pair)
    
    # Distribution check
    cat_dist = defaultdict(int)
    for d in data:
        cat_dist[d["category"]] += 1
    logger.info(f"Generated {len(data)} LLM Q&A pairs. Distribution: {dict(cat_dist)}")
    
    return data


# ============================================================
# Master Generator
# ============================================================

def generate_all_synthetic_data(config: DataGenConfig = None) -> Dict[str, str]:
    """
    Generate all synthetic datasets and save to disk.
    
    Returns dict of dataset_name -> file_path.
    """
    config = config or DataGenConfig()
    output_dir = SYNTHETIC_DATA_DIR
    output_dir.mkdir(parents=True, exist_ok=True)
    
    paths = {}
    
    # 1. Intent data
    intent_data = generate_intent_data(config)
    intent_path = output_dir / "intent_training_data.json"
    with open(intent_path, "w", encoding="utf-8") as f:
        json.dump(intent_data, f, indent=2, ensure_ascii=False)
    paths["intent"] = str(intent_path)
    logger.info(f"Saved {len(intent_data)} intent samples to {intent_path}")
    
    # 2. NER data
    ner_data = generate_ner_data(config)
    ner_path = output_dir / "ner_training_data.json"
    with open(ner_path, "w", encoding="utf-8") as f:
        json.dump(ner_data, f, indent=2, ensure_ascii=False)
    paths["ner"] = str(ner_path)
    logger.info(f"Saved {len(ner_data)} NER samples to {ner_path}")
    
    # 3. Transaction data
    txn_data = generate_transaction_data(config)
    txn_path = output_dir / "transactions_training_data.json"
    with open(txn_path, "w", encoding="utf-8") as f:
        json.dump(txn_data, f, indent=2, ensure_ascii=False)
    paths["transactions"] = str(txn_path)
    logger.info(f"Saved {len(txn_data)} transactions to {txn_path}")
    
    # 4. Credit data
    credit_data = generate_credit_data(config)
    credit_path = output_dir / "credit_applications_training_data.json"
    with open(credit_path, "w", encoding="utf-8") as f:
        json.dump(credit_data, f, indent=2, ensure_ascii=False)
    paths["credit"] = str(credit_path)
    logger.info(f"Saved {len(credit_data)} credit applications to {credit_path}")
    
    # 5. LLM Q&A data
    llm_data = generate_llm_data(config)
    # Save as JSONL for LLM training
    llm_jsonl_path = output_dir / "llm_finetuning_data.jsonl"
    with open(llm_jsonl_path, "w", encoding="utf-8") as f:
        for item in llm_data:
            entry = {
                "instruction": "You are a financial advisor specializing in Indian personal finance. "
                              "Provide detailed, helpful advice using Indian financial instruments and tax laws.",
                "input": item["query"],
                "output": item["response"],
            }
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    paths["llm_jsonl"] = str(llm_jsonl_path)
    
    # Also save as JSON for easy viewing
    llm_json_path = output_dir / "llm_finetuning_data.json"
    with open(llm_json_path, "w", encoding="utf-8") as f:
        json.dump(llm_data, f, indent=2, ensure_ascii=False)
    paths["llm_json"] = str(llm_json_path)
    logger.info(f"Saved {len(llm_data)} LLM Q&A pairs to {llm_jsonl_path}")
    
    # Summary
    logger.info("=" * 60)
    logger.info("SYNTHETIC DATA GENERATION COMPLETE")
    logger.info("=" * 60)
    logger.info(f"Intent samples:  {len(intent_data)}")
    logger.info(f"NER samples:     {len(ner_data)}")
    logger.info(f"Transactions:    {len(txn_data)}")
    logger.info(f"Credit apps:     {len(credit_data)}")
    logger.info(f"LLM Q&A pairs:   {len(llm_data)}")
    logger.info(f"Output dir:      {output_dir}")
    logger.info("=" * 60)
    
    return paths


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    generate_all_synthetic_data()
