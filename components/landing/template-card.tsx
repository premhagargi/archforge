import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { getCatalogEntry } from "@/lib/constants";
import type { ComponentType, DiagramTemplate } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/** Distinct component types in a template, in first-seen order. */
function uniqueTypes(template: DiagramTemplate): ComponentType[] {
  const seen = new Set<ComponentType>();
  for (const node of template.nodes) {
    seen.add(node.data.componentType);
  }
  return [...seen];
}

export function TemplateCard({
  template,
  className,
}: {
  template: DiagramTemplate;
  className?: string;
}) {
  const types = uniqueTypes(template);
  const shown = types.slice(0, 6);
  const extra = types.length - shown.length;

  return (
    <Link
      href={`/editor?template=${template.id}`}
      className={cn(
        "group flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-xs transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <Badge variant="accent">{template.category}</Badge>
        <span className="text-xs text-muted">
          {template.nodes.length} components
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <h3 className="text-lg font-semibold">{template.name}</h3>
        <p className="text-sm font-medium text-accent">{template.tagline}</p>
        <p className="line-clamp-3 text-sm leading-6 text-text-secondary">
          {template.description}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between pt-2">
        <div className="flex items-center gap-1.5">
          {shown.map((type) => {
            const Icon = getCatalogEntry(type).icon;
            return (
              <span
                key={type}
                className="grid size-7 place-items-center rounded-lg border border-border bg-secondary-bg text-text-secondary"
                title={getCatalogEntry(type).label}
              >
                <Icon className="size-3.5" />
              </span>
            );
          })}
          {extra > 0 && (
            <span className="grid size-7 place-items-center rounded-lg border border-border bg-secondary-bg text-[11px] font-medium text-muted">
              +{extra}
            </span>
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary transition-colors group-hover:text-accent">
          Open
          <ArrowUpRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}
