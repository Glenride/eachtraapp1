/**
 * API Client for EchoTrack Backend Communication
 */

import { DecodedBeacon } from './fskDecoder';

export interface EventPayload {
    beacon_id: string;
    device_id: string;
    signal_strength_db: number;
    timestamp: string;
}

export interface ApiConfig {
    baseUrl: string;
    enabled: boolean;
}

const DEFAULT_CONFIG: ApiConfig = {
    baseUrl: 'https://api.echotrack.io',
    enabled: false,
};

let config: ApiConfig = { ...DEFAULT_CONFIG };

/**
 * Configure API client
 */
export function configureApi(newConfig: Partial<ApiConfig>): void {
    config = { ...config, ...newConfig };
}

/**
 * Get current API configuration
 */
export function getApiConfig(): ApiConfig {
    return { ...config };
}

/**
 * Generate a hashed device ID for privacy
 */
export async function getHashedDeviceId(): Promise<string> {
    // In production, use a proper device ID + hashing
    // For now, generate a random ID and store it
    const stored = await getStoredDeviceId();
    if (stored) return stored;

    const newId = 'device_' + Math.random().toString(36).substr(2, 16);
    await storeDeviceId(newId);
    return newId;
}

// Simple in-memory storage for demo (use AsyncStorage in real app)
let storedDeviceId: string | null = null;

async function getStoredDeviceId(): Promise<string | null> {
    return storedDeviceId;
}

async function storeDeviceId(id: string): Promise<void> {
    storedDeviceId = id;
}

/**
 * Send beacon detection event to backend
 */
export async function sendBeaconEvent(beacon: DecodedBeacon): Promise<boolean> {
    if (!config.enabled) {
        console.log('[API] Disabled, not sending event');
        return false;
    }

    try {
        const deviceId = await getHashedDeviceId();

        const payload: EventPayload = {
            beacon_id: beacon.beaconId,
            device_id: deviceId,
            signal_strength_db: beacon.signalStrengthDb,
            timestamp: beacon.timestamp.toISOString(),
        };

        const response = await fetch(`${config.baseUrl}/api/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error('[API] Failed to send event:', response.status);
            return false;
        }

        console.log('[API] Event sent successfully');
        return true;
    } catch (error) {
        console.error('[API] Error sending event:', error);
        return false;
    }
}
