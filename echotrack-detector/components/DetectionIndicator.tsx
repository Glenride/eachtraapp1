/**
 * Detection Indicator Component
 * Color-changing circle showing beacon detection status
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { DetectionStatus } from '../hooks/useBeaconDetection';
import { DecodedBeacon } from '../lib/fskDecoder';

interface DetectionIndicatorProps {
    status: DetectionStatus;
    beacon: DecodedBeacon | null;
    signalStrengthDb: number;
}

const STATUS_COLORS: Record<DetectionStatus, string> = {
    idle: '#6B7280',      // Gray
    requesting_permission: '#F59E0B', // Amber
    listening: '#3B82F6', // Blue
    recording: '#8B5CF6', // Purple
    analyzing: '#F59E0B', // Amber
    detected: '#10B981',  // Green
    error: '#EF4444',     // Red
};

const STATUS_MESSAGES: Record<DetectionStatus, string> = {
    idle: 'Tap to start listening',
    requesting_permission: 'Requesting permission...',
    listening: 'Listening for beacons...',
    recording: 'Recording audio...',
    analyzing: 'Analyzing for beacons...',
    detected: 'Beacon Detected!',
    error: 'Error occurred',
};

export function DetectionIndicator({ status, beacon, signalStrengthDb }: DetectionIndicatorProps) {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    // Pulse animation when listening
    useEffect(() => {
        if (status === 'listening') {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 1000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        } else {
            pulseAnim.setValue(1);
        }
    }, [status]);

    // Flash animation when detected
    useEffect(() => {
        if (status === 'detected') {
            Animated.sequence([
                Animated.timing(glowAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(glowAnim, {
                    toValue: 0.3,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(glowAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [status, beacon?.beaconId]);

    const backgroundColor = STATUS_COLORS[status];
    const message = status === 'detected' && beacon
        ? `Beacon: ${beacon.beaconId}`
        : STATUS_MESSAGES[status];

    return (
        <View style={styles.container}>
            <Animated.View
                style={[
                    styles.circle,
                    {
                        backgroundColor,
                        transform: [{ scale: pulseAnim }],
                        opacity: status === 'detected' ? glowAnim : 1,
                    },
                ]}
            >
                <View style={styles.innerCircle}>
                    {status === 'listening' && (
                        <View style={styles.waveContainer}>
                            <View style={[styles.wave, styles.wave1]} />
                            <View style={[styles.wave, styles.wave2]} />
                            <View style={[styles.wave, styles.wave3]} />
                        </View>
                    )}
                    {status === 'detected' && (
                        <Text style={styles.checkmark}>✓</Text>
                    )}
                </View>
            </Animated.View>

            <Text style={styles.statusText}>{message}</Text>

            {(status === 'listening' || status === 'detected') && (
                <View style={styles.signalContainer}>
                    <Text style={styles.signalLabel}>Signal Strength</Text>
                    <Text style={styles.signalValue}>{signalStrengthDb.toFixed(1)} dB</Text>
                </View>
            )}

            {beacon && status === 'detected' && (
                <View style={styles.beaconDetails}>
                    <Text style={styles.detailLabel}>
                        {beacon.isValid ? '✓ Valid checksum' : '⚠ Invalid checksum'}
                    </Text>
                    <Text style={styles.detailTime}>
                        Detected at {beacon.timestamp.toLocaleTimeString()}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    circle: {
        width: 200,
        height: 200,
        borderRadius: 100,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    innerCircle: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    waveContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    wave: {
        position: 'absolute',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: 100,
    },
    wave1: {
        width: 40,
        height: 40,
    },
    wave2: {
        width: 80,
        height: 80,
    },
    wave3: {
        width: 120,
        height: 120,
    },
    checkmark: {
        fontSize: 64,
        color: '#fff',
        fontWeight: 'bold',
    },
    statusText: {
        marginTop: 24,
        fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
        textAlign: 'center',
    },
    signalContainer: {
        marginTop: 16,
        alignItems: 'center',
    },
    signalLabel: {
        fontSize: 14,
        color: '#6B7280',
    },
    signalValue: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
    },
    beaconDetails: {
        marginTop: 16,
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 14,
        color: '#059669',
        fontWeight: '500',
    },
    detailTime: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
});
