import { Logger } from '../core/logger.js';

export class AudioManager {
    constructor() {
        this.logger = new Logger('AudioManager');
        this.enabled = this.loadState();
        this.volume = 0.5;
        this.sounds = new Map();
        this.context = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) {
            return;
        }

        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.loadSounds();
            this.initialized = true;
            this.logger.info('Audio manager initialized');
        } catch (error) {
            this.logger.error('Failed to initialize audio context:', error);
            this.enabled = false;
        }
    }

    loadState() {
        const saved = localStorage.getItem('soundEnabled');
        return saved !== 'false';
    }

    saveState() {
        localStorage.setItem('soundEnabled', this.enabled);
    }

    loadSounds() {
        const soundData = {
            click: { frequency: 800, duration: 50, type: 'square', volume: 0.3 },
            hover: { frequency: 600, duration: 30, type: 'sine', volume: 0.2 },
            success: { frequency: 1000, duration: 200, type: 'sine', volume: 0.4 },
            error: { frequency: 300, duration: 300, type: 'sawtooth', volume: 0.5 },
            nav: { frequency: 500, duration: 100, type: 'triangle', volume: 0.3 },
            type: { frequency: 1200, duration: 20, type: 'square', volume: 0.1 },
            switch: { frequency: 700, duration: 80, type: 'sine', volume: 0.3 },
            startup: {
                sequence: [
                    { frequency: 261.63, duration: 100 },
                    { frequency: 329.63, duration: 100 },
                    { frequency: 392, duration: 100 },
                    { frequency: 523.25, duration: 200 },
                ],
                type: 'sine',
                volume: 0.4,
            },
            shutdown: {
                sequence: [
                    { frequency: 523.25, duration: 100 },
                    { frequency: 392, duration: 100 },
                    { frequency: 329.63, duration: 100 },
                    { frequency: 261.63, duration: 200 },
                ],
                type: 'sine',
                volume: 0.4,
            },
        };

        Object.entries(soundData).forEach(([name, data]) => {
            this.sounds.set(name, data);
        });
    }

    play(soundName, options = {}) {
        if (!this.enabled || !this.initialized) {
            return;
        }

        const sound = this.sounds.get(soundName);
        if (!sound) {
            this.logger.warn(`Sound not found: ${soundName}`);
            return;
        }

        if (this.context.state === 'suspended') {
            this.context.resume();
        }

        if (sound.sequence) {
            this.playSequence(sound, options);
        } else {
            this.playTone(sound, options);
        }
    }

    playTone(sound, options = {}) {
        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);

        oscillator.type = sound.type || 'sine';
        oscillator.frequency.value = sound.frequency;

        const volume = (options.volume || sound.volume || 0.5) * this.volume;
        gainNode.gain.value = volume;

        const duration = options.duration || sound.duration || 100;
        const { currentTime } = this.context;

        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + (duration / 1000));

        oscillator.start(currentTime);
        oscillator.stop(currentTime + (duration / 1000));
    }

    playSequence(sound, _options = {}) {
        let time = this.context.currentTime;

        sound.sequence.forEach(note => {
            const oscillator = this.context.createOscillator();
            const gainNode = this.context.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.context.destination);

            oscillator.type = sound.type || 'sine';
            oscillator.frequency.value = note.frequency;

            const volume = (sound.volume || 0.5) * this.volume;
            gainNode.gain.value = volume;

            const duration = note.duration / 1000;

            oscillator.start(time);
            oscillator.stop(time + duration);

            gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);

            time += duration;
        });
    }

    playNote(frequency, duration = 100, type = 'sine') {
        if (!this.enabled || !this.initialized) {
            return;
        }

        this.playTone({
            frequency,
            duration,
            type,
            volume: 0.5,
        });
    }

    playMelody(notes, tempo = 120) {
        if (!this.enabled || !this.initialized) {
            return;
        }

        const beatDuration = 60 / tempo;
        let time = this.context.currentTime;

        notes.forEach(({ note, duration = 1, volume = 0.5 }) => {
            const frequency = this.noteToFrequency(note);
            if (frequency) {
                this.scheduleNote(frequency, time, duration * beatDuration, volume);
            }
            time += duration * beatDuration;
        });
    }

    scheduleNote(frequency, startTime, duration, volume) {
        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.value = volume * this.volume;
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }

    noteToFrequency(note) {
        const notes = {
            C4: 261.63,
            'C#4': 277.18,
            D4: 293.66,
            'D#4': 311.13,
            E4: 329.63,
            F4: 349.23,
            'F#4': 369.99,
            G4: 392.0,
            'G#4': 415.3,
            A4: 440.0,
            'A#4': 466.16,
            B4: 493.88,
            C5: 523.25,
            'C#5': 554.37,
            D5: 587.33,
            'D#5': 622.25,
            E5: 659.25,
            F5: 698.46,
            'F#5': 739.99,
            G5: 783.99,
            'G#5': 830.61,
            A5: 880.0,
            'A#5': 932.33,
            B5: 987.77,
        };

        return notes[note] || null;
    }

    createOscillator(type = 'sine', frequency = 440) {
        if (!this.initialized) {
            return null;
        }

        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();

        oscillator.type = type;
        oscillator.frequency.value = frequency;
        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);
        gainNode.gain.value = this.volume;

        return {
            oscillator,
            gainNode,
            start: () => oscillator.start(),
            stop: () => oscillator.stop(),
            setFrequency: freq => (oscillator.frequency.value = freq),
            setVolume: vol => (gainNode.gain.value = vol * this.volume),
        };
    }

    toggle() {
        this.enabled = !this.enabled;
        this.saveState();

        if (this.enabled && !this.initialized) {
            this.init();
        }

        this.logger.info(`Sound ${this.enabled ? 'enabled' : 'disabled'}`);
        return this.enabled;
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.logger.info(`Volume set to: ${this.volume}`);
    }

    getVolume() {
        return this.volume;
    }

    mute() {
        this.previousVolume = this.volume;
        this.volume = 0;
    }

    unmute() {
        this.volume = this.previousVolume || 0.5;
    }

    playAmbient() {
        if (!this.enabled || !this.initialized) {
            return null;
        }

        const oscillator1 = this.context.createOscillator();
        const oscillator2 = this.context.createOscillator();
        const gainNode = this.context.createGain();

        oscillator1.type = 'sine';
        oscillator2.type = 'sine';

        oscillator1.frequency.value = 100;
        oscillator2.frequency.value = 101;

        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(this.context.destination);

        gainNode.gain.value = 0.05 * this.volume;

        oscillator1.start();
        oscillator2.start();

        return () => {
            oscillator1.stop();
            oscillator2.stop();
        };
    }

    destroy() {
        if (this.context) {
            this.context.close();
        }
        this.sounds.clear();
        this.initialized = false;
        this.logger.info('Audio manager destroyed');
    }
}
