# Voiceovers Directory

This directory contains audio explanations for each table in the application.

## File Structure

```
public/voiceovers/
├── Valuation.mp3          # Valuation metrics explanation
├── Balance.mp3            # Balance sheet explanation
├── CashFlow.mp3           # Cash flow metrics explanation
├── MarginsGrowth.mp3      # Margins & growth explanation
└── scripts/
    ├── Valuation.txt      # Transcript for Valuation
    ├── Balance.txt        # Transcript for Balance
    ├── CashFlow.txt       # Transcript for CashFlow
    └── MarginsGrowth.txt  # Transcript for MarginsGrowth
```

## Table Names (must match exactly)

- `Valuation` - Valuation metrics (P/E, P/S, P/B, EV/EBITDA, Market Cap)
- `Balance` - Balance sheet (Cash, Debt, Net, Altman Z-Score)
- `CashFlow` - Cash flow metrics (FCF Yield, SBC Impact)
- `MarginsGrowth` - Margins and growth (Profit Margin, Operating Margin, YoY Growth)

## Generating Voiceovers

Use one of the voice generation scripts in `scripts/voice-generation/`:

### NaturalReader (Recommended - $9/1M chars)
```bash
cd scripts/voice-generation
python generate_voiceovers_naturalreader.py Valuation
```

### ElevenLabs (Voice cloning)
```bash
cd scripts/voice-generation
python generate_voiceovers_elevenlabs.py Valuation
```

### OpenAI TTS ($15/1M chars)
```bash
cd scripts/voice-generation
python generate_voiceovers_openai.py Valuation
```

### Bark (Free, local)
```bash
cd scripts/voice-generation
python generate_voiceovers_bark.py Valuation
```

## Moving Files

After generating voiceovers, copy them to this public folder:

```powershell
# Copy audio files
Copy-Item "scripts\voice-generation\voiceovers\Valuation.mp3" -Destination "public\voiceovers\Valuation.mp3"

# Copy transcript
Copy-Item "scripts\voice-generation\scripts\Valuation.txt" -Destination "public\voiceovers\scripts\Valuation.txt"
```

## Notes

- Audio files are **NOT** ticker-specific (they explain metrics, not companies)
- File names must match table names exactly (case-sensitive)
- Transcripts are optional but recommended for accessibility
- Each table has its own audio button in the top-right corner
