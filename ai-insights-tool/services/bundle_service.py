"""
Bundle Service - Manage AI insights JSON bundle

Handles loading, saving, updating, and copying the insights bundle.
"""

import json
import os
import shutil
from datetime import datetime
from typing import Dict, List, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

OUTPUT_PATH = os.getenv('OUTPUT_PATH', './output/ai-insights.json')
MAIN_PROJECT_PATH = os.getenv('MAIN_PROJECT_PATH', '../public/ai-insights.json')


def load_bundle() -> Dict:
    """
    Load existing bundle from output path.
    
    Returns:
        dict: Bundle data or empty dict if file doesn't exist
    """
    if os.path.exists(OUTPUT_PATH):
        try:
            with open(OUTPUT_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            print(f"⚠️  Error loading bundle: {e}")
            return {}
        except Exception as e:
            print(f"⚠️  Error reading bundle file: {e}")
            return {}
    return {}


def save_bundle(bundle: Dict) -> bool:
    """
    Save bundle to output path.
    
    Args:
        bundle: Bundle data to save
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Ensure output directory exists
        os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
        
        # Write bundle
        with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
            json.dump(bundle, f, indent=2, ensure_ascii=False)
        
        return True
    except Exception as e:
        print(f"❌ Error saving bundle: {e}")
        return False


def add_ticker(
    bundle: Dict,
    ticker: str,
    advantages: List[Dict],
    risks: List[Dict],
    provider: str = "ollama"
) -> Dict:
    """
    Add or update ticker insights in bundle.
    
    Args:
        bundle: Existing bundle data
        ticker: Ticker symbol (uppercase)
        advantages: List of advantage objects with title and description
        risks: List of risk objects with title and description
        provider: AI provider name (default: "ollama")
        
    Returns:
        dict: Updated bundle
    """
    ticker_upper = ticker.upper()
    
    bundle[ticker_upper] = {
        "advantages": advantages,
        "risks": risks,
        "updated": datetime.now().strftime("%Y-%m-%d"),
        "provider": provider
    }
    
    return bundle


def ticker_exists(bundle: Dict, ticker: str) -> bool:
    """
    Check if ticker exists in bundle.
    
    Args:
        bundle: Bundle data
        ticker: Ticker symbol
        
    Returns:
        bool: True if ticker exists, False otherwise
    """
    return ticker.upper() in bundle


def get_bundle_stats() -> Dict:
    """
    Get bundle statistics.
    
    Returns:
        dict: Statistics including count, size_kb, last_updated
    """
    if not os.path.exists(OUTPUT_PATH):
        return {
            'count': 0,
            'size_kb': 0,
            'last_updated': 'Never'
        }
    
    try:
        # Get file size
        size_bytes = os.path.getsize(OUTPUT_PATH)
        size_kb = round(size_bytes / 1024, 1)
        
        # Load bundle for count
        bundle = load_bundle()
        count = len(bundle)
        
        # Get last modified time
        mtime = os.path.getmtime(OUTPUT_PATH)
        last_updated = datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M")
        
        return {
            'count': count,
            'size_kb': size_kb,
            'last_updated': last_updated
        }
    except Exception as e:
        print(f"⚠️  Error getting bundle stats: {e}")
        return {
            'count': 0,
            'size_kb': 0,
            'last_updated': 'Error'
        }


def copy_to_main_project(create_backup: bool = True) -> bool:
    """
    Copy bundle from output to main project.
    
    Args:
        create_backup: Whether to create backup before overwriting
        
    Returns:
        bool: True if successful, False otherwise
    """
    if not os.path.exists(OUTPUT_PATH):
        print("❌ Output bundle doesn't exist")
        return False
    
    try:
        # Create backup if requested and target exists
        if create_backup and os.path.exists(MAIN_PROJECT_PATH):
            backup_path = f"{MAIN_PROJECT_PATH}.backup"
            shutil.copy2(MAIN_PROJECT_PATH, backup_path)
            print(f"📦 Created backup: {backup_path}")
        
        # Copy to main project
        shutil.copy2(OUTPUT_PATH, MAIN_PROJECT_PATH)
        print(f"✅ Copied to {MAIN_PROJECT_PATH}")
        
        return True
    except Exception as e:
        print(f"❌ Error copying to main project: {e}")
        return False


def get_ticker_data(bundle: Dict, ticker: str) -> Optional[Dict]:
    """
    Get data for specific ticker.
    
    Args:
        bundle: Bundle data
        ticker: Ticker symbol
        
    Returns:
        dict or None: Ticker data if exists, None otherwise
    """
    return bundle.get(ticker.upper())


def remove_ticker(bundle: Dict, ticker: str) -> Dict:
    """
    Remove ticker from bundle.
    
    Args:
        bundle: Bundle data
        ticker: Ticker symbol
        
    Returns:
        dict: Updated bundle
    """
    ticker_upper = ticker.upper()
    if ticker_upper in bundle:
        del bundle[ticker_upper]
    
    return bundle


if __name__ == "__main__":
    # Test the service
    print("Testing Bundle Service...")
    
    # Load existing bundle
    bundle = load_bundle()
    print(f"Loaded bundle with {len(bundle)} tickers")
    
    # Get stats
    stats = get_bundle_stats()
    print(f"Stats: {stats}")
    
    # Check if ticker exists
    print(f"AAPL exists: {ticker_exists(bundle, 'AAPL')}")
    print(f"TEST exists: {ticker_exists(bundle, 'TEST')}")
