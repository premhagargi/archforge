'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { ArchNode } from '@/lib/types'
import { COMPONENT_CATALOG } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const RISK_COLORS: Record<string, string> = {
  low: 'bg-success',
  medium: 'bg-warning',
  high: 'bg-critical',
}

const HANDLE_CLASS =
  '!bg-accent !border-accent/30 !w-2.5 !h-2.5'

export const ArchNodeComponent = memo(function ArchNodeComponent({
  data,
  selected,
}: NodeProps<ArchNode>) {
  const catalog = COMPONENT_CATALOG[data.componentType]
  const Icon = catalog.icon

  return (
    <div
      className={cn(
        'relative w-48 rounded-xl border bg-surface shadow-sm transition-shadow',
        selected
          ? 'border-accent ring-2 ring-accent/20 shadow-md'
          : 'border-border',
      )}
    >
      {/* Left — source + target */}
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className={HANDLE_CLASS}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        className={HANDLE_CLASS}
      />

      {/* Right — source + target */}
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        className={HANDLE_CLASS}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className={HANDLE_CLASS}
      />

      {/* Top — source + target */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className={HANDLE_CLASS}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        className={HANDLE_CLASS}
      />

      {/* Bottom — source + target */}
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        className={HANDLE_CLASS}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className={HANDLE_CLASS}
      />

      {/* Card body */}
      <div className="p-3 flex flex-col gap-1.5">
        {/* Header row */}
        <div className="flex items-center gap-2">
          {/* Icon tile */}
          <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10">
            <Icon className="w-4 h-4 text-accent" />
          </div>

          {/* Type label + name */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-text-secondary leading-none mb-0.5">
              {catalog.label}
            </p>
            <p className="text-sm font-semibold truncate leading-tight">
              {data.name}
            </p>
          </div>

          {/* Risk dot */}
          <span
            className={cn(
              'flex-shrink-0 w-2 h-2 rounded-full',
              RISK_COLORS[data.riskLevel] ?? 'bg-border',
            )}
          />
        </div>

        {/* Description */}
        {data.description && (
          <p className="text-[11px] text-text-secondary line-clamp-2 leading-snug">
            {data.description}
          </p>
        )}

        {/* Capacity badge */}
        {data.estimatedCapacity && (
          <Badge variant="outline" className="text-[10px] w-fit">
            {data.estimatedCapacity}
          </Badge>
        )}

        {/* Tags — up to 3 */}
        {data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[9px] bg-secondary-bg text-muted rounded px-1 leading-[1.4]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})

export const NODE_TYPES = {
  archNode: ArchNodeComponent,
} as const
