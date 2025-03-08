export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

export function lerpAngle(from: number, to: number, progress: number): number {
  const difference = ((to - from + Math.PI) % (2 * Math.PI)) - Math.PI;
  return from + difference * progress;
}
