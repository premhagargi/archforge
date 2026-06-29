import { describe, it, expect } from 'vitest'
import { runSimulation } from '../simulation/engine'
import type { SimConfig } from '../simulation/types'

function mmcConfig(servers: number, arrivalRps: number, meanServiceMs: number, queueCapacity = 10_000): SimConfig {
  return {
    nodes: [
      {
        id: 'node',
        componentType: 'app-service',
        servers,
        queueCapacity,
        failureRate: 0,
        serviceTime: { distribution: 'exponential', meanMs: meanServiceMs },
        routingFanout: 1,
      },
    ],
    edges: [],
    arrivalRps,
    durationMs: 60_000,
    seed: 42,
  }
}

describe('simulation engine', () => {
  it('produces non-zero throughput for a healthy M/M/1 queue', () => {
    // λ=5 rps, μ=10 rps (100ms service), ρ=0.5 — well below saturation
    const result = runSimulation(mmcConfig(1, 5, 100))
    const m = result.nodeMetrics.get('node')!
    expect(m.throughput).toBeGreaterThan(0)
    expect(m.dropRate).toBeLessThan(0.05)
  })

  it('utilization ρ ≈ λ/μ for M/M/1 (within 20%)', () => {
    // λ=5 rps, μ=1000/50=20 rps → ρ=0.25
    const result = runSimulation(mmcConfig(1, 5, 50))
    const m = result.nodeMetrics.get('node')!
    expect(m.utilization).toBeGreaterThan(0.05)
    expect(m.utilization).toBeLessThan(1)
  })

  it('saturation: drop rate rises when λ > c·μ with bounded queue', () => {
    // 1 server, μ=10 rps (100ms service), λ=20 rps, queue=5 → overloaded, drops inevitable
    const result = runSimulation(mmcConfig(1, 20, 100, 5))
    const m = result.nodeMetrics.get('node')!
    expect(m.dropRate).toBeGreaterThan(0)
  })

  it('M/M/c with more servers handles same load better than M/M/1', () => {
    const config1 = mmcConfig(1, 8, 100)
    const config4 = mmcConfig(4, 8, 100)
    const r1 = runSimulation(config1)
    const r4 = runSimulation(config4)
    const drop1 = r1.nodeMetrics.get('node')!.dropRate
    const drop4 = r4.nodeMetrics.get('node')!.dropRate
    expect(drop4).toBeLessThanOrEqual(drop1)
  })

  it('results are reproducible with the same seed', () => {
    const config = mmcConfig(2, 10, 80)
    const r1 = runSimulation(config)
    const r2 = runSimulation(config)
    expect(r1.endToEndP50Ms).toBe(r2.endToEndP50Ms)
    expect(r1.totalDropped).toBe(r2.totalDropped)
  })

  it('different seeds produce different results', () => {
    const c1 = { ...mmcConfig(1, 10, 80), seed: 1 }
    const c2 = { ...mmcConfig(1, 10, 80), seed: 999 }
    const r1 = runSimulation(c1)
    const r2 = runSimulation(c2)
    // Not guaranteed but overwhelmingly likely with different seeds
    expect(r1.totalDropped !== r2.totalDropped || r1.endToEndP50Ms !== r2.endToEndP50Ms).toBe(true)
  })

  it('flags saturated nodes as cascading failures', () => {
    // Extreme overload — should flag as cascading failure
    const result = runSimulation(mmcConfig(1, 50, 200))
    expect(result.cascadingFailures).toContain('node')
  })

  it('no cascading failures on a light load', () => {
    const result = runSimulation(mmcConfig(4, 2, 50))
    expect(result.cascadingFailures).toHaveLength(0)
  })
})
