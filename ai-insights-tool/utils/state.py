"""
State Management Module

Centralized session state management with typed state model.
Follows singleton pattern for Streamlit session state.
"""

import streamlit as st
from typing import Dict, List, Tuple, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class TickerStatus:
    """Represents the status of a single ticker."""
    status: str  # 'new', 'exists', 'invalid'
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@dataclass
class AppState:
    """
    Application state model.
    All app state should be accessed through this class.
    """
    # Generation state
    generated_count: int = 0
    failed_tickers: List[Tuple[str, str]] = field(default_factory=list)
    
    # Ticker checking state
    checked_tickers: List[str] = field(default_factory=list)
    ticker_statuses: Dict[str, TickerStatus] = field(default_factory=dict)
    current_preview_ticker: Optional[str] = None
    
    # Settings state
    ollama_model: str = 'llama3.2'
    temperature: float = 0.7
    max_tokens: int = 400
    retry_attempts: int = 5
    delay_between: int = 3
    auto_copy: bool = False
    create_backup: bool = True
    
    # UI state
    show_settings: bool = False
    last_check_time: Optional[datetime] = None


class StateManager:
    """
    Manages Streamlit session state.
    Provides type-safe access to application state.
    """
    
    STATE_KEY = 'app_state'
    
    @classmethod
    def initialize(cls) -> None:
        """Initialize session state with default values."""
        if cls.STATE_KEY not in st.session_state:
            st.session_state[cls.STATE_KEY] = AppState()
    
    @classmethod
    def get_state(cls) -> AppState:
        """Get the current application state."""
        cls.initialize()
        return st.session_state[cls.STATE_KEY]
    
    @classmethod
    def reset_generation_state(cls) -> None:
        """Reset generation-related state."""
        state = cls.get_state()
        state.generated_count = 0
        state.failed_tickers = []
    
    @classmethod
    def reset_ticker_state(cls) -> None:
        """Reset ticker checking state."""
        state = cls.get_state()
        state.checked_tickers = []
        state.ticker_statuses = {}
        state.current_preview_ticker = None
    
    @classmethod
    def add_ticker_status(cls, ticker: str, status: str, data: Optional[Dict] = None, error: Optional[str] = None) -> None:
        """Add or update ticker status."""
        state = cls.get_state()
        state.ticker_statuses[ticker] = TickerStatus(
            status=status,
            data=data,
            error=error
        )
        if status != 'invalid':
            state.checked_tickers.append(ticker)
    
    @classmethod
    def increment_generated(cls) -> None:
        """Increment successful generation count."""
        state = cls.get_state()
        state.generated_count += 1
    
    @classmethod
    def add_failed_ticker(cls, ticker: str, error: str) -> None:
        """Add a failed ticker."""
        state = cls.get_state()
        state.failed_tickers.append((ticker, error))
    
    @classmethod
    def get_existing_tickers(cls) -> List[str]:
        """Get list of tickers that exist in bundle."""
        state = cls.get_state()
        return [
            ticker for ticker, status in state.ticker_statuses.items()
            if status.status == 'exists'
        ]
    
    @classmethod
    def get_tickers_to_process(cls, force_regenerate: bool = False) -> List[str]:
        """Get list of tickers that need processing."""
        state = cls.get_state()
        result = []
        
        for ticker in state.checked_tickers:
            status_info = state.ticker_statuses.get(ticker)
            if not status_info:
                continue
            
            if status_info.status == 'new':
                result.append(ticker)
            elif status_info.status == 'exists' and force_regenerate:
                result.append(ticker)
        
        return result
    
    @classmethod
    def update_settings(cls, **kwargs) -> None:
        """Update multiple settings at once."""
        state = cls.get_state()
        for key, value in kwargs.items():
            if hasattr(state, key):
                setattr(state, key, value)


# Convenience functions for backward compatibility
def get_state() -> AppState:
    """Get the current application state."""
    return StateManager.get_state()


def initialize_state() -> None:
    """Initialize application state."""
    StateManager.initialize()
