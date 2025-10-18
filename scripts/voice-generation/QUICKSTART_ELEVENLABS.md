# 🚀 Quick Start - ElevenLabs Voice Generation

## Step 1: Set Your API Key

You need to set your ElevenLabs API key for this terminal session:

```powershell
# Set API key (temporary - for current PowerShell session)
$env:ELEVEN_API_KEY = "your-elevenlabs-api-key-here"

# Verify it's set
if ($env:ELEVEN_API_KEY) { Write-Host "✅ API key set!" }
```

### Where to Find Your API Key:
1. Go to: https://elevenlabs.io/app/settings/api-keys
2. Log in to your account
3. Copy your API key (starts with `sk_`)
4. Paste it in the command above

## Step 2: Check Your Setup

Before generating, verify everything is configured:

```powershell
cd D:\projects\Vue\factorly\scripts\voice-generation
python check_setup.py
```

This shows:
- ✅ API key valid
- ✅ Voice samples found (0.31 MB)
- ✅ Scripts ready (4 files, 2,144 characters)
- 💰 Estimated cost: **FREE** (within 10,000 char limit)

## Step 3: Generate ONE Test Audio

Start with just AAPL to test without wasting credits:

```powershell
python generate_voiceovers.py AAPL
```

**Expected:**
- ⏱️ Takes 5-10 seconds
- 💰 Uses ~641 characters from your free 10,000/month
- 🎤 Uses your wife's voice sample for cloning
- 💾 Saves to: `voiceovers/AAPL.mp3`

## Step 4: Listen & Decide

After AAPL generates:
1. Listen to `voiceovers/AAPL.mp3`
2. If quality is good, generate more
3. If not, adjust settings in `generate_voiceovers.py`

## Step 5: Generate All (Optional)

If you're happy with the result:

```powershell
# Generate all 4 scripts (AAPL, GOOGL, MSFT, TSLA)
python generate_voiceovers.py
```

**Total cost:** 2,144 characters (21% of your free 10,000/month)

## 💰 Your Free Plan Limits

**ElevenLabs Free Plan:**
- ✅ 10,000 characters/month
- ✅ Voice cloning (10 minutes)
- ✅ High quality voices

**Your Scripts:**
- AAPL: 641 chars (6.4% of limit)
- GOOGL: 541 chars (5.4%)
- MSFT: 428 chars (4.3%)
- TSLA: 534 chars (5.3%)
- **Total: 2,144 chars (21.4% of limit)**

You can generate these 4 scripts ~4 times before hitting the limit.

## 🎤 Voice Cloning

The script will use your wife's voice sample (`wife_sample1.ogg`) to clone her voice.

**Current sample:** 0.31 MB (<1 minute)

**For better quality:**
- Add 1-3 minutes of audio total
- Clear speech, no background noise
- Varied emotions and tones

## ⚙️ Troubleshooting

### "API key not set"
```powershell
# Check if set
$env:ELEVEN_API_KEY

# If empty, set it:
$env:ELEVEN_API_KEY = "sk_your_key_here"
```

### "API key invalid"
- Copy key directly from ElevenLabs dashboard
- Don't include spaces or quotes
- Make sure you're logged into the right account

### "Quota exceeded"
- Check usage: https://elevenlabs.io/app/usage
- Wait until next month for reset
- Or upgrade plan

## 🎯 Recommended Workflow

1. ✅ Set API key (Step 1)
2. ✅ Run check_setup.py (Step 2)
3. ✅ Generate AAPL only (Step 3)
4. 🎧 Listen to result
5. ✅ Generate rest if satisfied (Step 5)

---

**Ready?** Run these commands:
```powershell
# Set your API key
$env:ELEVEN_API_KEY = "paste-your-key-here"

# Check setup
python check_setup.py

# Generate test audio
python generate_voiceovers.py AAPL
```
