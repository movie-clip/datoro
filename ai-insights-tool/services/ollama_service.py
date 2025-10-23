"""
Ollama Service - Interact with local Ollama AI model

Handles connection, prompt generation, retry logic, and response parsing.
"""

import json
import time
import requests
from typing import Dict, List, Optional, Generator
from dotenv import load_dotenv
import os
from config import prompts

# Load environment variables
load_dotenv()

OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'llama3.2')

# Retry configuration
MAX_RETRIES = 5
INITIAL_RETRY_DELAY = 2  # seconds
MAX_RETRY_DELAY = 60  # seconds


def check_ollama_connection() -> bool:
    """
    Check if Ollama is running and accessible.
    
    Returns:
        bool: True if connected, False otherwise
    """
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        return response.status_code == 200
    except requests.exceptions.RequestException:
        return False


def _sleep(seconds: float) -> None:
    """Sleep for specified seconds."""
    time.sleep(seconds)


def _call_ollama_with_retry(
    prompt: str,
    retry_count: int = 0
) -> Optional[str]:
    """
    Call Ollama API with exponential backoff retry logic.
    
    Args:
        prompt: Prompt to send to Ollama
        retry_count: Current retry attempt (0-indexed)
        
    Returns:
        str or None: Response text if successful, None if failed
    """
    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "num_predict": 400
                }
            },
            timeout=120
        )
        
        # Handle rate limiting and server overload
        if response.status_code in [429, 503]:
            if retry_count < MAX_RETRIES:
                delay = min(
                    INITIAL_RETRY_DELAY * (2 ** retry_count),
                    MAX_RETRY_DELAY
                )
                print(f"⏳ Rate limit/overload (HTTP {response.status_code}). "
                      f"Waiting {delay}s before retry {retry_count + 1}/{MAX_RETRIES}")
                _sleep(delay)
                return _call_ollama_with_retry(prompt, retry_count + 1)
            else:
                print(f"❌ Max retries ({MAX_RETRIES}) exceeded")
                return None
        
        # Handle other errors
        if response.status_code != 200:
            print(f"❌ Ollama error: HTTP {response.status_code}")
            return None
        
        # Parse response
        result = response.json()
        return result.get('response', '')
        
    except requests.exceptions.Timeout:
        print(f"⏳ Request timeout")
        if retry_count < MAX_RETRIES:
            delay = min(
                INITIAL_RETRY_DELAY * (2 ** retry_count),
                MAX_RETRY_DELAY
            )
            print(f"Retrying in {delay}s... ({retry_count + 1}/{MAX_RETRIES})")
            _sleep(delay)
            return _call_ollama_with_retry(prompt, retry_count + 1)
        return None
        
    except requests.exceptions.ConnectionError:
        print(f"❌ Connection error - is Ollama running?")
        return None
        
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return None


def parse_ai_response(raw_response: str) -> Optional[List[Dict]]:
    """
    Parse AI response into structured list of insights.
    
    Expected format:
    [
      {"title": "...", "description": "..."},
      {"title": "...", "description": "..."},
      {"title": "...", "description": "..."}
    ]
    
    Args:
        raw_response: Raw text response from AI
        
    Returns:
        list or None: Parsed insights if valid, None otherwise
    """
    if not raw_response:
        return None
    
    try:
        # Try to find JSON in the response
        # Look for array brackets
        start = raw_response.find('[')
        end = raw_response.rfind(']') + 1
        
        if start == -1 or end == 0:
            print("⚠️  No JSON array found in response")
            return None
        
        json_str = raw_response[start:end]
        insights = json.loads(json_str)
        
        # Validate structure
        if not isinstance(insights, list):
            print("⚠️  Response is not a list")
            return None
        
        for insight in insights:
            if not isinstance(insight, dict):
                print("⚠️  Insight is not a dict")
                return None
            if 'title' not in insight or 'description' not in insight:
                print("⚠️  Insight missing title or description")
                return None
        
        return insights
        
    except json.JSONDecodeError as e:
        print(f"⚠️  JSON parse error: {e}")
        return None
    except Exception as e:
        print(f"⚠️  Error parsing response: {e}")
        return None


def generate_advantages(ticker: str, company_name: str, company_data: Optional[Dict] = None) -> Optional[List[Dict]]:
    """
    Generate competitive advantages for a ticker.
    
    Args:
        ticker: Ticker symbol
        company_name: Company name
        company_data: Optional enriched company data from FMP
        
    Returns:
        list or None: List of advantages if successful, None otherwise
    """
    prompt = prompts.get_advantages_prompt(ticker, company_name, company_data)

    raw_response = _call_ollama_with_retry(prompt)
    if not raw_response:
        return None
    
    return parse_ai_response(raw_response)


def generate_risks(ticker: str, company_name: str, company_data: Optional[Dict] = None) -> Optional[List[Dict]]:
    """
    Generate investment risks for a ticker.
    
    Args:
        ticker: Ticker symbol
        company_name: Company name
        company_data: Optional enriched company data from FMP
        
    Returns:
        list or None: List of risks if successful, None otherwise
    """
    prompt = prompts.get_risks_prompt(ticker, company_name, company_data)

    raw_response = _call_ollama_with_retry(prompt)
    if not raw_response:
        return None
    
    return parse_ai_response(raw_response)


def generate_insights(ticker: str, company_name: str, company_data: Optional[Dict] = None) -> Optional[Dict]:
    """
    Generate both advantages and risks for a ticker.
    
    Args:
        ticker: Ticker symbol
        company_name: Company name
        company_data: Optional enriched company data from FMP
        
    Returns:
        dict or None: Dictionary with 'advantages' and 'risks' keys, or None if failed
    """
    print(f"🤖 Generating advantages for {ticker}...")
    advantages = generate_advantages(ticker, company_name, company_data)
    
    if not advantages:
        print(f"❌ Failed to generate advantages for {ticker}")
        return None
    
    print(f"✅ Generated {len(advantages)} advantages")
    
    # Brief delay between requests
    _sleep(2)
    
    print(f"🤖 Generating risks for {ticker}...")
    risks = generate_risks(ticker, company_name, company_data)
    
    if not risks:
        print(f"❌ Failed to generate risks for {ticker}")
        return None
    
    print(f"✅ Generated {len(risks)} risks")
    
    return {
        'advantages': advantages,
        'risks': risks
    }


if __name__ == "__main__":
    # Test the service
    print("Testing Ollama Service...")
    
    # Check connection
    if check_ollama_connection():
        print("✅ Ollama is running")
        
        # Test generation
        print("\nTesting insight generation for AAPL...")
        insights = generate_insights("AAPL", "Apple Inc.")
        
        if insights:
            print("\n✅ Success!")
            print(f"\nAdvantages ({len(insights['advantages'])}):")
            for adv in insights['advantages']:
                print(f"  - {adv['title']}")
            
            print(f"\nRisks ({len(insights['risks'])}):")
            for risk in insights['risks']:
                print(f"  - {risk['title']}")
        else:
            print("\n❌ Failed to generate insights")
    else:
        print("❌ Ollama is not running")
        print("Start it with: ollama serve")
