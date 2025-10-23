"""
AI Insights Generator - Main Streamlit Application

Standalone tool for generating AI insights using local Ollama models and FMP API data.
"""

import streamlit as st
import re
import time
import os
from services import bundle_service, ollama_service, fmp_service

# Page configuration - Always wide mode, no top padding
st.set_page_config(
    page_title="AI Insights Generator",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS to reduce top padding and improve layout
st.markdown("""
    <style>
        /* Reduce top padding */
        .block-container {
            padding-top: 2rem !important;
            padding-bottom: 1rem !important;
        }
        
        /* Make headers more compact */
        h1 {
            margin-top: 0 !important;
            margin-bottom: 0.5rem !important;
            font-size: 2rem !important;
        }
        
        h2 {
            font-size: 1.2rem !important;
            margin-top: 1rem !important;
            margin-bottom: 0.5rem !important;
        }
        
        h3 {
            font-size: 1rem !important;
            margin-top: 0.5rem !important;
            margin-bottom: 0.3rem !important;
        }
        
        /* Improve button styling */
        .stButton button {
            width: 100%;
        }
    </style>
""", unsafe_allow_html=True)

# Initialize session state
if 'generated_count' not in st.session_state:
    st.session_state.generated_count = 0
if 'failed_tickers' not in st.session_state:
    st.session_state.failed_tickers = []
if 'checked_tickers' not in st.session_state:
    st.session_state.checked_tickers = []
if 'ticker_statuses' not in st.session_state:
    st.session_state.ticker_statuses = {}
if 'current_preview_ticker' not in st.session_state:
    st.session_state.current_preview_ticker = None

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


@st.cache_data(ttl=60)
def get_cached_bundle_stats():
    """Get bundle statistics with caching."""
    return bundle_service.get_bundle_stats()


@st.cache_data(ttl=30)
def check_ollama_status():
    """Check Ollama connection with caching."""
    return ollama_service.check_ollama_connection()


# ============================================================================
# HEADER - Compact at the top
# ============================================================================

st.title("🤖 AI Insights Generator")
st.caption("Generate AI-powered investment insights using local Ollama models and FMP data")

# ============================================================================
# SIDEBAR
# ============================================================================

with st.sidebar:
    st.header("📊 Bundle Statistics")
    
    # Use cached stats function
    stats = get_cached_bundle_stats()
    
    col1, col2 = st.columns(2)
    with col1:
        st.metric("Tickers", stats['count'])
    with col2:
        st.metric("Size", f"{stats['size_kb']} KB")
    
    st.caption(f"Last updated: {stats['last_updated']}")
    
    st.divider()
    
    # Ollama connection status with caching
    st.header("🔌 Ollama Status")
    if check_ollama_status():
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
# MAIN CONTENT - Two Column Layout
# ============================================================================

# Load existing bundle
bundle = bundle_service.load_bundle()

# Create two-column layout
left_col, right_col = st.columns([1, 1.5])

# ============================================================================
# LEFT COLUMN - Input and Controls
# ============================================================================

with left_col:
    st.subheader("Enter Tickers")

    tickers_input = st.text_area(
        "Ticker symbols",
        height=120,
        placeholder="AAPL, MSFT, GOOGL",
        help="Enter stock ticker symbols (comma or newline separated)",
        label_visibility="collapsed"
    )

    # Check Status and Generate buttons
    col_check, col_generate = st.columns([1, 1])
    
    with col_check:
        check_button = st.button("🔍 Check Status", use_container_width=True)
    
    with col_generate:
        generate_button_placeholder = st.empty()
    
    # Force regenerate option (below buttons)
    force_regenerate = st.checkbox(
        "Force regenerate existing",
        help="Regenerate insights even if they already exist"
    )
    
    st.divider()
    
    # Status display area
    status_container = st.container()

# ============================================================================
# RIGHT COLUMN - Data Preview and Results
# ============================================================================

with right_col:
    st.subheader("Data Preview")
    preview_container = st.container()

# ============================================================================
# CHECK STATUS LOGIC
# ============================================================================

if check_button and tickers_input:
    with status_container:
        st.write("**Ticker Status:**")
        
        tickers = parse_tickers(tickers_input)
        
        if not tickers:
            st.warning("No valid tickers entered")
        else:
            # Store checked tickers for later use
            st.session_state.checked_tickers = []
            st.session_state.ticker_statuses = {}
            
            for ticker in tickers:
                is_valid, error_msg = validate_ticker(ticker)
                
                if not is_valid:
                    st.error(f"❌ **{ticker}** - {error_msg}")
                    st.session_state.ticker_statuses[ticker] = {'status': 'invalid', 'error': error_msg}
                else:
                    exists = bundle_service.ticker_exists(bundle, ticker)
                    
                    if exists:
                        st.success(f"✅ **{ticker}** - Already in bundle")
                        st.session_state.ticker_statuses[ticker] = {'status': 'exists', 'data': bundle.get(ticker)}
                    else:
                        st.info(f"➕ **{ticker}** - New ticker")
                        st.session_state.ticker_statuses[ticker] = {'status': 'new'}
                    
                    st.session_state.checked_tickers.append(ticker)
            
            # Clear cache to refresh stats
            get_cached_bundle_stats.clear()

# ============================================================================
# PREVIEW DISPLAY (only if tickers have been checked)
# ============================================================================

@st.fragment
def render_ticker_preview():
    """Fragment to render ticker preview without full page rerun."""
    existing_tickers = [t for t, s in st.session_state.ticker_statuses.items() if s['status'] == 'exists']
    
    if existing_tickers:
        selected_ticker = st.selectbox(
            "View existing data for:",
            existing_tickers,
            key="preview_selector"
        )
        
        if selected_ticker:
            ticker_data = st.session_state.ticker_statuses[selected_ticker]['data']
            
            st.markdown(f"### {selected_ticker}")
            st.caption(f"Last updated: {ticker_data.get('updated', 'N/A')}")
            
            # Advantages
            st.markdown("**✅ Competitive Advantages:**")
            for i, adv in enumerate(ticker_data.get('advantages', []), 1):
                with st.expander(f"{i}. {adv['title']}", expanded=False):
                    st.write(adv['description'])
            
            st.divider()
            
            # Risks
            st.markdown("**⚠️ Investment Risks:**")
            for i, risk in enumerate(ticker_data.get('risks', []), 1):
                with st.expander(f"{i}. {risk['title']}", expanded=False):
                    st.write(risk['description'])
    else:
        st.info("No existing data found for checked tickers")

# Show preview for existing tickers ONLY if we have checked tickers
if st.session_state.checked_tickers:
    with preview_container:
        render_ticker_preview()
else:
    # Show helpful message when no tickers have been checked yet
    with preview_container:
        st.info("👈 Enter tickers and click 'Check Status' to begin")

# ============================================================================
# GENERATE INSIGHTS LOGIC
# ============================================================================

# Show generate button only if we have checked tickers
if st.session_state.checked_tickers:
    # Determine which tickers need processing
    tickers_to_process = []
    
    for ticker in st.session_state.checked_tickers:
        status_info = st.session_state.ticker_statuses.get(ticker, {})
        
        if status_info.get('status') == 'new':
            tickers_to_process.append(ticker)
        elif status_info.get('status') == 'exists' and force_regenerate:
            tickers_to_process.append(ticker)
    
    # Display generate button in left column
    with left_col:
        with generate_button_placeholder:
            if not tickers_to_process:
                if force_regenerate:
                    st.info("✅ All tickers already exist")
                else:
                    st.info("✅ All tickers exist. Check 'Force regenerate' to update.")
            else:
                # Check Ollama connection
                if not ollama_service.check_ollama_connection():
                    st.error("❌ Ollama is not running")
                    st.code("ollama serve", language="bash")
                else:
                    generate_button = st.button(
                        f"🚀 Generate ({len(tickers_to_process)})",
                        type="primary",
                        use_container_width=True
                    )
                    
                    if generate_button:
                        # Clear right column for live generation
                        with preview_container:
                            st.empty()
                        
                        # Reset counters
                        st.session_state.generated_count = 0
                        st.session_state.failed_tickers = []
                        
                        # Progress tracking
                        with status_container:
                            progress_bar = st.progress(0)
                            status_text = st.empty()
                        
                        # Process each ticker
                        for i, ticker in enumerate(tickers_to_process):
                            current = i + 1
                            total = len(tickers_to_process)
                            
                            status_text.info(f"🔄 Processing {ticker} ({current}/{total})...")
                            
                            # Show live generation in right column
                            with preview_container:
                                st.markdown(f"### 🔄 Generating: {ticker}")
                                
                                generation_status = st.empty()
                                generation_output = st.container()
                            
                            # Generate insights
                            try:
                                # Fetch FMP data
                                with generation_status:
                                    st.info("📊 Fetching company data from FMP...")
                                
                                company_data = fmp_service.enrich_company_data(ticker)
                                company_name = company_data.get('company_name', ticker) if company_data.get('has_data') else ticker
                                
                                # Show company info
                                with generation_output:
                                    if company_data.get('has_data'):
                                        st.success(f"✅ **{company_name}**")
                                        col_a, col_b = st.columns(2)
                                        with col_a:
                                            st.caption(f"**Industry:** {company_data.get('industry', 'N/A')}")
                                        with col_b:
                                            st.caption(f"**Sector:** {company_data.get('sector', 'N/A')}")
                                        if company_data.get('revenue'):
                                            st.caption(f"**Revenue (TTM):** ${company_data.get('revenue')}B")
                                    else:
                                        st.warning(f"⚠️ Limited data for {ticker}")
                                
                                # Generate insights with AI
                                with generation_status:
                                    st.info("🤖 Generating insights with Ollama...")
                                
                                insights = ollama_service.generate_insights(
                                    ticker, 
                                    company_name, 
                                    company_data if company_data.get('has_data') else None
                                )
                                
                                if insights:
                                    # Display generated insights
                                    with generation_output:
                                        st.divider()
                                        
                                        # Advantages
                                        st.markdown("**✅ Competitive Advantages:**")
                                        for idx, adv in enumerate(insights.get('advantages', []), 1):
                                            with st.expander(f"{idx}. {adv['title']}", expanded=True):
                                                st.write(adv['description'])
                                        
                                        st.divider()
                                        
                                        # Risks
                                        st.markdown("**⚠️ Investment Risks:**")
                                        for idx, risk in enumerate(insights.get('risks', []), 1):
                                            with st.expander(f"{idx}. {risk['title']}", expanded=True):
                                                st.write(risk['description'])
                                    
                                    # Save to bundle
                                    bundle = bundle_service.add_ticker(
                                        bundle, 
                                        ticker, 
                                        insights['advantages'], 
                                        insights['risks']
                                    )
                                    bundle_service.save_bundle(bundle)
                                    
                                    st.session_state.generated_count += 1
                                    
                                    with generation_status:
                                        st.success(f"✅ Saved {ticker} to bundle!")
                                
                                else:
                                    with generation_status:
                                        st.error(f"❌ Failed to generate insights for {ticker}")
                                    st.session_state.failed_tickers.append((ticker, "No insights returned"))
                            
                            except Exception as e:
                                with generation_status:
                                    st.error(f"❌ Error: {str(e)}")
                                st.session_state.failed_tickers.append((ticker, str(e)))
                            
                            # Update progress
                            progress_bar.progress(current / total)
                            
                            # Delay between tickers (except for last one)
                            if current < total:
                                time.sleep(st.session_state.delay_between)
                        
                        # Final status
                        status_text.success(f"✅ Complete! Processed {st.session_state.generated_count}/{total}")
                        
                        # Clear cache to refresh stats
                        get_cached_bundle_stats.clear()
                        
                        # Auto-copy if enabled
                        if st.session_state.auto_copy and st.session_state.generated_count > 0:
                            with status_container:
                                with st.spinner("📋 Auto-copying to main project..."):
                                    if bundle_service.copy_to_main_project(create_backup=st.session_state.create_backup):
                                        st.success("✅ Auto-copied to ../public/ai-insights.json")
                                    else:
                                        st.warning("⚠️ Auto-copy failed")
                        
                        # Show summary
                        with status_container:
                            st.divider()
                            st.markdown("### 📊 Generation Summary")
                            
                            col_success, col_failed = st.columns(2)
                            
                            with col_success:
                                st.metric("✅ Successful", st.session_state.generated_count)
                            
                            with col_failed:
                                st.metric("❌ Failed", len(st.session_state.failed_tickers))
                            
                            # Show failed tickers
                            if st.session_state.failed_tickers:
                                st.error("**Failed Tickers:**")
                                for ticker, error in st.session_state.failed_tickers:
                                    st.write(f"- {ticker}: {error}")
                            
                            # Manual copy button
                            if st.session_state.generated_count > 0:
                                st.divider()
                                
                                if st.button("📋 Copy to Main Project", use_container_width=True):
                                    if bundle_service.copy_to_main_project(create_backup=st.session_state.create_backup):
                                        st.success("✅ Copied to ../public/ai-insights.json")
                                    else:
                                        st.error("❌ Failed to copy")

# ============================================================================
# FOOTER - Bundle Stats
# ============================================================================

st.divider()

stats = get_cached_bundle_stats()

col1, col2, col3 = st.columns(3)

with col1:
    st.metric("📊 Total Tickers", stats['count'])

with col2:
    st.metric("💾 Bundle Size", f"{stats['size_kb']} KB")

with col3:
    st.metric("🕒 Last Updated", stats['last_updated'])
