import { describe, it, expect } from 'vitest'
import { analyzeArchitecture } from '../analysis-engine'
import type { ArchNode, ArchEdge } from '../types'

function node(id: string, type: string, overrides: Partial<ArchNode['data']> = {}): ArchNode {
  return {
    id,
    type: 'archNode',
    position: { x: 0, y: 0 },
    data: {
      name: id,
      description: '',
      componentType: type as ArchNode['data']['componentType'],
      riskLevel: 'low',
      estimatedCapacity: '',
      notes: '',
      tags: [],
      customMetadata: {},
      ...overrides,
    },
  }
}

function edge(source: string, target: string): ArchEdge {
  return { id: `${source}__${target}`, source, target, type: 'smoothstep' }
}

describe('analyzeArchitecture', () => {
  it('fires db-exposed when client connects directly to database', () => {
    const nodes = [node('c', 'client'), node('db', 'database')]
    const edges = [edge('c', 'db')]
    const findings = analyzeArchitecture({ nodes, edges })
    expect(findings.some(f => f.ruleId === 'db-exposed')).toBe(true)
    expect(findings.find(f => f.ruleId === 'db-exposed')?.severity).toBe('critical')
  })

  it('does not fire db-exposed with a service in between', () => {
    const nodes = [node('c', 'client'), node('svc', 'app-service'), node('db', 'database')]
    const edges = [edge('c', 'svc'), edge('svc', 'db')]
    const findings = analyzeArchitecture({ nodes, edges })
    expect(findings.some(f => f.ruleId === 'db-exposed')).toBe(false)
  })

  it('fires no-monitoring when monitoring node is absent', () => {
    const nodes = [node('c', 'client'), node('db', 'database')]
    const edges = [edge('c', 'db')]
    const findings = analyzeArchitecture({ nodes, edges })
    expect(findings.some(f => f.ruleId === 'no-monitoring')).toBe(true)
    expect(findings.find(f => f.ruleId === 'no-monitoring')?.severity).toBe('info')
  })

  it('does not fire no-monitoring when monitoring exists', () => {
    const nodes = [node('c', 'client'), node('m', 'monitoring')]
    const findings = analyzeArchitecture({ nodes, edges: [] })
    expect(findings.some(f => f.ruleId === 'no-monitoring')).toBe(false)
  })

  it('fires no-cache when database has no cache', () => {
    const nodes = [node('svc', 'app-service'), node('db', 'database')]
    const findings = analyzeArchitecture({ nodes, edges: [] })
    expect(findings.some(f => f.ruleId === 'no-cache')).toBe(true)
  })

  it('does not fire no-cache when cache is present', () => {
    const nodes = [node('svc', 'app-service'), node('db', 'database'), node('c', 'cache')]
    const findings = analyzeArchitecture({ nodes, edges: [] })
    expect(findings.some(f => f.ruleId === 'no-cache')).toBe(false)
  })

  it('fires no-lb when client has no load balancer', () => {
    const nodes = [node('c', 'client'), node('svc', 'app-service')]
    const findings = analyzeArchitecture({ nodes, edges: [edge('c', 'svc')] })
    expect(findings.some(f => f.ruleId === 'no-lb')).toBe(true)
  })

  it('fires worker-no-queue when worker has no queue', () => {
    const nodes = [node('w', 'worker')]
    const findings = analyzeArchitecture({ nodes, edges: [] })
    expect(findings.some(f => f.ruleId === 'worker-no-queue')).toBe(true)
  })

  it('does not fire worker-no-queue when message-queue is present', () => {
    const nodes = [node('w', 'worker'), node('q', 'message-queue')]
    const findings = analyzeArchitecture({ nodes, edges: [edge('q', 'w')] })
    expect(findings.some(f => f.ruleId === 'worker-no-queue')).toBe(false)
  })

  it('returns findings sorted critical → warning → info', () => {
    const nodes = [node('c', 'client'), node('db', 'database')]
    const edges = [edge('c', 'db')]
    const findings = analyzeArchitecture({ nodes, edges })
    const severities = findings.map(f => f.severity)
    const order = { critical: 0, warning: 1, info: 2 }
    for (let i = 1; i < severities.length; i++) {
      expect(order[severities[i]]).toBeGreaterThanOrEqual(order[severities[i - 1]])
    }
  })

  it('returns empty array for empty diagram', () => {
    expect(analyzeArchitecture({ nodes: [], edges: [] })).toEqual([])
  })
})
