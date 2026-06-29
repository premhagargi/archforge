import { NextResponse } from 'next/server'
import { DiagramStore } from '@/lib/server/store'
import { generateDesignDoc } from '@/lib/markdown-generator'
import { analyzeArchitecture } from '@/lib/analysis-engine'
import { calculateLoad } from '@/lib/load-calculator'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const diagram = await DiagramStore.get(id)
  if (!diagram) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const loadOutputs = calculateLoad(diagram.loadInputs)
  const findings = analyzeArchitecture(diagram, loadOutputs)
  const doc = generateDesignDoc(diagram, loadOutputs, findings)
  return NextResponse.json({ diagram, doc, findings })
}
