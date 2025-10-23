"""
Reusable UI Components

Modular, testable UI components following component-based architecture.
Each component is self-contained and reusable.
"""

import streamlit as st
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime


class TickerInput:
    """Component for ticker input with validation."""
    
    @staticmethod
    def render(
        key: str = "ticker_input",
        height: int = 120,
        placeholder: str = "AAPL, MSFT, GOOGL",
        help_text: str = "Enter stock ticker symbols (comma or newline separated)"
    ) -> str:
        """
        Render ticker input text area.
        
        Args:
            key: Unique key for widget
            height: Height of text area in pixels
            placeholder: Placeholder text
            help_text: Help tooltip text
            
        Returns:
            Input text value
        """
        return st.text_area(
            "Ticker symbols",
            height=height,
            placeholder=placeholder,
            help=help_text,
            label_visibility="collapsed",
            key=key
        )


class ActionButtons:
    """Component for action button groups."""
    
    @staticmethod
    def render_check_generate(
        on_check: Optional[Callable] = None,
        on_generate: Optional[Callable] = None,
        check_label: str = "🔍 Check Status",
        generate_label: str = "🚀 Generate",
        generate_disabled: bool = False
    ) -> tuple[bool, bool]:
        """
        Render check and generate buttons side by side.
        
        Args:
            on_check: Callback for check button (optional)
            on_generate: Callback for generate button (optional)
            check_label: Label for check button
            generate_label: Label for generate button
            generate_disabled: Whether generate button is disabled
            
        Returns:
            Tuple of (check_clicked, generate_clicked)
        """
        col_check, col_generate = st.columns([1, 1])
        
        with col_check:
            check_clicked = st.button(check_label, use_container_width=True, key="btn_check")
            if check_clicked and on_check:
                on_check()
        
        with col_generate:
            generate_clicked = st.button(
                generate_label,
                use_container_width=True,
                type="primary",
                disabled=generate_disabled,
                key="btn_generate"
            )
            if generate_clicked and on_generate:
                on_generate()
        
        return check_clicked, generate_clicked


class TickerStatusCard:
    """Component for displaying ticker status."""
    
    @staticmethod
    def render_success(ticker: str, message: str = "Already in bundle") -> None:
        """Render success status."""
        st.success(f"✅ **{ticker}** - {message}")
    
    @staticmethod
    def render_info(ticker: str, message: str = "New ticker") -> None:
        """Render info status."""
        st.info(f"➕ **{ticker}** - {message}")
    
    @staticmethod
    def render_error(ticker: str, error: str) -> None:
        """Render error status."""
        st.error(f"❌ **{ticker}** - {error}")
    
    @staticmethod
    def render_warning(ticker: str, message: str) -> None:
        """Render warning status."""
        st.warning(f"🔄 **{ticker}** - {message}")


class InsightPreview:
    """Component for displaying insights."""
    
    @staticmethod
    def render_insight_list(
        insights: List[Dict[str, str]],
        title: str,
        icon: str = "✅",
        expanded: bool = False
    ) -> None:
        """
        Render a list of insights with expandable cards.
        
        Args:
            insights: List of insights with 'title' and 'description'
            title: Section title
            icon: Icon to display
            expanded: Whether to expand all by default
        """
        st.markdown(f"**{icon} {title}:**")
        for i, insight in enumerate(insights, 1):
            with st.expander(f"{i}. {insight['title']}", expanded=expanded):
                st.write(insight['description'])
    
    @staticmethod
    def render_ticker_preview(
        ticker: str,
        data: Dict[str, Any],
        show_divider: bool = True
    ) -> None:
        """
        Render complete ticker preview with advantages and risks.
        
        Args:
            ticker: Ticker symbol
            data: Ticker data dictionary
            show_divider: Whether to show divider between sections
        """
        st.markdown(f"### {ticker}")
        st.caption(f"Last updated: {data.get('updated', 'N/A')}")
        
        # Advantages
        advantages = data.get('advantages', [])
        if advantages:
            InsightPreview.render_insight_list(
                advantages,
                "Competitive Advantages",
                icon="✅",
                expanded=False
            )
        
        if show_divider:
            st.divider()
        
        # Risks
        risks = data.get('risks', [])
        if risks:
            InsightPreview.render_insight_list(
                risks,
                "Investment Risks",
                icon="⚠️",
                expanded=False
            )


class CompanyInfoCard:
    """Component for displaying company information."""
    
    @staticmethod
    def render(
        company_name: str,
        industry: Optional[str] = None,
        sector: Optional[str] = None,
        revenue: Optional[float] = None,
        show_success: bool = True
    ) -> None:
        """
        Render company information card.
        
        Args:
            company_name: Company name
            industry: Industry classification
            sector: Sector classification
            revenue: Revenue in billions
            show_success: Whether to show success message
        """
        if show_success:
            st.success(f"✅ **{company_name}**")
        else:
            st.markdown(f"**{company_name}**")
        
        if industry or sector:
            col_a, col_b = st.columns(2)
            if industry:
                with col_a:
                    st.caption(f"**Industry:** {industry}")
            if sector:
                with col_b:
                    st.caption(f"**Sector:** {sector}")
        
        if revenue:
            st.caption(f"**Revenue (TTM):** ${revenue}B")


class ProgressTracker:
    """Component for progress tracking."""
    
    def __init__(self, total: int):
        """Initialize progress tracker."""
        self.total = total
        self.progress_bar = st.progress(0)
        self.status_text = st.empty()
    
    def update(self, current: int, message: str) -> None:
        """Update progress."""
        progress = current / self.total if self.total > 0 else 0
        self.progress_bar.progress(progress)
        self.status_text.info(f"🔄 {message}")
    
    def complete(self, message: str = "✅ Complete!") -> None:
        """Mark as complete."""
        self.progress_bar.progress(1.0)
        self.status_text.success(message)
    
    def error(self, message: str) -> None:
        """Show error."""
        self.status_text.error(f"❌ {message}")


class SummaryMetrics:
    """Component for summary metrics display."""
    
    @staticmethod
    def render_generation_summary(
        successful: int,
        failed: int,
        failed_details: Optional[List[tuple]] = None
    ) -> None:
        """
        Render generation summary with metrics.
        
        Args:
            successful: Number of successful generations
            failed: Number of failed generations
            failed_details: List of (ticker, error) tuples
        """
        st.markdown("### 📊 Generation Summary")
        
        col_success, col_failed = st.columns(2)
        
        with col_success:
            st.metric("✅ Successful", successful)
        
        with col_failed:
            st.metric("❌ Failed", failed)
        
        # Show failed tickers
        if failed_details and len(failed_details) > 0:
            st.error("**Failed Tickers:**")
            for ticker, error in failed_details:
                st.write(f"- {ticker}: {error}")
    
    @staticmethod
    def render_bundle_stats(stats: Dict[str, Any]) -> None:
        """
        Render bundle statistics.
        
        Args:
            stats: Dictionary with 'count', 'size_kb', 'last_updated'
        """
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.metric("📊 Total Tickers", stats.get('count', 0))
        
        with col2:
            st.metric("💾 Bundle Size", f"{stats.get('size_kb', 0)} KB")
        
        with col3:
            st.metric("🕒 Last Updated", stats.get('last_updated', 'N/A'))


class EmptyState:
    """Component for empty state messages."""
    
    @staticmethod
    def render(
        message: str,
        icon: str = "ℹ️",
        message_type: str = "info"
    ) -> None:
        """
        Render empty state message.
        
        Args:
            message: Message to display
            icon: Icon to show
            message_type: Type of message ('info', 'warning', 'error')
        """
        full_message = f"{icon} {message}"
        
        if message_type == "info":
            st.info(full_message)
        elif message_type == "warning":
            st.warning(full_message)
        elif message_type == "error":
            st.error(full_message)
        else:
            st.write(full_message)


# Convenience exports
__all__ = [
    'TickerInput',
    'ActionButtons',
    'TickerStatusCard',
    'InsightPreview',
    'CompanyInfoCard',
    'ProgressTracker',
    'SummaryMetrics',
    'EmptyState'
]
