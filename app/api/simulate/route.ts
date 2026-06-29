import { NextResponse } from 'next/server'
import { runSimulation } from '@/lib/simulation/engine'
import type { SimConfig } from '@/lib/simulation/types'

export async function POST(req: Request) {
  try {
    const body = await req.json() as { config: SimConfig }
    const result = runSimulation(body.config)
    // Serialize Map → plain object for JSON
    const serialized = { ...result, nodeMetrics: Object.fromEntries(result.nodeMetrics) }
    return NextResponse.json(serialized)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
