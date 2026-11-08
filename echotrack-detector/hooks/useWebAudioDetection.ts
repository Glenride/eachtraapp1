/**
 * Web Audio Detection Hook
 * Uses Web Audio API for real-time FFT analysis and beacon detection
 * This only works in web/browser environment
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { AUDIO_CONFIG, FSK_CONFIG } from '../lib/audioProcessor';
import { DecodedBeacon, DecoderState as FSKDecoderState } from '../lib/fskDecoder';

export type DetectionStatus = 'idle' | 'requesting_permission' | 'listening' | 'recording' | 'analyzing' | 'detected' | 'error';

export interface BeaconDetectionState {
    status: DetectionStatus;
    currentBeacon: DecodedBeacon | null;
    signalStrengthDb: number;
    dominantFrequency: number | null;
    decoderState: FSKDecoderState;
    error: string | null;
    history: DecodedBeacon[];
    recordingDuration: number;
}

export interface BeaconDetectionControls {
    startListening: () => Promise<void>;
    stopListening: () => void;
    clearHistory: () => void;
}

// FSK Decoder state machine
enum DecoderState {
    LISTENING = 'LISTENING',
    PREAMBLE_DETECTED = 'PREAMBLE_DETECTED',
    DECODING = 'DECODING',
}

const FREQUENCY_TOLERANCE = 300; // Hz tolerance for frequency matching

export function useWebAudioDetection(): [BeaconDetectionState, BeaconDetectionControls] {
    const [state, setState] = useState<BeaconDetectionState>({
        status: 'idle',
        currentBeacon: null,
        signalStrengthDb: -100,
        dominantFrequency: null,
        decoderState: FSKDecoderState.LISTENING,
        error: null,
        history: [],
        recordingDuration: 0,
    });

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const isListeningRef = useRef(false);

    // FSK decoder state
    const decoderStateRef = useRef<DecoderState>(DecoderState.LISTENING);
    const preambleCountRef = useRef(0);
    const bitBufferRef = useRef<number[]>([]);
    const lastFrequencyRef = useRef<number | null>(null);
    const frequencyStableCountRef = useRef(0);

    const cleanup = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        analyserRef.current = null;
    }, []);

    useEffect(() => {
        return () => cleanup();
    }, [cleanup]);

    const frequencyMatches = (detected: number, expected: number): boolean => {
        return Math.abs(detected - expected) <= FREQUENCY_TOLERANCE;
    };

    const resetDecoder = () => {
        decoderStateRef.current = DecoderState.LISTENING;
        preambleCountRef.current = 0;
        bitBufferRef.current = [];
        frequencyStableCountRef.current = 0;
    };

    const decodeBeaconId = (bits: number[]): DecodedBeacon | null => {
        if (bits.length < 40) return null; // Need 32 data bits + 8 checksum bits

        // Extract 32-bit beacon ID
        let idValue = 0;
        for (let i = 0; i < 32; i++) {
            idValue = (idValue << 1) | (bits[i] || 0);
        }
        const beaconId = idValue.toString(16).toUpperCase().padStart(8, '0');

        // Calculate expected checksum
        let expectedChecksum = 0;
        for (let i = 0; i < 4; i++) {
            const byte = (idValue >> (24 - i * 8)) & 0xFF;
            expectedChecksum ^= byte;
        }

        // Extract received checksum
        let receivedChecksum = 0;
        for (let i = 32; i < 40; i++) {
            receivedChecksum = (receivedChecksum << 1) | (bits[i] || 0);
        }

        return {
            beaconId,
            signalStrengthDb: -45,
            timestamp: new Date(),
            isValid: expectedChecksum === receivedChecksum,
        };
    };

    const processFrequency = useCallback((frequency: number, magnitudeDb: number) => {
        // Update UI state
        setState(prev => ({
            ...prev,
            dominantFrequency: frequency,
            signalStrengthDb: magnitudeDb,
        }));

        // Ignore signals weaker than -100 dB (lowered threshold for real-world testing)
        // getFloatFrequencyData returns values typically between -100 and 0 dB
        if (magnitudeDb < -100) {
            return null;
        }

        // Check if frequency is stable (same as last reading)
        if (lastFrequencyRef.current && frequencyMatches(frequency, lastFrequencyRef.current)) {
            frequencyStableCountRef.current++;
        } else {
            frequencyStableCountRef.current = 1;
            lastFrequencyRef.current = frequency;
        }

        // Need at least 2 stable readings before processing
        if (frequencyStableCountRef.current < 2) {
            return null;
        }

        switch (decoderStateRef.current) {
            case DecoderState.LISTENING:
                // Look for preamble (19000 Hz)
                if (frequencyMatches(frequency, FSK_CONFIG.PREAMBLE_FREQ)) {
                    preambleCountRef.current++;
                    if (preambleCountRef.current >= 3) {
                        console.log('[WebAudio] Preamble detected!');
                        decoderStateRef.current = DecoderState.PREAMBLE_DETECTED;
                        setState(prev => ({ ...prev, status: 'recording' }));
                    }
                } else {
                    preambleCountRef.current = 0;
                }
                break;

            case DecoderState.PREAMBLE_DETECTED:
                // Wait for data to start (non-preamble frequency)
                if (!frequencyMatches(frequency, FSK_CONFIG.PREAMBLE_FREQ)) {
                    console.log('[WebAudio] Starting bit decoding');
                    decoderStateRef.current = DecoderState.DECODING;
                    bitBufferRef.current = [];
                    setState(prev => ({ ...prev, status: 'analyzing' }));

                    // Process first bit
                    if (frequencyMatches(frequency, FSK_CONFIG.LOW_FREQ)) {
                        bitBufferRef.current.push(0);
                    } else if (frequencyMatches(frequency, FSK_CONFIG.HIGH_FREQ)) {
                        bitBufferRef.current.push(1);
                    }
                }
                break;

            case DecoderState.DECODING:
                // Decode bits
                if (frequencyMatches(frequency, FSK_CONFIG.LOW_FREQ)) {
                    bitBufferRef.current.push(0);
                } else if (frequencyMatches(frequency, FSK_CONFIG.HIGH_FREQ)) {
                    bitBufferRef.current.push(1);
                }

                console.log(`[WebAudio] Bits: ${bitBufferRef.current.length}`);

                // Check if we have enough bits
                if (bitBufferRef.current.length >= 40) {
                    const beacon = decodeBeaconId(bitBufferRef.current);
                    if (beacon) {
                        console.log('[WebAudio] Beacon decoded:', beacon.beaconId);
                        setState(prev => ({
                            ...prev,
                            status: 'detected',
                            currentBeacon: beacon,
                            history: [beacon, ...prev.history].slice(0, 50),
                        }));

                        // Reset after showing detection
                        setTimeout(() => {
                            resetDecoder();
                            if (isListeningRef.current) {
                                setState(prev => ({
                                    ...prev,
                                    status: 'listening',
                                    currentBeacon: null,
                                }));
                            }
                        }, 2000);
                    }
                    resetDecoder();
                }
                break;
        }

        return null;
    }, []);

    const analyzeAudio = useCallback(() => {
        if (!analyserRef.current || !isListeningRef.current) return;

        const analyser = analyserRef.current;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);

        analyser.getFloatFrequencyData(dataArray);

        // Find the dominant frequency in the ultrasonic range (17-21 kHz)
        const sampleRate = audioContextRef.current?.sampleRate || 48000;
        const binWidth = sampleRate / (analyser.fftSize);

        const minBin = Math.floor(AUDIO_CONFIG.FREQ_MIN / binWidth);
        const maxBin = Math.ceil(AUDIO_CONFIG.FREQ_MAX / binWidth);

        let maxMagnitude = -Infinity;
        let dominantBin = minBin;

        for (let i = minBin; i <= maxBin && i < bufferLength; i++) {
            if (dataArray[i] > maxMagnitude) {
                maxMagnitude = dataArray[i];
                dominantBin = i;
            }
        }

        const dominantFrequency = dominantBin * binWidth;

        // maxMagnitude is already in dB from getFloatFrequencyData
        processFrequency(dominantFrequency, maxMagnitude);

        // Continue analyzing
        animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    }, [processFrequency]);

    const startListening = useCallback(async () => {
        if (Platform.OS !== 'web') {
            setState(prev => ({
                ...prev,
                status: 'error',
                error: 'Web Audio only works in browser. Use npm run web',
            }));
            return;
        }

        try {
            setState(prev => ({ ...prev, status: 'requesting_permission', error: null }));

            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: AUDIO_CONFIG.SAMPLE_RATE,
                },
            });

            streamRef.current = stream;

            // Create audio context
            const audioContext = new AudioContext({ sampleRate: AUDIO_CONFIG.SAMPLE_RATE });
            audioContextRef.current = audioContext;

            // Create analyser node with high FFT size for frequency resolution
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = AUDIO_CONFIG.FFT_SIZE;
            analyser.smoothingTimeConstant = 0.3;
            analyserRef.current = analyser;

            // Connect microphone to analyser
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            isListeningRef.current = true;
            resetDecoder();
            setState(prev => ({ ...prev, status: 'listening' }));

            console.log('[WebAudio] Started listening');
            console.log(`[WebAudio] Sample rate: ${audioContext.sampleRate}`);
            console.log(`[WebAudio] FFT size: ${analyser.fftSize}`);
            console.log(`[WebAudio] Frequency resolution: ${audioContext.sampleRate / analyser.fftSize} Hz`);

            // Start analysis loop
            analyzeAudio();

        } catch (error) {
            console.error('[WebAudio] Error:', error);
            setState(prev => ({
                ...prev,
                status: 'error',
                error: error instanceof Error ? error.message : 'Failed to access microphone',
            }));
        }
    }, [analyzeAudio]);

    const stopListening = useCallback(() => {
        console.log('[WebAudio] Stopping...');
        isListeningRef.current = false;
        cleanup();
        resetDecoder();

        setState(prev => ({
            ...prev,
            status: 'idle',
            currentBeacon: null,
            signalStrengthDb: -100,
            dominantFrequency: null,
            decoderState: FSKDecoderState.LISTENING,
        }));
    }, [cleanup]);

    const clearHistory = useCallback(() => {
        setState(prev => ({ ...prev, history: [] }));
    }, []);

    return [
        state,
        { startListening, stopListening, clearHistory },
    ];
}
