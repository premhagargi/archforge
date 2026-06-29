'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  RotateCcw,
  RotateCw,
  LayoutGrid,
  Maximize2,
  ChevronDown,
  Download,
  Upload,
  Save,
  Copy,
  FileDown,
  FileText,
} from 'lucide-react'
import { useStore } from 'zustand'
import { useArchitectureStore } from '@/store/architecture-store'
import { TEMPLATES } from '@/lib/templates'
import { DiagramSchema } from '@/lib/types'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/* -------------------------------------------------------------------------- */

interface TopToolbarProps {
  onFitView?: () => void
  onExportMarkdown?: () => void
}

function formatSavedTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return `${Math.floor(diff / 3_600_000)}h ago`
}

/* -------------------------------------------------------------------------- */

export function TopToolbar({ onFitView, onExportMarkdown }: TopToolbarProps) {
  const diagramName = useArchitectureStore((s) => s.diagramName)
  const setDiagramName = useArchitectureStore((s) => s.setDiagramName)
  const loadTemplate = useArchitectureStore((s) => s.loadTemplate)
  const applyAutoLayout = useArchitectureStore((s) => s.applyAutoLayout)
  const save = useArchitectureStore((s) => s.save)
  const importDiagram = useArchitectureStore((s) => s.importDiagram)
  const exportDiagram = useArchitectureStore((s) => s.exportDiagram)
  const lastSaved = useArchitectureStore((s) => s.lastSaved)

  // Reactive undo / redo state via the zundo temporal store
  const canUndo = useStore(
    useArchitectureStore.temporal,
    (s) => s.pastStates.length > 0,
  )
  const canRedo = useStore(
    useArchitectureStore.temporal,
    (s) => s.futureStates.length > 0,
  )
  const undo = useStore(useArchitectureStore.temporal, (s) => s.undo)
  const redo = useStore(useArchitectureStore.temporal, (s) => s.redo)

  const fileInputRef = useRef<HTMLInputElement>(null)

  /* --- handlers ----------------------------------------------------------- */

  function handleSave() {
    save()
    toast.success('Saved')
  }

  function handleExportJson() {
    const diagram = exportDiagram()
    const blob = new Blob([JSON.stringify(diagram, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${diagramName.toLowerCase().replace(/\s+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleCopyJson() {
    const diagram = exportDiagram()
    navigator.clipboard
      .writeText(JSON.stringify(diagram, null, 2))
      .then(() => toast.success('JSON copied to clipboard'))
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string)
        const result = DiagramSchema.safeParse(json)
        if (result.success) {
          importDiagram(result.data)
          toast.success('Diagram imported')
        } else {
          toast.error('Invalid diagram file')
        }
      } catch {
        toast.error('Could not parse file')
      }
    }
    reader.readAsText(file)
    // Reset so the same file can be re-imported
    e.target.value = ''
  }

  /* ----------------------------------------------------------------------- */

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      {/* ── LEFT ── */}
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href="/"
          className="whitespace-nowrap text-sm font-semibold text-text"
        >
          ArchForge
        </Link>

        <span className="select-none text-border">|</span>

        <Input
          value={diagramName}
          onChange={(e) => setDiagramName(e.target.value)}
          className="h-7 w-48 border-transparent bg-transparent px-1 text-sm font-medium shadow-none focus:border-border focus:bg-surface"
        />
      </div>

      {/* ── CENTER ── */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={!canUndo}
          onClick={() => undo()}
          title="Undo (Ctrl+Z)"
        >
          <RotateCcw />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={!canRedo}
          onClick={() => redo()}
          title="Redo (Ctrl+Y)"
        >
          <RotateCw />
        </Button>

        <span className="mx-1 h-4 w-px bg-border" />

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={applyAutoLayout}
          title="Auto-layout"
        >
          <LayoutGrid />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onFitView}
          title="Fit view"
        >
          <Maximize2 />
        </Button>

        <span className="mx-1 h-4 w-px bg-border" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              Templates
              <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-56">
            <DropdownMenuLabel>Reference Architectures</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {TEMPLATES.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onClick={() => loadTemplate(t.id)}
              >
                <span className="font-medium">{t.name}</span>
                <span className="ml-auto text-xs text-muted">
                  {t.category}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── RIGHT ── */}
      <div className="flex items-center gap-1">
        {/* Hidden file input for import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />

        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs"
          onClick={() => fileInputRef.current?.click()}
          title="Import JSON"
        >
          <Upload className="size-3.5" />
          Import
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              <Download className="size-3.5" />
              Export
              <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportJson}>
              <FileDown />
              Export JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportMarkdown}>
              <FileText />
              Export Markdown
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCopyJson}>
              <Copy />
              Copy JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs"
          onClick={handleSave}
          title="Save (Ctrl+S)"
        >
          <Save className="size-3.5" />
          Save
        </Button>

        {lastSaved ? (
          <span className="whitespace-nowrap text-xs text-muted">
            Saved {formatSavedTime(lastSaved)}
          </span>
        ) : (
          <span className="whitespace-nowrap text-xs text-muted">Unsaved</span>
        )}
      </div>
    </header>
  )
}
