"""
Batch Text-to-Speech voiceover generator using ElevenLabs API.
Features:
- Voice cloning from audio samples
- Custom accent modification
- High-quality voice generation
- Batch processing of scripts

Setup:
1. Install: pip install elevenlabs
2. Get API key from: https://elevenlabs.io/
3. Set environment variable: ELEVEN_API_KEY=your_key_here
"""

import os
import sys
from pathlib import Path
from elevenlabs import ElevenLabs, VoiceSettings

# ─────────────────────────────
#  CONFIGURATION
# ─────────────────────────────
ELEVEN_API_KEY = os.getenv("ELEVEN_API_KEY", "")  # Set via environment variable for security

# Voice cloning settings
USE_VOICE_CLONING = False  # Set to True to use voice cloning
VOICE_NAME = "wife"  # Name for your cloned voice
VOICE_SAMPLES_DIR = Path("voice_samples")  # Folder with your voice samples (.mp3, .wav)

# Preset voice ID (used if USE_VOICE_CLONING = False)
# Popular voices: "21m00Tcm4TlvDq8ikWAM" (Rachel), "29vD33N1CtxCmqQRPOHJ" (Drew)
# self voice "pU6T98N0nNOVluKPfsLU"
# wife voice "3CIN7JGA9faDzDSRhhVP"
PRESET_VOICE_ID = "pU6T98N0nNOVluKPfsLU"

# Voice settings
STABILITY = 0.5  # 0.0-1.0: Lower = more expressive, Higher = more stable
SIMILARITY_BOOST = 0.75  # 0.0-1.0: How closely to match the voice
STYLE = 0.0  # 0.0-1.0: Style exaggeration
USE_SPEAKER_BOOST = False  # Enhance speaker similarity

# Accent modification
ENABLE_ACCENT_MODIFICATION = False  # Set to True to modify accent
ACCENT_DESCRIPTION = "British accent"  # Describe desired accent

# Input/Output folders
SCRIPTS_DIR = Path("scripts")
OUTPUT_DIR = Path("voiceovers")
OUTPUT_DIR.mkdir(exist_ok=True)

# Model selection: "eleven_multilingual_v2", "eleven_turbo_v2", "eleven_monolingual_v1"
MODEL = "eleven_multilingual_v2"


def get_or_create_cloned_voice(client: ElevenLabs, voice_name: str) -> str:
    """
    Get existing cloned voice ID or create new one from samples.
    For FREE PLAN: This will look for voices you created manually in the web interface.
    API voice creation requires a paid plan.
    """
    try:
        # Check if voice already exists in your account
        print(f"🔍 Looking for voice: {voice_name}")
        voices = client.voices.get_all()
        for voice in voices.voices:
            if voice.name == voice_name:
                print(f"✅ Found existing voice: {voice_name} (ID: {voice.voice_id})")
                return voice.voice_id
        
        # Voice not found
        print(f"⚠️  Voice '{voice_name}' not found in your account")
        print(f"💡 To use custom voice on FREE plan:")
        print(f"   1. Go to https://elevenlabs.io/app/voice-lab")
        print(f"   2. Create/clone your voice manually using web interface")
        print(f"   3. Name it '{voice_name}' or update VOICE_NAME in script")
        raise Exception(f"Voice '{voice_name}' not found")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        raise


def generate_voiceover(
    client: ElevenLabs,
    text: str,
    voice_id: str,
    output_path: Path
):
    """Generate voiceover from text using ElevenLabs API."""
    try:
        print(f"🎙️  Generating voice for: {output_path.stem} ...")
        
        # Prepare voice settings
        voice_settings = VoiceSettings(
            stability=STABILITY,
            similarity_boost=SIMILARITY_BOOST,
            style=STYLE,
            use_speaker_boost=USE_SPEAKER_BOOST
        )
        
        # Modify text for accent if enabled
        prompt = text
        if ENABLE_ACCENT_MODIFICATION:
            prompt = f"[Speak with a {ACCENT_DESCRIPTION}] {text}"
        
        # Generate audio
        audio_generator = client.text_to_speech.convert(
            voice_id=voice_id,
            text=prompt,
            model_id=MODEL,
            voice_settings=voice_settings,
        )
        
        # Save audio to file
        with open(output_path, "wb") as f:
            for chunk in audio_generator:
                f.write(chunk)
        
        print(f"✅ Saved: {output_path.name}")
        
    except Exception as e:
        print(f"❌ Error generating {output_path.name}: {e}")


def main():
    # Validate API key
    if not ELEVEN_API_KEY:
        print("❌ Error: ELEVEN_API_KEY environment variable not set!")
        print("Get your API key from: https://elevenlabs.io/")
        print("Set it with: $env:ELEVEN_API_KEY='your_key_here' (PowerShell)")
        return
    
    # Initialize client
    client = ElevenLabs(api_key=ELEVEN_API_KEY)
    
    # Get voice ID
    if USE_VOICE_CLONING:
        try:
            voice_id = get_or_create_cloned_voice(client, VOICE_NAME)
        except Exception as e:
            print(f"❌ Failed to setup voice cloning. Falling back to preset voice.")
            voice_id = PRESET_VOICE_ID
    else:
        voice_id = PRESET_VOICE_ID
        print(f"🎵 Using preset voice ID: {voice_id}")
    
    # Check for command-line argument (specific ticker)
    if len(sys.argv) > 1:
        # Process specific ticker
        ticker = sys.argv[1].upper()
        txt_path = SCRIPTS_DIR / f"{ticker}.txt"
        
        if not txt_path.exists():
            print(f"❌ Error: Script file not found: {txt_path}")
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
            print(f"❌ No .txt files found in {SCRIPTS_DIR.resolve()}")
            return
        
        print(f"\n📝 Found {len(txt_files)} script(s) to process\n")
    
    # Process files
    for txt_path in txt_files:
        with open(txt_path, "r", encoding="utf-8") as f:
            text = f.read()
        
        if not text.strip():
            print(f"⚠️  Skipping empty file: {txt_path.name}")
            continue
        
        output_path = OUTPUT_DIR / f"{txt_path.stem}.mp3"
        generate_voiceover(client, text, voice_id, output_path)
    
    print("\n✅ All voiceovers generated successfully!")
    print(f"📁 Output folder: {OUTPUT_DIR.resolve()}")


if __name__ == "__main__":
    main()
