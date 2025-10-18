"""
Local Voice Generation using Coqui TTS
- 100% free and open source
- Runs locally on your machine
- Voice cloning support
- No API costs or internet required

Setup:
1. Install: pip install TTS
2. Add voice samples to voice_samples/
3. Run: python generate_voiceovers_local.py AAPL
"""

import os
import sys
from pathlib import Path
import torch

# ─────────────────────────────
#  CONFIGURATION
# ─────────────────────────────

# Voice cloning settings
USE_VOICE_CLONING = True
VOICE_SAMPLES_DIR = Path("voice_samples")

# TTS Model Selection
# Options:
# - "tts_models/en/vctk/vits" - Multi-speaker, fast
# - "tts_models/en/ljspeech/tacotron2-DDC" - High quality
# - "tts_models/multilingual/multi-dataset/xtts_v2" - Best for voice cloning
MODEL_NAME = "tts_models/multilingual/multi-dataset/xtts_v2"

# Input/Output folders
SCRIPTS_DIR = Path("scripts")
OUTPUT_DIR = Path("voiceovers_local")
OUTPUT_DIR.mkdir(exist_ok=True)

# Audio settings
SAMPLE_RATE = 24000  # 24kHz output


def check_gpu():
    """Check if GPU is available for faster generation"""
    if torch.cuda.is_available():
        print(f"✅ GPU detected: {torch.cuda.get_device_name(0)}")
        return "cuda"
    else:
        print("ℹ️  No GPU detected, using CPU (will be slower)")
        return "cpu"


def setup_tts():
    """Initialize TTS model"""
    try:
        from TTS.api import TTS
        
        print(f"🔧 Loading model: {MODEL_NAME}")
        device = check_gpu()
        
        # Initialize TTS
        tts = TTS(model_name=MODEL_NAME, progress_bar=True).to(device)
        
        print("✅ Model loaded successfully!")
        return tts
        
    except ImportError:
        print("❌ Error: TTS package not installed!")
        print("   Install with: pip install TTS")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        print("   The model will be downloaded on first run (may take a few minutes)")
        raise


def get_voice_sample():
    """Get a voice sample for cloning"""
    if not USE_VOICE_CLONING:
        return None
    
    if not VOICE_SAMPLES_DIR.exists():
        print(f"⚠️  Voice samples directory not found: {VOICE_SAMPLES_DIR}")
        print("   Falling back to default voice")
        return None
    
    # Find first audio file
    for ext in ['*.mp3', '*.wav', '*.ogg', '*.flac', '*.m4a']:
        samples = list(VOICE_SAMPLES_DIR.glob(ext))
        if samples:
            sample_file = samples[0]
            print(f"🎤 Using voice sample: {sample_file.name}")
            return str(sample_file)
    
    print("⚠️  No voice samples found, using default voice")
    return None


def generate_voiceover(tts, text: str, output_path: Path, speaker_wav: str = None):
    """Generate voiceover from text"""
    try:
        print(f"🎙️  Generating voice for: {output_path.stem} ...")
        
        if speaker_wav and USE_VOICE_CLONING:
            # Voice cloning mode
            tts.tts_to_file(
                text=text,
                file_path=str(output_path),
                speaker_wav=speaker_wav,
                language="en"  # Change if needed: es, fr, de, etc.
            )
        else:
            # Default voice mode
            tts.tts_to_file(
                text=text,
                file_path=str(output_path)
            )
        
        print(f"✅ Saved: {output_path.name}")
        
    except Exception as e:
        print(f"❌ Error generating {output_path.name}: {e}")


def main():
    print("=" * 60)
    print("🎙️  LOCAL VOICE GENERATION (Coqui TTS)")
    print("=" * 60)
    
    # Initialize TTS
    print("\n📦 Initializing TTS engine...")
    tts = setup_tts()
    
    # Get voice sample for cloning
    speaker_wav = get_voice_sample()
    
    if speaker_wav:
        print("✅ Voice cloning enabled")
    else:
        print("ℹ️  Using default voice")
    
    # Check for command-line argument (specific ticker)
    if len(sys.argv) > 1:
        # Process specific ticker
        ticker = sys.argv[1].upper()
        txt_path = SCRIPTS_DIR / f"{ticker}.txt"
        
        if not txt_path.exists():
            print(f"\n❌ Error: Script file not found: {txt_path}")
            print(f"💡 Available scripts in {SCRIPTS_DIR}:")
            for f in SCRIPTS_DIR.glob("*.txt"):
                print(f"   - {f.stem}")
            return
        
        print(f"\n🎯 Processing single ticker: {ticker}\n")
        txt_files = [txt_path]
    else:
        # Process all text files
        txt_files = list(SCRIPTS_DIR.glob("*.txt"))
        if not txt_files:
            print(f"\n❌ No .txt files found in {SCRIPTS_DIR.resolve()}")
            return
        
        print(f"\n📝 Found {len(txt_files)} script(s) to process\n")
    
    # Process files
    for txt_path in txt_files:
        with open(txt_path, "r", encoding="utf-8") as f:
            text = f.read()
        
        if not text.strip():
            print(f"⚠️  Skipping empty file: {txt_path.name}")
            continue
        
        # Add _local suffix to distinguish from cloud-generated audio
        output_path = OUTPUT_DIR / f"{txt_path.stem}_local.wav"
        generate_voiceover(tts, text, output_path, speaker_wav)
    
    print("\n✅ All voiceovers generated successfully!")
    print(f"📁 Output folder: {OUTPUT_DIR.resolve()}")
    print("\n💡 Tips:")
    print("   - First run downloads the model (~2GB)")
    print("   - GPU makes generation much faster")
    print("   - Add more voice samples for better cloning")


if __name__ == "__main__":
    main()
