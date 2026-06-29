export function createRng(seed: number) {
  let s = seed >>> 0

  const random = (): number => {
    s |= 0
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const exponential = (meanMs: number): number => {
    const u = Math.min(random(), 1 - Number.EPSILON)
    return -Math.log(1 - u) * meanMs
  }

  const normal = (meanMs: number, stdDevMs: number): number => {
    // Box-Muller transform
    const u1 = Math.max(random(), Number.EPSILON)
    const u2 = random()
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    return Math.max(0.1, meanMs + stdDevMs * z)
  }

  const deterministic = (meanMs: number): number => meanMs

  return { random, exponential, normal, deterministic }
}
