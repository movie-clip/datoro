"""
Voice Generation Pre-flight Check
Validates configuration and samples before running the actual script.
Prevents wasting API tokens on misconfigured setups.
"""

import os
import sys
from pathlib import Path

# ─────────────────────────────
#  CONFIGURATION (match main script)
# ─────────────────────────────
ELEVEN_API_KEY = os.getenv("ELEVEN_API_KEY", "")
USE_VOICE_CLONING = True
VOICE_SAMPLES_DIR = Path("voice_samples")
SCRIPTS_DIR = Path("scripts")

def check_api_key():
    """Check if API key is set"""
    print("🔍 Checking API key...")
    if not ELEVEN_API_KEY:
        print("❌ ERROR: ELEVEN_API_KEY environment variable not set!")
        print("   Set it with: $env:ELEVEN_API_KEY='your_key_here'")
        return False
    
    if len(ELEVEN_API_KEY) < 20:
        print("⚠️  WARNING: API key seems too short, might be invalid")
        return False
    
    print(f"✅ API key found ({len(ELEVEN_API_KEY)} characters)")
    return True


def check_voice_samples():
    """Check voice samples if cloning is enabled"""
    if not USE_VOICE_CLONING:
        print("ℹ️  Voice cloning disabled - skipping sample check")
        return True
    
    print("\n🔍 Checking voice samples...")
    
    if not VOICE_SAMPLES_DIR.exists():
        print(f"❌ ERROR: Voice samples directory not found: {VOICE_SAMPLES_DIR}")
        print("   Create it with: mkdir voice_samples")
        return False
    
    # Check for audio files
    sample_files = []
    for ext in ['*.mp3', '*.wav', '*.ogg', '*.flac', '*.m4a', '*.aac']:
        sample_files.extend(list(VOICE_SAMPLES_DIR.glob(ext)))
    
    if not sample_files:
        print(f"❌ ERROR: No audio files found in {VOICE_SAMPLES_DIR}")
        print("   Add .mp3, .wav, .ogg, .flac, or .m4a files")
        return False
    
    print(f"✅ Found {len(sample_files)} voice sample(s):")
    total_size = 0
    for sample in sample_files:
        size_mb = sample.stat().st_size / (1024 * 1024)
        total_size += size_mb
        print(f"   - {sample.name} ({size_mb:.2f} MB)")
    
    print(f"   Total size: {total_size:.2f} MB")
    
    # Estimate audio length (rough estimate: 1MB ≈ 1 minute for MP3)
    estimated_minutes = total_size
    if estimated_minutes < 1:
        print(f"⚠️  WARNING: Total audio might be less than 1 minute")
        print("   Recommended: 1-3 minutes for best voice cloning")
    else:
        print(f"✅ Estimated audio length: ~{estimated_minutes:.1f} minutes")
    
    return True


def check_scripts():
    """Check if script files exist"""
    print("\n🔍 Checking script files...")
    
    if not SCRIPTS_DIR.exists():
        print(f"❌ ERROR: Scripts directory not found: {SCRIPTS_DIR}")
        print("   Create it with: mkdir scripts")
        return False
    
    txt_files = list(SCRIPTS_DIR.glob("*.txt"))
    
    if not txt_files:
        print(f"❌ ERROR: No .txt files found in {SCRIPTS_DIR}")
        print("   Add text script files (e.g., AAPL.txt)")
        return False
    
    print(f"✅ Found {len(txt_files)} script file(s):")
    for txt_file in txt_files[:10]:  # Show max 10
        size_kb = txt_file.stat().st_size / 1024
        with open(txt_file, 'r', encoding='utf-8') as f:
            char_count = len(f.read())
        print(f"   - {txt_file.stem}: {char_count} characters ({size_kb:.1f} KB)")
    
    if len(txt_files) > 10:
        print(f"   ... and {len(txt_files) - 10} more")
    
    return True


def check_dependencies():
    """Check if required Python packages are installed"""
    print("\n🔍 Checking Python dependencies...")
    
    try:
        import elevenlabs
        print(f"✅ elevenlabs package installed (v{elevenlabs.__version__})")
    except ImportError:
        print("❌ ERROR: elevenlabs package not installed")
        print("   Install with: pip install elevenlabs")
        return False
    
    return True


def estimate_cost():
    """Estimate API usage and cost"""
    print("\n💰 Estimating costs...")
    
    txt_files = list(SCRIPTS_DIR.glob("*.txt"))
    total_chars = 0
    
    for txt_file in txt_files:
        with open(txt_file, 'r', encoding='utf-8') as f:
            total_chars += len(f.read())
    
    # ElevenLabs pricing
    free_tier_chars = 10000
    char_cost = 0.00030  # ~$0.30 per 1000 characters (Creator tier)
    
    print(f"📊 Total characters across all scripts: {total_chars:,}")
    
    if total_chars <= free_tier_chars:
        print(f"✅ Within free tier limit ({free_tier_chars:,} chars/month)")
    else:
        excess = total_chars - free_tier_chars
        cost = (excess / 1000) * char_cost
        print(f"⚠️  Exceeds free tier by {excess:,} characters")
        print(f"   Estimated cost: ~${cost:.2f}")
    
    return True


def main():
    print("=" * 60)
    print("🔧 VOICE GENERATION PRE-FLIGHT CHECK")
    print("=" * 60)
    
    checks = [
        ("Dependencies", check_dependencies),
        ("API Key", check_api_key),
        ("Voice Samples", check_voice_samples),
        ("Script Files", check_scripts),
        ("Cost Estimation", estimate_cost),
    ]
    
    all_passed = True
    
    for check_name, check_func in checks:
        try:
            if not check_func():
                all_passed = False
        except Exception as e:
            print(f"❌ ERROR in {check_name}: {e}")
            all_passed = False
    
    print("\n" + "=" * 60)
    
    if all_passed:
        print("✅ ALL CHECKS PASSED!")
        print("=" * 60)
        print("\n🚀 You're ready to run:")
        print("   python generate_voiceovers.py AAPL")
        print("   python generate_voiceovers.py        (for all scripts)")
        return 0
    else:
        print("❌ SOME CHECKS FAILED!")
        print("=" * 60)
        print("\n⚠️  Fix the errors above before running the script")
        print("   This prevents wasting API tokens on failed runs")
        return 1


if __name__ == "__main__":
    sys.exit(main())
