# Voice Generation for Factorly

Generate AI voiceovers for company analysis scripts using multiple TTS providers.

## 🎙️ Available Solutions

### 1. **ElevenLabs** - `generate_voiceovers.py`
- ✅ Voice cloning (manual setup via web)
- ✅ Premium quality
- 💰 $5-11/month subscription
- 📖 See: `QUICKSTART_ELEVENLABS.md`

### 2. **NaturalReader** - `generate_voiceovers_naturalreader.py` ⭐ **RECOMMENDED**
- ✅ Professional neural voices
- ✅ Pay-as-you-go ($9 per 1M chars)
- ✅ 40% cheaper than OpenAI
- ✅ Multiple voice options
- 📖 See: `NATURALREADER_GUIDE.md`

### 3. **OpenAI TTS** - `generate_rap_style.py`
- ✅ Rap/rhythmic style
- ✅ High quality
- 💰 $15 per 1M chars
- 📖 See: `RAP_STYLE_GUIDE.md`

### 4. **Bark (Local)** - `generate_voiceovers_bark.py`
- ✅ 100% FREE
- ✅ Runs locally
- ❌ No voice cloning
- ⚠️ Slower on CPU
- 📖 See: `BARK_GUIDE.md`

## 💰 Cost Comparison

For your 4 scripts (2,144 characters):

| Solution | Cost | Best For |
|----------|------|----------|
| **NaturalReader** | **$0.02** | 💰 Best value |
| **OpenAI** | $0.03 | Creative style |
| **ElevenLabs** | $5/month | Voice cloning |
| **Bark (Local)** | **$0** | Zero cost |

## 🚀 Quick Start - NaturalReader (Recommended)

## 🚀 Quick Start - NaturalReader (Recommended)

### 1. Get API Key
- Visit: https://www.naturalreaders.com/online/
- Sign up and get your API key
- Add credits to your account

### 2. Set Environment Variable
```powershell
$env:NATURALREADER_API_KEY = "your-api-key-here"
```

### 3. Generate Audio
```powershell
cd scripts/voice-generation

# Single ticker
python generate_voiceovers_naturalreader.py AAPL

# All tickers
python generate_voiceovers_naturalreader.py
```

**Output:** `voiceovers_naturalreader/AAPL.mp3`

**Cost:** ~$0.02 for all 4 scripts (2 cents!)

---

## 📚 Detailed Guides

- **NaturalReader:** See `NATURALREADER_GUIDE.md` ⭐
- **ElevenLabs:** See `QUICKSTART_ELEVENLABS.md`
- **OpenAI Rap Style:** See `RAP_STYLE_GUIDE.md`
- **Bark Local TTS:** See `BARK_GUIDE.md`
- **Voice Cloning (ElevenLabs):** See `VOICE_CLONING_GUIDE.md`

---

## 🎯 Which Solution to Choose?

### For Cost-Effectiveness: NaturalReader ⭐
```powershell
python generate_voiceovers_naturalreader.py AAPL
```
- **Cost:** $0.02 for 4 scripts
- **Quality:** Professional neural voices
- **Speed:** Fast (2-5 seconds per file)

### For Voice Cloning: ElevenLabs
```powershell
python generate_voiceovers.py AAPL
```
- **Cost:** $5-11/month subscription
- **Quality:** Best (can clone your wife's voice)
- **Speed:** Very fast

### For Creative/Rap Style: OpenAI
```powershell
python generate_rap_style.py AAPL
```
- **Cost:** $0.03 for 4 scripts
- **Quality:** High quality, rhythmic
- **Speed:** Fast

### For Zero Cost: Bark (Local)
```powershell
python generate_voiceovers_bark.py AAPL
```
- **Cost:** $0 forever
- **Quality:** Good
- **Speed:** Slow on CPU (30-60s per file)

---

## ⚙️ Configuration (NaturalReader)

Edit `generate_voiceovers_naturalreader.py`:

```python
# Voice Selection
VOICE_NAME = "en-US-madison"  # Professional female

# Other options:
# "en-US-davis"  - Professional male
# "en-US-aria"   - Warm female
# "en-GB-sonia"  - British female

# Audio Settings
AUDIO_FORMAT = "mp3"  # mp3, wav, ogg
SPEED = 0             # -3 to +3 (0 = normal)
PITCH = 0             # -12 to +12 (0 = normal)
```

---

## 🎤 Old Configurations

### Standard Voice (ElevenLabs)
```powershell
cd scripts/voice-generation
pip install elevenlabs
```

#### 2. Set API Key
```powershell
$env:ELEVEN_API_KEY = "your_elevenlabs_api_key"
```
Get your key from: https://elevenlabs.io/app/speech-synthesis

#### 3. Generate Audio
```powershell
# Single ticker
python generate_voiceovers.py AAPL

# All tickers
python generate_voiceovers.py
```

### Rap Style (OpenAI) 🎤

#### 1. Install OpenAI
```powershell
pip install openai
```

#### 2. Set API Key
```powershell
$env:OPENAI_API_KEY = "your_openai_api_key"
```

#### 3. Generate Rap-Style Audio
```powershell
# Single ticker
python generate_rap_style.py TSLA

# All tickers
python generate_rap_style.py
```

Output: `voiceovers/TSLA_rap.mp3`

## ⚙️ Configuration

### Standard Voice (generate_voiceovers.py)

Edit `generate_voiceovers.py` to customize:

```python
# Voice Selection
PRESET_VOICE_ID = "lnieQLGTodpbhjpZtg1k"  # Change to your preferred voice

# Voice Quality
STABILITY = 0.5                  # 0.0 = expressive, 1.0 = stable
SIMILARITY_BOOST = 0.75          # Voice matching strength
USE_SPEAKER_BOOST = False        # Enhanced similarity

# Accent Modification (Optional)
ENABLE_ACCENT_MODIFICATION = False
ACCENT_DESCRIPTION = "British accent"

# Model
MODEL = "eleven_multilingual_v2"  # Best quality
```

### Rap Style (generate_rap_style.py) 🎤

Edit `generate_rap_style.py` to customize:

```python
# Voice Selection for rap
# Options: alloy, echo, fable, onyx, nova, shimmer
# Best for rap: onyx (deep), echo (resonant), fable (expressive)
VOICE = "onyx"

# Speed control (0.25 to 4.0)
SPEED = 1.1  # 0.8-1.0 = Slow rap, 1.0-1.2 = Normal, 1.2-1.5 = Fast rap

# Model
MODEL = "gpt-4o-audio-preview"  # Better prosody and musicality
```

## 🎙️ Voice Cloning (Optional)

To use your own voice:

1. Enable voice cloning:
```python
USE_VOICE_CLONING = True
```

2. Add voice samples:
   - Place `.mp3`, `.wav`, `.ogg`, `.flac`, or `.m4a` files in `voice_samples/`
   - At least 1-3 minutes of clear audio
   - Multiple samples recommended

3. Run the script - it will automatically create your cloned voice

## 📁 Folder Structure

```
scripts/voice-generation/
├── generate_voiceovers.py    # Main script
├── scripts/                  # Text scripts (input)
│   ├── AAPL.txt
│   ├── MSFT.txt
│   └── ...
├── voiceovers/              # Generated audio (output)
│   ├── AAPL.mp3
│   ├── MSFT.mp3
│   └── ...
├── voice_samples/           # Your voice recordings (optional)
│   ├── sample1.mp3
│   └── ...
└── README.md               # This file
```

## 🔧 Popular Voice IDs

| Voice Name | Voice ID | Style |
|------------|----------|-------|
| Rachel | `21m00Tcm4TlvDq8ikWAM` | Female, American |
| Drew | `29vD33N1CtxCmqQRPOHJ` | Male, warm |
| Clyde | `2EiwWnXFnvU5JabPnv8n` | Male, American |
| Paul | `5Q0t7uMcjvnagumLfvZi` | Male, authoritative |
| Antoni | `ErXwobaYiN019PkySvjV` | Male, well-rounded |
| Thomas | `GBv7mTt0atIp3Br8iCZE` | Male, calm |
| Charlie | `IKne3meq5aSn9XLyUdCD` | Male, Australian |
| Emily | `LcfcDJNUP1GQjkzn1xUU` | Female, American |

Find more voices at: https://elevenlabs.io/voice-library

## 💡 Tips

- **Free tier**: 10,000 characters/month (includes voice cloning)
- **Quality**: Use `eleven_multilingual_v2` model for best results
- **Speed**: Use `eleven_turbo_v2` for faster generation
- **Cost**: Pro tier starts at $5/month for 30,000 characters

## ⚠️ Important Notes

- This folder is **excluded from the web build** (it's in `/scripts/`)
- Audio files are **not tracked in git** (add to `.gitignore` if needed)
- API key should be set via **environment variable** (not hardcoded)
- Generated voiceovers are saved locally only

## 🚀 Usage Examples

```powershell
# Generate voiceover for Apple
python generate_voiceovers.py AAPL

# Generate voiceovers for all companies
python generate_voiceovers.py

# Use different voice (edit PRESET_VOICE_ID first)
python generate_voiceovers.py MSFT

# Enable accent modification (edit config first)
python generate_voiceovers.py GOOGL
```

## 📊 Integration

Generated audio files can be:
- Used in video presentations
- Embedded in web applications
- Shared with users
- Used for podcasts or social media

---

**Note**: This is a standalone utility script and does not affect the Factorly web application build or deployment.
