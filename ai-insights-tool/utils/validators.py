"""
Validation and Parsing Utilities

Handles ticker validation and input parsing.
"""

import re
from typing import List, Tuple


def parse_tickers(input_text: str) -> List[str]:
    """
    Parse ticker input (comma or newline separated).
    
    Args:
        input_text: Raw input from text area
        
    Returns:
        list: Cleaned and validated ticker symbols
        
    Example:
        >>> parse_tickers("AAPL, MSFT\\nGOOGL")
        ['AAPL', 'MSFT', 'GOOGL']
    """
    if not input_text:
        return []
    
    # Split by comma or newline
    tickers = re.split(r'[,\n\s]+', input_text)
    
    # Clean and filter
    tickers = [t.strip().upper() for t in tickers if t.strip()]
    
    # Remove duplicates while preserving order
    seen = set()
    unique_tickers = []
    for ticker in tickers:
        if ticker not in seen:
            seen.add(ticker)
            unique_tickers.append(ticker)
    
    return unique_tickers


def validate_ticker(ticker: str) -> Tuple[bool, str]:
    """
    Validate ticker format.
    
    Args:
        ticker: Ticker symbol
        
    Returns:
        tuple: (is_valid, error_message)
        
    Example:
        >>> validate_ticker("AAPL")
        (True, "")
        >>> validate_ticker("TOOLONG")
        (False, "Too long (max 5 characters)")
    """
    if not ticker:
        return False, "Empty ticker"
    
    if len(ticker) > 5:
        return False, "Too long (max 5 characters)"
    
    if not ticker.isalpha():
        return False, "Must contain only letters"
    
    return True, ""


def format_number(value: float, decimals: int = 2) -> str:
    """
    Format number for display.
    
    Args:
        value: Number to format
        decimals: Number of decimal places
        
    Returns:
        Formatted string
        
    Example:
        >>> format_number(1234567.89)
        '1,234,567.89'
    """
    return f"{value:,.{decimals}f}"


def format_currency(value: float, symbol: str = "$") -> str:
    """
    Format currency for display.
    
    Args:
        value: Amount to format
        symbol: Currency symbol
        
    Returns:
        Formatted currency string
        
    Example:
        >>> format_currency(1234.56)
        '$1,234.56'
    """
    return f"{symbol}{format_number(value, 2)}"


def truncate_text(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """
    Truncate text to maximum length.
    
    Args:
        text: Text to truncate
        max_length: Maximum length before truncation
        suffix: Suffix to add if truncated
        
    Returns:
        Truncated text
    """
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix
