# AI Insights Tool - Standalone Vue Application

A standalone Vue.js application for generating AI insights using local Ollama.

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure Ollama:**
Make sure Ollama is running on http://localhost:11434

3. **Start the backend server:**
```bash
npm run server
```

4. **Start the frontend (in a new terminal):**
```bash
npm run dev
```

5. **Open the application:**
Navigate to http://localhost:5174

## Features

- ✅ Check ticker status against existing bundle
- 🤖 Generate AI insights using local Ollama
- 📊 Real-time progress updates
- 💾 Automatic bundle management
- 🎨 Factorly-style UI (dark theme)

## Output

Generated insights are saved to `output/ai-insights.json`
