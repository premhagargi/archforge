'use client'

import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import {
  useArchitectureStore,
  useKeyboardShortcuts,
} from '@/store/architecture-store'
import { TopToolbar } from './TopToolbar'
import { ComponentPalette } from './ComponentPalette'
import { ArchitectureCanvas } from './ArchitectureCanvas'
import { InspectorPanel } from './InspectorPanel'
import { AnalysisPanel } from './AnalysisPanel'
import { MarkdownExporter } from './MarkdownExporter'

/* -------------------------------------------------------------------------- */

export default function EditorShell() {
  const loadSaved = useArchitectureStore((s) => s.loadSaved)
  const addNode = useArchitectureStore((s) => s.addNode)

  const [exportOpen, setExportOpen] = useState(false)

  // Load persisted diagram on first mount
  useEffect(() => {
    loadSaved()
  }, [loadSaved])

  // Register global keyboard shortcuts (Ctrl+Z, Ctrl+S, Delete, …)
  useKeyboardShortcuts()

  /* ----------------------------------------------------------------------- */

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* ── Top bar ── */}
      <TopToolbar
        onExportMarkdown={() => setExportOpen(true)}
      />

      {/* ── Middle row: palette | canvas | inspector ── */}
      <div className="flex flex-1 overflow-hidden">
        <ComponentPalette onAddNode={addNode} />
        <ArchitectureCanvas className="flex-1" />
        <InspectorPanel />
      </div>

      {/* ── Bottom: collapsible analysis panel ── */}
      <AnalysisPanel />

      {/* ── Markdown export dialog ── */}
      <MarkdownExporter
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />

      {/* ── Toast notifications ── */}
      <Toaster richColors position="bottom-right" />
    </div>
  )
}
