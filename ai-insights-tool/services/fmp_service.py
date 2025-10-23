"""
FMP API Service - Fetch company data from Financial Modeling Prep

Handles company profiles, financial metrics, and key ratios.
"""

import requests
import time
from typing import Dict, Optional
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

FMP_API_KEY = os.getenv('FMP_API_KEY', '')
FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3'

# Retry configuration
MAX_RETRIES = 3
INITIAL_RETRY_DELAY = 1  # seconds
MAX_RETRY_DELAY = 10  # seconds


def _sleep(seconds: float) -> None:
    """Sleep for specified seconds."""
    time.sleep(seconds)


def _make_fmp_request(url: str, retry_count: int = 0) -> Optional[Dict]:
    """
    Make FMP API request with retry logic.
    
    Args:
        url: Full URL with API key
        retry_count: Current retry attempt
        
    Returns:
        dict or None: Response data if successful, None otherwise
    """
    try:
        response = requests.get(url, timeout=10)
        
        # Handle rate limiting
        if response.status_code == 429:
            if retry_count < MAX_RETRIES:
                delay = min(
                    INITIAL_RETRY_DELAY * (2 ** retry_count),
                    MAX_RETRY_DELAY
                )
                print(f"⏳ FMP rate limit hit. Waiting {delay}s... (retry {retry_count + 1}/{MAX_RETRIES})")
                _sleep(delay)
                return _make_fmp_request(url, retry_count + 1)
            else:
                print(f"❌ Max retries exceeded for FMP request")
                return None
        
        # Handle other errors
        if response.status_code != 200:
            print(f"❌ FMP API error: HTTP {response.status_code}")
            return None
        
        data = response.json()
        return data
        
    except requests.exceptions.Timeout:
        print(f"⏳ FMP request timeout")
        if retry_count < MAX_RETRIES:
            delay = INITIAL_RETRY_DELAY * (2 ** retry_count)
            print(f"Retrying in {delay}s...")
            _sleep(delay)
            return _make_fmp_request(url, retry_count + 1)
        return None
        
    except requests.exceptions.ConnectionError:
        print(f"❌ FMP connection error")
        return None
        
    except Exception as e:
        print(f"❌ FMP unexpected error: {e}")
        return None


def get_company_profile(ticker: str) -> Optional[Dict]:
    """
    Fetch company profile from FMP.
    
    Args:
        ticker: Stock ticker symbol
        
    Returns:
        dict or None: Company profile data
    """
    if not FMP_API_KEY:
        print("⚠️  FMP_API_KEY not set")
        return None
    
    url = f"{FMP_BASE_URL}/profile/{ticker.upper()}?apikey={FMP_API_KEY}"
    data = _make_fmp_request(url)
    
    if data and isinstance(data, list) and len(data) > 0:
        return data[0]
    
    return None


def get_key_metrics(ticker: str) -> Optional[Dict]:
    """
    Fetch key metrics from FMP (TTM data).
    
    Args:
        ticker: Stock ticker symbol
        
    Returns:
        dict or None: Key metrics data
    """
    if not FMP_API_KEY:
        print("⚠️  FMP_API_KEY not set")
        return None
    
    url = f"{FMP_BASE_URL}/key-metrics-ttm/{ticker.upper()}?apikey={FMP_API_KEY}"
    data = _make_fmp_request(url)
    
    if data and isinstance(data, list) and len(data) > 0:
        return data[0]
    
    return None


def get_financial_ratios(ticker: str) -> Optional[Dict]:
    """
    Fetch financial ratios from FMP (TTM data).
    
    Args:
        ticker: Stock ticker symbol
        
    Returns:
        dict or None: Financial ratios data
    """
    if not FMP_API_KEY:
        print("⚠️  FMP_API_KEY not set")
        return None
    
    url = f"{FMP_BASE_URL}/ratios-ttm/{ticker.upper()}?apikey={FMP_API_KEY}"
    data = _make_fmp_request(url)
    
    if data and isinstance(data, list) and len(data) > 0:
        return data[0]
    
    return None


def enrich_company_data(ticker: str) -> Dict:
    """
    Fetch and combine all company data for AI prompts.
    
    Args:
        ticker: Stock ticker symbol
        
    Returns:
        dict: Enriched company data with all available metrics
    """
    ticker_upper = ticker.upper()
    
    # Initialize result
    result = {
        'ticker': ticker_upper,
        'company_name': ticker_upper,  # Fallback
        'has_data': False
    }
    
    print(f"📊 Fetching FMP data for {ticker_upper}...")
    
    # Fetch profile
    profile = get_company_profile(ticker_upper)
    if profile:
        result['company_name'] = profile.get('companyName', ticker_upper)
        result['industry'] = profile.get('industry', '')
        result['sector'] = profile.get('sector', '')
        result['description'] = profile.get('description', '')
        result['market_cap'] = profile.get('mktCap', 0)
        result['has_data'] = True
        print(f"  ✅ Profile: {result['company_name']}")
    else:
        print(f"  ⚠️  No profile data")
    
    # Brief delay between requests
    _sleep(0.5)
    
    # Fetch key metrics
    metrics = get_key_metrics(ticker_upper)
    if metrics:
        # Revenue
        revenue_ttm = metrics.get('revenuePerShareTTM', 0)
        shares = metrics.get('numberOfShares', 0)
        if revenue_ttm and shares:
            result['revenue'] = round((revenue_ttm * shares) / 1_000_000_000, 2)  # In billions
        
        # Growth
        result['revenue_growth'] = metrics.get('revenueGrowthTTM', 0)
        if result.get('revenue_growth'):
            result['revenue_growth'] = round(result['revenue_growth'] * 100, 2)
        
        # ROE
        result['roe'] = metrics.get('roeTTM', 0)
        if result.get('roe'):
            result['roe'] = round(result['roe'] * 100, 2)
        
        # P/E Ratio
        result['pe_ratio'] = metrics.get('peRatioTTM', 0)
        if result.get('pe_ratio'):
            result['pe_ratio'] = round(result['pe_ratio'], 2)
        
        print(f"  ✅ Metrics: Revenue ${result.get('revenue', 0)}B, Growth {result.get('revenue_growth', 0)}%")
    else:
        print(f"  ⚠️  No metrics data")
    
    # Brief delay between requests
    _sleep(0.5)
    
    # Fetch ratios
    ratios = get_financial_ratios(ticker_upper)
    if ratios:
        # Profit margin
        result['profit_margin'] = ratios.get('grossProfitMarginTTM', 0)
        if result.get('profit_margin'):
            result['profit_margin'] = round(result['profit_margin'] * 100, 2)
        
        # Debt to equity
        result['debt_to_equity'] = ratios.get('debtEquityRatioTTM', 0)
        if result.get('debt_to_equity'):
            result['debt_to_equity'] = round(result['debt_to_equity'], 2)
        
        print(f"  ✅ Ratios: Margin {result.get('profit_margin', 0)}%, D/E {result.get('debt_to_equity', 0)}")
    else:
        print(f"  ⚠️  No ratios data")
    
    return result


def test_connection() -> bool:
    """
    Test FMP API connection.
    
    Returns:
        bool: True if connected, False otherwise
    """
    if not FMP_API_KEY:
        return False
    
    try:
        url = f"{FMP_BASE_URL}/profile/AAPL?apikey={FMP_API_KEY}"
        response = requests.get(url, timeout=5)
        return response.status_code == 200
    except:
        return False


if __name__ == "__main__":
    # Test the service
    print("Testing FMP Service...")
    
    if test_connection():
        print("✅ FMP API connected\n")
        
        # Test with AAPL
        print("Testing with AAPL...")
        data = enrich_company_data("AAPL")
        
        print(f"\n=== Enriched Data ===")
        print(f"Company: {data.get('company_name', 'N/A')}")
        print(f"Industry: {data.get('industry', 'N/A')}")
        print(f"Sector: {data.get('sector', 'N/A')}")
        print(f"Revenue: ${data.get('revenue', 0)}B")
        print(f"Revenue Growth: {data.get('revenue_growth', 0)}%")
        print(f"Profit Margin: {data.get('profit_margin', 0)}%")
        print(f"P/E Ratio: {data.get('pe_ratio', 0)}")
        print(f"ROE: {data.get('roe', 0)}%")
        print(f"Debt/Equity: {data.get('debt_to_equity', 0)}")
        print(f"Has Data: {data.get('has_data', False)}")
    else:
        print("❌ FMP API not connected")
        print("Check FMP_API_KEY in .env file")
