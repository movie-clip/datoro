"""
Ticker Handler - Business Logic

Handles ticker checking, validation, and generation workflows.
Separates business logic from UI presentation.
"""

import time
from typing import List, Tuple, Optional, Dict, Any
from services import bundle_service, ollama_service, fmp_service
from utils.validators import parse_tickers, validate_ticker
from utils.state import StateManager


class TickerChecker:
    """Handles ticker validation and status checking."""
    
    def __init__(self, bundle: Dict[str, Any]):
        """
        Initialize ticker checker.
        
        Args:
            bundle: Current bundle data
        """
        self.bundle = bundle
    
    def check_tickers(self, input_text: str) -> Tuple[List[str], List[str], Dict[str, Any]]:
        """
        Check and validate tickers from input text.
        
        Args:
            input_text: Raw ticker input
            
        Returns:
            Tuple of (valid_tickers, invalid_tickers, ticker_info)
        """
        # Reset ticker state
        StateManager.reset_ticker_state()
        
        # Parse tickers
        tickers = parse_tickers(input_text)
        
        if not tickers:
            return [], [], {}
        
        valid_tickers = []
        invalid_tickers = []
        ticker_info = {}
        
        for ticker in tickers:
            is_valid, error_msg = validate_ticker(ticker)
            
            if not is_valid:
                invalid_tickers.append(ticker)
                StateManager.add_ticker_status(ticker, 'invalid', error=error_msg)
                ticker_info[ticker] = {'status': 'invalid', 'error': error_msg}
            else:
                exists = bundle_service.ticker_exists(self.bundle, ticker)
                
                if exists:
                    StateManager.add_ticker_status(
                        ticker,
                        'exists',
                        data=self.bundle.get(ticker)
                    )
                    ticker_info[ticker] = {
                        'status': 'exists',
                        'data': self.bundle.get(ticker)
                    }
                else:
                    StateManager.add_ticker_status(ticker, 'new')
                    ticker_info[ticker] = {'status': 'new'}
                
                valid_tickers.append(ticker)
        
        return valid_tickers, invalid_tickers, ticker_info


class InsightGenerator:
    """Handles AI insight generation workflow."""
    
    def __init__(self, bundle: Dict[str, Any]):
        """
        Initialize insight generator.
        
        Args:
            bundle: Current bundle data
        """
        self.bundle = bundle
    
    def generate_for_ticker(
        self,
        ticker: str,
        on_status_update: Optional[callable] = None
    ) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        Generate insights for a single ticker.
        
        Args:
            ticker: Ticker symbol
            on_status_update: Callback for status updates (message: str) -> None
            
        Returns:
            Tuple of (success, insights, error_message)
        """
        try:
            # Fetch FMP data
            if on_status_update:
                on_status_update("📊 Fetching company data from FMP...")
            
            company_data = fmp_service.enrich_company_data(ticker)
            company_name = (
                company_data.get('company_name', ticker)
                if company_data.get('has_data')
                else ticker
            )
            
            # Generate insights with AI
            if on_status_update:
                on_status_update("🤖 Generating insights with Ollama...")
            
            insights = ollama_service.generate_insights(
                ticker,
                company_name,
                company_data if company_data.get('has_data') else None
            )
            
            if not insights:
                return False, None, "No insights returned"
            
            # Save to bundle
            self.bundle = bundle_service.add_ticker(
                self.bundle,
                ticker,
                insights['advantages'],
                insights['risks']
            )
            bundle_service.save_bundle(self.bundle)
            
            if on_status_update:
                on_status_update(f"✅ Saved {ticker} to bundle!")
            
            return True, insights, None
        
        except Exception as e:
            error_msg = str(e)
            if on_status_update:
                on_status_update(f"❌ Error: {error_msg}")
            return False, None, error_msg
    
    def generate_batch(
        self,
        tickers: List[str],
        delay_between: int = 3,
        on_ticker_start: Optional[callable] = None,
        on_ticker_complete: Optional[callable] = None,
        on_ticker_failed: Optional[callable] = None,
        on_progress_update: Optional[callable] = None
    ) -> Tuple[int, List[Tuple[str, str]]]:
        """
        Generate insights for multiple tickers.
        
        Args:
            tickers: List of ticker symbols
            delay_between: Delay between tickers in seconds
            on_ticker_start: Callback when starting ticker (ticker, current, total)
            on_ticker_complete: Callback when ticker succeeds (ticker, insights)
            on_ticker_failed: Callback when ticker fails (ticker, error)
            on_progress_update: Callback for progress (current, total)
            
        Returns:
            Tuple of (success_count, failed_tickers)
        """
        success_count = 0
        failed_tickers = []
        total = len(tickers)
        
        for i, ticker in enumerate(tickers):
            current = i + 1
            
            # Notify start
            if on_ticker_start:
                on_ticker_start(ticker, current, total)
            
            # Generate insights
            def status_callback(msg):
                """Pass through status updates."""
                pass  # Status handled by on_ticker_start/complete/failed
            
            success, insights, error = self.generate_for_ticker(
                ticker,
                on_status_update=status_callback
            )
            
            # Handle result
            if success:
                success_count += 1
                StateManager.increment_generated()
                if on_ticker_complete:
                    on_ticker_complete(ticker, insights)
            else:
                failed_tickers.append((ticker, error))
                StateManager.add_failed_ticker(ticker, error)
                if on_ticker_failed:
                    on_ticker_failed(ticker, error)
            
            # Update progress
            if on_progress_update:
                on_progress_update(current, total)
            
            # Delay between tickers (except last one)
            if current < total:
                time.sleep(delay_between)
        
        return success_count, failed_tickers


class BundleManager:
    """Handles bundle operations."""
    
    @staticmethod
    def load_bundle() -> Dict[str, Any]:
        """Load the current bundle."""
        return bundle_service.load_bundle()
    
    @staticmethod
    def get_stats() -> Dict[str, Any]:
        """Get bundle statistics."""
        return bundle_service.get_bundle_stats()
    
    @staticmethod
    def copy_to_main_project(create_backup: bool = True) -> bool:
        """
        Copy bundle to main project.
        
        Args:
            create_backup: Whether to create backup
            
        Returns:
            True if successful
        """
        return bundle_service.copy_to_main_project(create_backup=create_backup)
    
    @staticmethod
    def ticker_exists(bundle: Dict[str, Any], ticker: str) -> bool:
        """Check if ticker exists in bundle."""
        return bundle_service.ticker_exists(bundle, ticker)


# Convenience exports
__all__ = [
    'TickerChecker',
    'InsightGenerator',
    'BundleManager'
]
