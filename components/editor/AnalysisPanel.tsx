'use client'

import { useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { useArchitectureStore } from '@/store/architecture-store'
import { runSimulationInWorker } from '@/lib/simulation/client'
import {
  buildSimConfig,
  formatLatency,
  utilizationLevel,
} from '@/lib/simulation/metrics'
import type { SimResult } from '@/lib/simulation/types'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { LoadSimulator } from './LoadSimulator'

/* -------------------------------------------------------------------------- */

export function AnalysisPanel() {
  const findings = useArchitectureStore((s) => s.findings)
  const nodes = useArchitectureStore((s) => s.nodes)
  const edges = useArchitectureStore((s) => s.edges)
  const loadOutputs = useArchitectureStore((s) => s.loadOutputs)

  const [expanded, setExpanded] = useState(false)
  const [simRunning, setSimRunning] = useState(false)
  const [simResult, setSimResult] = useState<SimResult | null>(null)

  /* --- badge counts ------------------------------------------------------- */
  const criticalCount = findings.filter((f) => f.severity === 'critical').length
  const warningCount = findings.filter((f) => f.severity === 'warning').length
  const infoCount = findings.filter((f) => f.severity === 'info').length

  /* --- simulation --------------------------------------------------------- */
  async function handleRunSimulation() {
    if (nodes.length === 0) return
    setSimRunning(true)
    setSimResult(null)
    try {
      const arrivalRps = loadOutputs?.peakRps ?? 100
      const config = buildSimConfig(nodes, edges, arrivalRps)
      const result = await runSimulationInWorker(config)
      setSimResult(result)
    } catch (err) {
      console.error('Simulation failed', err)
    } finally {
      setSimRunning(false)
    }
  }

  /* --- derived data ------------------------------------------------------- */

  // Unique recommended fixes (preserves order, removes duplicate strings)
  const uniqueFixes = [...new Set(findings.map((f) => f.suggestedFix))]

  // Component-type breakdown for Summary tab
  const typeCounts = nodes.reduce<Record<string, number>>((acc, n) => {
    acc[n.data.componentType] = (acc[n.data.componentType] ?? 0) + 1
    return acc
  }, {})

  /* ----------------------------------------------------------------------- */

  return (
    <div
      className={cn(
        'shrink-0 border-t border-border bg-surface transition-all duration-200',
        expanded ? 'h-72' : 'h-10',
      )}
    >
      {/* ── Header bar ── */}
      <div
        className="flex h-10 cursor-pointer select-none items-center gap-2 px-4"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-xs font-medium text-text">Analysis</span>

        {criticalCount > 0 && (
          <Badge className="h-4 border-red-500/20 bg-red-500/10 px-1.5 text-xs text-red-500">
            {criticalCount} critical
          </Badge>
        )}
        {warningCount > 0 && (
          <Badge className="h-4 border-yellow-500/20 bg-yellow-500/10 px-1.5 text-xs text-yellow-600">
            {warningCount} warning{warningCount > 1 ? 's' : ''}
          </Badge>
        )}
        {infoCount > 0 && (
          <Badge className="h-4 border-blue-500/20 bg-blue-500/10 px-1.5 text-xs text-blue-500">
            {infoCount} info
          </Badge>
        )}

        <button
          className="ml-auto text-muted transition-colors hover:text-text"
          aria-label={expanded ? 'Collapse analysis panel' : 'Expand analysis panel'}
        >
          {expanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronUp className="size-4" />
          )}
        </button>
      </div>

      {/* ── Panel body (only mounted when expanded) ── */}
      {expanded && (
        <div className="h-[calc(100%-2.5rem)] overflow-hidden">
          <Tabs defaultValue="warnings" className="flex h-full flex-col">
            <TabsList className="mx-4 mt-0.5 w-auto shrink-0 justify-start">
              <TabsTrigger value="warnings" className="text-xs">
                Warnings
              </TabsTrigger>
              <TabsTrigger value="load" className="text-xs">
                Load
              </TabsTrigger>
              <TabsTrigger value="simulation" className="text-xs">
                Simulation
              </TabsTrigger>
              <TabsTrigger value="recommendations" className="text-xs">
                Recommendations
              </TabsTrigger>
              <TabsTrigger value="summary" className="text-xs">
                Summary
              </TabsTrigger>
            </TabsList>

            {/* ── Warnings ── */}
            <TabsContent
              value="warnings"
              className="flex-1 overflow-auto px-4 pb-4"
            >
              {findings.length === 0 ? (
                <div className="flex items-center gap-2 py-4 text-sm text-green-600">
                  <CheckCircle2 className="size-4" />
                  No issues found
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  {findings.map((f) => (
                    <div
                      key={f.id}
                      className="space-y-1 rounded-lg border border-border p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium',
                            f.severity === 'critical' &&
                              'bg-red-500/10 text-red-500',
                            f.severity === 'warning' &&
                              'bg-yellow-500/10 text-yellow-600',
                            f.severity === 'info' &&
                              'bg-blue-500/10 text-blue-500',
                          )}
                        >
                          {f.severity}
                        </span>
                        <span className="text-sm font-medium text-text">
                          {f.title}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary">
                        {f.explanation}
                      </p>
                      <p className="text-xs text-muted">{f.suggestedFix}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Load ── */}
            <TabsContent value="load" className="flex-1 overflow-auto">
              <LoadSimulator />
            </TabsContent>

            {/* ── Simulation ── */}
            <TabsContent
              value="simulation"
              className="flex-1 overflow-auto px-4 pb-4"
            >
              <div className="space-y-4 pt-2">
                <Button
                  size="sm"
                  onClick={handleRunSimulation}
                  disabled={simRunning || nodes.length === 0}
                >
                  {simRunning ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Running…
                    </>
                  ) : (
                    'Run Simulation'
                  )}
                </Button>

                {simResult && (
                  <div className="space-y-4">
                    {/* End-to-end latency card */}
                    <div className="rounded-lg border border-border bg-secondary-bg p-3">
                      <h4 className="mb-2 text-xs font-medium text-text-secondary">
                        End-to-End Latency
                      </h4>
                      <div className="flex gap-6 text-sm">
                        <span>
                          <span className="text-xs text-muted">p50 </span>
                          <span className="font-semibold text-text">
                            {formatLatency(simResult.endToEndP50Ms)}
                          </span>
                        </span>
                        <span>
                          <span className="text-xs text-muted">p95 </span>
                          <span className="font-semibold text-text">
                            {formatLatency(simResult.endToEndP95Ms)}
                          </span>
                        </span>
                        <span>
                          <span className="text-xs text-muted">p99 </span>
                          <span className="font-semibold text-text">
                            {formatLatency(simResult.endToEndP99Ms)}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Cascade failure warning */}
                    {simResult.cascadingFailures.length > 0 && (
                      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600">
                        <span className="font-medium">
                          Cascading failures detected:{' '}
                        </span>
                        {simResult.cascadingFailures.join(', ')}
                      </div>
                    )}

                    {/* Per-node metrics table */}
                    <div className="overflow-hidden rounded-lg border border-border">
                      <table className="w-full text-xs">
                        <thead className="bg-secondary-bg">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-text-secondary">
                              Node
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-text-secondary">
                              Utilization
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-text-secondary">
                              p95
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-text-secondary">
                              Drop Rate
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {Array.from(simResult.nodeMetrics.entries()).map(
                            ([nodeId, metrics]) => {
                              const node = nodes.find((n) => n.id === nodeId)
                              const level = utilizationLevel(metrics.utilization)
                              const pct = Math.round(metrics.utilization * 100)
                              return (
                                <tr key={nodeId}>
                                  <td className="px-3 py-2 font-medium text-text">
                                    {node?.data.name ?? nodeId}
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border">
                                        <div
                                          className={cn(
                                            'h-full rounded-full',
                                            level === 'healthy' &&
                                              'bg-green-500',
                                            level === 'busy' &&
                                              'bg-yellow-500',
                                            level === 'saturated' &&
                                              'bg-red-500',
                                          )}
                                          style={{
                                            width: `${Math.min(pct, 100)}%`,
                                          }}
                                        />
                                      </div>
                                      <span className="text-text-secondary">
                                        {pct}%
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-text-secondary">
                                    {formatLatency(metrics.p95Ms)}
                                  </td>
                                  <td className="px-3 py-2 text-text-secondary">
                                    {(metrics.dropRate * 100).toFixed(2)}%
                                  </td>
                                </tr>
                              )
                            },
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Recommendations ── */}
            <TabsContent
              value="recommendations"
              className="flex-1 overflow-auto px-4 pb-4"
            >
              {uniqueFixes.length === 0 ? (
                <p className="py-4 text-sm text-text-secondary">
                  No recommendations.
                </p>
              ) : (
                <ol className="list-inside list-decimal space-y-2 pt-2 text-sm text-text-secondary">
                  {uniqueFixes.map((fix, i) => (
                    <li key={i} className="leading-relaxed">
                      {fix}
                    </li>
                  ))}
                </ol>
              )}
            </TabsContent>

            {/* ── Summary ── */}
            <TabsContent
              value="summary"
              className="flex-1 overflow-auto px-4 pb-4"
            >
              <div className="grid grid-cols-2 gap-2 pt-2 text-sm">
                <SummaryCard label="Total nodes" value={String(nodes.length)} />
                <SummaryCard label="Total edges" value={String(edges.length)} />
                <SummaryCard
                  label="Critical findings"
                  value={String(criticalCount)}
                />
                <SummaryCard
                  label="Warning findings"
                  value={String(warningCount)}
                />
                {loadOutputs && (
                  <>
                    <SummaryCard
                      label="Suggested servers"
                      value={String(loadOutputs.suggestedServers)}
                    />
                    <SummaryCard
                      label="Peak RPS"
                      value={loadOutputs.peakRps.toFixed(0)}
                    />
                  </>
                )}
                {Object.keys(typeCounts).length > 0 && (
                  <div className="col-span-2 rounded-lg border border-border bg-secondary-bg p-3">
                    <span className="mb-2 block text-xs text-text-secondary">
                      Component Types
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(typeCounts).map(([type, count]) => (
                        <Badge
                          key={type}
                          variant="outline"
                          className="text-xs"
                        >
                          {type} ×{count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary-bg p-3">
      <span className="mb-1 block text-xs text-text-secondary">{label}</span>
      <span className="font-semibold text-text">{value}</span>
    </div>
  )
}
