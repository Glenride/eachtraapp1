/**
 * Main Beacon Detection Hook
 * Simplified implementation for demo purposes
 * Uses expo-audio to record and simulates detection
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioModule, RecordingPresets } from 'expo-audio';
import { DecodedBeacon, DecoderState } from '../lib/fskDecoder';

export type DetectionStatus = 'idle' | 'requesting_permission' | 'listening' | 'recording' | 'analyzing' | 'detected' | 'error';

export interface BeaconDetectionState {
    status: DetectionStatus;
    currentBeacon: DecodedBeacon | null;
    signalStrengthDb: number;
    dominantFrequency: number | null;
    decoderState: DecoderState;
    error: string | null;
    history: DecodedBeacon[];
    recordingDuration: number;
}

export interface BeaconDetectionControls {
    startListening: () => Promise<void>;
    stopListening: () => void;
    clearHistory: () => void;
}

const RECORDING_DURATION_MS = 3000; // Record for 3 seconds

export function useBeaconDetection(): [BeaconDetectionState, BeaconDetectionControls] {
    const [state, setState] = useState<BeaconDetectionState>({
        status: 'idle',
        currentBeacon: null,
        signalStrengthDb: -100,
        dominantFrequency: null,
        decoderState: DecoderState.LISTENING,
        error: null,
        history: [],
        recordingDuration: 0,
    });

    const isListeningRef = useRef(false);
    const recorderRef = useRef<any>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const cleanup = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (recorderRef.current) {
            try {
                recorderRef.current.release();
            } catch (e) {
                // Ignore
            }
            recorderRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    const runRecordingCycle = useCallback(async () => {
        if (!isListeningRef.current) return;

        try {
            setState(prev => ({ ...prev, status: 'recording', recordingDuration: 0 }));

            // Enable recording mode on iOS
            await AudioModule.setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode: true,
            });

            // Create a new recorder for each cycle
            const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
            recorderRef.current = recorder;

            // Start recording
            await recorder.prepareToRecordAsync();
            await recorder.record();

            console.log('[Detection] Recording started');

            // Track duration
            let elapsed = 0;
            intervalRef.current = setInterval(() => {
                elapsed += 100;
                setState(prev => ({ ...prev, recordingDuration: elapsed / 1000 }));
            }, 100);

            // Stop after duration
            timerRef.current = setTimeout(async () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }

                if (recorderRef.current) {
                    try {
                        await recorderRef.current.stop();
                        const uri = recorderRef.current.uri;
                        console.log('[Detection] Recording saved:', uri);

                        // Analyze the recording
                        setState(prev => ({ ...prev, status: 'analyzing' }));

                        // Simulate beacon detection (30% chance)
                        // In a real implementation, you would analyze the audio file here
                        const simulatedDetection = Math.random() > 0.7;

                        if (simulatedDetection && isListeningRef.current) {
                            const beacon: DecodedBeacon = {
                                beaconId: 'ECHO' + Math.random().toString(16).substr(2, 4).toUpperCase(),
                                signalStrengthDb: -45 - Math.random() * 20,
                                timestamp: new Date(),
                                isValid: true,
                            };

                            setState(prev => ({
                                ...prev,
                                status: 'detected',
                                currentBeacon: beacon,
                                signalStrengthDb: beacon.signalStrengthDb,
                                history: [beacon, ...prev.history].slice(0, 50),
                            }));

                            console.log('[Detection] Beacon detected:', beacon.beaconId);

                            // Return to listening after showing detection
                            setTimeout(() => {
                                if (isListeningRef.current) {
                                    setState(prev => ({
                                        ...prev,
                                        status: 'listening',
                                        currentBeacon: null,
                                    }));
                                    runRecordingCycle();
                                }
                            }, 2000);
                        } else if (isListeningRef.current) {
                            console.log('[Detection] No beacon detected');
                            setState(prev => ({ ...prev, status: 'listening' }));
                            // Continue with next cycle
                            setTimeout(() => {
                                if (isListeningRef.current) {
                                    runRecordingCycle();
                                }
                            }, 500);
                        }

                        // Release recorder
                        recorderRef.current.release();
                        recorderRef.current = null;

                    } catch (e) {
                        console.error('[Detection] Error stopping recorder:', e);
                    }
                }
            }, RECORDING_DURATION_MS);

        } catch (error) {
            console.error('[Detection] Recording cycle error:', error);
            setState(prev => ({
                ...prev,
                status: 'error',
                error: error instanceof Error ? error.message : 'Recording failed',
            }));
        }
    }, []);

    const startListening = useCallback(async () => {
        try {
            setState(prev => ({ ...prev, status: 'requesting_permission', error: null }));

            const permissionStatus = await AudioModule.requestRecordingPermissionsAsync();

            if (!permissionStatus.granted) {
                setState(prev => ({
                    ...prev,
                    status: 'error',
                    error: 'Microphone permission denied',
                }));
                return;
            }

            isListeningRef.current = true;
            setState(prev => ({ ...prev, status: 'listening' }));

            console.log('[Detection] Started listening');

            // Start recording cycle after a short delay
            setTimeout(() => {
                runRecordingCycle();
            }, 500);

        } catch (error) {
            console.error('[Detection] Error starting:', error);
            setState(prev => ({
                ...prev,
                status: 'error',
                error: error instanceof Error ? error.message : 'Failed to start listening',
            }));
        }
    }, [runRecordingCycle]);

    const stopListening = useCallback(() => {
        console.log('[Detection] Stopping...');
        isListeningRef.current = false;
        cleanup();

        setState(prev => ({
            ...prev,
            status: 'idle',
            currentBeacon: null,
            signalStrengthDb: -100,
            dominantFrequency: null,
            decoderState: DecoderState.LISTENING,
            recordingDuration: 0,
        }));

        console.log('[Detection] Stopped');
    }, [cleanup]);

    const clearHistory = useCallback(() => {
        setState(prev => ({ ...prev, history: [] }));
    }, []);

    return [
        state,
        { startListening, stopListening, clearHistory },
    ];
}
