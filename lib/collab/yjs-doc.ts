import * as Y from 'yjs'
import type { ArchNode, ArchEdge } from '@/lib/types'

export function createYDoc() {
  const doc = new Y.Doc()
  const nodesMap = doc.getMap<ArchNode>('nodes')
  const edgesMap = doc.getMap<ArchEdge>('edges')

  return {
    doc,
    nodesMap,
    edgesMap,
    applyNodes(nodes: ArchNode[], origin = 'local') {
      doc.transact(() => {
        const remoteIds = new Set(nodesMap.keys())
        const localIds = new Set(nodes.map(n => n.id))
        remoteIds.forEach(id => { if (!localIds.has(id)) nodesMap.delete(id) })
        nodes.forEach(n => {
          const existing = nodesMap.get(n.id)
          if (!existing || JSON.stringify(existing) !== JSON.stringify(n)) nodesMap.set(n.id, n)
        })
      }, origin)
    },
    applyEdges(edges: ArchEdge[], origin = 'local') {
      doc.transact(() => {
        const remoteIds = new Set(edgesMap.keys())
        const localIds = new Set(edges.map(e => e.id))
        remoteIds.forEach(id => { if (!localIds.has(id)) edgesMap.delete(id) })
        edges.forEach(e => {
          const existing = edgesMap.get(e.id)
          if (!existing || JSON.stringify(existing) !== JSON.stringify(e)) edgesMap.set(e.id, e)
        })
      }, origin)
    },
    getNodes(): ArchNode[] { return Array.from(nodesMap.values()) },
    getEdges(): ArchEdge[] { return Array.from(edgesMap.values()) },
    destroy() { doc.destroy() },
  }
}

export type YDocHandle = ReturnType<typeof createYDoc>
