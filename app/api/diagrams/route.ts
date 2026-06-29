import { NextResponse } from 'next/server'
import { DiagramStore } from '@/lib/server/store'
import { DiagramSchema } from '@/lib/types'
import { createId } from '@/lib/utils'

export async function GET() {
  const list = await DiagramStore.list()
  return NextResponse.json(list)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const now = new Date().toISOString()
    const diagram = DiagramSchema.parse({
      ...body,
      id: body.id ?? createId('diagram'),
      createdAt: now,
      updatedAt: now,
    })
    await DiagramStore.upsert(diagram)
    return NextResponse.json(diagram, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
