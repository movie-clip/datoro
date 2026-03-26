# Voice Generation

This directory contains optional utility scripts for generating voiceovers from text prompts.

It is not part of the main app build or deployment flow.

## Available Scripts

- `generate_voiceovers_naturalreader.py`
- `generate_voiceovers.py` for ElevenLabs
- `generate_rap_style.py` for OpenAI audio output
- `generate_voiceovers_bark.py`
- `generate_voiceovers_local.py`

## Quick Start

From `scripts/voice-generation/`:

```bash
python generate_voiceovers_naturalreader.py AAPL
```

Other common runs:

```bash
python generate_voiceovers.py AAPL
python generate_rap_style.py AAPL
python generate_voiceovers_bark.py AAPL
```

## Supporting Docs

- `NATURALREADER_GUIDE.md`
- `QUICKSTART_ELEVENLABS.md`
- `BARK_GUIDE.md`
- `LOCAL_TTS_GUIDE.md`
- `API_KEYS_SETUP.md`

## Notes

- generated audio is local output only
- keep API keys in environment variables
- this tooling is optional and separate from the web app
