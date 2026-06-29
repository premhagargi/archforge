// Web Worker entry point
import { runSimulation } from './engine'
import type { SimConfig, SimResult, NodeMetrics } from './types'

export type WorkerRequest = { id: string; config: SimConfig }
export type WorkerResponse =
  | { id: string; type: 'result'; result: Omit<SimResult, 'nodeMetrics'> & { nodeMetrics: Record<string, NodeMetrics> } }
  | { id: string; type: 'error'; message: string }

self.onmessage = (ev: MessageEvent<WorkerRequest>) => {
  try {
    const result = runSimulation(ev.data.config)
    const serialized = { ...result, nodeMetrics: Object.fromEntries(result.nodeMetrics) }
    self.postMessage({ id: ev.data.id, type: 'result', result: serialized } satisfies WorkerResponse)
  } catch (e) {
    self.postMessage({ id: ev.data.id, type: 'error', message: String(e) } satisfies WorkerResponse)
  }
}
