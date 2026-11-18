// Deterministic Bharat Connect Sonic Branding synthesizer via Web Audio API.
// Plays an identical multi-note ascending harmonic chime across platforms
// without mutating device volume or showing errors if audio fails.

let sharedAudioCtx: AudioContext | null = null;

export function playBharatConnectSonic(audioState: 'normal' | 'muted' | 'fail-load'): {
  played: boolean;
  reason: string;
} {
  if (audioState === 'muted') {
    return { played: false, reason: 'Device is muted / silent — respecting system audio state.' };
  }

  if (audioState === 'fail-load') {
    // Log internally without surfacing error to the customer per Gherkin spec
    console.info('[BharatConnectSDK] Sonic audio asset unavailable; continuing silently.');
    return { played: false, reason: 'Sonic asset unavailable; handled silently.' };
  }

  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      return { played: false, reason: 'Web Audio API unsupported.' };
    }
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume();
    }

    const now = sharedAudioCtx.currentTime;
    // Signature 3-note warm ascending Bharat Connect confirmation motif (C5 -> E5 -> G5 -> C6)
    const notes = [
      { freq: 523.25, start: 0, duration: 0.14, gain: 0.16 },
      { freq: 659.25, start: 0.11, duration: 0.14, gain: 0.18 },
      { freq: 783.99, start: 0.22, duration: 0.16, gain: 0.2 },
      { freq: 1046.5, start: 0.34, duration: 0.42, gain: 0.22 },
    ];

    notes.forEach((n) => {
      if (!sharedAudioCtx) return;
      const osc = sharedAudioCtx.createOscillator();
      const gainNode = sharedAudioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.freq, now + n.start);

      gainNode.gain.setValueAtTime(0.0001, now + n.start);
      gainNode.gain.exponentialRampToValueAtTime(n.gain, now + n.start + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.duration);

      osc.connect(gainNode);
      gainNode.connect(sharedAudioCtx.destination);

      osc.start(now + n.start);
      osc.stop(now + n.start + n.duration + 0.02);
    });

    return { played: true, reason: 'Sonic branding chime played once.' };
  } catch {
    console.info('[BharatConnectSDK] Audio playback skipped safely.');
    return { played: false, reason: 'Audio playback blocked by browser policy.' };
  }
}
