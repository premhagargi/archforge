import type { SimConfig, SimResult, NodeMetrics } from './types'
import { createRng } from './rng'
import { sampleServiceTime } from './distributions'

// ---------------------------------------------------------------------------
// Min-heap
// ---------------------------------------------------------------------------

interface HeapItem {
  time: number
}

class MinHeap<T extends HeapItem> {
  private data: T[] = []

  get size(): number {
    return this.data.length
  }

  push(item: T): void {
    this.data.push(item)
    this._bubbleUp(this.data.length - 1)
  }

  pop(): T | undefined {
    if (this.data.length === 0) return undefined
    const top = this.data[0]
    const last = this.data.pop()!
    if (this.data.length > 0) {
      this.data[0] = last
      this._sinkDown(0)
    }
    return top
  }

  peek(): T | undefined {
    return this.data[0]
  }

  private _bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >>> 1
      if (this.data[parent].time <= this.data[i].time) break
      ;[this.data[parent], this.data[i]] = [this.data[i], this.data[parent]]
      i = parent
    }
  }

  private _sinkDown(i: number): void {
    const n = this.data.length
    while (true) {
      let smallest = i
      const l = 2 * i + 1
      const r = 2 * i + 2
      if (l < n && this.data[l].time < this.data[smallest].time) smallest = l
      if (r < n && this.data[r].time < this.data[smallest].time) smallest = r
      if (smallest === i) break
      ;[this.data[smallest], this.data[i]] = [this.data[i], this.data[smallest]]
      i = smallest
    }
  }
}

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

interface SimEvent {
  time: number
  type: 'arrival' | 'departure'
  nodeId: string
  requestId: string
  /** Wall-clock time the request first entered the system (for E2E latency). */
  arrivalTimeMs: number
  /** Wall-clock time this request's service began (for node latency). */
  serviceStartMs?: number
  /** Ordered list of node IDs visited so far. */
  pathSoFar: string[]
}

interface QueueEntry {
  requestId: string
  arrivalTimeMs: number
  pathSoFar: string[]
}

// ---------------------------------------------------------------------------
// Helper: percentile
// ---------------------------------------------------------------------------

function percentile(samples: number[], p: number): number {
  if (samples.length === 0) return 0
  const sorted = [...samples].sort((a, b) => a - b)
  return sorted[Math.floor(p * (sorted.length - 1))]
}

// ---------------------------------------------------------------------------
// Main engine
// ---------------------------------------------------------------------------

export function runSimulation(config: SimConfig): SimResult {
  const rng = createRng(config.seed)

  // ---- Build lookup structures ----
  const nodeMap = new Map(config.nodes.map((n) => [n.id, n]))

  // downstream adjacency: nodeId -> target nodeIds
  const downstream = new Map<string, string[]>()
  for (const node of config.nodes) downstream.set(node.id, [])
  for (const edge of config.edges) {
    downstream.get(edge.source)?.push(edge.target)
  }

  // entry nodes: nodes with no incoming edges
  const hasIncoming = new Set(config.edges.map((e) => e.target))
  const entryNodes = config.nodes.filter((n) => !hasIncoming.has(n.id))

  // ---- Per-node mutable state ----
  const busyServers = new Map<string, number>()
  const queues = new Map<string, QueueEntry[]>()

  // ---- Metrics accumulators ----
  const arrivals = new Map<string, number>()
  const drops = new Map<string, number>()
  const served = new Map<string, number>()
  const latencySamples = new Map<string, number[]>()
  const queueDepthSamples = new Map<string, number[]>()

  for (const node of config.nodes) {
    busyServers.set(node.id, 0)
    queues.set(node.id, [])
    arrivals.set(node.id, 0)
    drops.set(node.id, 0)
    served.set(node.id, 0)
    latencySamples.set(node.id, [])
    queueDepthSamples.set(node.id, [])
  }

  const endToEndSamples: number[] = []
  const heap = new MinHeap<SimEvent>()

  // ---- Seed arrivals at entry nodes ----
  const meanInterArrivalMs = 1000 / config.arrivalRps
  let reqCounter = 0

  for (const entryNode of entryNodes) {
    let t = rng.exponential(meanInterArrivalMs)
    while (t <= config.durationMs) {
      heap.push({
        time: t,
        type: 'arrival',
        nodeId: entryNode.id,
        requestId: `req-${reqCounter++}`,
        arrivalTimeMs: t,
        pathSoFar: [],
      })
      t += rng.exponential(meanInterArrivalMs)
    }
  }

  // ---- Event loop ----
  while (heap.size > 0) {
    const event = heap.pop()!
    if (event.time > config.durationMs) break

    const node = nodeMap.get(event.nodeId)
    if (!node) continue

    if (event.type === 'arrival') {
      // Count arrival
      arrivals.set(event.nodeId, (arrivals.get(event.nodeId) ?? 0) + 1)

      // Sample failure
      if (rng.random() < node.failureRate) {
        drops.set(event.nodeId, (drops.get(event.nodeId) ?? 0) + 1)
        continue
      }

      const busy = busyServers.get(event.nodeId) ?? 0
      const queue = queues.get(event.nodeId)!

      if (busy < node.servers) {
        // A server is free — start immediately
        busyServers.set(event.nodeId, busy + 1)
        const serviceMs = sampleServiceTime(node.serviceTime, rng)
        heap.push({
          time: event.time + serviceMs,
          type: 'departure',
          nodeId: event.nodeId,
          requestId: event.requestId,
          arrivalTimeMs: event.arrivalTimeMs,
          serviceStartMs: event.time,
          pathSoFar: [...event.pathSoFar, event.nodeId],
        })
      } else if (queue.length < node.queueCapacity) {
        // Queue the request
        queue.push({
          requestId: event.requestId,
          arrivalTimeMs: event.arrivalTimeMs,
          pathSoFar: event.pathSoFar,
        })
      } else {
        // Queue full — drop
        drops.set(event.nodeId, (drops.get(event.nodeId) ?? 0) + 1)
      }

      // Record queue depth sample
      queueDepthSamples.get(event.nodeId)!.push(queues.get(event.nodeId)!.length)
    } else {
      // DEPARTURE
      served.set(event.nodeId, (served.get(event.nodeId) ?? 0) + 1)

      // Record node-level service latency
      if (event.serviceStartMs !== undefined) {
        latencySamples.get(event.nodeId)!.push(event.time - event.serviceStartMs)
      }

      // Check if queued requests are waiting
      const queue = queues.get(event.nodeId)!
      if (queue.length > 0) {
        const next = queue.shift()!
        const serviceMs = sampleServiceTime(node.serviceTime, rng)
        heap.push({
          time: event.time + serviceMs,
          type: 'departure',
          nodeId: event.nodeId,
          requestId: next.requestId,
          arrivalTimeMs: next.arrivalTimeMs,
          serviceStartMs: event.time,
          pathSoFar: [...next.pathSoFar, event.nodeId],
        })
      } else {
        busyServers.set(event.nodeId, (busyServers.get(event.nodeId) ?? 1) - 1)
      }

      // Route downstream
      const targets = downstream.get(event.nodeId) ?? []
      for (const target of targets) {
        heap.push({
          time: event.time,
          type: 'arrival',
          nodeId: target,
          requestId: event.requestId,
          arrivalTimeMs: event.arrivalTimeMs,
          pathSoFar: event.pathSoFar,
        })
      }

      // Leaf node — record end-to-end latency
      if (targets.length === 0) {
        endToEndSamples.push(event.time - event.arrivalTimeMs)
      }
    }
  }

  // ---- Compute NodeMetrics ----
  const durationSec = config.durationMs / 1000
  const nodeMetrics = new Map<string, NodeMetrics>()

  for (const node of config.nodes) {
    const totalArrived = arrivals.get(node.id) ?? 0
    const totalDropped = drops.get(node.id) ?? 0
    const totalServed = served.get(node.id) ?? 0
    const samples = latencySamples.get(node.id) ?? []
    const depthSamples = queueDepthSamples.get(node.id) ?? []

    const throughput = totalServed / durationSec
    const dropRate = totalArrived > 0 ? totalDropped / totalArrived : 0

    // Utilization via M/M/c: rho = lambda / (c * mu)
    const lambda = totalArrived / durationSec
    const mu = 1000 / node.serviceTime.meanMs
    const utilization = Math.min(1, lambda / (node.servers * mu))

    const avgQueueDepth =
      depthSamples.length > 0
        ? depthSamples.reduce((a, b) => a + b, 0) / depthSamples.length
        : 0

    nodeMetrics.set(node.id, {
      nodeId: node.id,
      throughput,
      dropRate,
      utilization,
      avgQueueDepth,
      latencySamplesMs: samples,
      p50Ms: percentile(samples, 0.5),
      p95Ms: percentile(samples, 0.95),
      p99Ms: percentile(samples, 0.99),
      totalArrived,
      totalDropped,
      totalServed,
    })
  }

  // ---- Cascading failures ----
  const cascadingFailures: string[] = []
  for (const [id, metrics] of nodeMetrics) {
    if (metrics.utilization > 0.95) cascadingFailures.push(id)
  }

  // ---- Totals ----
  let totalRequests = 0
  let totalDropped = 0
  for (const node of config.nodes) {
    totalRequests += arrivals.get(node.id) ?? 0
    totalDropped += drops.get(node.id) ?? 0
  }

  return {
    nodeMetrics,
    endToEndP50Ms: percentile(endToEndSamples, 0.5),
    endToEndP95Ms: percentile(endToEndSamples, 0.95),
    endToEndP99Ms: percentile(endToEndSamples, 0.99),
    endToEndSamplesMs: endToEndSamples,
    cascadingFailures,
    totalRequests,
    totalDropped,
    durationMs: config.durationMs,
  }
}
