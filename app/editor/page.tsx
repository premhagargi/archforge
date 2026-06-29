import type { Metadata } from 'next'
import EditorLoader from './EditorLoader'

export const metadata: Metadata = {
  title: 'Editor — ArchForge',
  description:
    'Design distributed systems visually. Simulate load. Detect bottlenecks.',
}

export default function EditorPage() {
  return <EditorLoader />
}
