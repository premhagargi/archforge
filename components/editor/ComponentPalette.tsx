'use client'
import { useState } from 'react'
import { Search } from 'lucide-react'
import { CATALOG_BY_CATEGORY } from '@/lib/constants'
import type { ComponentType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

interface ComponentPaletteProps {
  onAddNode: (type: ComponentType, position: { x: number; y: number }) => void
}

export function ComponentPalette({ onAddNode }: ComponentPaletteProps) {
  const [search, setSearch] = useState('')

  const query = search.trim().toLowerCase()

  const filtered = CATALOG_BY_CATEGORY.map(({ category, components }) => ({
    category,
    components: query
      ? components.filter(
          (c) =>
            c.label.toLowerCase().includes(query) ||
            c.description.toLowerCase().includes(query),
        )
      : components,
  })).filter(({ components }) => components.length > 0)

  const hasResults = filtered.some(({ components }) => components.length > 0)

  return (
    <aside className="flex w-60 flex-shrink-0 flex-col bg-secondary-bg border-r border-border overflow-hidden">
      {/* Header */}
      <div className="px-3 pt-4 pb-2">
        <p className="text-sm font-semibold text-text mb-3">Components</p>

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
          <Input
            type="search"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {query && !hasResults ? (
          <p className="px-2 py-4 text-xs text-muted">No components match.</p>
        ) : (
          filtered.map(({ category, components }) => (
            <div key={category} className="mt-4">
              {/* Category label */}
              <p className="px-2 mb-1 text-xs font-medium uppercase tracking-wide text-muted">
                {category}
              </p>

              {/* Component items */}
              {components.map((entry) => {
                const Icon = entry.icon
                return (
                  <div
                    key={entry.type}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        'application/archforge-node-type',
                        entry.type,
                      )
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onClick={() =>
                      onAddNode(entry.type, {
                        x: 200 + Math.random() * 300,
                        y: 100 + Math.random() * 200,
                      })
                    }
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg',
                      'hover:bg-secondary-bg cursor-grab',
                      'select-none',
                    )}
                  >
                    <Icon className="w-4 h-4 text-muted flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text leading-tight">
                        {entry.label}
                      </p>
                      <p className="text-xs text-text-secondary line-clamp-1">
                        {entry.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
