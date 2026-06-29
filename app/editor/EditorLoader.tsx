'use client'

import dynamic from 'next/dynamic'

const EditorShell = dynamic(
  () => import('@/components/editor/EditorShell'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted">Loading editor…</div>
      </div>
    ),
  },
)

export default function EditorLoader() {
  return <EditorShell />
}
