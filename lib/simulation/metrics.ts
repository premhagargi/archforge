import type { SimResult } from './types'
import type { SimConfig, SimNode, SimEdge } from './types'
import type { ArchNode } from '@/lib/types'
import { COMPONENT_CATALOG } from '@/lib/constants'

export function percentile(samples: number[], p: number): number {
  if (samples.length === 0) return 0
  const sorted = [...samples].sort((a, b) => a - b)
  return sorted[Math.floor(p * (sorted.length - 1))]
}

export function formatLatency(ms: number): string {
  if (ms === 0) return '—'
  if (ms < 1) return '<1ms'
  if (ms < 1000) return Math.round(ms) + 'ms'
  return (ms / 1000).toFixed(2) + 's'
}

export type UtilizationLevel = 'healthy' | 'busy' | 'saturated'

export function utilizationLevel(rho: number): UtilizationLevel {
  if (rho < 0.7) return 'healthy'
  if (rho < 0.9) return 'busy'
  return 'saturated'
}

export function buildSimConfig(
  nodes: ArchNode[],
  edges: Array<{ source: string; target: string }>,
  arrivalRps: number,
  durationMs = 30_000,
  seed = 42,
): SimConfig {
  const simNodes: SimNode[] = nodes.map((n) => {
    const profile = COMPONENT_CATALOG[n.data.componentType].simulation
    return {
      id: n.id,
      componentType: n.data.componentType,
      servers: profile.servers,
      queueCapacity: profile.queueCapacity,
      failureRate: profile.failureRate,
      serviceTime: profile.serviceTime,
      routingFanout: profile.routingFanout,
    }
  })
  const simEdges: SimEdge[] = edges.map((e) => ({ source: e.source, target: e.target }))
  return { nodes: simNodes, edges: simEdges, arrivalRps, durationMs, seed } satisfies SimConfig
}
