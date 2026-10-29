let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  const AudioCtx =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

/** 木製印床に朱肉を落とす「ドンッ」＋剥がし＋満願の余韻鈴 */
export function playCelebrationStampSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();

    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(155, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 0.24);
    gain.gain.setValueAtTime(0.58, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);

    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = "sine";
    snapOsc.frequency.setValueAtTime(280, t);
    snapOsc.frequency.exponentialRampToValueAtTime(70, t + 0.09);
    snapGain.gain.setValueAtTime(0.24, t);
    snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    snapOsc.connect(snapGain);
    snapGain.connect(ctx.destination);
    snapOsc.start(t);
    snapOsc.stop(t + 0.16);

    window.setTimeout(() => {
      try {
        const live = getAudioContext();
        if (!live) return;
        const rel = live.currentTime;
        const peelOsc = live.createOscillator();
        const peelGain = live.createGain();
        peelOsc.type = "sine";
        peelOsc.frequency.setValueAtTime(420, rel);
        peelOsc.frequency.exponentialRampToValueAtTime(180, rel + 0.06);
        peelGain.gain.setValueAtTime(0.08, rel);
        peelGain.gain.exponentialRampToValueAtTime(0.0001, rel + 0.08);
        peelOsc.connect(peelGain);
        peelGain.connect(live.destination);
        peelOsc.start(rel);
        peelOsc.stop(rel + 0.09);
      } catch {
        // ignore
      }
    }, 320);

    for (const [freq, delay] of [
      [587.33, 0.06],
      [880.0, 0.13],
    ] as const) {
      const bell = ctx.createOscillator();
      const bellGain = ctx.createGain();
      bell.type = "sine";
      bell.frequency.setValueAtTime(freq, t + delay);
      bellGain.gain.setValueAtTime(0.06, t + delay);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, t + 2.0);
      bell.connect(bellGain);
      bellGain.connect(ctx.destination);
      bell.start(t + delay);
      bell.stop(t + 2.1);
    }
  } catch {
    // Autoplay / AudioContext 拒否時は無音で続行
  }
}

/** 筆が走る微細な紙擦れ音 */
export function playPenStrokeSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();

    const t = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 0.022);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 3200;
    filter.Q.value = 1.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.035, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.022);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.022);
  } catch {
    // ignore
  }
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
