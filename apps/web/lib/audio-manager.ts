// lib/audio-manager.ts
export class AudioManager {
  private static instance: AudioManager;
  private audioContext: AudioContext | null = null;
  private ringtoneAudio: HTMLAudioElement | null = null;
  private buzzerAudio: HTMLAudioElement | null = null;
  private notificationAudio: HTMLAudioElement | null = null;
  private isInitialized = false;
  private enabled = true;

  private constructor() {
    this.init();
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private init() {
    if (typeof window === 'undefined') return;
    
    try {
      // Create audio context for web audio API (more reliable)
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
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
      
      this.isInitialized = true;
      console.log('Audio manager initialized');
    } catch (error) {
      console.warn('Failed to initialize audio manager:', error);
    }
  }

  /**
   * Generate a ringtone using Web Audio API
   */
private generateRingtone(): void {
  if (!this.audioContext) return;

  try {
    const now = this.audioContext.currentTime;
    const masterGain = this.audioContext.createGain();
    masterGain.connect(this.audioContext.destination);
    masterGain.gain.setValueAtTime(0.3, now);

    // Create a more sophisticated ringtone with multiple layers
    this.createMelodyLayer(now, masterGain);
    this.createHarmonyLayer(now, masterGain);
    this.createPulseEffect(now, masterGain);

    // Fade out smoothly
    masterGain.gain.setValueAtTime(0.3, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

  } catch (error) {
    console.warn('Failed to generate ringtone:', error);
    this.ringtoneAudio?.play().catch(() => {});
  }
}

private createMelodyLayer(startTime: number, output: GainNode): void {
  // Professional ringtone pattern - "Alert" motif
  const melody = [
    { freq: 523.25, duration: 0.12, volume: 0.4 },  // C5
    { freq: 659.25, duration: 0.12, volume: 0.4 },  // E5
    { freq: 783.99, duration: 0.18, volume: 0.5 },  // G5
    { freq: 1046.50, duration: 0.15, volume: 0.5 }, // C6
    { freq: 880.00, duration: 0.10, volume: 0.3 },  // A5
    { freq: 987.77, duration: 0.15, volume: 0.4 },  // B5
    { freq: 1046.50, duration: 0.25, volume: 0.6 }, // C6 (held)
  ];

  let currentTime = startTime;

  melody.forEach((note, index) => {
    const osc = this.audioContext!.createOscillator();
    const gain = this.audioContext!.createGain();
    
    osc.connect(gain);
    gain.connect(output);

    // Use triangle wave for warmer, less harsh sound
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(note.freq, currentTime);

    // Add slight vibrato for richness
    if (index % 2 === 0) {
      const vibrato = this.audioContext!.createOscillator();
      const vibratoGain = this.audioContext!.createGain();
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      vibrato.frequency.setValueAtTime(5, currentTime);
      vibratoGain.gain.setValueAtTime(3, currentTime);
      vibrato.start(currentTime);
      vibrato.stop(currentTime + note.duration);
    }

    // Volume envelope with quick attack and release
    gain.gain.setValueAtTime(0, currentTime);
    gain.gain.linearRampToValueAtTime(note.volume, currentTime + 0.02);
    gain.gain.setValueAtTime(note.volume, currentTime + note.duration - 0.03);
    gain.gain.linearRampToValueAtTime(0, currentTime + note.duration);

    osc.start(currentTime);
    osc.stop(currentTime + note.duration);

    currentTime += note.duration + 0.05;
  });
}

private createHarmonyLayer(startTime: number, output: GainNode): void {
  // Gentle harmonic pad in the background
  const harmonyNotes = [261.63, 329.63, 392.00]; // C4, E4, G4
  
  harmonyNotes.forEach((freq) => {
    const osc = this.audioContext!.createOscillator();
    const gain = this.audioContext!.createGain();
    
    osc.connect(gain);
    gain.connect(output);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    
    // Very subtle background volume
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.08, startTime + 0.1);
    gain.gain.setValueAtTime(0.08, startTime + 1.8);
    gain.gain.linearRampToValueAtTime(0, startTime + 2.0);
    
    osc.start(startTime);
    osc.stop(startTime + 2.0);
  });
}

private createPulseEffect(startTime: number, output: GainNode): void {
  // Add a subtle rhythmic pulse for alert urgency
  const pulses = [0, 0.4, 0.8, 1.2, 1.6];
  
  pulses.forEach((delay) => {
    const osc = this.audioContext!.createOscillator();
    const gain = this.audioContext!.createGain();
    const filter = this.audioContext!.createBiquadFilter();
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    
    // Low frequency pulse
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, startTime + delay);
    
    // Filter to make it more like a soft "thump"
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, startTime + delay);
    filter.Q.setValueAtTime(0.5, startTime + delay);
    
    // Quick, subtle pulse
    gain.gain.setValueAtTime(0, startTime + delay);
    gain.gain.linearRampToValueAtTime(0.15, startTime + delay + 0.02);
    gain.gain.linearRampToValueAtTime(0, startTime + delay + 0.08);
    
    osc.start(startTime + delay);
    osc.stop(startTime + delay + 0.08);
  });
}

// Public method to change ringtone style
public setRingtoneStyle(style: 'professional' | 'urgent' | 'gentle'): void {
  this.ringtoneStyle = style;
  // Adjust parameters based on style
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
   * Generate a buzzer sound using Web Audio API
   */
  private generateBuzzer(): void {
    if (!this.audioContext) return;

    try {
      const now = this.audioContext.currentTime;
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(880, now);
      
      // Buzzer pattern - three short beeps
      for (let i = 0; i < 3; i++) {
        const startTime = now + i * 0.2;
        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
      }
      
      oscillator.start(now);
      oscillator.stop(now + 0.6);
    } catch (error) {
      console.warn('Failed to generate buzzer:', error);
      // Fallback to HTML audio
      this.buzzerAudio?.play().catch(() => {});
    }
  }

  /**
   * Play ringtone for new messages
   */
  playRingtone(): void {
    if (!this.enabled || !this.isInitialized) return;
    
    try {
      // Try Web Audio first
      this.generateRingtone();
    } catch (error) {
      // Fallback to HTML audio
      this.ringtoneAudio?.play().catch(() => {});
    }
  }

  /**
   * Play buzzer for group notifications
   */
  playBuzzer(): void {
    if (!this.enabled || !this.isInitialized) return;
    
    try {
      // Try Web Audio first
      this.generateBuzzer();
    } catch (error) {
      // Fallback to HTML audio
      this.buzzerAudio?.play().catch(() => {});
    }
  }

  /**
   * Play notification sound
   */
  playNotification(): void {
    if (!this.enabled || !this.isInitialized) return;
    
    try {
      this.notificationAudio?.play().catch(() => {});
    } catch (error) {
      console.warn('Failed to play notification:', error);
    }
  }

  /**
   * Enable/disable audio
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    localStorage.setItem('chat-sound-enabled', String(enabled));
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
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * Create a simple beep using oscillator
   */
  private createBeep(frequency: number, duration: number, volume: number = 0.3): void {
    if (!this.audioContext) return;

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
   * Play a specific sound type
   */
  playSound(type: 'ringtone' | 'buzzer' | 'notification'): void {
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
   * Vibrate device if supported
   */
  vibrate(pattern: number | number[] = 200): void {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }
}

// Export singleton
export const audioManager = AudioManager.getInstance();