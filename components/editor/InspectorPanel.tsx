'use client'

import { useState, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import { useArchitectureStore } from '@/store/architecture-store'
import { CATALOG_BY_CATEGORY, COMPONENT_CATALOG } from '@/lib/constants'
import type { ComponentType, RiskLevel } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/* ============================================================================
 * Meta panel — shown when nothing is selected
 * ========================================================================== */

function MetaPanel() {
  const nodes = useArchitectureStore((s) => s.nodes)
  const edges = useArchitectureStore((s) => s.edges)
  const diagramName = useArchitectureStore((s) => s.diagramName)
  const setDiagramName = useArchitectureStore((s) => s.setDiagramName)

  // Compute top-3 component type distribution
  const typeCounts: Record<string, number> = {}
  for (const node of nodes) {
    const t = node.data.componentType
    typeCounts[t] = (typeCounts[t] ?? 0) + 1
  }
  const top3 = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Diagram name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="inspector-diagram-name">Diagram Name</Label>
        <Input
          id="inspector-diagram-name"
          value={diagramName}
          onChange={(e) => setDiagramName(e.target.value)}
          className="text-[15px] font-semibold"
        />
      </div>

      <Separator />

      {/* Stats */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
          Diagram Stats
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-2xl font-bold tabular-nums text-text">{nodes.length}</p>
            <p className="mt-0.5 text-xs text-muted">
              {nodes.length === 1 ? 'node' : 'nodes'}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-2xl font-bold tabular-nums text-text">{edges.length}</p>
            <p className="mt-0.5 text-xs text-muted">
              {edges.length === 1 ? 'connection' : 'connections'}
            </p>
          </div>
        </div>

        {top3.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
              Component Mix
            </p>
            {top3.map(([type, count]) => {
              const entry = COMPONENT_CATALOG[type as ComponentType]
              return (
                <div key={type} className="flex items-center justify-between py-0.5">
                  <span className="text-sm text-text">{entry?.label ?? type}</span>
                  <Badge variant="neutral">{count}</Badge>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Separator />

      {/* Contextual hint */}
      <p className="text-center text-sm text-muted">
        {nodes.length === 0
          ? 'Drop components onto the canvas to get started'
          : 'Select a node to inspect'}
      </p>
    </div>
  )
}

/* ============================================================================
 * Node editor — shown when exactly one node is selected
 * ========================================================================== */

type MetaPair = { key: string; value: string }

function NodeEditor({ nodeId }: { nodeId: string }) {
  const node = useArchitectureStore((s) => s.nodes.find((n) => n.id === nodeId))
  const updateNodeData = useArchitectureStore((s) => s.updateNodeData)

  // Local state for custom metadata pairs — preserves insertion order and
  // allows in-progress keys/values without stomping the store on every keystroke.
  const [metaPairs, setMetaPairs] = useState<MetaPair[]>([])

  // Reinitialise local pairs whenever the selected node id changes.
  useEffect(() => {
    if (!node) return
    const pairs: MetaPair[] = Object.entries(node.data.customMetadata ?? {}).map(
      ([key, value]) => ({ key, value }),
    )
    setMetaPairs(pairs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId])

  if (!node) return null

  const { data } = node

  // Typed helper so callers don't need to cast.
  function patch<K extends keyof typeof data>(key: K, value: (typeof data)[K]) {
    updateNodeData(nodeId, { [key]: value } as Partial<typeof data>)
  }

  // Flush the current pairs array into the store as a Record<string, string>.
  // Empty keys are silently dropped so they don't produce junk entries.
  function flushMetaPairs(pairs: MetaPair[]) {
    const record: Record<string, string> = {}
    for (const { key, value } of pairs) {
      if (key.trim() !== '') record[key.trim()] = value
    }
    updateNodeData(nodeId, { customMetadata: record })
  }

  function updateMetaPair(index: number, field: 'key' | 'value', val: string) {
    const next = metaPairs.map((p, i) => (i === index ? { ...p, [field]: val } : p))
    setMetaPairs(next)
    flushMetaPairs(next)
  }

  function removeMetaPair(index: number) {
    const next = metaPairs.filter((_, i) => i !== index)
    setMetaPairs(next)
    flushMetaPairs(next)
  }

  function addMetaPair() {
    // Append an empty pair; don't flush — empty key won't enter the record.
    setMetaPairs((prev) => [...prev, { key: '', value: '' }])
  }

  return (
    <div className="flex flex-col gap-5 p-4">

      {/* ── Name ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${nodeId}-name`}>Name</Label>
        <Input
          id={`${nodeId}-name`}
          value={data.name}
          onChange={(e) => patch('name', e.target.value)}
        />
      </div>

      {/* ── Component Type ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <Label>Component Type</Label>
        <Select
          value={data.componentType}
          onValueChange={(v) => patch('componentType', v as ComponentType)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATALOG_BY_CATEGORY.map(({ category, components }) => (
              <SelectGroup key={category}>
                <SelectLabel>{category}</SelectLabel>
                {components.map((entry) => (
                  <SelectItem key={entry.type} value={entry.type}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Risk Level ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <Label>Risk Level</Label>
        <Select
          value={data.riskLevel}
          onValueChange={(v) => patch('riskLevel', v as RiskLevel)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Estimated Capacity ────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${nodeId}-capacity`}>Estimated Capacity</Label>
        <Input
          id={`${nodeId}-capacity`}
          value={data.estimatedCapacity}
          onChange={(e) => patch('estimatedCapacity', e.target.value)}
          placeholder="e.g. ~10k rps"
        />
      </div>

      <Separator />

      {/* ── Description ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${nodeId}-description`}>Description</Label>
        <Textarea
          id={`${nodeId}-description`}
          rows={3}
          value={data.description}
          onChange={(e) => patch('description', e.target.value)}
        />
      </div>

      {/* ── Notes ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${nodeId}-notes`}>Notes</Label>
        <Textarea
          id={`${nodeId}-notes`}
          rows={4}
          value={data.notes}
          onChange={(e) => patch('notes', e.target.value)}
          placeholder="Engineering notes..."
        />
      </div>

      <Separator />

      {/* ── Tags ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${nodeId}-tags`}>Tags</Label>
        <Input
          id={`${nodeId}-tags`}
          value={data.tags.join(', ')}
          onChange={(e) => {
            const tags = e.target.value
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
            patch('tags', tags)
          }}
          placeholder="e.g. critical, stateless, public"
        />
        <p className="text-xs text-muted">Comma-separated</p>
      </div>

      <Separator />

      {/* ── Custom Metadata ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <Label>Custom Metadata</Label>

        {metaPairs.length > 0 && (
          <div className="flex flex-col gap-2">
            {metaPairs.map((pair, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Input
                  value={pair.key}
                  onChange={(e) => updateMetaPair(i, 'key', e.target.value)}
                  placeholder="key"
                  className="min-w-0 flex-1"
                  aria-label={`Metadata key ${i + 1}`}
                />
                <Input
                  value={pair.value}
                  onChange={(e) => updateMetaPair(i, 'value', e.target.value)}
                  placeholder="value"
                  className="min-w-0 flex-1"
                  aria-label={`Metadata value ${i + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeMetaPair(i)}
                  aria-label="Remove field"
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface',
                    'text-muted transition-colors hover:border-border-strong hover:text-text',
                  )}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={addMetaPair}
        >
          <Plus className="size-3.5" />
          Add field
        </Button>
      </div>
    </div>
  )
}

/* ============================================================================
 * Multi-select panel — shown when two or more nodes are selected
 * ========================================================================== */

function MultiSelectPanel({ ids }: { ids: string[] }) {
  const nodes = useArchitectureStore((s) => s.nodes)
  const deleteSelected = useArchitectureStore((s) => s.deleteSelected)

  const selectedNodes = ids
    .map((id) => nodes.find((n) => n.id === id))
    .filter((n): n is NonNullable<typeof n> => n != null)

  return (
    <div className="flex flex-col gap-4 p-4">
      <p className="text-sm font-medium text-text">
        {ids.length} nodes selected
      </p>

      <div className="flex flex-col gap-1">
        {selectedNodes.map((node) => (
          <div
            key={node.id}
            className="flex items-center gap-2 rounded-md bg-secondary-bg px-2 py-1.5"
          >
            <span className="truncate text-sm text-text">{node.data.name}</span>
          </div>
        ))}
      </div>

      <Button
        variant="destructive"
        size="sm"
        className="mt-2 w-full"
        onClick={deleteSelected}
      >
        Delete selected
      </Button>
    </div>
  )
}

/* ============================================================================
 * InspectorPanel — root export
 * ========================================================================== */

export function InspectorPanel() {
  const selectedNodeIds = useArchitectureStore((s) => s.selectedNodeIds)

  return (
    <aside className="w-72 flex-shrink-0 overflow-y-auto border-l border-border bg-background">
      {selectedNodeIds.length === 0 ? (
        <MetaPanel />
      ) : selectedNodeIds.length === 1 ? (
        <NodeEditor nodeId={selectedNodeIds[0]} />
      ) : (
        <MultiSelectPanel ids={selectedNodeIds} />
      )}
    </aside>
  )
}
