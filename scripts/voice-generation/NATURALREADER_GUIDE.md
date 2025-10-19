# 🎙️ NaturalReader Voice Generation Guide

## Overview

NaturalReader provides high-quality neural TTS voices at affordable pricing - perfect for generating voiceovers without breaking the bank!

## 💰 Pricing Comparison

| Service | Price | Your 4 Scripts (2,144 chars) | 100 Scripts (~300K chars) |
|---------|-------|-------------------------------|---------------------------|
| **NaturalReader** | $9 per 1M chars | $0.02 | $2.70 |
| **ElevenLabs** | $5-11/month | Subscription | Subscription |
| **OpenAI TTS** | $15 per 1M chars | $0.03 | $4.50 |
| **Bark (Local)** | Free | $0 | $0 |

**Winner for paid solutions:** NaturalReader (40% cheaper than OpenAI!)

## 🚀 Quick Setup

### Step 1: Get API Key

1. Visit: https://www.naturalreaders.com/online/
2. Sign up for an account
3. Go to API section
4. Get your API key
5. Add credits to your account

### Step 2: Set Environment Variable

```powershell
# Set API key (temporary - current session)
$env:NATURALREADER_API_KEY = "your-api-key-here"

# Verify it's set
if ($env:NATURALREADER_API_KEY) { Write-Host "✅ API key set!" }
```

### Step 3: Install Dependencies

```powershell
# Activate your venv
.\.venv\Scripts\Activate.ps1

# Install requests (already have it)
pip install requests
```

### Step 4: Generate Audio

```powershell
cd D:\projects\Vue\factorly\scripts\voice-generation

# Generate single ticker
python generate_voiceovers_naturalreader.py AAPL

# Generate all scripts
python generate_voiceovers_naturalreader.py
```

## 🎤 Available Voices

### US Voices (American English)
- **`en-US-madison`** - Professional female ⭐ (Default)
- **`en-US-davis`** - Professional male
- **`en-US-aria`** - Warm, friendly female
- **`en-US-guy`** - Conversational male
- **`en-US-jenny`** - Young female
- **`en-US-tony`** - Authoritative male

### UK Voices (British English)
- **`en-GB-sonia`** - British female
- **`en-GB-ryan`** - British male
- **`en-GB-libby`** - Young British female

### Change Voice:
Edit `generate_voiceovers_naturalreader.py` line ~30:
```python
VOICE_NAME = "en-US-madison"  # Change to any voice above
```

## ⚙️ Audio Settings

You can customize the audio output:

```python
# In generate_voiceovers_naturalreader.py

AUDIO_FORMAT = "mp3"  # Options: mp3, wav, ogg
SPEED = 0             # Range: -3 to +3 (0 = normal)
PITCH = 0             # Range: -12 to +12 (0 = normal)
```

**Examples:**
- Faster reading: `SPEED = 1`
- Slower reading: `SPEED = -1`
- Higher pitch: `PITCH = 3`
- Lower pitch: `PITCH = -3`

## 📊 Output

Generated files are saved to:
```
voiceovers_naturalreader/
├── AAPL.mp3
├── GOOGL.mp3
├── MSFT.mp3
└── TSLA.mp3
```

**File format:** `.mp3` (default) - small file size, good quality

## 💰 Cost Calculation

For your current scripts:
- **AAPL:** 641 chars → $0.0058
- **GOOGL:** 541 chars → $0.0049
- **MSFT:** 428 chars → $0.0039
- **TSLA:** 534 chars → $0.0048
- **Total:** 2,144 chars → **$0.0193** (~2 cents)

You can generate these scripts **500 times** for less than $10!

## 🆚 When to Use NaturalReader

### ✅ Use NaturalReader when:
- You want professional quality at low cost
- You're generating large volumes of audio
- You prefer pay-as-you-go vs subscription
- You don't need voice cloning
- You want multiple voice options

### ❌ Don't use NaturalReader when:
- You need voice cloning (use ElevenLabs)
- You want completely free (use Bark local)
- You need creative/rap style (use OpenAI)
- You want zero cost forever (use Bark)

## 🔧 Troubleshooting

### "API key not set"
```powershell
# Check if set
$env:NATURALREADER_API_KEY

# If empty, set it:
$env:NATURALREADER_API_KEY = "your-key-here"
```

### "API Error: 401"
- Check API key is correct
- Ensure you have credits in your account
- Verify account is active

### "API Error: 429" (Rate Limit)
- Wait a few seconds between requests
- Script includes 1-second delay between files

### "Insufficient credits"
- Add more credits to your NaturalReader account
- Check balance at: https://www.naturalreaders.com/online/

## 📋 Features

- ✅ High-quality neural voices
- ✅ Multiple voice options (US, UK, etc.)
- ✅ Fast generation (~2-5 seconds per file)
- ✅ Pay-as-you-go pricing
- ✅ Multiple audio formats (mp3, wav, ogg)
- ✅ Speed and pitch control
- ✅ Batch processing
- ✅ Cost estimation before generation
- ❌ No voice cloning (use ElevenLabs for that)

## 🎯 Recommended Workflow

1. **Set API key:**
   ```powershell
   $env:NATURALREADER_API_KEY = "your-key"
   ```

2. **Test with one file:**
   ```powershell
   python generate_voiceovers_naturalreader.py AAPL
   ```

3. **Listen to output:**
   Check `voiceovers_naturalreader/AAPL.mp3`

4. **Adjust settings if needed:**
   - Change voice in script
   - Adjust speed/pitch
   - Try different format

5. **Generate all:**
   ```powershell
   python generate_voiceovers_naturalreader.py
   ```

## 🔗 Useful Links

- **NaturalReader Website:** https://www.naturalreaders.com/
- **API Documentation:** https://www.naturalreaders.com/online/api
- **Voice Samples:** https://www.naturalreaders.com/online/text-to-speech-voices.html
- **Pricing:** https://www.naturalreaders.com/online/pricing.html

## 💡 Tips

1. **Cost Savings:**
   - NaturalReader is 40% cheaper than OpenAI TTS
   - Great for high-volume generation

2. **Quality:**
   - Neural voices are very natural
   - Professional quality for business use
   - Clear pronunciation

3. **Performance:**
   - Fast generation (2-5 seconds per script)
   - No local GPU needed
   - Cloud-based processing

4. **Flexibility:**
   - Multiple voice options
   - Adjust speed/pitch
   - Various audio formats

---

**Ready to try?** Set your API key and run:
```powershell
python generate_voiceovers_naturalreader.py AAPL
```
