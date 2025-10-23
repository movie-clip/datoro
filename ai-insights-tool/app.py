"""
AI Insights Generator - Main Streamlit Application

Standalone tool for generating AI insights using local Ollama models and FMP API data.
"""

import streamlit as st
import re
import time
import os
from services import bundle_service, ollama_service, fmp_service

# Page configuration
st.set_page_config(
    page_title="AI Insights Generator",
    page_icon="🤖",
    layout="wide"
)

# Initialize session state
if 'generated_count' not in st.session_state:
    st.session_state.generated_count = 0
if 'failed_tickers' not in st.session_state:
    st.session_state.failed_tickers = []

# Initialize settings in session state with defaults
if 'ollama_model' not in st.session_state:
    st.session_state.ollama_model = 'llama3.2'
if 'temperature' not in st.session_state:
    st.session_state.temperature = 0.7
if 'max_tokens' not in st.session_state:
    st.session_state.max_tokens = 400
if 'retry_attempts' not in st.session_state:
    st.session_state.retry_attempts = 5
if 'delay_between' not in st.session_state:
    st.session_state.delay_between = 3
if 'auto_copy' not in st.session_state:
    st.session_state.auto_copy = False
if 'create_backup' not in st.session_state:
    st.session_state.create_backup = True


def parse_tickers(input_text: str) -> list:
    """
    Parse ticker input (comma or newline separated).
    
    Args:
        input_text: Raw input from text area
        
    Returns:
        list: Cleaned and validated ticker symbols
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


def validate_ticker(ticker: str) -> tuple[bool, str]:
    """
    Validate ticker format.
    
    Args:
        ticker: Ticker symbol
        
    Returns:
        tuple: (is_valid, error_message)
    """
    if not ticker:
        return False, "Empty ticker"
    
    if len(ticker) > 5:
        return False, "Too long (max 5 characters)"
    
    if not ticker.isalpha():
        return False, "Must contain only letters"
    
    return True, ""


def display_insight(insight: dict, index: int):
    """Display a single insight with formatting."""
    st.markdown(f"**{index}. {insight['title']}**")
    st.write(insight['description'])
    st.write("")


# ============================================================================
# HEADER
# ============================================================================

st.title("🤖 AI Insights Generator")
st.markdown("Generate AI-powered investment insights using local Ollama models")

# ============================================================================
# SIDEBAR
# ============================================================================

with st.sidebar:
    st.header("📊 Bundle Statistics")
    
    # Load and display current bundle stats
    stats = bundle_service.get_bundle_stats()
    
    col1, col2 = st.columns(2)
    with col1:
        st.metric("Tickers", stats['count'])
    with col2:
        st.metric("Size", f"{stats['size_kb']} KB")
    
    st.caption(f"Last updated: {stats['last_updated']}")
    
    st.divider()
    
    # Ollama connection status
    st.header("🔌 Ollama Status")
    if ollama_service.check_ollama_connection():
        st.success("✅ Connected")
    else:
        st.error("❌ Not connected")
        st.caption("Start Ollama with: `ollama serve`")
    
    st.divider()
    
    # ========================================================================
    # SETTINGS PANELS
    # ========================================================================
    
    # Ollama Settings
    with st.expander("⚙️ Ollama Settings", expanded=False):
        st.subheader("Model Configuration")
        
        # Model selection
        st.session_state.ollama_model = st.selectbox(
            "Model",
            ["llama3.2", "llama3.1", "llama3", "mistral", "mixtral", "codellama"],
            index=["llama3.2", "llama3.1", "llama3", "mistral", "mixtral", "codellama"].index(st.session_state.ollama_model),
            help="Select which Ollama model to use for generation"
        )
        
        # Temperature
        st.session_state.temperature = st.slider(
            "Temperature",
            min_value=0.0,
            max_value=1.0,
            value=st.session_state.temperature,
            step=0.1,
            help="Higher = more creative, Lower = more focused"
        )
        
        # Max tokens
        st.session_state.max_tokens = st.number_input(
            "Max Tokens",
            min_value=100,
            max_value=2000,
            value=st.session_state.max_tokens,
            step=100,
            help="Maximum response length"
        )
        
        st.divider()
        st.subheader("Retry Configuration")
        
        # Retry attempts
        st.session_state.retry_attempts = st.slider(
            "Max Retry Attempts",
            min_value=1,
            max_value=10,
            value=st.session_state.retry_attempts,
            help="Number of retries on failure"
        )
        
        # Delay between tickers
        st.session_state.delay_between = st.slider(
            "Delay Between Tickers (seconds)",
            min_value=1,
            max_value=10,
            value=st.session_state.delay_between,
            help="Wait time between processing multiple tickers"
        )
        
        st.info("💡 Settings are applied immediately")
    
    # FMP API Configuration
    with st.expander("🔑 FMP API Configuration", expanded=False):
        st.subheader("API Connection")
        
        # API key input
        current_api_key = os.getenv("FMP_API_KEY", "")
        api_key_display = "***" + current_api_key[-4:] if len(current_api_key) > 4 else "Not set"
        
        st.text_input(
            "Current API Key",
            value=api_key_display,
            disabled=True,
            help="Configure in .env file"
        )
        
        # Test connection
        if st.button("🔌 Test FMP Connection"):
            with st.spinner("Testing connection..."):
                if fmp_service.test_connection():
                    st.success("✅ FMP API connected!")
                    st.caption("API key is valid and working")
                else:
                    st.error("❌ Connection failed")
                    st.caption("Check your API key in .env file")
        
        st.divider()
        st.subheader("API Information")
        
        # API tier info
        st.caption("**Free Tier:** 300 calls/minute")
        st.caption("**Premium Tier:** 750 calls/minute")
        
        st.info("💡 Configure FMP_API_KEY in .env file")
    
    # Output Path Configuration
    with st.expander("📁 Output Configuration", expanded=False):
        st.subheader("File Paths")
        
        # Output path (display only for now)
        st.text_input(
            "Output Bundle Path",
            value="./output/ai-insights.json",
            disabled=True,
            help="Where to save generated insights"
        )
        
        # Main project path (display only for now)
        st.text_input(
            "Main Project Path",
            value="../public/ai-insights.json",
            disabled=True,
            help="Destination when copying to main project"
        )
        
        st.divider()
        st.subheader("Copy Options")
        
        # Auto-copy toggle
        st.session_state.auto_copy = st.checkbox(
            "Auto-copy to main project",
            value=st.session_state.auto_copy,
            help="Automatically copy bundle after generation"
        )
        
        # Backup toggle
        st.session_state.create_backup = st.checkbox(
            "Create backup before overwriting",
            value=st.session_state.create_backup,
            help="Backup existing file before replacing"
        )
        
        st.info("💡 Paths are relative to ai-insights-tool directory")

# ============================================================================
# MAIN CONTENT
# ============================================================================

# Load existing bundle
bundle = bundle_service.load_bundle()

# Ticker Input Section
st.header("1️⃣ Enter Tickers")

tickers_input = st.text_area(
    "Ticker symbols (comma or newline separated)",
    height=100,
    placeholder="AAPL, MSFT, GOOGL\n\nor\n\nAAPL\nMSFT\nGOOGL",
    help="Enter stock ticker symbols separated by commas or new lines"
)

force_regenerate = st.checkbox(
    "🔄 Force regenerate existing insights",
    help="Regenerate insights even if they already exist in the bundle"
)

# Parse and validate tickers
if tickers_input:
    tickers = parse_tickers(tickers_input)
    
    if tickers:
        st.write(f"**{len(tickers)} ticker(s) to process:**")
        
        # Display ticker status
        valid_tickers = []
        invalid_tickers = []
        
        for ticker in tickers:
            is_valid, error_msg = validate_ticker(ticker)
            
            if not is_valid:
                invalid_tickers.append((ticker, error_msg))
                st.error(f"❌ {ticker} - {error_msg}")
            else:
                exists = bundle_service.ticker_exists(bundle, ticker)
                
                if exists and not force_regenerate:
                    st.info(f"✅ {ticker} - Already exists (will skip)")
                elif exists and force_regenerate:
                    st.warning(f"🔄 {ticker} - Will regenerate")
                    valid_tickers.append(ticker)
                else:
                    st.success(f"➕ {ticker} - New ticker")
                    valid_tickers.append(ticker)
        
        # Filter tickers to process
        tickers_to_process = valid_tickers
        
        st.divider()
        
        # Generation Section
        if tickers_to_process:
            st.header("2️⃣ Generate Insights")
            
            st.write(f"Ready to generate insights for **{len(tickers_to_process)} ticker(s)**")
            
            # Check Ollama connection before allowing generation
            if not ollama_service.check_ollama_connection():
                st.error("❌ Ollama is not running. Please start Ollama before generating insights.")
                st.code("ollama serve")
            else:
                # Generate button
                if st.button("🚀 Generate Insights", type="primary", use_container_width=True):
                    # Reset counters
                    st.session_state.generated_count = 0
                    st.session_state.failed_tickers = []
                    
                    # Progress tracking
                    progress_bar = st.progress(0)
                    status_text = st.empty()
                    
                    # Results containers
                    results_container = st.container()
                    
                    # Process each ticker
                    for i, ticker in enumerate(tickers_to_process):
                        current = i + 1
                        total = len(tickers_to_process)
                        
                        status_text.info(f"🔄 Processing {ticker} ({current}/{total})...")
                        
                        # Create two-column layout for this ticker
                        with results_container:
                            st.subheader(f"📈 {ticker}")
                            
                            col1, col2 = st.columns([1, 2])
                            
                            with col1:
                                st.write("**Status:**")
                                status_placeholder = st.empty()
                                status_placeholder.write("🔄 Fetching company data...")
                            
                            with col2:
                                response_placeholder = st.empty()
                            
                            # Generate insights
                            try:
                                # Fetch FMP data
                                company_data = fmp_service.enrich_company_data(ticker)
                                company_name = company_data.get('company_name', ticker) if company_data.get('has_data') else ticker
                                
                                # Update status
                                with col1:
                                    if company_data.get('has_data'):
                                        status_placeholder.write(f"✅ {company_name}")
                                        # Show enriched data
                                        st.caption(f"**Industry:** {company_data.get('industry', 'N/A')}")
                                        st.caption(f"**Sector:** {company_data.get('sector', 'N/A')}")
                                        if company_data.get('revenue'):
                                            st.caption(f"**Revenue:** ${company_data.get('revenue')}B")
                                    else:
                                        status_placeholder.write(f"⚠️ {ticker} (Limited data)")
                                
                                with response_placeholder:
                                    st.write("**🤖 AI Response:**")
                                    
                                    # Show what we're doing
                                    with st.spinner("Generating competitive advantages..."):
                                        insights = ollama_service.generate_insights(
                                            ticker, 
                                            company_name, 
                                            company_data if company_data.get('has_data') else None
                                        )
                                    
                                    if insights:
                                        # Display advantages
                                        st.write("**Competitive Advantages:**")
                                        for idx, adv in enumerate(insights['advantages'], 1):
                                            display_insight(adv, idx)
                                        
                                        # Display risks
                                        st.write("**Investment Risks:**")
                                        for idx, risk in enumerate(insights['risks'], 1):
                                            display_insight(risk, idx)
                                        
                                        # Save to bundle
                                        bundle = bundle_service.add_ticker(
                                            bundle,
                                            ticker,
                                            insights['advantages'],
                                            insights['risks']
                                        )
                                        
                                        # Save bundle to file
                                        if bundle_service.save_bundle(bundle):
                                            status_placeholder.success("✅ Saved!")
                                            st.session_state.generated_count += 1
                                        else:
                                            status_placeholder.error("❌ Failed to save")
                                            st.session_state.failed_tickers.append((ticker, "Save failed"))
                                    else:
                                        status_placeholder.error("❌ Generation failed")
                                        st.session_state.failed_tickers.append((ticker, "AI generation failed"))
                                        st.error("Failed to generate insights. Check Ollama logs.")
                            
                            except Exception as e:
                                with col1:
                                    status_placeholder.error("❌ Error")
                                st.session_state.failed_tickers.append((ticker, str(e)))
                                with col2:
                                    st.error(f"Error: {e}")
                            
                        
                        st.divider()
                    
                    # Brief delay between tickers (use setting from sidebar)
                    if current < total:
                        time.sleep(st.session_state.delay_between)
                    
                
                # Update progress
                progress_bar.progress(current / total)
                
                # Final status
                status_text.success("✅ All done!")
                progress_bar.progress(1.0)
                
                # Auto-copy if enabled
                if st.session_state.auto_copy and st.session_state.generated_count > 0:
                    with st.spinner("📋 Auto-copying to main project..."):
                        if bundle_service.copy_to_main_project(create_backup=st.session_state.create_backup):
                            st.success("✅ Auto-copied to ../public/ai-insights.json")
                        else:
                            st.warning("⚠️ Auto-copy failed. You can copy manually below.")
                
                # ============================================================================
                # RESULTS SUMMARY
                # ============================================================================
                
                st.divider()
                st.header("3️⃣ Results Summary")
                
                # Success/failure metrics
                success_count = st.session_state.generated_count
                failed_count = len(st.session_state.failed_tickers)
                
                col1, col2, col3 = st.columns(3)
                
                with col1:
                    st.metric("✅ Successful", success_count)
                with col2:
                    st.metric("❌ Failed", failed_count)
                    with col3:
                        st.metric("� Total", len(tickers_to_process))
                    
                    # Failed tickers details
                    if st.session_state.failed_tickers:
                        st.error(f"❌ Failed to process {failed_count} ticker(s):")
                        for ticker, error in st.session_state.failed_tickers:
                            st.write(f"- **{ticker}**: {error}")
                    
                    # Updated bundle stats
                    st.divider()
                    st.subheader("📦 Updated Bundle Statistics")
                    
                    new_stats = bundle_service.get_bundle_stats()
                    
                    col1, col2, col3 = st.columns(3)
                    with col1:
                        st.metric("Total Tickers", new_stats['count'])
                    with col2:
                        st.metric("Bundle Size", f"{new_stats['size_kb']} KB")
                    with col3:
                        st.metric("Last Updated", new_stats['last_updated'])
                    
                    # Download and copy buttons
                    st.divider()
                    
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        # Download button
                        try:
                            with open(bundle_service.OUTPUT_PATH, 'r', encoding='utf-8') as f:
                                bundle_json = f.read()
                            
                            st.download_button(
                                label="📥 Download Bundle",
                                data=bundle_json,
                                file_name="ai-insights.json",
                                mime="application/json",
                                use_container_width=True
                            )
                        except Exception as e:
                            st.error(f"Cannot download: {e}")
                    
                    with col2:
                        # Copy to main project button
                        if st.button("📋 Copy to Main Project", use_container_width=True):
                            if bundle_service.copy_to_main_project(create_backup=True):
                                st.success("✅ Copied to ../public/ai-insights.json")
                            else:
                                st.error("❌ Failed to copy")
        else:
            st.warning("⚠️ All tickers already exist in bundle. Enable 'Force regenerate' to update them.")
    else:
        st.info("👆 Enter ticker symbols above to get started")
else:
    st.info("👆 Enter ticker symbols above to get started")
