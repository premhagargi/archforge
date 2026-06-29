'use client'

import { useCallback } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useArchitectureStore } from '@/store/architecture-store'
import { NODE_TYPES } from './ArchNode'
import type { ComponentType } from '@/lib/types'

interface ArchitectureCanvasProps {
  className?: string
}

function CanvasInner({ className }: ArchitectureCanvasProps) {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    setSelectedNodeIds,
  } = useArchitectureStore()
  const { screenToFlowPosition } = useReactFlow()

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const type = e.dataTransfer.getData(
        'application/archforge-node-type',
      ) as ComponentType
      if (!type) return
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      addNode(type, position)
    },
    [screenToFlowPosition, addNode],
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onSelectionChange = useCallback(
    ({ nodes }: { nodes: any[] }) => {
      setSelectedNodeIds(nodes.map((n) => n.id))
    },
    [setSelectedNodeIds],
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onSelectionChange={onSelectionChange}
      nodeTypes={NODE_TYPES as NodeTypes}
      defaultEdgeOptions={{
        type: 'smoothstep',
        style: { stroke: 'var(--accent)', strokeWidth: 1.5 },
        markerEnd: { type: 'arrowclosed', color: 'var(--accent)' },
      }}
      className={className}
      fitView
      selectionOnDrag
      panOnScroll
      deleteKeyCode={null}
    >
      <Background
        variant={BackgroundVariant.Dots}
        color="var(--grid)"
        gap={24}
        size={1.5}
      />
      <Controls className="!border-border !bg-surface !shadow-sm" />
      <MiniMap
        nodeColor={(node: any) => {
          const risk = node.data?.riskLevel
          if (risk === 'high') return 'var(--critical)'
          if (risk === 'medium') return 'var(--warning)'
          return 'var(--success)'
        }}
        className="!border-border !bg-surface"
        maskColor="rgba(248, 246, 242, 0.8)"
      />
    </ReactFlow>
  )
}

export function ArchitectureCanvas(props: ArchitectureCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  )
}
