"""
Batch Text-to-Speech voiceover generator using NaturalReader API.
Features:
- High-quality neural voices
- Multiple voice options
- Affordable pricing
- Batch processing of scripts

Setup:
1. Get API key from: https://www.naturalreaders.com/online/
2. Set environment variable: NATURALREADER_API_KEY=your_key_here
3. Install: pip install requests

Pricing:
- Pay as you go: $9 per 1 million characters
- Much cheaper than ElevenLabs for large volumes
"""

import os
import sys
from pathlib import Path
import requests
import time

# ─────────────────────────────
#  CONFIGURATION
# ─────────────────────────────
NATURALREADER_API_KEY = os.getenv("NATURALREADER_API_KEY", "")  # Set via environment variable

# Voice settings
# Popular voices:
# - "en-US-davis" - Professional male
# - "en-US-madison" - Professional female  
# - "en-US-guy" - Conversational male
# - "en-US-aria" - Warm female
# - "en-GB-sonia" - British female
# - "en-GB-ryan" - British male
VOICE_NAME = "en-US-madison"  # Professional female voice

# Audio settings
AUDIO_FORMAT = "mp3"  # mp3, wav, ogg
SPEED = 0  # -3 to +3 (0 = normal speed)
PITCH = 0  # -12 to +12 (0 = normal pitch)

# Input/Output folders
SCRIPTS_DIR = Path("scripts")
OUTPUT_DIR = Path("voiceovers_naturalreader")
OUTPUT_DIR.mkdir(exist_ok=True)

# API endpoints
API_BASE_URL = "https://api.naturalreaders.com/v4/tts"


def get_script_files():
    """Get all .txt files from scripts folder"""
    if not SCRIPTS_DIR.exists():
        print(f"❌ Scripts folder not found: {SCRIPTS_DIR}")
        return []
    
    script_files = list(SCRIPTS_DIR.glob("*.txt"))
    return sorted(script_files)


def read_script(filepath):
    """Read script content from file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read().strip()
    except Exception as e:
        print(f"❌ Error reading {filepath}: {e}")
        return None


def generate_voiceover(text, voice_name, output_path):
    """
    Generate voiceover using NaturalReader API
    
    Args:
        text: Text to convert to speech
        voice_name: Voice ID to use
        output_path: Path to save the audio file
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        print(f"🎙️  Generating voice for: {output_path.stem} ...")
        print(f"   Voice: {voice_name}")
        print(f"   Characters: {len(text)}")
        
        # Prepare request payload
        payload = {
            "text": text,
            "voice": voice_name,
            "format": AUDIO_FORMAT,
            "speed": SPEED,
            "pitch": PITCH
        }
        
        headers = {
            "Authorization": f"Bearer {NATURALREADER_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # Make API request
        response = requests.post(
            API_BASE_URL,
            json=payload,
            headers=headers,
            timeout=60
        )
        
        if response.status_code != 200:
            print(f"❌ API Error: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
        
        # Check if response is JSON (error) or audio data
        content_type = response.headers.get('Content-Type', '')
        if 'application/json' in content_type:
            # API returned JSON, likely an error
            error_data = response.json()
            print(f"❌ API Error: {error_data}")
            return False
        
        # Save audio file
        with open(output_path, 'wb') as f:
            f.write(response.content)
        
        file_size = output_path.stat().st_size / 1024  # KB
        print(f"✅ Saved: {output_path.name} ({file_size:.1f} KB)")
        
        return True
        
    except requests.exceptions.Timeout:
        print(f"❌ Request timeout for {output_path.name}")
        return False
    except Exception as e:
        print(f"❌ Error generating {output_path.name}: {e}")
        import traceback
        traceback.print_exc()
        return False


def estimate_cost(total_chars):
    """Estimate cost based on character count"""
    cost_per_million = 9  # $9 per 1 million characters
    cost = (total_chars / 1_000_000) * cost_per_million
    return cost


def main():
    print("=" * 60)
    print("🎙️  NATURALREADER VOICE GENERATION")
    print("=" * 60)
    
    # Validate API key
    if not NATURALREADER_API_KEY:
        print("❌ Error: NATURALREADER_API_KEY environment variable not set!")
        print("Get your API key from: https://www.naturalreaders.com/online/")
        print("Set it with: $env:NATURALREADER_API_KEY='your_key_here' (PowerShell)")
        return
    
    # Get ticker from command line or process all
    if len(sys.argv) > 1:
        ticker = sys.argv[1].upper()
        script_file = SCRIPTS_DIR / f"{ticker}.txt"
        
        if not script_file.exists():
            print(f"❌ Script not found: {script_file}")
            print(f"\n📁 Available scripts:")
            for f in get_script_files():
                print(f"   - {f.stem}")
            return
        
        script_files = [script_file]
        print(f"🎯 Processing single ticker: {ticker}\n")
    else:
        script_files = get_script_files()
        if not script_files:
            print(f"❌ No script files found in {SCRIPTS_DIR}")
            return
        print(f"📋 Processing {len(script_files)} script(s)\n")
    
    # Estimate costs
    total_chars = 0
    for script_file in script_files:
        text = read_script(script_file)
        if text:
            total_chars += len(text)
    
    estimated_cost = estimate_cost(total_chars)
    print(f"💰 Cost Estimate:")
    print(f"   Total characters: {total_chars:,}")
    print(f"   Estimated cost: ${estimated_cost:.4f}")
    print(f"   (Based on $9 per 1M characters)")
    print()
    
    # Process each script
    success_count = 0
    failed_count = 0
    start_time = time.time()
    
    for script_file in script_files:
        ticker = script_file.stem.upper()
        text = read_script(script_file)
        
        if not text:
            failed_count += 1
            continue
        
        output_path = OUTPUT_DIR / f"{ticker}.{AUDIO_FORMAT}"
        
        if generate_voiceover(text, VOICE_NAME, output_path):
            success_count += 1
        else:
            failed_count += 1
        
        # Rate limiting - be nice to the API
        time.sleep(1)
    
    # Summary
    elapsed = time.time() - start_time
    print("\n" + "=" * 60)
    print("✅ All voiceovers generated successfully!")
    print("=" * 60)
    print(f"✅ Successful: {success_count}")
    print(f"❌ Failed: {failed_count}")
    print(f"⏱️  Time: {elapsed:.1f}s")
    print(f"📁 Output folder: {OUTPUT_DIR.absolute()}")
    print("=" * 60)


if __name__ == "__main__":
    main()
