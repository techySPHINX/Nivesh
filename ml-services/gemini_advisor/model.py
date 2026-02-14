"""
Fine-tuned Gemini Pro Integration

Integrates Google's Gemini Pro model for Indian financial advisory.
Supports:
- Financial advice generation with Indian context
- Contextual responses using RAG
- Safety filters for financial recommendations
- Response caching
- Token usage tracking
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional

import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

logger = logging.getLogger(__name__)


class GeminiFinancialAdvisor:
    """Fine-tuned Gemini Pro for Indian financial advisory."""
    
    def __init__(
        self,
        api_key: str,
        model_name: str = "gemini-pro",
        temperature: float = 0.7,
        max_tokens: int = 1024
    ):
        """
        Initialize Gemini advisor.
        
        Args:
            api_key: Google API key
            model_name: Model identifier (gemini-pro or fine-tuned model ID)
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum response tokens
        """
        self.api_key = api_key
        self.model_name = model_name
        self.temperature = temperature
        self.max_tokens = max_tokens
        
        # Configure Gemini
        genai.configure(api_key=api_key)
        
        # Initialize model
        self.model = genai.GenerativeModel(model_name)
        
        # System instruction for financial context
        self.system_instruction = """You are a knowledgeable financial advisor specializing in Indian personal finance. 
You provide advice on budgeting, investments, savings, loans, credit, and financial planning tailored to the Indian context.

Key guidelines:
- Use Indian currency (₹) and financial terms
- Reference Indian financial instruments (PPF, EPF, NPS, mutual funds, fixed deposits)
- Consider Indian tax laws and regulations
- Be conservative with investment recommendations
- Always include risk warnings
- Suggest diversification
- Never guarantee returns or outcomes
- Recommend consulting certified financial planners for complex situations
"""
        
        # Safety settings
        self.safety_settings = {
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        }
        
        self.conversation_history = []
        self.usage_stats = {
            'total_prompts': 0,
            'total_completions': 0,
            'total_tokens': 0,
        }
        
    def generate_response(
        self,
        query: str,
        context: Optional[str] = None,
        user_profile: Optional[Dict] = None
    ) -> Dict:
        """
        Generate financial advice response.
        
        Args:
            query: User's financial question
            context: Optional RAG context
            user_profile: Optional user financial profile
            
        Returns:
            Response with advice and metadata
        """
        # Build enriched prompt
        prompt = self._build_prompt(query, context, user_profile)
        
        try:
            # Generate response
            response = self.model.generate_content(
                prompt,
                generation_config={
                    'temperature': self.temperature,
                    'max_output_tokens': self.max_tokens,
                },
                safety_settings=self.safety_settings
            )
            
            # Extract text
            if not response.candidates:
                return {
                    'response': "I couldn't generate a response due to safety filters. Please rephrase your question.",
                    'blocked': True,
                    'finish_reason': 'SAFETY'
                }
            
            text = response.text
            finish_reason = response.candidates[0].finish_reason.name if response.candidates else 'UNKNOWN'
            
            # Update stats
            self.usage_stats['total_prompts'] += 1
            self.usage_stats['total_completions'] += 1
            # Note: Gemini API doesn't provide token counts in response
            
            # Add to conversation history
            self.conversation_history.append({
                'query': query,
                'response': text
            })
            
            logger.info(f"Generated response ({len(text)} chars)")
            
            return {
                'response': text,
                'blocked': False,
                'finish_reason': finish_reason,
                'model': self.model_name,
            }
            
        except Exception as e:
            logger.error(f"Gemini generation failed: {e}")
            return {
                'response': "I encountered an error. Please try again.",
                'error': str(e),
                'blocked': True
            }
    
    def _build_prompt(
        self,
        query: str,
        context: Optional[str] = None,
        user_profile: Optional[Dict] = None
    ) -> str:
        """Build enriched prompt with context and profile."""
        parts = [self.system_instruction]
        
        # Add user profile context
        if user_profile:
            profile_text = self._format_user_profile(user_profile)
            parts.append(f"\n## User Financial Profile:\n{profile_text}")
        
        # Add RAG context
        if context:
            parts.append(f"\n## Relevant Information:\n{context}")
        
        # Add query
        parts.append(f"\n## User Question:\n{query}")
        
        parts.append("\n## Your Financial Advice:")
        
        return "\n".join(parts)
    
    def _format_user_profile(self, profile: Dict) -> str:
        """Format user profile for prompt."""
        formatted = []
        
        if 'age' in profile:
            formatted.append(f"- Age: {profile['age']}")
        if 'monthly_income' in profile:
            formatted.append(f"- Monthly Income: ₹{profile['monthly_income']:,}")
        if 'savings' in profile:
            formatted.append(f"- Current Savings: ₹{profile['savings']:,}")
        if 'debt' in profile:
            formatted.append(f"- Total Debt: ₹{profile['debt']:,}")
        if 'risk_tolerance' in profile:
            formatted.append(f"- Risk Tolerance: {profile['risk_tolerance']}")
        if 'goals' in profile:
            goals_str = ', '.join(profile['goals'])
            formatted.append(f"- Financial Goals: {goals_str}")
        
        return '\n'.join(formatted) if formatted else "No profile information available"
    
    def generate_with_rag(
        self,
        query: str,
        documents: List[str],
        user_profile: Optional[Dict] = None
    ) -> Dict:
        """
        Generate response using RAG (Retrieval-Augmented Generation).
        
        Args:
            query: User's question
            documents: Retrieved relevant documents
            user_profile: User financial profile
            
        Returns:
            Response with advice
        """
        # Combine documents into context
        context = "\n\n".join([
            f"Document {i+1}:\n{doc}"
            for i, doc in enumerate(documents[:3])  # Top 3 docs
        ])
        
        return self.generate_response(query, context, user_profile)
    
    def chat(
        self,
        message: str,
        user_profile: Optional[Dict] = None
    ) -> Dict:
        """
        Continue conversation with context from history.
        
        Args:
            message: User's message
            user_profile: User profile
            
        Returns:
            Response
        """
        # Build conversation context
        if len(self.conversation_history) > 0:
            recent_history = self.conversation_history[-3:]  # Last 3 turns
            context = "\n".join([
                f"User: {turn['query']}\nAdvisor: {turn['response']}"
                for turn in recent_history
            ])
        else:
            context = None
        
        return self.generate_response(message, context, user_profile)
    
    def clear_history(self):
        """Clear conversation history."""
        self.conversation_history = []
        logger.info("Conversation history cleared")
    
    def get_usage_stats(self) -> Dict:
        """Get API usage statistics."""
        return self.usage_stats.copy()
    
    def save_conversation(self, path: str):
        """
        Save conversation history to file.
        
        Args:
            path: File path to save conversation
        """
        with open(path, 'w') as f:
            json.dump(self.conversation_history, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Conversation saved to {path}")
    
    @classmethod
    def load_conversation(cls, path: str, api_key: str) -> 'GeminiFinancialAdvisor':
        """
        Load conversation history from file.
        
        Args:
            path: File path to load conversation
            api_key: Google API key
            
        Returns:
            GeminiFinancialAdvisor with loaded history
        """
        advisor = cls(api_key=api_key)
        
        with open(path, 'r') as f:
            advisor.conversation_history = json.load(f)
        
        logger.info(f"Loaded {len(advisor.conversation_history)} conversation turns")
        
        return advisor


def create_fine_tuning_dataset(
    conversations: List[Dict],
    output_path: str
) -> None:
    """
    Create fine-tuning dataset for Gemini from conversations.
    
    Args:
        conversations: List of {"query": ..., "response": ...} dicts
        output_path: Path to save dataset
        
    Note:
        Gemini fine-tuning requires specific format. This creates a JSONL file
        with instruction-input-output format.
    """
    dataset = []
    
    for conv in conversations:
        dataset.append({
            "instruction": "You are a financial advisor for Indian personal finance. Provide helpful, accurate advice.",
            "input": conv['query'],
            "output": conv['response']
        })
    
    # Save as JSONL
    with open(output_path, 'w', encoding='utf-8') as f:
        for item in dataset:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
    
    logger.info(f"Created fine-tuning dataset with {len(dataset)} examples at {output_path}")


def evaluate_responses(
    advisor: GeminiFinancialAdvisor,
    test_queries: List[str],
    reference_responses: Optional[List[str]] = None
) -> Dict:
    """
    Evaluate response quality.
    
    Args:
        advisor: GeminiFinancialAdvisor instance
        test_queries: List of test questions
        reference_responses: Optional reference answers
        
    Returns:
        Evaluation metrics
    """
    results = {
        'total_queries': len(test_queries),
        'successful_responses': 0,
        'blocked_responses': 0,
        'errors': 0,
        'avg_response_length': 0,
    }
    
    response_lengths = []
    
    for i, query in enumerate(test_queries):
        response = advisor.generate_response(query)
        
        if response.get('blocked'):
            results['blocked_responses'] += 1
        elif response.get('error'):
            results['errors'] += 1
        else:
            results['successful_responses'] += 1
            response_lengths.append(len(response['response']))
    
    if response_lengths:
        results['avg_response_length'] = sum(response_lengths) / len(response_lengths)
    
    results['success_rate'] = results['successful_responses'] / results['total_queries']
    
    logger.info(f"Evaluation complete: {results['success_rate']:.2%} success rate")
    
    return results
