import fs from 'node:fs/promises'
import path from 'node:path'
import { DiagramSchema, type Diagram } from '@/lib/types'

const DATA_DIR = path.join(process.cwd(), '.data', 'diagrams')

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

export const DiagramStore = {
  async list(): Promise<{ id: string; name: string; updatedAt: string }[]> {
    await ensureDir()
    const files = await fs.readdir(DATA_DIR).catch(() => [] as string[])
    const results = await Promise.all(
      files.filter(f => f.endsWith('.json')).map(async f => {
        try {
          const raw = await fs.readFile(path.join(DATA_DIR, f), 'utf-8')
          const d = DiagramSchema.parse(JSON.parse(raw))
          return { id: d.id, name: d.name, updatedAt: d.updatedAt }
        } catch { return null }
      })
    )
    return results.filter(Boolean) as { id: string; name: string; updatedAt: string }[]
  },

  async get(id: string): Promise<Diagram | null> {
    await ensureDir()
    try {
      const raw = await fs.readFile(path.join(DATA_DIR, id + '.json'), 'utf-8')
      return DiagramSchema.parse(JSON.parse(raw))
    } catch { return null }
  },

  async upsert(diagram: Diagram): Promise<void> {
    await ensureDir()
    await fs.writeFile(path.join(DATA_DIR, diagram.id + '.json'), JSON.stringify(diagram, null, 2))
  },

  async delete(id: string): Promise<void> {
    await ensureDir()
    await fs.unlink(path.join(DATA_DIR, id + '.json')).catch(() => {})
  },
}
