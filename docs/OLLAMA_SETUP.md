# Using Ollama for Local AI Analysis

This guide explains how to set up Ollama to run AI analysis locally (free, private, no API costs).

## Why Ollama?

- **Free:** No API costs, runs entirely on your machine
- **Private:** Your data never leaves your computer
- **Fast:** Local processing (if you have decent hardware)
- **No rate limits:** Analyze as many companies as you want

## Setup Instructions

### 1. Install Ollama

**Windows/Mac/Linux:**
- Download from: https://ollama.com/download
- Run the installer
- Ollama will start automatically as a service

### 2. Pull a Model

Open a terminal and pull a model (recommended: llama3.2):

```bash
# Recommended: Llama 3.2 (3B parameters, ~2GB download)
ollama pull llama3.2

# Alternative: Llama 3.2 1B (smaller, faster, ~1GB)
ollama pull llama3.2:1b

# Alternative: Llama 3.1 8B (larger, better quality, ~4.7GB)
ollama pull llama3.1:8b
```

### 3. Test Ollama

Verify Ollama is running:

```bash
# Test the API
curl http://localhost:11434/api/generate -d "{
  \"model\": \"llama3.2\",
  \"prompt\": \"Why is the sky blue?\",
  \"stream\": false
}"
```

You should see a JSON response with the model's answer.

### 4. Configure Your Dashboard

Edit your `.env.local` file:

```bash
# Set AI provider to Ollama
VITE_AI_PROVIDER=ollama

# Ollama endpoint (default)
VITE_OLLAMA_BASE_URL=http://localhost:11434

# Model to use (must match the model you pulled)
VITE_OLLAMA_MODEL=llama3.2
```

### 5. Restart Your Dev Server

```bash
# Stop the dev server (Ctrl+C)
# Start it again
npm run dev
```

### 6. Test the AI Analysis

1. Open your dashboard at http://localhost:5173
2. Enter a ticker (e.g., AAPL)
3. Scroll down to the "Competitive Advantages" and "Investment Risks" sections
4. You should see "🤖 Ollama" indicator at the bottom of each panel

## Model Recommendations

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| `llama3.2:1b` | ~1GB | ⚡⚡⚡ | ⭐⭐ | Fast responses, lower-end hardware |
| `llama3.2` | ~2GB | ⚡⚡ | ⭐⭐⭐ | **Recommended** - balanced |
| `llama3.1:8b` | ~4.7GB | ⚡ | ⭐⭐⭐⭐ | Best quality, needs good hardware |

## Troubleshooting

### "Cannot connect to Ollama" Error

**Check if Ollama is running:**
```bash
# Windows (PowerShell)
Get-Process ollama

# Mac/Linux
ps aux | grep ollama
```

**Start Ollama manually:**
```bash
ollama serve
```

### "Model not found" Error

Make sure you've pulled the model:
```bash
ollama list
```

If your model isn't listed, pull it:
```bash
ollama pull llama3.2
```

### Slow Responses

- **Try a smaller model:** `llama3.2:1b` is much faster
- **Close other applications** to free up RAM
- **Check GPU usage:** Ollama uses GPU if available (much faster)

### Different Port

If Ollama runs on a different port, update `.env.local`:
```bash
VITE_OLLAMA_BASE_URL=http://localhost:YOUR_PORT
```

## Switching Between OpenAI and Ollama

You can easily switch between providers by changing one line in `.env.local`:

```bash
# Use OpenAI
VITE_AI_PROVIDER=openai

# Use Ollama
VITE_AI_PROVIDER=ollama
```

Restart the dev server after changing the provider.

## Performance Tips

1. **First analysis is slower:** Ollama loads the model into memory
2. **Subsequent analyses are fast:** Model stays in memory
3. **GPU acceleration:** If you have an NVIDIA GPU, Ollama will use it automatically
4. **RAM requirements:** 
   - llama3.2:1b → 2GB RAM minimum
   - llama3.2 → 4GB RAM minimum
   - llama3.1:8b → 8GB RAM minimum

## Privacy & Security

- All analysis happens locally on your machine
- Company data never leaves your computer
- No API keys, no tracking, no data sharing
- Cache is stored in browser localStorage only

## Cost Comparison

| Provider | Cost per Company | Notes |
|----------|------------------|-------|
| OpenAI | ~$0.0006 | Fast, high quality, requires internet |
| Ollama | $0.00 | Free, private, works offline |

With caching (30 days), you'll only analyze each company once per month regardless of provider.
