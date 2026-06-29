import { createRng } from './rng'

type Rng = ReturnType<typeof createRng>

export function sampleServiceTime(
  dist: {
    distribution: 'exponential' | 'normal' | 'deterministic'
    meanMs: number
    stdDevMs?: number
  },
  rng: Rng,
): number {
  switch (dist.distribution) {
    case 'exponential':
      return rng.exponential(dist.meanMs)
    case 'normal':
      return rng.normal(dist.meanMs, dist.stdDevMs ?? dist.meanMs * 0.2)
    case 'deterministic':
      return rng.deterministic(dist.meanMs)
    default:
      return dist.meanMs
  }
}
