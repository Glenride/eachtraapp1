/**
 * EchoTrack Detector App
 * Ultrasonic beacon detection demo application
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Switch,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { useBeaconDetection } from './hooks/useBeaconDetection';
import { useWebAudioDetection } from './hooks/useWebAudioDetection';
import { DetectionIndicator } from './components/DetectionIndicator';
import { SpectrumVisualizer } from './components/SpectrumVisualizer';
import { BeaconCard } from './components/BeaconCard';

type TabType = 'home' | 'history' | 'settings';

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [debugMode, setDebugMode] = useState(false);

  // Use Web Audio API on web for real FFT analysis, native hook on mobile
  const nativeDetection = useBeaconDetection();
  const webDetection = useWebAudioDetection();
  const [detectionState, controls] = Platform.OS === 'web' ? webDetection : nativeDetection;

  const isListening = detectionState.status === 'listening' || detectionState.status === 'detected';

  const handleToggleListening = async () => {
    if (isListening) {
      controls.stopListening();
    } else {
      await controls.startListening();
    }
  };

  const renderHomeScreen = () => (
    <View style={styles.screenContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>EchoTrack</Text>
        <Text style={styles.headerSubtitle}>Ultrasonic Beacon Detector</Text>
      </View>

      <View style={styles.detectionArea}>
        <DetectionIndicator
          status={detectionState.status}
          beacon={detectionState.currentBeacon}
          signalStrengthDb={detectionState.signalStrengthDb}
        />
      </View>

      {debugMode && (
        <SpectrumVisualizer
          dominantFrequency={detectionState.dominantFrequency}
          signalStrengthDb={detectionState.signalStrengthDb}
          isActive={isListening}
        />
      )}

      <View style={styles.controlArea}>
        <TouchableOpacity
          style={[
            styles.mainButton,
            isListening ? styles.stopButton : styles.startButton,
          ]}
          onPress={handleToggleListening}
        >
          <Text style={styles.mainButtonText}>
            {isListening ? 'Stop Listening' : 'Start Listening'}
          </Text>
        </TouchableOpacity>

        {detectionState.error && (
          <Text style={styles.errorText}>{detectionState.error}</Text>
        )}
      </View>
    </View>
  );

  const renderHistoryScreen = () => (
    <View style={styles.screenContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Detection History</Text>
        {detectionState.history.length > 0 && (
          <TouchableOpacity onPress={controls.clearHistory}>
            <Text style={styles.clearButton}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {detectionState.history.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📡</Text>
          <Text style={styles.emptyTitle}>No Beacons Detected</Text>
          <Text style={styles.emptySubtitle}>
            Start listening to detect nearby ultrasonic beacons
          </Text>
        </View>
      ) : (
        <FlatList
          data={detectionState.history}
          renderItem={({ item }) => <BeaconCard beacon={item} />}
          keyExtractor={(item, index) => `${item.beaconId}-${index}`}
          contentContainerStyle={styles.historyList}
        />
      )}
    </View>
  );

  const renderSettingsScreen = () => (
    <ScrollView style={styles.screenContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Debug</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Debug Mode</Text>
            <Text style={styles.settingDescription}>
              Show frequency spectrum visualization
            </Text>
          </View>
          <Switch
            value={debugMode}
            onValueChange={setDebugMode}
            trackColor={{ false: '#D1D5DB', true: '#10B981' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Audio Configuration</Text>

        <View style={styles.configItem}>
          <Text style={styles.configLabel}>Sample Rate</Text>
          <Text style={styles.configValue}>48,000 Hz</Text>
        </View>
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>FFT Size</Text>
          <Text style={styles.configValue}>4,096 samples</Text>
        </View>
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>Detection Range</Text>
          <Text style={styles.configValue}>17-21 kHz</Text>
        </View>
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>Threshold</Text>
          <Text style={styles.configValue}>-60 dB</Text>
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>FSK Configuration</Text>

        <View style={styles.configItem}>
          <Text style={styles.configLabel}>Low Frequency (0)</Text>
          <Text style={styles.configValue}>18,500 Hz</Text>
        </View>
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>High Frequency (1)</Text>
          <Text style={styles.configValue}>19,500 Hz</Text>
        </View>
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>Preamble</Text>
          <Text style={styles.configValue}>19,000 Hz</Text>
        </View>
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>Symbol Duration</Text>
          <Text style={styles.configValue}>50 ms</Text>
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>Version</Text>
          <Text style={styles.aboutValue}>1.0.0</Text>
        </View>
        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>Build</Text>
          <Text style={styles.aboutValue}>Demo</Text>
        </View>
      </View>

      <View style={styles.privacyNote}>
        <Text style={styles.privacyText}>
          🔒 Privacy: This app does not record or transmit audio.
          Only decoded beacon IDs can optionally be sent to your configured API endpoint.
        </Text>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      <View style={styles.content}>
        {activeTab === 'home' && renderHomeScreen()}
        {activeTab === 'history' && renderHistoryScreen()}
        {activeTab === 'settings' && renderSettingsScreen()}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'home' && styles.tabActive]}
          onPress={() => setActiveTab('home')}
        >
          <Text style={[styles.tabIcon, activeTab === 'home' && styles.tabIconActive]}>
            📡
          </Text>
          <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>
            Detect
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabIcon, activeTab === 'history' && styles.tabIconActive]}>
            📋
          </Text>
          <Text style={[styles.tabLabel, activeTab === 'history' && styles.tabLabelActive]}>
            History
          </Text>
          {detectionState.history.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{detectionState.history.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && styles.tabActive]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles.tabIcon, activeTab === 'settings' && styles.tabIconActive]}>
            ⚙️
          </Text>
          <Text style={[styles.tabLabel, activeTab === 'settings' && styles.tabLabelActive]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  clearButton: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  detectionArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlArea: {
    padding: 20,
    alignItems: 'center',
  },
  mainButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#3B82F6',
  },
  stopButton: {
    backgroundColor: '#EF4444',
  },
  mainButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  historyList: {
    paddingVertical: 8,
  },
  settingsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  settingDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  configItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  configLabel: {
    fontSize: 14,
    color: '#374151',
  },
  configValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    fontFamily: 'monospace',
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  aboutLabel: {
    fontSize: 14,
    color: '#374151',
  },
  aboutValue: {
    fontSize: 14,
    color: '#6B7280',
  },
  privacyNote: {
    margin: 16,
    padding: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
  },
  privacyText: {
    fontSize: 13,
    color: '#4338CA',
    lineHeight: 20,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabActive: {},
  tabIcon: {
    fontSize: 24,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    right: '25%',
    top: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
});
