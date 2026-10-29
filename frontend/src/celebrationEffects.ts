let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  const AudioCtx =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

/** 木製印床に朱肉を落とす「トンッ」＋満願時の余韻鈴 */
export function playCelebrationStampSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();

    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(36, t + 0.22);
    gain.gain.setValueAtTime(0.38, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.35);

    for (const [freq, delay] of [
      [587.33, 0.05],
      [880.0, 0.13],
    ] as const) {
      const bell = ctx.createOscillator();
      const bellGain = ctx.createGain();
      bell.type = "sine";
      bell.frequency.setValueAtTime(freq, t + delay);
      bellGain.gain.setValueAtTime(0.09, t + delay);
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

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
