import type { SimConfig, SimResult, NodeMetrics } from './types'

let worker: Worker | null = null
const pending = new Map<string, { resolve: (r: SimResult) => void; reject: (e: Error) => void }>()
let counter = 0

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url))
    worker.onmessage = (ev) => {
      const msg = ev.data
      const cb = pending.get(msg.id)
      if (!cb) return
      pending.delete(msg.id)
      if (msg.type === 'result') {
        cb.resolve({
          ...msg.result,
          nodeMetrics: new Map(Object.entries(msg.result.nodeMetrics as Record<string, NodeMetrics>)),
        })
      } else {
        cb.reject(new Error(msg.message))
      }
    }
    worker.onerror = (e) => console.error('Sim worker error', e)
  }
  return worker
}

export function runSimulationInWorker(config: SimConfig): Promise<SimResult> {
  return new Promise((resolve, reject) => {
    const id = 'r' + counter++
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ id, config })
  })
}

export function terminateSimWorker() {
  worker?.terminate()
  worker = null
  pending.forEach((cb) => cb.reject(new Error('Worker terminated')))
  pending.clear()
}
