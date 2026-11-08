/**
 * Spectrum Visualizer Component
 * Debug view showing frequency spectrum for ultrasonic detection
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AUDIO_CONFIG, FSK_CONFIG } from '../lib/audioProcessor';

interface SpectrumVisualizerProps {
    dominantFrequency: number | null;
    signalStrengthDb: number;
    isActive: boolean;
}

export function SpectrumVisualizer({
    dominantFrequency,
    signalStrengthDb,
    isActive
}: SpectrumVisualizerProps) {
    const frequencyBars = generateFrequencyBars(dominantFrequency, isActive);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Frequency Spectrum</Text>
            <Text style={styles.subtitle}>17 kHz - 21 kHz</Text>

            <View style={styles.spectrumContainer}>
                {frequencyBars.map((bar, index) => (
                    <View key={index} style={styles.barContainer}>
                        <View
                            style={[
                                styles.bar,
                                {
                                    height: bar.height,
                                    backgroundColor: bar.isActive ? bar.color : '#E5E7EB',
                                }
                            ]}
                        />
                        {bar.label && (
                            <Text style={styles.barLabel}>{bar.label}</Text>
                        )}
                    </View>
                ))}
            </View>

            <View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                    <Text style={styles.legendText}>Preamble (19kHz)</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={styles.legendText}>Bit 0 (18.5kHz)</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.legendText}>Bit 1 (19.5kHz)</Text>
                </View>
            </View>

            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Dominant Frequency</Text>
                    <Text style={styles.statValue}>
                        {dominantFrequency ? `${(dominantFrequency / 1000).toFixed(2)} kHz` : '—'}
                    </Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Signal Strength</Text>
                    <Text style={styles.statValue}>
                        {isActive ? `${signalStrengthDb.toFixed(1)} dB` : '—'}
                    </Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Threshold</Text>
                    <Text style={styles.statValue}>{AUDIO_CONFIG.DETECTION_THRESHOLD_DB} dB</Text>
                </View>
            </View>
        </View>
    );
}

interface BarData {
    height: number;
    color: string;
    isActive: boolean;
    label?: string;
}

function generateFrequencyBars(dominantFreq: number | null, isActive: boolean): BarData[] {
    const bars: BarData[] = [];
    const freqRange = { start: 17000, end: 21000 };
    const numBars = 20;
    const step = (freqRange.end - freqRange.start) / numBars;

    for (let i = 0; i < numBars; i++) {
        const freq = freqRange.start + i * step;
        const isNearDominant = dominantFreq && Math.abs(freq - dominantFreq) < step;

        let color = '#9CA3AF';
        let label: string | undefined;

        // Color special frequencies
        if (Math.abs(freq - FSK_CONFIG.LOW_FREQ) < step / 2) {
            color = '#F59E0B'; // Amber for bit 0
            label = '0';
        } else if (Math.abs(freq - FSK_CONFIG.PREAMBLE_FREQ) < step / 2) {
            color = '#3B82F6'; // Blue for preamble
            label = 'P';
        } else if (Math.abs(freq - FSK_CONFIG.HIGH_FREQ) < step / 2) {
            color = '#10B981'; // Green for bit 1
            label = '1';
        }

        // Calculate bar height based on whether this is the dominant frequency
        let height = 20;
        if (isActive && isNearDominant) {
            height = 80;
        } else if (isActive) {
            height = 20 + Math.random() * 30; // Simulated noise visualization
        }

        bars.push({
            height,
            color,
            isActive: !!(isActive && isNearDominant),
            label,
        });
    }

    return bars;
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1F2937',
        borderRadius: 16,
        padding: 20,
        margin: 16,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
        marginBottom: 16,
    },
    spectrumContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        height: 100,
        backgroundColor: '#111827',
        borderRadius: 8,
        padding: 10,
    },
    barContainer: {
        alignItems: 'center',
        flex: 1,
    },
    bar: {
        width: 8,
        borderRadius: 4,
        minHeight: 4,
    },
    barLabel: {
        fontSize: 8,
        color: '#6B7280',
        marginTop: 4,
    },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginTop: 16,
        gap: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 4,
    },
    legendText: {
        fontSize: 11,
        color: '#9CA3AF',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#374151',
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 10,
        color: '#6B7280',
        marginBottom: 2,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
        fontFamily: 'monospace',
    },
});
