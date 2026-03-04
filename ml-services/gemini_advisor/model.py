"""
Local LLM Financial Advisor

Integration with local LLM models (LLaMA-3-8B-Instruct and Mistral-7B-Instruct)
via Ollama for Indian financial advisory.

Supports:
- Financial advice generation with Indian context
- Contextual responses using RAG
- Dual model support (primary + fallback)
- Response caching
- Token usage tracking
- 100% free & local - no API keys needed
"""

import json
import logging
import os
from typing import Dict, List, Optional

import requests

logger = logging.getLogger(__name__)


class LocalFinancialAdvisor:
    """Local LLM-powered financial advisor for Indian personal finance.
    
    Uses LLaMA-3-8B-Instruct (primary) or Mistral-7B-Instruct (fallback)
    running locally via Ollama. Quantized to 4-bit (Q4_K_M) to fit 8GB VRAM.
    """
    
    # Model presets
    MODELS = {
        'llama3': 'llama3:8b-instruct-q4_K_M',
        'mistral': 'mistral:7b-instruct-q4_K_M',
    }
    
    def __init__(
        self,
        ollama_base_url: Optional[str] = None,
        primary_model: Optional[str] = None,
        fallback_model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ):
        """
        Initialize local financial advisor.
        
        Args:
            ollama_base_url: Ollama server URL (default: http://localhost:11434)
            primary_model: Primary model name (default: llama3:8b-instruct-q4_K_M)
            fallback_model: Fallback model name (default: mistral:7b-instruct-q4_K_M)
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum response tokens
        """
        self.ollama_base_url = ollama_base_url or os.getenv(
            'LLM_OLLAMA_BASE_URL', 'http://localhost:11434'
        )
        self.primary_model = primary_model or os.getenv(
            'LLM_PRIMARY_MODEL', self.MODELS['llama3']
        )
        self.fallback_model = fallback_model or os.getenv(
            'LLM_FALLBACK_MODEL', self.MODELS['mistral']
        )
        self.active_model = self.primary_model
        self.temperature = temperature
        self.max_tokens = max_tokens
        
        # System instruction for financial context
        self.system_instruction = """You are a knowledgeable financial advisor specializing in Indian personal finance. 
You provide advice on budgeting, investments, savings, loans, credit, and financial planning tailored to the Indian context.

Key guidelines:
- Use Indian currency (INR / ₹) and financial terms
- Reference Indian financial instruments (PPF, EPF, NPS, mutual funds, fixed deposits, ELSS)
- Consider Indian tax laws and regulations (Section 80C, 80D, HRA, etc.)
- Be conservative with investment recommendations
- Always include risk warnings
- Suggest diversification across equity, debt, and gold
- Never guarantee returns or outcomes
- Recommend consulting SEBI-registered financial planners for complex situations
"""
        
        self.conversation_history = []
        self.usage_stats = {
            'total_prompts': 0,
            'total_completions': 0,
            'total_tokens': 0,
        }
        
        # Check connectivity
        self._check_ollama_health()
    
    def _check_ollama_health(self) -> bool:
        """Check if Ollama server is available and models are loaded."""
        try:
            response = requests.get(f"{self.ollama_base_url}/api/tags", timeout=5)
            if response.status_code == 200:
                data = response.json()
                available = [m['name'] for m in data.get('models', [])]
                logger.info(f"Ollama connected. Available models: {available}")
                
                if any(m.startswith('llama3') for m in available):
                    self.active_model = self.primary_model
                    logger.info(f"Primary model active: {self.primary_model}")
                elif any(m.startswith('mistral') for m in available):
                    self.active_model = self.fallback_model
                    logger.info(f"Fallback model active: {self.fallback_model}")
                else:
                    logger.warning(
                        "No LLaMA-3 or Mistral models found. "
                        "Run: ollama pull llama3:8b-instruct-q4_K_M"
                    )
                return True
            return False
        except requests.ConnectionError:
            logger.warning(
                f"Ollama not available at {self.ollama_base_url}. "
                "Ensure Ollama is running: https://ollama.ai"
            )
            return False
        except Exception as e:
            logger.warning(f"Ollama health check failed: {e}")
            return False
    
    def _call_ollama(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> Dict:
        """
        Make a request to the Ollama chat API.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model to use (defaults to active_model)
            temperature: Temperature override
            max_tokens: Max tokens override
            
        Returns:
            Response dict from Ollama
        """
        payload = {
            'model': model or self.active_model,
            'messages': messages,
            'stream': False,
            'options': {
                'temperature': temperature or self.temperature,
                'num_predict': max_tokens or self.max_tokens,
                'top_p': 0.9,
                'top_k': 40,
            }
        }
        
        try:
            response = requests.post(
                f"{self.ollama_base_url}/api/chat",
                json=payload,
                timeout=120,
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            if (model or self.active_model) == self.primary_model:
                logger.warning(
                    f"Primary model failed ({e}). Trying fallback: {self.fallback_model}"
                )
                payload['model'] = self.fallback_model
                response = requests.post(
                    f"{self.ollama_base_url}/api/chat",
                    json=payload,
                    timeout=120,
                )
                response.raise_for_status()
                return response.json()
            raise
    
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
        prompt = self._build_prompt(query, context, user_profile)
        
        messages = [
            {'role': 'system', 'content': self.system_instruction},
            {'role': 'user', 'content': prompt},
        ]
        
        try:
            result = self._call_ollama(messages)
            
            text = result.get('message', {}).get('content', '')
            
            if not text:
                return {
                    'response': "I couldn't generate a response. Please rephrase your question.",
                    'blocked': True,
                    'finish_reason': 'EMPTY'
                }
            
            prompt_tokens = result.get('prompt_eval_count', 0)
            completion_tokens = result.get('eval_count', 0)
            self.usage_stats['total_prompts'] += 1
            self.usage_stats['total_completions'] += 1
            self.usage_stats['total_tokens'] += prompt_tokens + completion_tokens
            
            self.conversation_history.append({
                'query': query,
                'response': text
            })
            
            logger.info(
                f"Generated response ({len(text)} chars, "
                f"~{prompt_tokens + completion_tokens} tokens, "
                f"model: {result.get('model', self.active_model)})"
            )
            
            return {
                'response': text,
                'blocked': False,
                'finish_reason': 'stop' if result.get('done') else 'length',
                'model': result.get('model', self.active_model),
                'tokens': {
                    'prompt': prompt_tokens,
                    'completion': completion_tokens,
                    'total': prompt_tokens + completion_tokens,
                }
            }
            
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
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
        parts = []
        
        if user_profile:
            profile_text = self._format_user_profile(user_profile)
            parts.append(f"## User Financial Profile:\n{profile_text}")
        
        if context:
            parts.append(f"## Relevant Information:\n{context}")
        
        parts.append(f"## User Question:\n{query}")
        parts.append("\n## Your Financial Advice:")
        
        return "\n\n".join(parts)
    
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
        context = "\n\n".join([
            f"Document {i+1}:\n{doc}"
            for i, doc in enumerate(documents[:3])
        ])
        
        return self.generate_response(query, context, user_profile)
    
    def chat(
        self,
        message: str,
        user_profile: Optional[Dict] = None
    ) -> Dict:
        """Continue conversation with context from history."""
        if len(self.conversation_history) > 0:
            recent_history = self.conversation_history[-3:]
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
        """Get usage statistics."""
        return self.usage_stats.copy()
    
    def get_active_model(self) -> str:
        """Get the currently active model name."""
        return self.active_model
    
    def switch_model(self, model_key: str):
        """Switch active model. Use 'llama3' or 'mistral'."""
        if model_key in self.MODELS:
            self.active_model = self.MODELS[model_key]
            logger.info(f"Switched to model: {self.active_model}")
        else:
            logger.warning(f"Unknown model key: {model_key}. Use 'llama3' or 'mistral'.")
    
    def save_conversation(self, path: str):
        """Save conversation history to file."""
        with open(path, 'w') as f:
            json.dump(self.conversation_history, f, indent=2, ensure_ascii=False)
        logger.info(f"Conversation saved to {path}")
    
    @classmethod
    def load_conversation(
        cls,
        path: str,
        ollama_base_url: Optional[str] = None,
    ) -> 'LocalFinancialAdvisor':
        """Load conversation history from file."""
        advisor = cls(ollama_base_url=ollama_base_url)
        with open(path, 'r') as f:
            advisor.conversation_history = json.load(f)
        logger.info(f"Loaded {len(advisor.conversation_history)} conversation turns")
        return advisor


# ==========================================
# Backward compatibility aliases
# ==========================================
GeminiFinancialAdvisor = LocalFinancialAdvisor


def create_fine_tuning_dataset(
    conversations: List[Dict],
    output_path: str
) -> None:
    """
    Create fine-tuning dataset from conversations.
    
    Can be used with:
    - Ollama's Modelfile for custom models
    - HuggingFace transformers for LoRA fine-tuning
    - llama.cpp for GGUF training
    """
    dataset = []
    
    for conv in conversations:
        dataset.append({
            "instruction": "You are a financial advisor for Indian personal finance. Provide helpful, accurate advice.",
            "input": conv['query'],
            "output": conv['response']
        })
    
    with open(output_path, 'w', encoding='utf-8') as f:
        for item in dataset:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
    
    logger.info(f"Created fine-tuning dataset with {len(dataset)} examples at {output_path}")


def evaluate_responses(
    advisor: LocalFinancialAdvisor,
    test_queries: List[str],
    reference_responses: Optional[List[str]] = None
) -> Dict:
    """Evaluate response quality."""
    results = {
        'total_queries': len(test_queries),
        'successful_responses': 0,
        'blocked_responses': 0,
        'errors': 0,
        'avg_response_length': 0,
        'model_used': advisor.get_active_model(),
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
    
    results['success_rate'] = results['successful_responses'] / max(results['total_queries'], 1)
    
    logger.info(f"Evaluation complete: {results['success_rate']:.2%} success rate")
    
    return results
