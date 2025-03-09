export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
export function range(n) {
    return Array.from({ length: n }, (_, i) => i);
}
export function lerpAngle(from, to, progress) {
    const difference = ((to - from + Math.PI) % (2 * Math.PI)) - Math.PI;
    return from + difference * progress;
}
