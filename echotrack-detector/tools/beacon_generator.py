#!/usr/bin/env python3
"""
EchoTrack Beacon Generator
Generates ultrasonic FSK-encoded beacon tones for testing the detector app

Usage:
    python beacon_generator.py              # Generate beacon with random ID
    python beacon_generator.py --id ABC123  # Generate beacon with specific ID
    python beacon_generator.py --play       # Play through speakers
    python beacon_generator.py --save       # Save to WAV file
"""

import numpy as np
import argparse
import struct
import wave
import os
import random
import string

# FSK Configuration (must match the detector app)
SAMPLE_RATE = 48000
LOW_FREQ = 18500      # Binary 0
HIGH_FREQ = 19500     # Binary 1
PREAMBLE_FREQ = 19000
SYMBOL_DURATION_MS = 50
PREAMBLE_DURATION_MS = 200
AMPLITUDE = 0.8       # Volume (0.0 - 1.0)


def generate_tone(frequency: float, duration_ms: float, sample_rate: int = SAMPLE_RATE) -> np.ndarray:
    """Generate a pure sine wave tone"""
    num_samples = int(sample_rate * duration_ms / 1000)
    t = np.linspace(0, duration_ms / 1000, num_samples, endpoint=False)
    # Apply fade in/out to reduce clicking
    envelope = np.ones(num_samples)
    fade_samples = int(sample_rate * 0.002)  # 2ms fade
    if fade_samples > 0 and num_samples > fade_samples * 2:
        envelope[:fade_samples] = np.linspace(0, 1, fade_samples)
        envelope[-fade_samples:] = np.linspace(1, 0, fade_samples)
    return AMPLITUDE * envelope * np.sin(2 * np.pi * frequency * t)


def generate_preamble() -> np.ndarray:
    """Generate the preamble tone (19kHz for 200ms)"""
    return generate_tone(PREAMBLE_FREQ, PREAMBLE_DURATION_MS)


def string_to_bits(beacon_id: str) -> list:
    """Convert a hex beacon ID string to bits"""
    # Ensure it's 8 hex characters (32 bits)
    beacon_id = beacon_id.upper().ljust(8, '0')[:8]
    try:
        value = int(beacon_id, 16)
    except ValueError:
        # If not valid hex, hash the string
        value = hash(beacon_id) & 0xFFFFFFFF
    
    # Convert to 32 bits
    bits = []
    for i in range(31, -1, -1):
        bits.append((value >> i) & 1)
    
    return bits, value


def calculate_checksum(value: int) -> list:
    """Calculate 8-bit XOR checksum and return as bits"""
    checksum = 0
    for i in range(4):
        byte = (value >> (24 - i * 8)) & 0xFF
        checksum ^= byte
    
    # Convert checksum to 8 bits
    bits = []
    for i in range(7, -1, -1):
        bits.append((checksum >> i) & 1)
    
    return bits


def generate_beacon_signal(beacon_id: str) -> tuple:
    """Generate the complete beacon signal with preamble, data, and checksum"""
    # Generate preamble
    signal = generate_preamble()
    
    # Convert beacon ID to bits
    data_bits, value = string_to_bits(beacon_id)
    
    # Add checksum bits
    checksum_bits = calculate_checksum(value)
    all_bits = data_bits + checksum_bits
    
    # Generate FSK tones for each bit
    for bit in all_bits:
        freq = HIGH_FREQ if bit == 1 else LOW_FREQ
        tone = generate_tone(freq, SYMBOL_DURATION_MS)
        signal = np.concatenate([signal, tone])
    
    # Add small silence at beginning and end
    silence = np.zeros(int(SAMPLE_RATE * 0.1))  # 100ms silence
    signal = np.concatenate([silence, signal, silence])
    
    # Normalize to prevent clipping
    signal = signal / np.max(np.abs(signal)) * AMPLITUDE
    
    return signal, beacon_id.upper().ljust(8, '0')[:8]


def save_to_wav(signal: np.ndarray, filename: str):
    """Save signal to WAV file"""
    # Convert to 16-bit PCM
    signal_int = (signal * 32767).astype(np.int16)
    
    with wave.open(filename, 'w') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)  # 16-bit
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(signal_int.tobytes())
    
    print(f"✅ Saved beacon to: {filename}")


def play_signal(signal: np.ndarray):
    """Play signal through speakers (requires sounddevice)"""
    try:
        import sounddevice as sd
        print("🔊 Playing beacon tone...")
        sd.play(signal, SAMPLE_RATE)
        sd.wait()
        print("✅ Playback complete")
    except ImportError:
        print("❌ sounddevice not installed. Install with: pip install sounddevice")
        print("   Or use --save to save the beacon to a WAV file instead.")
    except Exception as e:
        print(f"❌ Playback error: {e}")


def generate_random_id() -> str:
    """Generate a random 8-character hex beacon ID"""
    return ''.join(random.choices('0123456789ABCDEF', k=8))


def main():
    parser = argparse.ArgumentParser(
        description='Generate ultrasonic FSK-encoded beacon tones for EchoTrack detector testing',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python beacon_generator.py                    # Random ID, print info only
  python beacon_generator.py --id ABC12345      # Specific ID
  python beacon_generator.py --play             # Play through speakers
  python beacon_generator.py --save             # Save to beacon.wav
  python beacon_generator.py --id TEST --play   # Specific ID + play

FSK Protocol:
  Preamble: 19000 Hz for 200ms
  Bit 0:    18500 Hz for 50ms
  Bit 1:    19500 Hz for 50ms
  Encoding: 32-bit beacon ID + 8-bit XOR checksum
        """
    )
    
    parser.add_argument('--id', type=str, help='Beacon ID (up to 8 hex characters)')
    parser.add_argument('--play', action='store_true', help='Play the beacon through speakers')
    parser.add_argument('--save', action='store_true', help='Save the beacon to a WAV file')
    parser.add_argument('--output', type=str, default='beacon.wav', help='Output WAV filename (default: beacon.wav)')
    parser.add_argument('--repeat', type=int, default=1, help='Number of times to repeat the beacon')
    
    args = parser.parse_args()
    
    # Generate or use provided beacon ID
    beacon_id = args.id if args.id else generate_random_id()
    
    print("=" * 50)
    print("🔊 EchoTrack Beacon Generator")
    print("=" * 50)
    print(f"Beacon ID:   {beacon_id.upper().ljust(8, '0')[:8]}")
    print(f"Sample Rate: {SAMPLE_RATE} Hz")
    print(f"Preamble:    {PREAMBLE_FREQ} Hz for {PREAMBLE_DURATION_MS}ms")
    print(f"Bit 0:       {LOW_FREQ} Hz")
    print(f"Bit 1:       {HIGH_FREQ} Hz")
    print(f"Symbol:      {SYMBOL_DURATION_MS}ms per bit")
    print("=" * 50)
    
    # Generate signal
    signal, final_id = generate_beacon_signal(beacon_id)
    
    # Repeat if requested
    if args.repeat > 1:
        silence = np.zeros(int(SAMPLE_RATE * 0.5))  # 500ms between repeats
        repeated = signal.copy()
        for _ in range(args.repeat - 1):
            repeated = np.concatenate([repeated, silence, signal])
        signal = repeated
        print(f"Repeating {args.repeat} times")
    
    duration_ms = len(signal) / SAMPLE_RATE * 1000
    print(f"Duration:    {duration_ms:.1f}ms ({len(signal)} samples)")
    print("=" * 50)
    
    if args.save:
        save_to_wav(signal, args.output)
    
    if args.play:
        play_signal(signal)
    
    if not args.save and not args.play:
        print("\nℹ️  Use --play to play through speakers")
        print("ℹ️  Use --save to save to WAV file")
        print("\nTo test with the EchoTrack app:")
        print("1. Run: python beacon_generator.py --play")
        print("2. Open EchoTrack app and tap 'Start Listening'")
        print("3. Play the beacon again, the app should detect it!")


if __name__ == '__main__':
    main()
