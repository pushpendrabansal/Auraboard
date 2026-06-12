// Web Audio API Synthesizer for premium, self-contained UI sound effects
class SoundSynth {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            // Lazy load AudioContext on first user interaction
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setEnabled(enabled) {
        this.enabled = !!enabled;
    }

    // A soft, organic "click" or "tick" sound for normal checkbox toggle
    playTick() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = 'sine';
        // Fast sweep from 1500Hz to 600Hz
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.05);
    }

    // A beautiful, ascending electronic chime for checklist completion
    playSuccess() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        // Ascending major chord notes: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
        const notes = [523.25, 659.25, 783.99, 1046.50];
        const noteDuration = 0.08;
        const noteInterval = 0.06;

        notes.forEach((freq, index) => {
            const time = now + index * noteInterval;
            
            const osc = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);

            gainNode.gain.setValueAtTime(0.0, time);
            gainNode.gain.linearRampToValueAtTime(0.06, time + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + noteDuration);

            osc.connect(gainNode);
            gainNode.connect(this.ctx.destination);

            osc.start(time);
            osc.stop(time + noteDuration + 0.01);
        });
    }

    // A low-frequency descending swoosh / paper crumple for deletion
    playDelete() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);

        gainNode.gain.setValueAtTime(0.04, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        // Low-pass filter to make it softer
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, now);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.16);
    }

    // A pleasant double-beep for saving items
    playSave() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        
        // Tone 1: C5 (523Hz)
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, now); // E5
        gain1.gain.setValueAtTime(0.05, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.09);

        // Tone 2: A5 (880Hz) after 0.06 seconds
        const time2 = now + 0.07;
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, time2);
        gain2.gain.setValueAtTime(0.0, time2);
        gain2.gain.linearRampToValueAtTime(0.05, time2 + 0.01);
        gain2.gain.exponentialRampToValueAtTime(0.001, time2 + 0.08);
        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.start(time2);
        osc2.stop(time2 + 0.09);
    }
}

// Export a single instance
const soundSynth = new SoundSynth();
window.soundSynth = soundSynth;
