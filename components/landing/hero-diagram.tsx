import { getCatalogEntry } from "@/lib/constants";
import type { ComponentType, RiskLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DiagramNodeSpec {
  type: ComponentType;
  /** Center position as a percentage of the diagram box. */
  x: number;
  y: number;
  risk: RiskLevel;
}

// A small, believable read-path: Client → LB → API → App → { Cache, DB }.
const NODES: readonly DiagramNodeSpec[] = [
  { type: "client", x: 9, y: 50, risk: "low" },
  { type: "load-balancer", x: 29, y: 50, risk: "medium" },
  { type: "api-gateway", x: 49, y: 50, risk: "medium" },
  { type: "app-service", x: 71, y: 27, risk: "medium" },
  { type: "cache", x: 91, y: 27, risk: "low" },
  { type: "database", x: 71, y: 75, risk: "high" },
];

// Edges reference node indices into NODES.
const EDGES: readonly [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [3, 5],
];

const RISK_DOT: Record<RiskLevel, string> = {
  low: "bg-success",
  medium: "bg-warning",
  high: "bg-critical",
};

/**
 * Decorative, non-interactive architecture diagram for the hero. Coordinates
 * are percentages; the SVG uses `preserveAspectRatio="none"` with non-scaling
 * strokes so the whole thing scales fluidly while node cards stay crisp.
 */
export function HeroDiagram({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-dot-grid relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-md",
        className,
      )}
      aria-hidden
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {EDGES.map(([from, to], i) => {
          const a = NODES[from];
          const b = NODES[to];
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="var(--border-strong)"
              strokeWidth={1.5}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>

      {NODES.map((node) => {
        const entry = getCatalogEntry(node.type);
        const Icon = entry.icon;
        return (
          <div
            key={node.type}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-2.5 py-1.5 shadow-sm">
              <span className="grid size-7 place-items-center rounded-lg bg-accent-soft text-accent">
                <Icon className="size-4" />
              </span>
              <div className="pr-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="whitespace-nowrap text-[13px] font-medium leading-none">
                    {entry.label}
                  </span>
                  <span
                    className={cn(
                      "inline-block size-1.5 shrink-0 rounded-full",
                      RISK_DOT[node.risk],
                    )}
                  />
                </div>
                <div className="mt-1 text-[10px] uppercase leading-none tracking-wide text-muted">
                  {entry.category}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
