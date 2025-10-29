"""
Rap/Music Style Text-to-Speech using OpenAI API.
Features:
- Singing/rap style voice generation
- Multiple voice options
- Speed control for rap delivery

Setup:
1. Install: pip install openai
2. Get API key from: https://platform.openai.com/api-keys
3. Set environment variable: OPENAI_API_KEY=your_key_here
"""

import os
import sys
from pathlib import Path
from openai import OpenAI

# ─────────────────────────────
#  CONFIGURATION
# ─────────────────────────────
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")  # Set via environment variable

# Voice Selection for rap/music style
# Options: alloy, echo, fable, onyx, nova, shimmer
# Best for rap: onyx (deep), echo (resonant), fable (expressive)
VOICE = "onyx"

# Model Selection
# Use 'tts-1-hd' for high quality or 'tts-1' for faster generation
MODEL = "tts-1-hd"  # Standard high-quality TTS model

# Speed control (0.25 to 4.0)
# 0.8-1.0 = Slow rap, 1.0-1.2 = Normal rap, 1.2-1.5 = Fast rap
SPEED = 1.1

# Input/Output folders
SCRIPTS_DIR = Path("scripts")
OUTPUT_DIR = Path("voiceovers")
OUTPUT_DIR.mkdir(exist_ok=True)


def format_text_for_rap(text: str) -> str:
    """
    Format text to sound more like rap/music.
    Adds pauses, emphasis, and rhythm cues.
    """
    # Add dramatic pauses between sentences
    text = text.replace(". ", "... ")
    
    # Add emphasis to numbers and key metrics
    text = text.replace("%", " percent")
    text = text.replace("$", " dollar ")
    
    # Add rhythm breaks at commas
    text = text.replace(", ", ", ... ")
    
    return text


def generate_rap_voiceover(
    client: OpenAI,
    text: str,
    output_path: Path,
    add_rhythm: bool = True
):
    """Generate rap-style voiceover from text."""
    try:
        print(f"🎤 Generating rap-style voice for: {output_path.stem} ...")
        
        # Format text for better rhythm if enabled
        if add_rhythm:
            formatted_text = format_text_for_rap(text)
        else:
            formatted_text = text
        
        # Add rap context instruction
        rap_prompt = f"[Speak in a rhythmic, rap-style delivery with emphasis and flow] {formatted_text}"
        
        # Generate audio
        response = client.audio.speech.create(
            model=MODEL,
            voice=VOICE,
            input=rap_prompt,
            speed=SPEED
        )
        
        # Save audio to file (write binary content)
        with open(output_path, "wb") as f:
            f.write(response.content)
        
        print(f"✅ Saved: {output_path.name}")
        
    except Exception as e:
        print(f"❌ Error generating {output_path.name}: {e}")


def main():
    # Validate API key
    if not OPENAI_API_KEY:
        print("❌ Error: OPENAI_API_KEY environment variable not set!")
        print("Get your API key from: https://platform.openai.com/api-keys")
        print("Set it with: $env:OPENAI_API_KEY='your_key_here' (PowerShell)")
        return
    
    # Initialize client
    client = OpenAI(api_key=OPENAI_API_KEY)
    
    print(f"🎵 Using voice: {VOICE} at speed: {SPEED}x")
    print(f"🎶 Model: {MODEL}")
    
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
        
        # Add _rap suffix to distinguish from normal voiceovers
        output_path = OUTPUT_DIR / f"{txt_path.stem}_rap.mp3"
        generate_rap_voiceover(client, text, output_path)
    
    print("\n✅ All rap-style voiceovers generated successfully!")
    print(f"📁 Output folder: {OUTPUT_DIR.resolve()}")
    print("\n💡 Tip: Adjust SPEED in the script for faster/slower rap delivery")


if __name__ == "__main__":
    main()
