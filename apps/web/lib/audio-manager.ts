// lib/audio-manager.ts

/**
 * Audio Manager interface for type safety
 */
export interface IAudioManager {
  playRingtone(): void;
  playBuzzer(): void;
  playNotification(): void;
  playSound(type: 'ringtone' | 'buzzer' | 'notification'): void;
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
  resume(): void;
  vibrate(pattern: number | number[]): void;
  isAudioAvailable(): boolean;
  reset(): void;
  setRingtoneStyle(style: 'professional' | 'urgent' | 'gentle'): void;
}

/**
 * Dummy audio manager for SSR
 */
class DummyAudioManager implements IAudioManager {
  playRingtone(): void {}
  playBuzzer(): void {}
  playNotification(): void {}
  playSound(type: 'ringtone' | 'buzzer' | 'notification'): void {}
  setEnabled(enabled: boolean): void {}
  isEnabled(): boolean { return true; }
  resume(): void {}
  vibrate(pattern: number | number[]): void {}
  isAudioAvailable(): boolean { return false; }
  reset(): void {}
  setRingtoneStyle(style: 'professional' | 'urgent' | 'gentle'): void {}
}

/**
 * Main Audio Manager class
 */
export class AudioManager implements IAudioManager {
  private static instance: AudioManager | null = null;
  private audioContext: AudioContext | null = null;
  private ringtoneAudio: HTMLAudioElement | null = null;
  private buzzerAudio: HTMLAudioElement | null = null;
  private notificationAudio: HTMLAudioElement | null = null;
  private isInitialized = false;
  private enabled = true;
  private isBrowser = false;
  private ringtoneStyle: 'professional' | 'urgent' | 'gentle' = 'professional';
  private ringtoneTempo = 1.0;
  private ringtoneVolume = 0.3;

  private constructor() {
    this.isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    
    if (this.isBrowser) {
      this.init();
    } else {
      console.log('AudioManager: Running in SSR environment, audio disabled');
    }
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * Initialize audio context and elements
   */
  private init(): void {
    if (!this.isBrowser) return;
    
    try {
      // Create audio context for web audio API
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
      
      // Create HTML audio elements for fallback
      this.ringtoneAudio = new Audio();
      this.buzzerAudio = new Audio();
      this.notificationAudio = new Audio();
      
      // Preload audio files
      this.ringtoneAudio.src = '/sounds/ringtone.mp3';
      this.buzzerAudio.src = '/sounds/buzzer.mp3';
      this.notificationAudio.src = '/sounds/notification.mp3';
      
      // Preload
      this.ringtoneAudio.load();
      this.buzzerAudio.load();
      this.notificationAudio.load();
      
      // Load sound preference from localStorage
      try {
        const savedSound = localStorage.getItem('chat-sound-enabled');
        if (savedSound !== null) {
          this.enabled = savedSound === 'true';
        }
      } catch (error) {
        // Ignore localStorage errors
      }
      
      this.isInitialized = true;
      console.log('Audio manager initialized');
    } catch (error) {
      console.warn('Failed to initialize audio manager:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Check if audio is available
   */
  isAudioAvailable(): boolean {
    return this.isBrowser && this.isInitialized && this.audioContext !== null;
  }

  /**
   * Set ringtone style
   */
  setRingtoneStyle(style: 'professional' | 'urgent' | 'gentle'): void {
    this.ringtoneStyle = style;
    switch(style) {
      case 'urgent':
        this.ringtoneTempo = 1.3;
        this.ringtoneVolume = 0.5;
        break;
      case 'gentle':
        this.ringtoneTempo = 0.7;
        this.ringtoneVolume = 0.2;
        break;
      default: // professional
        this.ringtoneTempo = 1.0;
        this.ringtoneVolume = 0.3;
    }
  }

  /**
   * Generate a ringtone using Web Audio API
   */
  private generateRingtone(): void {
    if (!this.isAudioAvailable() || !this.audioContext) return;

    try {
      const now = this.audioContext.currentTime;
      const masterGain = this.audioContext.createGain();
      masterGain.connect(this.audioContext.destination);
      masterGain.gain.setValueAtTime(this.ringtoneVolume * 0.8, now);

      // Create ringtone with multiple layers
      this.createMelodyLayer(now, masterGain);
      this.createHarmonyLayer(now, masterGain);
      this.createPulseEffect(now, masterGain);

      // Fade out smoothly
      masterGain.gain.setValueAtTime(this.ringtoneVolume * 0.8, now);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5 * this.ringtoneTempo);

    } catch (error) {
      console.warn('Failed to generate ringtone:', error);
      this.playFallbackRingtone();
    }
  }

  /**
   * Create melody layer for ringtone
   */
  private createMelodyLayer(startTime: number, output: GainNode): void {
    if (!this.audioContext) return;
    
    const tempo = this.ringtoneTempo;
    
    // Professional ringtone pattern
    const melody = [
      { freq: 523.25, duration: 0.12, volume: 0.4 * this.ringtoneVolume },  // C5
      { freq: 659.25, duration: 0.12, volume: 0.4 * this.ringtoneVolume },  // E5
      { freq: 783.99, duration: 0.18, volume: 0.5 * this.ringtoneVolume },  // G5
      { freq: 1046.50, duration: 0.15, volume: 0.5 * this.ringtoneVolume }, // C6
      { freq: 880.00, duration: 0.10, volume: 0.3 * this.ringtoneVolume },  // A5
      { freq: 987.77, duration: 0.15, volume: 0.4 * this.ringtoneVolume },  // B5
      { freq: 1046.50, duration: 0.25, volume: 0.6 * this.ringtoneVolume }, // C6 (held)
    ];

    let currentTime = startTime;

    melody.forEach((note, index) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      
      osc.connect(gain);
      gain.connect(output);

      // Use triangle wave for warmer sound
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, currentTime);

      // Add vibrato for richness
      if (index % 2 === 0) {
        const vibrato = this.audioContext!.createOscillator();
        const vibratoGain = this.audioContext!.createGain();
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);
        vibrato.frequency.setValueAtTime(5, currentTime);
        vibratoGain.gain.setValueAtTime(3, currentTime);
        vibrato.start(currentTime);
        vibrato.stop(currentTime + note.duration * tempo);
      }

      // Volume envelope
      const duration = note.duration * tempo;
      gain.gain.setValueAtTime(0, currentTime);
      gain.gain.linearRampToValueAtTime(note.volume, currentTime + 0.02);
      gain.gain.setValueAtTime(note.volume, currentTime + duration - 0.03);
      gain.gain.linearRampToValueAtTime(0, currentTime + duration);

      osc.start(currentTime);
      osc.stop(currentTime + duration);

      currentTime += duration + 0.05 * tempo;
    });
  }

  /**
   * Create harmony layer for ringtone
   */
  private createHarmonyLayer(startTime: number, output: GainNode): void {
    if (!this.audioContext) return;
    
    const harmonyNotes = [261.63, 329.63, 392.00]; // C4, E4, G4
    
    harmonyNotes.forEach((freq) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      
      osc.connect(gain);
      gain.connect(output);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      const duration = 2.0 * this.ringtoneTempo;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.08 * this.ringtoneVolume, startTime + 0.1);
      gain.gain.setValueAtTime(0.08 * this.ringtoneVolume, startTime + duration - 0.2);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }

  /**
   * Create pulse effect for ringtone
   */
  private createPulseEffect(startTime: number, output: GainNode): void {
    if (!this.audioContext) return;
    
    const pulses = [0, 0.4, 0.8, 1.2, 1.6].map(t => t * this.ringtoneTempo);
    
    pulses.forEach((delay) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      const filter = this.audioContext!.createBiquadFilter();
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(output);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, startTime + delay);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, startTime + delay);
      filter.Q.setValueAtTime(0.5, startTime + delay);
      
      gain.gain.setValueAtTime(0, startTime + delay);
      gain.gain.linearRampToValueAtTime(0.15 * this.ringtoneVolume, startTime + delay + 0.02);
      gain.gain.linearRampToValueAtTime(0, startTime + delay + 0.08);
      
      osc.start(startTime + delay);
      osc.stop(startTime + delay + 0.08);
    });
  }

  /**
   * Fallback ringtone using simple beeps
   */
  private playFallbackRingtone(): void {
    if (!this.isBrowser) return;
    
    try {
      // Simple beep sequence
      this.createBeep(523.25, 0.15, 0.3);
      setTimeout(() => this.createBeep(659.25, 0.15, 0.3), 200);
      setTimeout(() => this.createBeep(783.99, 0.2, 0.4), 400);
      setTimeout(() => this.createBeep(1046.50, 0.25, 0.5), 650);
    } catch (error) {
      // Ultimate fallback - try HTML5 audio
      this.ringtoneAudio?.play().catch(() => {});
    }
  }

  /**
   * Generate a buzzer sound using Web Audio API
   */
  private generateBuzzer(): void {
    if (!this.isAudioAvailable() || !this.audioContext) return;

    try {
      const now = this.audioContext.currentTime;
      const masterGain = this.audioContext.createGain();
      masterGain.connect(this.audioContext.destination);
      masterGain.gain.setValueAtTime(0.3, now);

      // Create buzzer with multiple layers
      this.createBuzzerLayer(now, masterGain);
      this.createBuzzerHarmonic(now, masterGain);

      // Fade out
      masterGain.gain.setValueAtTime(0.3, now);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    } catch (error) {
      console.warn('Failed to generate buzzer:', error);
      this.playFallbackBuzzer();
    }
  }

  /**
   * Create buzzer layer
   */
  private createBuzzerLayer(startTime: number, output: GainNode): void {
    if (!this.audioContext) return;
    
    const pattern = [
      { freq: 880, duration: 0.15, volume: 0.4 },
      { freq: 1100, duration: 0.15, volume: 0.3 },
      { freq: 880, duration: 0.2, volume: 0.5 },
    ];

    let currentTime = startTime;

    pattern.forEach((note) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      const filter = this.audioContext!.createBiquadFilter();
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(output);

      osc.type = 'square';
      osc.frequency.setValueAtTime(note.freq, currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, currentTime);
      filter.Q.setValueAtTime(0.5, currentTime);

      gain.gain.setValueAtTime(0, currentTime);
      gain.gain.linearRampToValueAtTime(note.volume, currentTime + 0.01);
      gain.gain.linearRampToValueAtTime(0, currentTime + note.duration - 0.02);

      osc.start(currentTime);
      osc.stop(currentTime + note.duration);

      currentTime += note.duration + 0.05;
    });
  }

  /**
   * Create harmonic for buzzer
   */
  private createBuzzerHarmonic(startTime: number, output: GainNode): void {
    if (!this.audioContext) return;
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(output);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, startTime);
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, startTime + 0.6);
    
    osc.start(startTime);
    osc.stop(startTime + 0.6);
  }

  /**
   * Fallback buzzer using simple beeps
   */
  private playFallbackBuzzer(): void {
    if (!this.isBrowser) return;
    
    try {
      this.createBeep(880, 0.15, 0.4);
      setTimeout(() => this.createBeep(1100, 0.15, 0.3), 200);
      setTimeout(() => this.createBeep(880, 0.2, 0.5), 400);
    } catch (error) {
      this.buzzerAudio?.play().catch(() => {});
    }
  }

  /**
   * Play ringtone for new messages
   */
  playRingtone(): void {
    if (!this.isBrowser || !this.enabled || !this.isInitialized) return;
    
    this.resume();
    
    try {
      this.generateRingtone();
    } catch (error) {
      this.ringtoneAudio?.play().catch(() => {});
    }
  }

  /**
   * Play buzzer for group notifications
   */
  playBuzzer(): void {
    if (!this.isBrowser || !this.enabled || !this.isInitialized) return;
    
    this.resume();
    
    try {
      this.generateBuzzer();
    } catch (error) {
      this.buzzerAudio?.play().catch(() => {});
    }
  }

  /**
   * Play notification sound
   */
  playNotification(): void {
    if (!this.isBrowser || !this.enabled || !this.isInitialized) return;
    
    this.resume();
    
    try {
      this.notificationAudio?.play().catch(() => {});
    } catch (error) {
      console.warn('Failed to play notification:', error);
    }
  }

  /**
   * Play a specific sound type
   */
  playSound(type: 'ringtone' | 'buzzer' | 'notification'): void {
    if (!this.isBrowser) return;
    
    switch (type) {
      case 'ringtone':
        this.playRingtone();
        break;
      case 'buzzer':
        this.playBuzzer();
        break;
      case 'notification':
        this.playNotification();
        break;
      default:
        break;
    }
  }

  /**
   * Enable/disable audio
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.isBrowser) {
      try {
        localStorage.setItem('chat-sound-enabled', String(enabled));
      } catch (error) {
        // Ignore localStorage errors
      }
    }
  }

  /**
   * Check if audio is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Resume audio context (needed for iOS/Chrome autoplay policy)
   */
  resume(): void {
    if (!this.isBrowser || !this.audioContext) return;
    
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
  }

  /**
   * Create a simple beep using oscillator
   */
  private createBeep(frequency: number, duration: number, volume: number = 0.3): void {
    if (!this.isAudioAvailable() || !this.audioContext) return;

    try {
      const now = this.audioContext.currentTime;
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, now);
      
      gainNode.gain.setValueAtTime(volume, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
      
      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (error) {
      console.warn('Failed to create beep:', error);
    }
  }

  /**
   * Vibrate device if supported
   */
  vibrate(pattern: number | number[] = 200): void {
    if (!this.isBrowser) return;
    
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch (error) {
      // Ignore vibration errors
    }
  }

  /**
   * Reset audio context (useful after errors)
   */
  reset(): void {
    if (!this.isBrowser) return;
    
    try {
      this.audioContext?.close();
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
      this.isInitialized = true;
      console.log('Audio context reset successfully');
    } catch (error) {
      console.warn('Failed to reset audio context:', error);
      this.isInitialized = false;
    }
  }
}

/**
 * Get the audio manager instance (safe for SSR)
 */
export function getAudioManager(): IAudioManager {
  if (typeof window === 'undefined') {
    // Return dummy instance on server
    return new DummyAudioManager();
  }
  
  return AudioManager.getInstance();
}

// Export default for convenience
export default getAudioManager;