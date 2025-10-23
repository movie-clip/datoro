# AI Insights Generator

A Streamlit-based tool for generating AI insights using local Ollama models and FMP API data.

## Prerequisites

- Python 3.10+
- [Ollama](https://ollama.ai) installed and running
- [FMP API key](https://financialmodelingprep.com) (free tier works)

## Quick Start

1. **Setup:**
   ```bash
   cd ai-insights-tool
   python -m venv venv
   venv\Scripts\activate  # Windows
   # source venv/bin/activate  # Linux/Mac
   pip install -r requirements.txt
   ```

2. **Configure:**
   - Create `.env` file with your FMP API key:
     ```
     FMP_API_KEY=your_api_key_here
     OLLAMA_BASE_URL=http://localhost:11434
     ```

3. **Run:**
   ```bash
   # Windows
   .\run.ps1
   # Or: run.bat
   
   # Linux/Mac
   streamlit run app.py
   ```

4. **Access:** Open browser to http://localhost:8501

## Features

- 🤖 Generate AI-powered stock insights using local LLMs
- 📊 Enrich data with FMP API company information
- 💾 Save insights to JSON bundle
- 🔄 Force regenerate existing insights
- 📋 Export and copy insights

## Project Structure

```
ai-insights-tool/
├── app.py                  # Main Streamlit application
├── components/             # Reusable UI components
├── views/                  # Page layouts
├── handlers/               # Business logic
├── services/               # External API services
├── utils/                  # Utilities and validators
├── config/                 # Configuration and prompts
└── output/                 # Generated insights
```

## Troubleshooting

**Ollama not connecting:**
- Start Ollama: `ollama serve`
- Verify URL in `.env`: `OLLAMA_BASE_URL=http://localhost:11434`

**FMP API errors:**
- Check API key in `.env`
- Free tier limit: 250 requests/day

**Module errors:**
- Activate virtual environment: `venv\Scripts\activate`
- Reinstall: `pip install -r requirements.txt`

## Stop Application

```bash
# Ctrl+C in terminal, or:
.\stop.ps1  # Windows PowerShell
stop.bat    # Windows CMD
```

