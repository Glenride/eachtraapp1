# EchoTrack Detector App PRD

Demo application to prove ultrasonic beacon detection technology works.

---

## 1. Overview

**Project:** EchoTrack Detector (React Expo)  
**Goal:** Turn the screen green when a beacon tone is detected at 15+ feet with background noise.

This is Sprint 1 from the main PRD - proving transmission reliability before building the full SDK.

---

## 2. Tech Stack

- **Framework:** React Expo (Managed workflow)
- **Audio Processing:** `expo-av` for microphone access
- **FFT Library:** `fft.js` or `kissfft` (WebAssembly)
- **Target Platforms:** iOS 15+, Android 10+

---

## 3. Core Features

### 3.1 Beacon Detection
- Listen for 18-20kHz ultrasonic frequencies
- Decode FSK-encoded beacon ID from audio
- Display detection result in real-time

### 3.2 Visual Feedback
| State | Screen Color | Message |
|-------|--------------|---------|
| Listening | Blue | "Listening for beacons..." |
| Detected | Green | "Beacon: ABC123" |
| No Signal | Gray | "No beacon detected" |

### 3.3 Debug Mode
- Show frequency spectrum visualization
- Display signal strength (dB)
- Log decoded bits for debugging

---

## 4. User Flow

1. User opens app → Requests microphone permission
2. App starts listening in background
3. When beacon detected → Screen turns green, shows beacon ID
4. User can tap to see detection history

---

## 5. Technical Requirements

### Audio Processing
```
Sample Rate: 48000 Hz
FFT Size: 4096 samples (85ms windows)
Frequency Range: 17000-21000 Hz (bandpass filter)
Detection Threshold: -60 dB
```

### FSK Decoding (match Python generator)
```
Low Frequency (0): 18500 Hz
High Frequency (1): 19500 Hz
Symbol Duration: 50ms
Preamble: 19000 Hz for 200ms
```

### Privacy
- No audio recorded or transmitted
- Only extracted beacon IDs sent to API (optional)
- Clear permission rationale for users

---

## 6. Screens

### Home Screen
- Large colored circle (detection indicator)
- Beacon ID display (when detected)
- "Start/Stop Listening" button
- Settings gear icon

### Settings Screen
- API endpoint configuration
- Detection threshold slider
- Debug mode toggle
- Audio permission status

### History Screen
- List of recently detected beacons
- Timestamp and signal strength
- Clear history button

---

## 7. API Integration (Optional)

If connected to EchoTrack backend:
```
POST /api/events
{
  "beacon_id": "ABC123",
  "device_id": "hashed_device_id",
  "signal_strength_db": -45.5,
  "timestamp": "2026-01-23T15:00:00Z"
}
```

---

## 8. Success Criteria

| Metric | Target |
|--------|--------|
| Detection Distance | 15+ feet |
| Detection Time | < 2 seconds |
| False Positive Rate | < 1% |
| Battery Impact | < 3% daily (active listening) |
| Works with Background Noise | Conversation, TV, music |

---

## 9. Project Structure

```
echotrack-detector/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx          # Home/detection screen
│   │   ├── history.tsx        # Detection history
│   │   └── settings.tsx       # App settings
│   └── _layout.tsx
├── components/
│   ├── DetectionIndicator.tsx # Color-changing circle
│   ├── SpectrumVisualizer.tsx # Debug frequency display
│   └── BeaconCard.tsx         # History list item
├── lib/
│   ├── audioProcessor.ts      # FFT and frequency analysis
│   ├── fskDecoder.ts          # Beacon ID decoding
│   └── api.ts                 # Backend communication
├── hooks/
│   └── useBeaconDetection.ts  # Main detection hook
└── app.json
```

---

## 10. Development Phases

### Phase 1: Basic Detection (Week 1)
- [ ] Expo project setup
- [ ] Microphone permission and audio capture
- [ ] FFT implementation
- [ ] Detect single tone (19kHz)

### Phase 2: FSK Decoding (Week 2)
- [ ] Implement FSK decoder
- [ ] Preamble detection
- [ ] Beacon ID extraction
- [ ] Checksum validation

### Phase 3: Polish (Week 3)
- [ ] UI/UX improvements
- [ ] History and settings screens
- [ ] Battery optimization
- [ ] API integration
