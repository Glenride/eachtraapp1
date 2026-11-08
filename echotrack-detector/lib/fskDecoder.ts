/**
 * FSK Decoder for EchoTrack Beacon Detection
 * Decodes frequency-shift keyed beacon IDs from ultrasonic audio
 */

import { FSK_CONFIG, AUDIO_CONFIG } from './audioProcessor';

export interface DecodedBeacon {
    beaconId: string;
    signalStrengthDb: number;
    timestamp: Date;
    isValid: boolean;
}

export enum DecoderState {
    LISTENING = 'LISTENING',
    PREAMBLE_DETECTED = 'PREAMBLE_DETECTED',
    DECODING = 'DECODING',
    COMPLETE = 'COMPLETE',
}

/**
 * FSK Decoder class for beacon ID extraction
 */
export class FSKDecoder {
    private state: DecoderState = DecoderState.LISTENING;
    private bitBuffer: number[] = [];
    private preambleCount: number = 0;
    private samplesPerSymbol: number;
    private preambleSamples: number;
    private frequencyTolerance: number = 200; // Hz tolerance for frequency matching

    constructor(sampleRate: number = AUDIO_CONFIG.SAMPLE_RATE) {
        // Calculate samples needed for each symbol
        this.samplesPerSymbol = Math.floor(
            (FSK_CONFIG.SYMBOL_DURATION_MS / 1000) * sampleRate
        );
        this.preambleSamples = Math.floor(
            (FSK_CONFIG.PREAMBLE_DURATION_MS / 1000) * sampleRate
        );
    }

    /**
     * Reset decoder state
     */
    public reset(): void {
        this.state = DecoderState.LISTENING;
        this.bitBuffer = [];
        this.preambleCount = 0;
    }

    /**
     * Check if frequency matches expected with tolerance
     */
    private frequencyMatches(detected: number, expected: number): boolean {
        return Math.abs(detected - expected) <= this.frequencyTolerance;
    }

    /**
     * Process a frequency detection and update state
     */
    public processFrequency(
        frequency: number,
        signalStrengthDb: number
    ): DecodedBeacon | null {
        // Ignore weak signals
        if (signalStrengthDb < AUDIO_CONFIG.DETECTION_THRESHOLD_DB) {
            // If we were in the middle of decoding, reset after timeout
            if (this.state === DecoderState.DECODING && this.bitBuffer.length > 0) {
                // Could implement timeout logic here
            }
            return null;
        }

        switch (this.state) {
            case DecoderState.LISTENING:
                // Look for preamble frequency
                if (this.frequencyMatches(frequency, FSK_CONFIG.PREAMBLE_FREQ)) {
                    this.preambleCount++;
                    // Need ~4 consecutive preamble detections (200ms / 50ms per symbol)
                    if (this.preambleCount >= 3) {
                        this.state = DecoderState.PREAMBLE_DETECTED;
                        console.log('[FSK] Preamble detected');
                    }
                } else {
                    this.preambleCount = 0;
                }
                break;

            case DecoderState.PREAMBLE_DETECTED:
                // Wait for data to start (non-preamble frequency)
                if (!this.frequencyMatches(frequency, FSK_CONFIG.PREAMBLE_FREQ)) {
                    this.state = DecoderState.DECODING;
                    this.bitBuffer = [];
                    // Process this frequency as first data bit
                    this.processBit(frequency);
                }
                break;

            case DecoderState.DECODING:
                this.processBit(frequency);

                // Check if we have a complete beacon ID (32 bits = 8 hex chars + 8 bit checksum)
                if (this.bitBuffer.length >= 40) {
                    const result = this.decodeBuffer(signalStrengthDb);
                    this.reset();
                    return result;
                }
                break;
        }

        return null;
    }

    /**
     * Process a single frequency as a bit
     */
    private processBit(frequency: number): void {
        if (this.frequencyMatches(frequency, FSK_CONFIG.LOW_FREQ)) {
            this.bitBuffer.push(0);
        } else if (this.frequencyMatches(frequency, FSK_CONFIG.HIGH_FREQ)) {
            this.bitBuffer.push(1);
        }
        // Ignore frequencies that don't match either
    }

    /**
     * Decode the bit buffer into a beacon ID
     */
    private decodeBuffer(signalStrengthDb: number): DecodedBeacon {
        // Extract 32-bit beacon ID (first 32 bits)
        const idBits = this.bitBuffer.slice(0, 32);
        const checksumBits = this.bitBuffer.slice(32, 40);

        // Convert bits to hex string
        let idValue = 0;
        for (let i = 0; i < idBits.length; i++) {
            idValue = (idValue << 1) | idBits[i];
        }
        const beaconId = idValue.toString(16).toUpperCase().padStart(8, '0');

        // Calculate checksum
        let calculatedChecksum = 0;
        for (let i = 0; i < 4; i++) {
            const byte = (idValue >> (24 - i * 8)) & 0xFF;
            calculatedChecksum ^= byte;
        }

        // Extract received checksum
        let receivedChecksum = 0;
        for (let i = 0; i < checksumBits.length; i++) {
            receivedChecksum = (receivedChecksum << 1) | checksumBits[i];
        }

        const isValid = calculatedChecksum === receivedChecksum;

        console.log(`[FSK] Decoded beacon: ${beaconId}, valid: ${isValid}`);

        return {
            beaconId,
            signalStrengthDb,
            timestamp: new Date(),
            isValid,
        };
    }

    /**
     * Get current decoder state
     */
    public getState(): DecoderState {
        return this.state;
    }

    /**
     * Get current bit buffer length
     */
    public getBufferLength(): number {
        return this.bitBuffer.length;
    }
}
