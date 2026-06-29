'use client'

import { useArchitectureStore } from '@/store/architecture-store'
import { formatBytes, formatCompact } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'

/* -------------------------------------------------------------------------- */

export function LoadSimulator() {
  const loadInputs = useArchitectureStore((s) => s.loadInputs)
  const setLoadInputs = useArchitectureStore((s) => s.setLoadInputs)
  const loadOutputs = useArchitectureStore((s) => s.loadOutputs)

  return (
    <div className="space-y-6 p-4 text-sm">
      {/* ── INPUTS ── */}
      <section>
        <h3 className="mb-3 font-medium text-text">Inputs</h3>

        {/* Number fields — 2-col grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-text-secondary">
              Daily Active Users
            </Label>
            <Input
              type="number"
              min={0}
              value={loadInputs.dailyActiveUsers}
              onChange={(e) =>
                setLoadInputs({ dailyActiveUsers: Number(e.target.value) })
              }
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-text-secondary">
              Requests / user / day
            </Label>
            <Input
              type="number"
              min={0}
              value={loadInputs.requestsPerUserPerDay}
              onChange={(e) =>
                setLoadInputs({
                  requestsPerUserPerDay: Number(e.target.value),
                })
              }
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-text-secondary">
              Avg payload (bytes)
            </Label>
            <Input
              type="number"
              min={0}
              value={loadInputs.avgPayloadBytes}
              onChange={(e) =>
                setLoadInputs({ avgPayloadBytes: Number(e.target.value) })
              }
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-text-secondary">
              Writes / user / day
            </Label>
            <Input
              type="number"
              min={0}
              value={loadInputs.writesPerUserPerDay}
              onChange={(e) =>
                setLoadInputs({
                  writesPerUserPerDay: Number(e.target.value),
                })
              }
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1 col-span-2 sm:col-span-1">
            <Label className="text-xs text-text-secondary">
              Retention days
            </Label>
            <Input
              type="number"
              min={1}
              value={loadInputs.retentionDays}
              onChange={(e) =>
                setLoadInputs({ retentionDays: Number(e.target.value) })
              }
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Slider controls */}
        <div className="mt-4 space-y-4">
          {/* Peak factor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-text-secondary">Peak factor</Label>
              <span className="text-xs font-medium text-text">
                {loadInputs.peakFactor}×
              </span>
            </div>
            <Slider
              min={1}
              max={10}
              step={0.5}
              value={[loadInputs.peakFactor]}
              onValueChange={([v]) => setLoadInputs({ peakFactor: v })}
            />
          </div>

          {/* Read ratio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-text-secondary">Read ratio</Label>
              <span className="text-xs font-medium text-text">
                {Math.round(loadInputs.readRatio * 100)}%
              </span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={[loadInputs.readRatio]}
              onValueChange={([v]) => setLoadInputs({ readRatio: v })}
            />
          </div>

          {/* Cache hit ratio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-text-secondary">
                Cache hit ratio
              </Label>
              <span className="text-xs font-medium text-text">
                {Math.round(loadInputs.cacheHitRatio * 100)}%
              </span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={[loadInputs.cacheHitRatio]}
              onValueChange={([v]) => setLoadInputs({ cacheHitRatio: v })}
            />
          </div>

          {/* Redundancy factor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-text-secondary">
                Redundancy factor
              </Label>
              <span className="text-xs font-medium text-text">
                {loadInputs.redundancyFactor}×
              </span>
            </div>
            <Slider
              min={1}
              max={3}
              step={0.5}
              value={[loadInputs.redundancyFactor]}
              onValueChange={([v]) =>
                setLoadInputs({ redundancyFactor: v })
              }
            />
          </div>
        </div>
      </section>

      {/* ── OUTPUTS ── */}
      {loadOutputs && (
        <section>
          <h3 className="mb-3 font-medium text-text">Outputs</h3>
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              label="Peak RPS"
              value={formatCompact(loadOutputs.peakRps)}
            />
            <StatCard
              label="Avg RPS"
              value={formatCompact(loadOutputs.averageRps)}
            />
            <StatCard
              label="Bandwidth / day"
              value={formatBytes(loadOutputs.bandwidthPerDayBytes)}
            />
            <StatCard
              label="Storage growth / day"
              value={formatBytes(loadOutputs.storageGrowthPerDayBytes)}
            />
            <StatCard
              label="Total retention"
              value={formatBytes(loadOutputs.retentionStorageBytes)}
            />
            <StatCard
              label="DB load RPS"
              value={formatCompact(loadOutputs.dbLoadRps)}
            />
            <StatCard
              label="Cache savings RPS"
              value={formatCompact(loadOutputs.cacheSavingsRps)}
            />
            <StatCard
              label="Suggested servers"
              value={String(loadOutputs.suggestedServers)}
            />

            {/* DB strategy spans both columns */}
            <div className="col-span-2 rounded-lg border border-border bg-secondary-bg p-3">
              <span className="mb-1 block text-xs text-text-secondary">
                DB Strategy
              </span>
              <Badge variant="outline" className="text-xs">
                {loadOutputs.dbScalingStrategy}
              </Badge>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary-bg p-3">
      <span className="mb-1 block text-xs text-text-secondary">{label}</span>
      <span className="text-sm font-semibold text-text">{value}</span>
    </div>
  )
}
