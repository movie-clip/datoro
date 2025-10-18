# 🎙️ Local Voice Generation with Coqui TTS

Generate voices completely FREE on your local machine - no API costs, no internet required!

## ⚠️ Python Version Requirement

**IMPORTANT:** Coqui TTS requires **Python 3.9, 3.10, or 3.11** (not 3.12+)

Your current setup:
- ✅ **ElevenLabs** - Installed and working (Python 3.12 compatible)
- ✅ **OpenAI TTS** - Installed and working (Python 3.12 compatible)
- ❌ **Coqui TTS** - Requires Python 3.11 or lower

## 🎯 Two Options

### Option 1: Use Cloud APIs (Recommended - Already Working!)
You already have ElevenLabs and OpenAI installed and working:
```powershell
# Voice cloning with ElevenLabs
.\.venv\Scripts\Activate.ps1
python scripts\voice-generation\generate_voiceovers.py AAPL

# Rap-style with OpenAI
python scripts\voice-generation\generate_rap_style.py AAPL
```

### Option 2: Install Python 3.11 for Coqui TTS (Free Local Voice)

If you want FREE local voice generation:

1. **Download Python 3.11:**
   - Visit: https://www.python.org/downloads/
   - Download Python 3.11.x (latest 3.11 version)
   - Install to: `C:\Python311\` (or remember the path)

2. **Run the automated setup script:**
```powershell
cd D:\projects\Vue\factorly\scripts\voice-generation

# Run the setup script (finds Python 3.11 and sets up everything)
.\setup_local_tts.ps1
```

**OR manually create venv:**
```powershell
# Create venv with Python 3.11
C:\Python311\python.exe -m venv venv_tts

# Activate it
.\venv_tts\Scripts\Activate.ps1

# Install Coqui TTS
pip install TTS torch torchaudio
```

3. **Use the TTS venv:**
```powershell
# Always activate TTS venv for local voice generation
.\venv_tts\Scripts\Activate.ps1
python generate_voiceovers_local.py AAPL
```

**Note:** First install will download ~2GB model (one-time)

### Step 2: Add Voice Samples (Optional)

For voice cloning, add your wife's voice sample:
```
voice_samples/
└── wife_sample1.ogg  (your existing file)
```

### Step 3: Generate Audio

```powershell
# Single ticker
python generate_voiceovers_local.py AAPL

# All tickers
python generate_voiceovers_local.py
```

Output: `voiceovers_local/AAPL_local.wav`

## ⚙️ Configuration

Edit `generate_voiceovers_local.py`:

```python
# Enable/disable voice cloning
USE_VOICE_CLONING = True

# Model selection (affects quality and speed)
MODEL_NAME = "tts_models/multilingual/multi-dataset/xtts_v2"  # Best for cloning

# Alternative models:
# MODEL_NAME = "tts_models/en/vctk/vits"  # Faster, multi-speaker
# MODEL_NAME = "tts_models/en/ljspeech/tacotron2-DDC"  # High quality
```

## 🎯 Usage Examples

```powershell
# Generate with voice cloning
python generate_voiceovers_local.py TSLA

# Generate all scripts
python generate_voiceovers_local.py

# Check output
ls voiceovers_local/
```

## 🆚 Comparison: Local vs Cloud

| Feature | Local (Coqui) | Cloud (ElevenLabs) |
|---------|---------------|-------------------|
| Cost | 🆓 Free | 💰 $5-11/month |
| Quality | ⭐⭐⭐ Good | ⭐⭐⭐⭐⭐ Excellent |
| Speed (CPU) | 🐢 Slow | ⚡⚡⚡ Fast |
| Speed (GPU) | ⚡⚡ Fast | ⚡⚡⚡ Fast |
| Voice Cloning | ✅ Yes | ✅ Yes |
| Privacy | 🔒 100% Local | ☁️ Cloud-based |
| Internet | ❌ Not needed | ✅ Required |
| Setup | 📦 2GB download | 🔑 API key only |

## 💻 Hardware Requirements

### Minimum (CPU only):
- **CPU:** Modern multi-core processor
- **RAM:** 8GB+
- **Disk:** 5GB free space
- **Speed:** ~10-30 seconds per paragraph

### Recommended (with GPU):
- **GPU:** NVIDIA GPU with 4GB+ VRAM
- **CUDA:** Installed (for NVIDIA GPUs)
- **Speed:** ~2-5 seconds per paragraph

### Check GPU:
```powershell
python -c "import torch; print('GPU:', torch.cuda.is_available())"
```

## 📊 Quality Settings

The script uses XTTS v2 model which provides:
- ✅ Natural-sounding speech
- ✅ Voice cloning with 5-30 seconds of audio
- ✅ Multilingual support (English, Spanish, French, German, etc.)
- ✅ Emotional expression
- ✅ 24kHz audio output

## 🎤 Voice Cloning Tips

### For Best Results:
1. **Sample Quality:**
   - Clear audio, no background noise
   - 5-30 seconds of speech
   - Natural speaking style

2. **Sample Content:**
   - Varied emotions and tones
   - Different words and phrases
   - Normal speaking pace

3. **File Format:**
   - `.wav` (best quality)
   - `.mp3`, `.ogg`, `.flac` (also work)

### Multiple Samples:
The script uses the **first audio file** it finds. To use a specific sample:
- Rename it to start with `a_` (e.g., `a_best_sample.wav`)
- Or keep only one sample in the folder

## 🔧 Troubleshooting

### "TTS package not installed"
```powershell
pip install TTS
```

### "torch not found"
```powershell
pip install torch
```

### "Model download failed"
- Check internet connection
- Retry - the download will resume
- Model is ~2GB, takes a few minutes

### "Out of memory" (CPU)
- Close other applications
- Process one file at a time
- Consider using a smaller model

### "CUDA out of memory" (GPU)
- Reduce batch size (automatic in this script)
- Use CPU instead
- Close other GPU applications

### Slow generation (CPU)
This is normal! CPU generation takes longer:
- Short text (1 paragraph): ~10-30 seconds
- Long text (full analysis): 1-3 minutes

**Tip:** Use GPU for much faster generation!

## 🚀 Performance Tips

### Speed Up Generation:

1. **Use GPU:**
   - Install CUDA toolkit
   - GPU is 5-10x faster than CPU

2. **Cache Model:**
   - Model downloads once
   - Subsequent runs are faster

3. **Batch Processing:**
   - Generate multiple files at once
   - More efficient than one-by-one

### Reduce Quality for Speed:
```python
# Use faster model (edit script)
MODEL_NAME = "tts_models/en/vctk/vits"
```

## 📝 Output Files

Generated files are saved as:
```
voiceovers_local/
├── AAPL_local.wav
├── MSFT_local.wav
└── TSLA_local.wav
```

**File Format:** `.wav` (uncompressed, high quality)
**Sample Rate:** 24kHz
**Typical Size:** ~1MB per minute of audio

### Convert to MP3 (Optional):
```powershell
# Using ffmpeg (if installed)
ffmpeg -i AAPL_local.wav -codec:a libmp3lame -b:a 192k AAPL_local.mp3
```

## 🆚 When to Use Which Script?

### Use `generate_voiceovers_local.py` (Coqui) when:
- ✅ You want zero costs
- ✅ You have privacy concerns
- ✅ You have a good CPU/GPU
- ✅ You don't mind slower generation
- ✅ Quality is "good enough"

### Use `generate_voiceovers.py` (ElevenLabs) when:
- ✅ You need best quality
- ✅ You want fast generation
- ✅ You're okay with costs ($5-11/month)
- ✅ Internet is available
- ✅ Professional output required

### Use `generate_rap_style.py` (OpenAI) when:
- ✅ You want creative/rap style
- ✅ You need rhythmic delivery
- ✅ Pay-per-use is fine
- ✅ Simple integration preferred

## 💰 Cost Analysis

### 100 Stock Analysis (3,000 chars each):

| Solution | Total Cost | Per Analysis |
|----------|-----------|--------------|
| **Coqui (Local)** | $0 | $0 |
| **ElevenLabs** | $11/month | ~$0.11 |
| **OpenAI TTS** | $4.50 | ~$0.045 |

**Coqui breaks even after:** Immediate (no ongoing costs!)

## 🎬 Next Steps

1. ✅ Install: `pip install TTS torch`
2. ✅ Add voice sample to `voice_samples/`
3. ✅ Run: `python generate_voiceovers_local.py AAPL`
4. ✅ Wait for model download (first run only)
5. ✅ Listen to output in `voiceovers_local/`

---

**Questions?** Check the main README.md or Coqui TTS docs: https://github.com/coqui-ai/TTS
