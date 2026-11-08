/**
 * Beacon Card Component
 * Display item for detection history list
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DecodedBeacon } from '../lib/fskDecoder';

interface BeaconCardProps {
    beacon: DecodedBeacon;
    onPress?: () => void;
}

export function BeaconCard({ beacon, onPress }: BeaconCardProps) {
    const timeAgo = getTimeAgo(beacon.timestamp);

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.iconContainer}>
                <View style={[styles.icon, beacon.isValid ? styles.iconValid : styles.iconInvalid]}>
                    <Text style={styles.iconText}>{beacon.isValid ? '✓' : '!'}</Text>
                </View>
            </View>

            <View style={styles.content}>
                <Text style={styles.beaconId}>{beacon.beaconId}</Text>
                <View style={styles.detailsRow}>
                    <Text style={styles.timeAgo}>{timeAgo}</Text>
                    <Text style={styles.separator}>•</Text>
                    <Text style={styles.signal}>{beacon.signalStrengthDb.toFixed(1)} dB</Text>
                </View>
            </View>

            <View style={styles.arrow}>
                <Text style={styles.arrowText}>›</Text>
            </View>
        </TouchableOpacity>
    );
}

function getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 60) {
        return 'Just now';
    } else if (diffSeconds < 3600) {
        const mins = Math.floor(diffSeconds / 60);
        return `${mins} min${mins > 1 ? 's' : ''} ago`;
    } else if (diffSeconds < 86400) {
        const hours = Math.floor(diffSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
        const days = Math.floor(diffSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    iconContainer: {
        marginRight: 12,
    },
    icon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconValid: {
        backgroundColor: '#D1FAE5',
    },
    iconInvalid: {
        backgroundColor: '#FEE2E2',
    },
    iconText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
    },
    beaconId: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        fontFamily: 'monospace',
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    timeAgo: {
        fontSize: 13,
        color: '#6B7280',
    },
    separator: {
        fontSize: 13,
        color: '#9CA3AF',
        marginHorizontal: 8,
    },
    signal: {
        fontSize: 13,
        color: '#6B7280',
    },
    arrow: {
        marginLeft: 8,
    },
    arrowText: {
        fontSize: 24,
        color: '#9CA3AF',
        fontWeight: '300',
    },
});
