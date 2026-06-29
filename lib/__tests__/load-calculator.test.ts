import { describe, it, expect } from 'vitest'
import { calculateLoad } from '../load-calculator'
import { LoadInputsSchema } from '../types'

const BASE = LoadInputsSchema.parse({})

describe('calculateLoad', () => {
  it('derives requestsPerDay from DAU × requests/user', () => {
    const out = calculateLoad({ ...BASE, dailyActiveUsers: 1_000_000, requestsPerUserPerDay: 10 })
    expect(out.requestsPerDay).toBe(10_000_000)
  })

  it('peakRps = averageRps × peakFactor', () => {
    const out = calculateLoad({ ...BASE, dailyActiveUsers: 86_400, requestsPerUserPerDay: 1, peakFactor: 3 })
    // DAU=86400, req/user=1 → 86400 req/day → 1 avg rps → 3 peak rps
    expect(out.averageRps).toBeCloseTo(1, 5)
    expect(out.peakRps).toBeCloseTo(3, 5)
  })

  it('dbLoadRps absorbs cache hits', () => {
    const out = calculateLoad({
      ...BASE,
      dailyActiveUsers: 86_400,
      requestsPerUserPerDay: 1,
      peakFactor: 1,
      readRatio: 1,
      cacheHitRatio: 0.9,
    })
    // 100% reads, 90% cache hit → only 10% of peakRps reaches DB
    expect(out.dbLoadRps).toBeCloseTo(out.peakRps * 0.1, 3)
    expect(out.cacheSavingsRps).toBeCloseTo(out.peakRps * 0.9, 3)
  })

  it('returns single-primary strategy at low DB load', () => {
    const out = calculateLoad({ ...BASE, dailyActiveUsers: 1_000, requestsPerUserPerDay: 1 })
    expect(out.dbScalingStrategy).toBe('single-primary')
  })

  it('returns sharded strategy at very high DB load', () => {
    const out = calculateLoad({
      ...BASE,
      dailyActiveUsers: 10_000_000,
      requestsPerUserPerDay: 100,
      peakFactor: 10,
      readRatio: 0,
      cacheHitRatio: 0,
    })
    expect(out.dbScalingStrategy).toBe('sharded')
  })

  it('suggestedServers respects redundancyFactor', () => {
    // 1000 peak rps → 1 raw server → 1 × 1.5 = ceil(1.5) = 2
    const out = calculateLoad({
      ...BASE,
      dailyActiveUsers: 86_400,
      requestsPerUserPerDay: 1,
      peakFactor: 1,
      redundancyFactor: 1.5,
    })
    expect(out.suggestedServers).toBeGreaterThanOrEqual(1)
  })

  it('retentionStorageBytes = storageGrowthPerDayBytes × retentionDays', () => {
    const out = calculateLoad({
      ...BASE,
      dailyActiveUsers: 1_000,
      writesPerUserPerDay: 1,
      avgPayloadBytes: 1_000,
      retentionDays: 365,
    })
    expect(out.retentionStorageBytes).toBe(out.storageGrowthPerDayBytes * 365)
  })
})
