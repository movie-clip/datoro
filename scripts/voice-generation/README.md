# Voice Generation for Factorly

Generate AI voiceovers for company analysis scripts using ElevenLabs or OpenAI APIs.

## �️ Available Scripts

### 1. `generate_voiceovers.py` - Standard Voice (ElevenLabs)
- Professional narration style
- High-quality voice cloning
- Multiple voice options

### 2. `generate_rap_style.py` - Rap/Music Style (OpenAI) 🎤
- Rhythmic, rap-style delivery
- Speed control for flow
- Emphasis and pauses
- Great for creative content

## �🎯 Quick Start

### Standard Voice (ElevenLabs)

#### 1. Install Dependencies
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
