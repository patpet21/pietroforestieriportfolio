/**
 * GestureOS temporal intent filter.
 * Reusable, framework-agnostic input stabilization for webcam gesture tracking.
 * Does not access the camera or dispatch clicks by itself.
 */
export type GestureIntent = 'idle' | 'point' | 'scroll' | 'pinch' | 'pause';
export type GestureSample = { x: number; y: number; intent: GestureIntent; timestamp: number };
export type GestureFrame = { x: number; y: number; intent: GestureIntent; changed: boolean; scrollDelta: number };
export class GestureIntentFilter {
  private last: GestureFrame | null = null;
  private candidate: GestureIntent = 'idle';
  private candidateSince = 0;
  private anchorY: number | null = null;
  private lastAt = 0;
  constructor(private readonly config = { smoothing: 0.23, holdMs: 140, deadzonePx: 16, scrollGain: 0.42, maxScrollPx: 44 }) {}
  reset() { this.last = null; this.candidate = 'idle'; this.candidateSince = 0; this.anchorY = null; this.lastAt = 0; }
  update(sample: GestureSample): GestureFrame {
    if (!Number.isFinite(sample.x) || !Number.isFinite(sample.y) || !Number.isFinite(sample.timestamp)) {
      throw new Error('Invalid gesture sample');
    }
    if (sample.timestamp < this.lastAt || sample.timestamp - this.lastAt > 650) this.reset();
    this.lastAt = sample.timestamp;
    const prev = this.last;
    const alpha = this.config.smoothing;
    const x = prev ? prev.x * (1 - alpha) + sample.x * alpha : sample.x;
    const y = prev ? prev.y * (1 - alpha) + sample.y * alpha : sample.y;
    if (sample.intent !== this.candidate) { this.candidate = sample.intent; this.candidateSince = sample.timestamp; }
    const intent = sample.timestamp - this.candidateSince >= this.config.holdMs ? this.candidate : (prev?.intent ?? 'idle');
    const changed = intent !== (prev?.intent ?? 'idle');
    if (intent !== 'scroll' || changed) this.anchorY = y;
    let scrollDelta = 0;
    if (intent === 'scroll' && this.anchorY !== null) {
      const dy = y - this.anchorY;
      if (Math.abs(dy) > this.config.deadzonePx) {
        scrollDelta = Math.max(-this.config.maxScrollPx, Math.min(this.config.maxScrollPx, dy * this.config.scrollGain));
        this.anchorY += dy * 0.28;
      }
    }
    const frame = { x, y, intent, changed, scrollDelta };
    this.last = frame;
    return frame;
  }
}
