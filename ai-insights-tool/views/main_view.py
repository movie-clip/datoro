"""
Main View Module

Handles page layout and composition.
Orchestrates UI components and business logic.
"""

import streamlit as st
from typing import Dict, Any, Optional
from components.ui import (
    TickerInput,
    ActionButtons,
    TickerStatusCard,
    InsightPreview,
    CompanyInfoCard,
    ProgressTracker,
    SummaryMetrics,
    EmptyState
)
from handlers.ticker_handler import TickerChecker, InsightGenerator, BundleManager
from services import ollama_service, fmp_service
from utils.state import StateManager, get_state


class LeftColumn:
    """Handles left column layout (input and controls)."""
    
    def __init__(self, container):
        """Initialize with Streamlit container."""
        self.container = container
    
    def render(
        self,
        on_check_clicked: callable,
        on_generate_clicked: callable,
        show_generate: bool = False,
        generate_count: int = 0
    ) -> tuple[str, bool, bool, bool]:
        """
        Render left column UI.
        
        Returns:
            Tuple of (tickers_input, check_clicked, generate_clicked, force_regenerate)
        """
        with self.container:
            # Title
            st.subheader("Enter Tickers")
            
            # Ticker input
            tickers_input = TickerInput.render()
            
            # Buttons
            check_clicked, generate_clicked = ActionButtons.render_check_generate(
                check_label="🔍 Check Status",
                generate_label=f"🚀 Generate ({generate_count})" if generate_count > 0 else "🚀 Generate",
                generate_disabled=not show_generate
            )
            
            # Force regenerate checkbox
            force_regenerate = st.checkbox(
                "Force regenerate existing",
                help="Regenerate insights even if they already exist"
            )
            
            st.divider()
            
            # Status container (managed externally)
            # This is where check results and generation progress appear
            
            return tickers_input, check_clicked, generate_clicked, force_regenerate


class RightColumn:
    """Handles right column layout (preview and results)."""
    
    def __init__(self, container):
        """Initialize with Streamlit container."""
        self.container = container
    
    def render_empty_state(self) -> None:
        """Render empty state message."""
        with self.container:
            st.subheader("Data Preview")
            EmptyState.render(
                "Enter tickers and click 'Check Status' to begin",
                icon="👈"
            )
    
    def render_preview(self, existing_tickers: list, ticker_statuses: dict) -> None:
        """
        Render preview for existing tickers.
        
        Args:
            existing_tickers: List of ticker symbols that exist
            ticker_statuses: Dictionary of ticker status info
        """
        with self.container:
            st.subheader("Data Preview")
            
            if not existing_tickers:
                EmptyState.render(
                    "No existing data found for checked tickers"
                )
                return
            
            # Dropdown to select ticker
            selected_ticker = st.selectbox(
                "View existing data for:",
                existing_tickers,
                key="preview_selector"
            )
            
            if selected_ticker:
                status_info = ticker_statuses.get(selected_ticker, {})
                ticker_data = status_info.get('data')
                
                if ticker_data:
                    InsightPreview.render_ticker_preview(
                        selected_ticker,
                        ticker_data,
                        show_divider=True
                    )
    
    def render_generation_live(
        self,
        ticker: str,
        company_data: Optional[Dict[str, Any]],
        insights: Optional[Dict[str, Any]]
    ) -> None:
        """
        Render live generation output.
        
        Args:
            ticker: Ticker being processed
            company_data: Company data from FMP
            insights: Generated insights
        """
        with self.container:
            st.markdown(f"### 🔄 Generating: {ticker}")
            
            # Company info
            if company_data and company_data.get('has_data'):
                CompanyInfoCard.render(
                    company_name=company_data.get('company_name', ticker),
                    industry=company_data.get('industry'),
                    sector=company_data.get('sector'),
                    revenue=company_data.get('revenue')
                )
            
            # Show insights if available
            if insights:
                st.divider()
                
                # Advantages
                advantages = insights.get('advantages', [])
                if advantages:
                    InsightPreview.render_insight_list(
                        advantages,
                        "Competitive Advantages",
                        icon="✅",
                        expanded=True
                    )
                
                st.divider()
                
                # Risks
                risks = insights.get('risks', [])
                if risks:
                    InsightPreview.render_insight_list(
                        risks,
                        "Investment Risks",
                        icon="⚠️",
                        expanded=True
                    )


class StatusSection:
    """Handles status display section in left column."""
    
    def __init__(self, container):
        """Initialize with Streamlit container."""
        self.container = container
    
    def render_check_results(
        self,
        valid_tickers: list,
        invalid_tickers: list,
        ticker_info: dict
    ) -> None:
        """
        Render ticker check results.
        
        Args:
            valid_tickers: List of valid tickers
            invalid_tickers: List of invalid tickers
            ticker_info: Dictionary with ticker status info
        """
        with self.container:
            st.write("**Ticker Status:**")
            
            # Show invalid tickers first
            for ticker in invalid_tickers:
                info = ticker_info.get(ticker, {})
                TickerStatusCard.render_error(ticker, info.get('error', 'Invalid'))
            
            # Show valid tickers
            for ticker in valid_tickers:
                info = ticker_info.get(ticker, {})
                if info.get('status') == 'exists':
                    TickerStatusCard.render_success(ticker, "Already in bundle")
                elif info.get('status') == 'new':
                    TickerStatusCard.render_info(ticker, "New ticker")
    
    def render_generation_summary(
        self,
        success_count: int,
        failed_tickers: list,
        auto_copy_enabled: bool = False,
        on_copy_clicked: Optional[callable] = None
    ) -> None:
        """
        Render generation summary.
        
        Args:
            success_count: Number of successful generations
            failed_tickers: List of (ticker, error) tuples
            auto_copy_enabled: Whether auto-copy is enabled
            on_copy_clicked: Callback for manual copy button
        """
        with self.container:
            st.divider()
            SummaryMetrics.render_generation_summary(
                successful=success_count,
                failed=len(failed_tickers),
                failed_details=failed_tickers
            )
            
            # Manual copy button
            if success_count > 0 and not auto_copy_enabled:
                st.divider()
                
                if st.button("📋 Copy to Main Project", use_container_width=True):
                    if on_copy_clicked:
                        on_copy_clicked()


class MainView:
    """Main application view orchestrator."""
    
    def __init__(self):
        """Initialize main view."""
        self.state = get_state()
    
    def render(self) -> None:
        """Render the complete main view."""
        # Load bundle
        bundle = BundleManager.load_bundle()
        
        # Create two-column layout
        left_col, right_col = st.columns([1, 1.5])
        
        # Create column handlers
        left_column = LeftColumn(left_col)
        right_column = RightColumn(right_col)
        
        # Status container in left column (below controls)
        with left_col:
            status_container = st.container()
        
        # Status section handler
        status_section = StatusSection(status_container)
        
        # Render left column
        tickers_input, check_clicked, generate_clicked, force_regenerate = left_column.render(
            on_check_clicked=None,
            on_generate_clicked=None,
            show_generate=bool(self.state.checked_tickers),
            generate_count=len(StateManager.get_tickers_to_process(force_regenerate))
        )
        
        # Handle check button click
        if check_clicked and tickers_input:
            self._handle_check(tickers_input, bundle, status_section)
        
        # Render right column based on state
        if self.state.checked_tickers:
            existing_tickers = StateManager.get_existing_tickers()
            right_column.render_preview(existing_tickers, self.state.ticker_statuses)
        else:
            right_column.render_empty_state()
        
        # Handle generate button click
        if generate_clicked:
            self._handle_generate(
                force_regenerate,
                bundle,
                status_section,
                right_column,
                status_container
            )
    
    def _handle_check(
        self,
        tickers_input: str,
        bundle: dict,
        status_section: StatusSection
    ) -> None:
        """Handle ticker checking logic."""
        checker = TickerChecker(bundle)
        valid_tickers, invalid_tickers, ticker_info = checker.check_tickers(tickers_input)
        
        if not valid_tickers and not invalid_tickers:
            with status_section.container:
                st.warning("No valid tickers entered")
        else:
            status_section.render_check_results(
                valid_tickers,
                invalid_tickers,
                ticker_info
            )
    
    def _handle_generate(
        self,
        force_regenerate: bool,
        bundle: dict,
        status_section: StatusSection,
        right_column: RightColumn,
        status_container
    ) -> None:
        """Handle insight generation logic."""
        # Get tickers to process
        tickers_to_process = StateManager.get_tickers_to_process(force_regenerate)
        
        if not tickers_to_process:
            return
        
        # Check Ollama connection
        if not ollama_service.check_ollama_connection():
            with status_container:
                st.error("❌ Ollama is not running")
                st.code("ollama serve", language="bash")
            return
        
        # Reset generation state
        StateManager.reset_generation_state()
        
        # Create progress tracker
        with status_container:
            progress_tracker = ProgressTracker(len(tickers_to_process))
        
        # Create generator
        generator = InsightGenerator(bundle)
        
        # Process each ticker
        for i, ticker in enumerate(tickers_to_process):
            current = i + 1
            total = len(tickers_to_process)
            
            # Update progress
            progress_tracker.update(current, f"Processing {ticker} ({current}/{total})...")
            
            # Fetch company data
            company_data = fmp_service.enrich_company_data(ticker)
            
            # Generate insights
            success, insights, error = generator.generate_for_ticker(ticker)
            
            # Show live output in right column
            if success:
                right_column.render_generation_live(ticker, company_data, insights)
            
            # Update state
            if success:
                StateManager.increment_generated()
            else:
                StateManager.add_failed_ticker(ticker, error or "Unknown error")
        
        # Complete
        progress_tracker.complete(f"✅ Complete! Processed {self.state.generated_count}/{total}")
        
        # Auto-copy if enabled
        if self.state.auto_copy and self.state.generated_count > 0:
            with status_container:
                with st.spinner("📋 Auto-copying to main project..."):
                    if BundleManager.copy_to_main_project(self.state.create_backup):
                        st.success("✅ Auto-copied to ../public/ai-insights.json")
                    else:
                        st.warning("⚠️ Auto-copy failed")
        
        # Show summary
        status_section.render_generation_summary(
            success_count=self.state.generated_count,
            failed_tickers=self.state.failed_tickers,
            auto_copy_enabled=self.state.auto_copy,
            on_copy_clicked=lambda: self._handle_copy()
        )
    
    def _handle_copy(self) -> None:
        """Handle manual copy to main project."""
        if BundleManager.copy_to_main_project(self.state.create_backup):
            st.success("✅ Copied to ../public/ai-insights.json")
        else:
            st.error("❌ Failed to copy")


# Convenience export
__all__ = ['MainView']
