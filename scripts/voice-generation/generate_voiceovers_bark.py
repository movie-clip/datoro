"""
Generate voiceovers locally using Bark TTS (Suno AI)
Runs completely FREE on your local machine - no API costs!

Features:
- 100% free and local (no internet needed after model download)
- High quality neural TTS
- Multiple voices/speakers
- Works with Python 3.12
- ~2-3GB model download on first run

Note: Bark doesn't support custom voice cloning from audio samples,
but it has many high-quality preset voices to choose from.
"""

import os
import sys
from pathlib import Path
import time
import warnings

# Fix for PyTorch 2.6+ weights loading issue with Bark models
import torch

# Monkey-patch torch.load to use weights_only=False for Bark compatibility
_original_torch_load = torch.load
def _patched_torch_load(*args, **kwargs):
    # Force weights_only=False for Bark model loading
    kwargs['weights_only'] = False
    return _original_torch_load(*args, **kwargs)
torch.load = _patched_torch_load

try:
    from bark import SAMPLE_RATE, generate_audio, preload_models
    from scipy.io.wavfile import write as write_wav
    import numpy as np
except ImportError as e:
    print("❌ Error: Required packages not installed")
    print(f"   {e}")
    print("\n📦 Install with:")
    print("   pip install suno-bark scipy numpy")
    sys.exit(1)

# Suppress warnings
warnings.filterwarnings('ignore')


# Configuration
SCRIPT_DIR = Path(__file__).parent
SCRIPTS_FOLDER = SCRIPT_DIR / "scripts"
OUTPUT_FOLDER = SCRIPT_DIR / "voiceovers_local"
OUTPUT_FOLDER.mkdir(exist_ok=True)

# Bark voice presets (you can change this to any of the available speakers)
# Available voices: v2/en_speaker_0 through v2/en_speaker_9
# Female voices: 1, 2, 3, 5, 7, 9
# Male voices: 0, 4, 6, 8
VOICE = "v2/en_speaker_5"  # Female voice (change to your preference)

# Generation settings
TEMPERATURE = 0.7  # 0.0-1.0, lower = more consistent, higher = more expressive


def check_gpu():
    """Check if CUDA GPU is available"""
    try:
        import torch
        if torch.cuda.is_available():
            gpu_name = torch.cuda.get_device_name(0)
            print(f"✅ GPU detected: {gpu_name}")
            return True
        else:
            print("ℹ️  No GPU detected, using CPU (will be slower)")
            return False
    except ImportError:
        print("ℹ️  PyTorch not installed, using CPU")
        return False


def list_available_voices():
    """Display available Bark voices"""
    print("\n🎤 Available Bark Voices:")
    print("   Female: v2/en_speaker_1, v2/en_speaker_2, v2/en_speaker_3")
    print("           v2/en_speaker_5, v2/en_speaker_7, v2/en_speaker_9")
    print("   Male:   v2/en_speaker_0, v2/en_speaker_4, v2/en_speaker_6")
    print("           v2/en_speaker_8")
    print(f"\n   Current voice: {VOICE}")
    print("   (Change VOICE variable in script to use different voice)\n")


def get_script_files():
    """Get all .txt files from scripts folder"""
    if not SCRIPTS_FOLDER.exists():
        print(f"❌ Scripts folder not found: {SCRIPTS_FOLDER}")
        return []
    
    script_files = list(SCRIPTS_FOLDER.glob("*.txt"))
    return script_files


def read_script(filepath):
    """Read script content from file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read().strip()
    except Exception as e:
        print(f"❌ Error reading {filepath}: {e}")
        return None


def generate_voiceover_local(ticker, text):
    """Generate voiceover using Bark TTS"""
    output_file = OUTPUT_FOLDER / f"{ticker}_bark.wav"
    
    print(f"\n{'='*60}")
    print(f"🎙️  Generating: {ticker}")
    print(f"{'='*60}")
    print(f"📝 Text: {text[:100]}..." if len(text) > 100 else f"📝 Text: {text}")
    print(f"🎤 Voice: {VOICE}")
    print(f"💾 Output: {output_file}")
    print(f"{'='*60}\n")
    
    try:
        start_time = time.time()
        
        # Generate audio with Bark
        print("🔄 Generating audio (this may take 10-60 seconds)...")
        audio_array = generate_audio(
            text,
            history_prompt=VOICE,
            text_temp=TEMPERATURE,
            waveform_temp=TEMPERATURE
        )
        
        # Save to WAV file
        print("💾 Saving audio file...")
        write_wav(output_file, SAMPLE_RATE, audio_array)
        
        elapsed = time.time() - start_time
        duration = len(audio_array) / SAMPLE_RATE
        file_size = output_file.stat().st_size / 1024 / 1024  # MB
        
        print(f"\n✅ Success!")
        print(f"   ⏱️  Generated in: {elapsed:.1f}s")
        print(f"   🎵 Audio duration: {duration:.1f}s")
        print(f"   💾 File size: {file_size:.2f} MB")
        print(f"   📁 Saved to: {output_file}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error generating audio: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("=" * 60)
    print("🎙️  BARK LOCAL VOICE GENERATION")
    print("=" * 60)
    print("💯 100% FREE - Runs completely on your local machine")
    print("🔒 Private - No data sent to cloud")
    print("=" * 60)
    
    # Check GPU
    has_gpu = check_gpu()
    if not has_gpu:
        print("⚠️  Warning: CPU generation is SLOW (30-60s per paragraph)")
        print("   Consider using GPU for faster generation\n")
    
    # Show available voices
    list_available_voices()
    
    # Download models on first run
    print("📦 Loading Bark models (first run downloads ~2-3GB)...")
    try:
        preload_models()
        print("✅ Models loaded\n")
    except Exception as e:
        print(f"❌ Error loading models: {e}")
        print("\n💡 Tip: Ensure you have stable internet for first-time model download")
        return
    
    # Get ticker from command line or process all
    if len(sys.argv) > 1:
        ticker = sys.argv[1].upper()
        script_file = SCRIPTS_FOLDER / f"{ticker}.txt"
        
        if not script_file.exists():
            print(f"❌ Script not found: {script_file}")
            print(f"\n📁 Available scripts:")
            for f in get_script_files():
                print(f"   - {f.stem}")
            return
        
        script_files = [script_file]
    else:
        script_files = get_script_files()
        if not script_files:
            print(f"❌ No script files found in {SCRIPTS_FOLDER}")
            return
    
    print(f"📋 Processing {len(script_files)} script(s)\n")
    
    # Process each script
    success_count = 0
    total_start = time.time()
    
    for script_file in script_files:
        ticker = script_file.stem.upper()
        text = read_script(script_file)
        
        if not text:
            continue
        
        if generate_voiceover_local(ticker, text):
            success_count += 1
    
    # Summary
    total_time = time.time() - total_start
    print("\n" + "=" * 60)
    print("📊 GENERATION COMPLETE")
    print("=" * 60)
    print(f"✅ Successfully generated: {success_count}/{len(script_files)}")
    print(f"⏱️  Total time: {total_time:.1f}s")
    print(f"📁 Output folder: {OUTPUT_FOLDER}")
    print(f"💰 Total cost: $0 (100% free!)")
    print("=" * 60)


if __name__ == "__main__":
    main()
