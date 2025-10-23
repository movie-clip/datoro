# AI Insights Generator

Standalone Python-based tool for generating AI insights using local Ollama models and FMP API data.

## Prerequisites

- Python 3.10 or higher
- Ollama installed and running locally
- FMP API key (free tier works)

## Installation

1. Navigate to the tool directory:
   ```bash
   cd ai-insights-tool
   ```

2. Create virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate virtual environment:
   ```bash
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Configure environment:
   - Copy `.env.example` to `.env`
   - Add your FMP API key
   - Verify Ollama settings

## Usage

### Quick Start (Windows)

**Option 1: PowerShell Launcher (Recommended)**
```powershell
cd ai-insights-tool
.\run.ps1
```

**Option 2: Batch File**
```cmd
cd ai-insights-tool
run.bat
```

**Option 3: Manual Command**
```powershell
cd d:\projects\Vue\factorly\ai-insights-tool
& ".\venv\Scripts\Activate.ps1"
streamlit run app.py --server.headless true
```

### Quick Start (Linux/Mac)

```bash
cd ai-insights-tool
source venv/bin/activate
streamlit run app.py --server.headless true
```

### Prerequisites Before Running

1. **Ensure Ollama is running:**
   ```bash
   ollama serve
   ```

2. **Verify FMP API key is set in `.env` file**

3. **Access the app:**
   - The app will automatically open in your browser
   - Or navigate to: http://localhost:8501
   streamlit run app.py
   ```

3. Open browser to `http://localhost:8501`

## Features

- Generate AI insights for stock tickers
- Use FMP API for company data enrichment
- Live streaming responses
- Force regenerate existing insights
- Save to bundle format
- Copy to main project

## Troubleshooting

**Ollama not connecting:**
- Ensure Ollama is running (`ollama serve`)
- Check `OLLAMA_BASE_URL` in `.env`

**FMP API errors:**
- Verify API key in `.env`
- Check rate limits (free tier: 300 calls/min)

**Module not found:**
- Ensure virtual environment is activated
- Run `pip install -r requirements.txt`

## Documentation

See `AI_INSIGHTS_TOOL_PLAN.md` in the root directory for full implementation details.
