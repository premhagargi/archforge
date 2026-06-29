export interface SimNode {
  id: string
  componentType: string
  servers: number
  queueCapacity: number
  failureRate: number
  serviceTime: {
    distribution: 'exponential' | 'normal' | 'deterministic'
    meanMs: number
    stdDevMs?: number
  }
  routingFanout: number
}

export interface SimEdge {
  source: string
  target: string
}

export interface SimConfig {
  nodes: SimNode[]
  edges: SimEdge[]
  arrivalRps: number
  durationMs: number
  seed: number
}

export interface NodeMetrics {
  nodeId: string
  throughput: number
  dropRate: number
  utilization: number
  avgQueueDepth: number
  latencySamplesMs: number[]
  p50Ms: number
  p95Ms: number
  p99Ms: number
  totalArrived: number
  totalDropped: number
  totalServed: number
}

export interface SimResult {
  nodeMetrics: Map<string, NodeMetrics>
  endToEndP50Ms: number
  endToEndP95Ms: number
  endToEndP99Ms: number
  endToEndSamplesMs: number[]
  cascadingFailures: string[]
  totalRequests: number
  totalDropped: number
  durationMs: number
}
