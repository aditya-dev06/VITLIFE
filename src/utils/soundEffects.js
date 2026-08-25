/**
 * Web Audio API Sound Synthesizer for WhatsApp-style Notifications
 * 
 * Zero external audio file dependency. Synthesizes a crisp, pleasant
 * double-tone incoming message chime instantly in any browser.
 */

class SoundEffectsEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;

    // Load initial preference from localStorage
    try {
      const stored = localStorage.getItem('vit_chat_sound_enabled');
      if (stored !== null) {
        this.isMuted = stored === 'false';
      }
    } catch (e) {}
  }

  initContext() {
    if (!this.ctx && (typeof window !== 'undefined')) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted) {
    this.isMuted = Boolean(muted);
    try {
      localStorage.setItem('vit_chat_sound_enabled', String(!this.isMuted));
    } catch (e) {}
  }

  toggleMute() {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  getIsMuted() {
    return this.isMuted;
  }

  /**
   * Play signature WhatsApp-style incoming message chime (dual harmonic bell)
   */
  playMessageChime() {
    if (this.isMuted) return;

    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // First Ping (800 Hz)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(800, now);
      osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.08);

      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.12);

      // Second Ping (Higher pitch chime at 1600 Hz, delayed by 100ms)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1400, now + 0.09);
      osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.22); // A6 note

      gain2.gain.setValueAtTime(0.22, now + 0.09);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);

      osc2.start(now + 0.09);
      osc2.stop(now + 0.35);
    } catch (err) {
      console.warn('[SoundEngine] Chime playback error:', err.message);
    }
  }

  /**
   * Play subtle sent message 'pop' tone
   */
  playSentSound() {
    if (this.isMuted) return;

    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.06);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch (err) {}
  }
}

export const soundEffects = new SoundEffectsEngine();
