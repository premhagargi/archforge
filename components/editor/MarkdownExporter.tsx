'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Copy, Download } from 'lucide-react'
import { useArchitectureStore } from '@/store/architecture-store'
import { generateDesignDoc } from '@/lib/markdown-generator'
import { slugify } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

/* -------------------------------------------------------------------------- */

interface MarkdownExporterProps {
  open: boolean
  onClose: () => void
}

/* -------------------------------------------------------------------------- */

export function MarkdownExporter({ open, onClose }: MarkdownExporterProps) {
  const nodes = useArchitectureStore((s) => s.nodes)
  const edges = useArchitectureStore((s) => s.edges)
  const diagramName = useArchitectureStore((s) => s.diagramName)
  const loadOutputs = useArchitectureStore((s) => s.loadOutputs)
  const findings = useArchitectureStore((s) => s.findings)

  const [markdown, setMarkdown] = useState('')

  // Regenerate the document each time the dialog opens
  useEffect(() => {
    if (!open) return
    const doc = generateDesignDoc(
      { name: diagramName, nodes, edges },
      loadOutputs ?? undefined,
      findings,
    )
    setMarkdown(doc)
  }, [open, nodes, edges, diagramName, loadOutputs, findings])

  /* --- handlers ----------------------------------------------------------- */

  function handleCopy() {
    navigator.clipboard
      .writeText(markdown)
      .then(() => toast.success('Markdown copied to clipboard'))
  }

  function handleDownload() {
    const slug = slugify(diagramName) || 'diagram'
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug}-design.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ----------------------------------------------------------------------- */

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[80vh] max-w-3xl flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Export Design Document</DialogTitle>
        </DialogHeader>

        {/* Scrollable markdown preview */}
        <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border bg-secondary-bg">
          <pre className="p-4 font-mono text-xs leading-relaxed text-text whitespace-pre-wrap">
            {markdown}
          </pre>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy />
            Copy
          </Button>
          <Button size="sm" onClick={handleDownload}>
            <Download />
            Download .md
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
