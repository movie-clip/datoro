# 🔑 API Keys Setup Guide

## Current Status

| API Key | Status | Required For |
|---------|--------|--------------|
| **ELEVENLABS_API_KEY** | ✅ Configured | Voice cloning & generation |
| **OPENAI_API_KEY** | ❌ Not set | Rap-style TTS |

## 🚀 Quick Setup

### Option 1: Set for Current Session Only

```powershell
# Set OpenAI API key (temporary - current PowerShell session only)
$env:OPENAI_API_KEY = "sk-proj-your-key-here"

# Verify it's set
if ($env:OPENAI_API_KEY) { Write-Host "✅ OpenAI key set" }

# Now run scripts
python scripts\voice-generation\generate_rap_style.py AAPL
```

### Option 2: Set Permanently (User Level)

```powershell
# Set permanently for your user account
[System.Environment]::SetEnvironmentVariable('OPENAI_API_KEY', 'sk-proj-your-key-here', 'User')

# Restart PowerShell to apply changes
# Then verify:
$env:OPENAI_API_KEY
```

### Option 3: Set Permanently (System Level)

```powershell
# Run PowerShell as Administrator, then:
[System.Environment]::SetEnvironmentVariable('OPENAI_API_KEY', 'sk-proj-your-key-here', 'Machine')

# Restart PowerShell to apply changes
```

### Option 4: Use .env File (Recommended for Projects)

1. Create `.env` file in `scripts/voice-generation/`:
```bash
ELEVENLABS_API_KEY=your-elevenlabs-key-here
OPENAI_API_KEY=sk-proj-your-openai-key-here
```

2. Update scripts to load from .env:
```python
from dotenv import load_dotenv
load_dotenv()
```

3. Install python-dotenv:
```powershell
.\.venv\Scripts\Activate.ps1
pip install python-dotenv
```

## 🔐 Getting API Keys

### ElevenLabs API Key (Already Have ✅)
You already have this configured! To get a new one:
1. Visit: https://elevenlabs.io/
2. Sign up / Log in
3. Go to Profile → API Keys
4. Copy your API key (starts with `sk_`)

**Free Tier:**
- 10,000 characters/month
- ~20 stock analyses
- Voice cloning included

**Paid Plans:**
- $5/month: 30,000 characters
- $22/month: 100,000 characters

### OpenAI API Key (Need to Set ❌)
1. Visit: https://platform.openai.com/
2. Sign up / Log in
3. Go to API Keys section
4. Create new secret key
5. Copy key (starts with `sk-proj-` or `sk-`)

**Pricing:**
- TTS HD: $15 per 1 million characters
- Your 4 scripts (~2,144 chars): ~$0.03
- 100 scripts: ~$1.50

## 📝 Verify Setup

### Check All Keys at Once:

```powershell
# Check ElevenLabs
if ($env:ELEVENLABS_API_KEY) {
    Write-Host "✅ ElevenLabs: $($env:ELEVENLABS_API_KEY.Length) characters"
} else {
    Write-Host "❌ ElevenLabs: NOT SET"
}

# Check OpenAI
if ($env:OPENAI_API_KEY) {
    Write-Host "✅ OpenAI: $($env:OPENAI_API_KEY.Length) characters"
} else {
    Write-Host "❌ OpenAI: NOT SET"
}
```

### Test ElevenLabs:
```powershell
.\.venv\Scripts\Activate.ps1
python scripts\voice-generation\check_setup.py
```

### Test OpenAI:
```powershell
.\.venv\Scripts\Activate.ps1
python scripts\voice-generation\generate_rap_style.py AAPL
```

## 🛡️ Security Best Practices

1. **Never commit API keys to Git:**
   - Add `.env` to `.gitignore`
   - Use environment variables
   - Use secrets management in production

2. **Rotate keys regularly:**
   - Generate new keys every 3-6 months
   - Delete old unused keys

3. **Monitor usage:**
   - Check ElevenLabs dashboard: https://elevenlabs.io/usage
   - Check OpenAI dashboard: https://platform.openai.com/usage

4. **Use rate limits:**
   - Scripts have built-in rate limiting
   - Pre-flight check prevents accidental overuse

## 🔧 Troubleshooting

### "API key not found" error:
```powershell
# Check if key is set
$env:OPENAI_API_KEY

# If empty, set it:
$env:OPENAI_API_KEY = "sk-proj-your-key-here"
```

### "Invalid API key" error:
- Verify key is correct (copy-paste from dashboard)
- Check for extra spaces or quotes
- Ensure key hasn't expired or been revoked

### "Rate limit exceeded" error:
- Wait a few minutes
- Check usage dashboard
- Upgrade plan if needed

### Environment variable not persisting:
- Use permanent setup (Option 2 or 3 above)
- Restart PowerShell after setting
- Check system vs user variables

## 📋 Quick Reference

### Set Temporarily (Current Session):
```powershell
$env:OPENAI_API_KEY = "your-key"
```

### Set Permanently (User):
```powershell
[System.Environment]::SetEnvironmentVariable('OPENAI_API_KEY', 'your-key', 'User')
```

### Check Current Value:
```powershell
$env:OPENAI_API_KEY
```

### Remove/Unset:
```powershell
[System.Environment]::SetEnvironmentVariable('OPENAI_API_KEY', $null, 'User')
```

---

**Need Help?** Check the main README.md or individual script documentation.
