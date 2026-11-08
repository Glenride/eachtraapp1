/**
 * Audio Processing Module for EchoTrack Detector
 * Handles FFT analysis and frequency detection in the ultrasonic range
 */

import FFT from 'fft.js';

// Audio processing constants from PRD
export const AUDIO_CONFIG = {
  SAMPLE_RATE: 48000,
  FFT_SIZE: 4096,           // 85ms windows
  FREQ_MIN: 17000,          // Bandpass filter low
  FREQ_MAX: 21000,          // Bandpass filter high
  DETECTION_THRESHOLD_DB: -60,
} as const;

// FSK configuration matching Python generator
export const FSK_CONFIG = {
  LOW_FREQ: 18500,          // Binary 0
  HIGH_FREQ: 19500,         // Binary 1
  PREAMBLE_FREQ: 19000,     // Preamble tone
  SYMBOL_DURATION_MS: 50,
  PREAMBLE_DURATION_MS: 200,
} as const;

export interface FrequencyPeak {
  frequency: number;
  magnitude: number;
  magnitudeDb: number;
}

export interface DetectionResult {
  detected: boolean;
  dominantFrequency: number | null;
  signalStrengthDb: number;
  isUltrasonic: boolean;
  peaks: FrequencyPeak[];
}

/**
 * Converts linear magnitude to decibels
 */
export function magnitudeToDb(magnitude: number): number {
  return 20 * Math.log10(Math.max(magnitude, 1e-10));
}

/**
 * Converts frequency bin index to Hz
 */
export function binToFrequency(bin: number, fftSize: number, sampleRate: number): number {
  return (bin * sampleRate) / fftSize;
}

/**
 * Converts frequency in Hz to bin index
 */
export function frequencyToBin(freq: number, fftSize: number, sampleRate: number): number {
  return Math.round((freq * fftSize) / sampleRate);
}

/**
 * AudioProcessor class for real-time FFT analysis
 */
export class AudioProcessor {
  private fft: FFT;
  private fftSize: number;
  private sampleRate: number;
  private minBin: number;
  private maxBin: number;

  constructor(
    fftSize: number = AUDIO_CONFIG.FFT_SIZE,
    sampleRate: number = AUDIO_CONFIG.SAMPLE_RATE
  ) {
    this.fftSize = fftSize;
    this.sampleRate = sampleRate;
    this.fft = new FFT(fftSize);
    
    // Pre-calculate bin ranges for ultrasonic frequencies
    this.minBin = frequencyToBin(AUDIO_CONFIG.FREQ_MIN, fftSize, sampleRate);
    this.maxBin = frequencyToBin(AUDIO_CONFIG.FREQ_MAX, fftSize, sampleRate);
  }

  /**
   * Apply Hamming window to reduce spectral leakage
   */
  private applyWindow(samples: Float32Array): Float32Array {
    const windowed = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const window = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (samples.length - 1));
      windowed[i] = samples[i] * window;
    }
    return windowed;
  }

  /**
   * Perform FFT and return magnitude spectrum
   */
  public computeSpectrum(samples: Float32Array): Float32Array {
    // Apply windowing
    const windowed = this.applyWindow(samples);
    
    // Prepare input for FFT (interleaved real/imaginary)
    const input = new Array(this.fftSize * 2).fill(0);
    for (let i = 0; i < this.fftSize; i++) {
      input[i * 2] = windowed[i] || 0;
      input[i * 2 + 1] = 0;
    }
    
    // Perform FFT
    const output = new Array(this.fftSize * 2).fill(0);
    this.fft.transform(output, input);
    
    // Calculate magnitude spectrum
    const magnitudes = new Float32Array(this.fftSize / 2);
    for (let i = 0; i < this.fftSize / 2; i++) {
      const real = output[i * 2];
      const imag = output[i * 2 + 1];
      magnitudes[i] = Math.sqrt(real * real + imag * imag) / this.fftSize;
    }
    
    return magnitudes;
  }

  /**
   * Find peaks in the ultrasonic frequency range
   */
  public findUltrasonicPeaks(magnitudes: Float32Array, topN: number = 3): FrequencyPeak[] {
    const peaks: FrequencyPeak[] = [];
    
    for (let bin = this.minBin; bin <= this.maxBin && bin < magnitudes.length; bin++) {
      const magnitude = magnitudes[bin];
      const magnitudeDb = magnitudeToDb(magnitude);
      
      // Simple peak detection: higher than neighbors
      const left = bin > 0 ? magnitudes[bin - 1] : 0;
      const right = bin < magnitudes.length - 1 ? magnitudes[bin + 1] : 0;
      
      if (magnitude > left && magnitude > right) {
        peaks.push({
          frequency: binToFrequency(bin, this.fftSize, this.sampleRate),
          magnitude,
          magnitudeDb,
        });
      }
    }
    
    // Sort by magnitude and return top N
    return peaks
      .sort((a, b) => b.magnitude - a.magnitude)
      .slice(0, topN);
  }

  /**
   * Analyze audio samples and detect ultrasonic signals
   */
  public analyze(samples: Float32Array): DetectionResult {
    const magnitudes = this.computeSpectrum(samples);
    const peaks = this.findUltrasonicPeaks(magnitudes);
    
    const strongestPeak = peaks[0];
    const detected = strongestPeak && strongestPeak.magnitudeDb > AUDIO_CONFIG.DETECTION_THRESHOLD_DB;
    
    return {
      detected: !!detected,
      dominantFrequency: strongestPeak?.frequency || null,
      signalStrengthDb: strongestPeak?.magnitudeDb || -100,
      isUltrasonic: !!strongestPeak && 
        strongestPeak.frequency >= AUDIO_CONFIG.FREQ_MIN && 
        strongestPeak.frequency <= AUDIO_CONFIG.FREQ_MAX,
      peaks,
    };
  }

  /**
   * Get frequency resolution in Hz
   */
  public getFrequencyResolution(): number {
    return this.sampleRate / this.fftSize;
  }
}
