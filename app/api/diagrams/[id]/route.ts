import { NextResponse } from 'next/server'
import { DiagramStore } from '@/lib/server/store'
import { DiagramSchema } from '@/lib/types'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const diagram = await DiagramStore.get(id)
  if (!diagram) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(diagram)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    const diagram = DiagramSchema.parse({ ...body, id, updatedAt: new Date().toISOString() })
    await DiagramStore.upsert(diagram)
    return NextResponse.json(diagram)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await DiagramStore.delete(id)
  return NextResponse.json({ ok: true })
}
