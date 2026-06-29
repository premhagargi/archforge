'use client'

import { useEffect } from 'react'
import { create } from 'zustand'
import { temporal } from 'zundo'
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react'
import type { NodeChange, EdgeChange, Connection } from '@xyflow/react'
import { calculateLoad } from '@/lib/load-calculator'
import { analyzeArchitecture } from '@/lib/analysis-engine'
import { saveDiagram, loadDiagram } from '@/lib/storage'
import { layoutDiagram } from '@/lib/auto-layout'
import { COMPONENT_CATALOG, DEFAULT_LOAD_INPUTS } from '@/lib/constants'
import { TEMPLATES } from '@/lib/templates'
import { createId } from '@/lib/utils'
import type {
  ArchNode,
  ArchEdge,
  ArchNodeData,
  LoadInputs,
  LoadOutputs,
  Finding,
  Diagram,
  ComponentType,
} from '@/lib/types'

/* ============================================================================
 * Store shape
 * ========================================================================== */

interface ArchitectureState {
  nodes: ArchNode[]
  edges: ArchEdge[]
  diagramName: string
  diagramId: string
  loadInputs: LoadInputs
  selectedNodeIds: string[]
  loadOutputs: LoadOutputs | null
  findings: Finding[]
  lastSaved: string | null
}

interface ArchitectureActions {
  // React Flow change handlers
  onNodesChange(changes: NodeChange<ArchNode>[]): void
  onEdgesChange(changes: EdgeChange<ArchEdge>[]): void
  onConnect(connection: Connection): void

  // Node CRUD
  addNode(type: ComponentType, position: { x: number; y: number }): void
  updateNodeData(nodeId: string, patch: Partial<ArchNodeData>): void
  deleteNode(nodeId: string): void
  duplicateNode(nodeId: string): void

  // Selection
  setSelectedNodeIds(ids: string[]): void
  deleteSelected(): void

  // Diagram metadata
  setDiagramName(name: string): void

  // Load calculator
  setLoadInputs(inputs: Partial<LoadInputs>): void

  // Templates & layout
  loadTemplate(templateId: string): void
  applyAutoLayout(): void

  // Persistence
  save(): void
  loadSaved(): void

  // Lifecycle
  reset(): void
  importDiagram(diagram: Diagram): void
  exportDiagram(): Diagram

  // Internal — not part of the public API but kept on the store for co-location
  _recompute(): void
}

export type ArchitectureStore = ArchitectureState & ArchitectureActions

/* ============================================================================
 * Initial state factory
 * ========================================================================== */

function buildInitialState(): ArchitectureState {
  return {
    nodes: [],
    edges: [],
    diagramName: 'Untitled System',
    diagramId: createId('diagram'),
    loadInputs: DEFAULT_LOAD_INPUTS,
    selectedNodeIds: [],
    loadOutputs: null,
    findings: [],
    lastSaved: null,
  }
}

/* ============================================================================
 * Store
 * ========================================================================== */

export const useArchitectureStore = create<ArchitectureStore>()(
  temporal(
    (set, get) => ({
      ...buildInitialState(),

      /* ------------------------------------------------------------------
       * React Flow change handlers
       * ---------------------------------------------------------------- */

      onNodesChange(changes) {
        set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) as ArchNode[] }))
        get()._recompute()
      },

      onEdgesChange(changes) {
        set((s) => ({ edges: applyEdgeChanges(changes, s.edges) as ArchEdge[] }))
        get()._recompute()
      },

      onConnect(connection) {
        set((s) => ({
          edges: addEdge(
            {
              ...connection,
              id: createId('edge'),
              type: 'smoothstep',
              animated: false,
            },
            s.edges,
          ) as ArchEdge[],
        }))
        get()._recompute()
      },

      /* ------------------------------------------------------------------
       * Node CRUD
       * ---------------------------------------------------------------- */

      addNode(type, position) {
        const catalog = COMPONENT_CATALOG[type]
        const node: ArchNode = {
          id: createId('node'),
          type: 'archNode',
          position,
          data: {
            name: catalog.label,
            description: catalog.description,
            componentType: type,
            riskLevel: catalog.defaultRiskLevel,
            estimatedCapacity: catalog.defaultCapacity,
            notes: '',
            tags: [],
            customMetadata: {},
          },
        }
        set((s) => ({ nodes: [...s.nodes, node] }))
        get()._recompute()
      },

      updateNodeData(nodeId, patch) {
        set((s) => ({
          nodes: s.nodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n,
          ),
        }))
        get()._recompute()
      },

      deleteNode(nodeId) {
        set((s) => ({
          nodes: s.nodes.filter((n) => n.id !== nodeId),
          edges: s.edges.filter(
            (e) => e.source !== nodeId && e.target !== nodeId,
          ),
        }))
        get()._recompute()
      },

      duplicateNode(nodeId) {
        const source = get().nodes.find((n) => n.id === nodeId)
        if (!source) return
        const copy: ArchNode = {
          ...source,
          id: createId('node'),
          position: { x: source.position.x + 40, y: source.position.y + 40 },
          data: { ...source.data },
        }
        set((s) => ({ nodes: [...s.nodes, copy] }))
        get()._recompute()
      },

      /* ------------------------------------------------------------------
       * Selection
       * ---------------------------------------------------------------- */

      setSelectedNodeIds(ids) {
        // Intentionally not part of the temporal snapshot — see partialize.
        set({ selectedNodeIds: ids })
      },

      deleteSelected() {
        const { selectedNodeIds } = get()
        if (selectedNodeIds.length === 0) return
        const idSet = new Set(selectedNodeIds)
        set((s) => ({
          nodes: s.nodes.filter((n) => !idSet.has(n.id)),
          edges: s.edges.filter(
            (e) => !idSet.has(e.source) && !idSet.has(e.target),
          ),
          selectedNodeIds: [],
        }))
        get()._recompute()
      },

      /* ------------------------------------------------------------------
       * Diagram metadata
       * ---------------------------------------------------------------- */

      setDiagramName(name) {
        set({ diagramName: name })
      },

      /* ------------------------------------------------------------------
       * Load calculator
       * ---------------------------------------------------------------- */

      setLoadInputs(inputs) {
        set((s) => ({ loadInputs: { ...s.loadInputs, ...inputs } }))
        get()._recompute()
      },

      /* ------------------------------------------------------------------
       * Templates & layout
       * ---------------------------------------------------------------- */

      loadTemplate(templateId) {
        const template = TEMPLATES.find((t) => t.id === templateId)
        if (!template) return
        set({
          nodes: template.nodes.map((n) => ({ ...n, data: { ...n.data } })),
          edges: template.edges.map((e) => ({ ...e })),
          loadInputs: { ...template.loadInputs },
          diagramName: template.name,
          diagramId: createId('diagram'),
          selectedNodeIds: [],
        })
        get()._recompute()
      },

      applyAutoLayout() {
        const { nodes, edges } = get()
        const laidOut = layoutDiagram(nodes, edges)
        set({ nodes: laidOut })
        get()._recompute()
      },

      /* ------------------------------------------------------------------
       * Persistence
       * ---------------------------------------------------------------- */

      save() {
        const { nodes, edges, loadInputs, diagramName, diagramId } = get()
        const now = new Date().toISOString()
        const diagram: Diagram = {
          id: diagramId,
          name: diagramName,
          nodes,
          edges,
          loadInputs,
          createdAt: now,
          updatedAt: now,
        }
        saveDiagram(diagram)
        set({ lastSaved: now })
      },

      loadSaved() {
        const diagram = loadDiagram()
        if (!diagram) return
        set({
          nodes: diagram.nodes,
          edges: diagram.edges,
          loadInputs: diagram.loadInputs,
          diagramName: diagram.name,
          diagramId: diagram.id,
          selectedNodeIds: [],
        })
        get()._recompute()
      },

      /* ------------------------------------------------------------------
       * Lifecycle
       * ---------------------------------------------------------------- */

      reset() {
        set({
          nodes: [],
          edges: [],
          diagramName: 'Untitled System',
          diagramId: createId('diagram'),
          selectedNodeIds: [],
          loadInputs: DEFAULT_LOAD_INPUTS,
        })
        get()._recompute()
      },

      importDiagram(diagram) {
        set({
          nodes: diagram.nodes,
          edges: diagram.edges,
          loadInputs: diagram.loadInputs,
          diagramName: diagram.name,
          diagramId: diagram.id,
          selectedNodeIds: [],
        })
        get()._recompute()
      },

      exportDiagram(): Diagram {
        const { nodes, edges, loadInputs, diagramName, diagramId } = get()
        const now = new Date().toISOString()
        return {
          id: diagramId,
          name: diagramName,
          nodes,
          edges,
          loadInputs,
          createdAt: now,
          updatedAt: now,
        }
      },

      /* ------------------------------------------------------------------
       * Internal: recompute derived state
       * ---------------------------------------------------------------- */

      _recompute() {
        const { nodes, edges, loadInputs } = get()
        const loadOutputs = calculateLoad(loadInputs)
        const findings =
          nodes.length > 0
            ? analyzeArchitecture({ nodes, edges }, loadOutputs)
            : []
        set({ loadOutputs, findings })
      },
    }),
    {
      partialize: (state) => ({ nodes: state.nodes, edges: state.edges }),
      limit: 100,
    },
  ),
)

/* ============================================================================
 * Temporal (undo/redo) hook helpers
 * ========================================================================== */

export const useUndo = () => useArchitectureStore.temporal.getState().undo
export const useRedo = () => useArchitectureStore.temporal.getState().redo
export const useCanUndo = () =>
  useArchitectureStore.temporal.getState().pastStates.length > 0
export const useCanRedo = () =>
  useArchitectureStore.temporal.getState().futureStates.length > 0

/* ============================================================================
 * Keyboard shortcuts hook
 * ========================================================================== */

export function useKeyboardShortcuts() {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName ?? ''
      const isInputFocused = tag === 'INPUT' || tag === 'TEXTAREA'

      // Ctrl+Z — undo
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        useArchitectureStore.temporal.getState().undo()
        return
      }

      // Ctrl+Shift+Z or Ctrl+Y — redo
      if ((e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
        e.preventDefault()
        useArchitectureStore.temporal.getState().redo()
        return
      }

      // Ctrl+S — save
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        useArchitectureStore.getState().save()
        return
      }

      // Delete / Backspace — delete selected nodes (only when no input is focused)
      if (!isInputFocused && (e.key === 'Delete' || e.key === 'Backspace')) {
        useArchitectureStore.getState().deleteSelected()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
