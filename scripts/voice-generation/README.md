# Voice Generation for Factorly

Generate AI voiceovers for company analysis scripts using ElevenLabs API.

## 🎯 Quick Start

### 1. Install Dependencies
```powershell
cd scripts/voice-generation
pip install elevenlabs
```

### 2. Set API Key
```powershell
$env:ELEVEN_API_KEY = "your_elevenlabs_api_key"
```
Get your key from: https://elevenlabs.io/app/speech-synthesis

### 3. Add Scripts
Place your `.txt` files in the `scripts/` folder:
- Example: `scripts/AAPL.txt`
- Example: `scripts/MSFT.txt`

### 4. Generate Audio

**Generate for specific ticker:**
```powershell
python generate_voiceovers.py AAPL
```

**Generate for all tickers:**
```powershell
python generate_voiceovers.py
```

Output will be in `voiceovers/` folder as `.mp3` files.

## ⚙️ Configuration

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

## 🎙️ Voice Cloning (Optional)

To use your own voice:

1. Enable voice cloning:
```python
USE_VOICE_CLONING = True
```

2. Add voice samples:
   - Place `.mp3` or `.wav` files in `voice_samples/`
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
