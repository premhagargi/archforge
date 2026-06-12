import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  GitBranch,
  Layers,
  ShieldAlert,
  Scale,
  TrendingUp,
} from "lucide-react";

import { getTemplate } from "@/lib/templates";
import { getCatalogEntry } from "@/lib/constants";
import { formatCompact } from "@/lib/utils";
import type { RiskLevel } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/landing/site-nav";
import { SiteFooter } from "@/components/landing/site-footer";
import { Reveal } from "@/components/landing/reveal";

export const metadata: Metadata = {
  title: "Example · URL Shortener",
  description:
    "An editorial walkthrough of a URL-shortener architecture: traffic assumptions, the cache-first read path, the database bottleneck, scaling strategy, and tradeoffs.",
};

const RISK_BADGE: Record<RiskLevel, "success" | "warning" | "critical"> = {
  low: "success",
  medium: "warning",
  high: "critical",
};

export default function UrlShortenerExamplePage() {
  const template = getTemplate("url-shortener");
  if (!template) notFound();

  const nameById = new Map(template.nodes.map((n) => [n.id, n.data.name]));

  const NARRATIVE = [
    {
      icon: TrendingUp,
      title: "Traffic assumptions",
      items: template.trafficAssumptions,
    },
    {
      icon: Scale,
      title: "Scaling strategy",
      items: template.scalingNotes,
    },
    {
      icon: ShieldAlert,
      title: "Known bottlenecks",
      items: template.knownBottlenecks,
    },
    {
      icon: GitBranch,
      title: "Tradeoffs",
      items: template.tradeoffs,
    },
  ] as const;

  const { loadInputs } = template;
  const stats = [
    { label: "Daily active users", value: formatCompact(loadInputs.dailyActiveUsers) },
    {
      label: "Requests / user / day",
      value: `${loadInputs.requestsPerUserPerDay}`,
    },
    { label: "Read ratio", value: `${Math.round(loadInputs.readRatio * 100)}%` },
    {
      label: "Cache hit ratio",
      value: `${Math.round(loadInputs.cacheHitRatio * 100)}%`,
    },
  ];

  return (
    <div className="marketing-page flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border bg-secondary-bg/40">
          <div
            aria-hidden
            className="bg-aurora pointer-events-none absolute inset-0 opacity-80"
          />
          <div
            aria-hidden
            className="bg-blueprint pointer-events-none absolute inset-0 opacity-40"
          />
          <Reveal className="relative mx-auto w-full max-w-4xl px-6 py-16 lg:py-20">
            <div className="flex items-center gap-2">
              <Badge variant="accent">Example</Badge>
              <Badge variant="neutral">{template.category}</Badge>
            </div>
            <h1 className="mt-5 text-balance text-4xl font-semibold sm:text-5xl">
              {template.name}
            </h1>
            <p className="mt-3 text-lg font-medium text-accent">
              {template.tagline}
            </p>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-text-secondary">
              {template.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href={`/editor?template=${template.id}`}>
                  Open in editor
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/templates">All templates</Link>
              </Button>
            </div>
          </Reveal>
        </section>

        {/* Load assumptions */}
        <section className="mx-auto w-full max-w-4xl px-6 py-12">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-surface p-5">
                <div className="text-2xl font-semibold tabular-nums">
                  {stat.value}
                </div>
                <div className="mt-1 text-xs uppercase tracking-wide text-muted">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Components */}
        <section className="mx-auto w-full max-w-4xl px-6 py-8">
          <h2 className="flex items-center gap-2 text-2xl font-semibold">
            <Layers className="size-5 text-accent" />
            The components
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {template.nodes.map((node) => {
              const entry = getCatalogEntry(node.data.componentType);
              const Icon = entry.icon;
              return (
                <div
                  key={node.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{node.data.name}</span>
                      <Badge variant={RISK_BADGE[node.data.riskLevel]}>
                        {node.data.riskLevel} risk
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-text-secondary">
                      {node.data.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Request flow */}
        <section className="mx-auto w-full max-w-4xl px-6 py-8">
          <h2 className="flex items-center gap-2 text-2xl font-semibold">
            <GitBranch className="size-5 text-accent" />
            How requests flow
          </h2>
          <ul className="mt-6 flex flex-col gap-2">
            {template.edges.map((edge) => (
              <li
                key={edge.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm"
              >
                <span className="font-medium">{nameById.get(edge.source)}</span>
                <ArrowUpRight className="size-4 text-muted" />
                <span className="font-medium">{nameById.get(edge.target)}</span>
                {edge.label && (
                  <span className="text-text-secondary">— {edge.label}</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Narrative */}
        <section className="mx-auto w-full max-w-4xl px-6 py-8 pb-16">
          <div className="grid gap-5 sm:grid-cols-2">
            {NARRATIVE.map((block) => (
              <div
                key={block.title}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6"
              >
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <block.icon className="size-5 text-accent" />
                  {block.title}
                </h3>
                <ul className="flex flex-col gap-2.5">
                  {block.items.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2.5 text-sm leading-6 text-text-secondary"
                    >
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden border-t border-border bg-secondary-bg/40">
          <div
            aria-hidden
            className="bg-aurora pointer-events-none absolute inset-0 opacity-70"
          />
          <Reveal className="relative mx-auto w-full max-w-4xl px-6 py-16 text-center">
            <h2 className="text-balance text-3xl font-semibold">
              Make it yours.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-text-secondary">
              Load this design into the editor, push traffic through the
              simulator, and watch the database bottleneck appear as you scale.
            </p>
            <Button asChild size="lg" className="mt-7">
              <Link href={`/editor?template=${template.id}`}>
                Open URL Shortener in editor
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
