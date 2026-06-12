import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Compass, GaugeCircle, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/landing/site-nav";
import { SiteFooter } from "@/components/landing/site-footer";
import { SectionHeading } from "@/components/landing/section-heading";
import { GithubMark, GITHUB_URL } from "@/components/brand/github-mark";

export const metadata: Metadata = {
  title: "About",
  description:
    "ArchForge's mission, why the review engine is deterministic rules (not AI), how the discrete-event simulator works, and the tech stack behind it.",
};

const TECH_STACK = [
  { name: "Next.js 16", role: "App Router, Route Handlers, one custom server" },
  { name: "React 19", role: "UI + the React Flow canvas" },
  { name: "TypeScript", role: "Strict types across the whole codebase" },
  { name: "Tailwind CSS v4", role: "CSS-variable design tokens" },
  { name: "React Flow", role: "Infinite, interactive architecture canvas" },
  { name: "Zustand + zundo", role: "State management with undo/redo" },
  { name: "Yjs + WebSockets", role: "CRDT real-time collaboration" },
  { name: "dagre", role: "Automatic left-to-right graph layout" },
  { name: "Zod", role: "Validation for storage, import, and APIs" },
  { name: "Vitest", role: "Unit tests for the engines" },
] as const;

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        {/* Mission */}
        <section className="border-b border-border bg-secondary-bg/40">
          <div className="mx-auto w-full max-w-3xl px-6 py-16 lg:py-24">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              About
            </span>
            <h1 className="mt-3 text-balance text-4xl font-semibold sm:text-5xl">
              A system-design tool that respects your intelligence.
            </h1>
            <p className="mt-6 text-lg leading-8 text-text-secondary">
              ArchForge exists to make distributed-system design tangible. Most
              tools stop at boxes and arrows. ArchForge goes further: it
              simulates real traffic, reasons about your topology as a graph, and
              writes the document you&apos;d hand to a reviewer — so the diagram
              becomes a model you can actually test.
            </p>
          </div>
        </section>

        {/* Honesty */}
        <section className="mx-auto w-full max-w-3xl px-6 py-16">
          <div className="flex flex-col gap-4">
            <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent">
              <ShieldCheck className="size-6" />
            </span>
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Deterministic rules, not AI.
            </h2>
            <p className="text-lg leading-8 text-text-secondary">
              The review engine is built on sixteen explicit, graph-based rules.
              It computes client-reachability, builds adjacency maps, and finds
              articulation points to flag single points of failure, exposed
              databases, missing caches, and scaling risks. The same diagram
              always produces the same findings — each with an explanation, a
              suggested fix, and the exact nodes it affects.
            </p>
            <p className="text-lg leading-8 text-text-secondary">
              There is no model guessing in the loop. That&apos;s a deliberate
              choice: in a tool meant to teach and verify system design, honesty
              and reproducibility matter more than a confident-sounding
              paragraph. Every warning is something you can trace back to a rule.
            </p>
          </div>
        </section>

        {/* Simulator */}
        <section className="border-y border-border bg-secondary-bg/40">
          <div className="mx-auto w-full max-w-3xl px-6 py-16">
            <div className="flex flex-col gap-4">
              <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent">
                <GaugeCircle className="size-6" />
              </span>
              <h2 className="text-2xl font-semibold sm:text-3xl">
                How the simulator actually works.
              </h2>
              <p className="text-lg leading-8 text-text-secondary">
                The load simulator is a real discrete-event engine. A seeded
                random number generator drives a min-heap event queue of arrivals
                and departures. Each component is a queueing station with a
                service-time distribution, a number of parallel servers, a
                bounded queue, and a failure rate.
              </p>
              <p className="text-lg leading-8 text-text-secondary">
                Requests route along your edges, wait in queues, get served or
                dropped under backpressure, and occasionally fail and retry. The
                engine records per-node and end-to-end latency samples, then
                reports p50/p95/p99, utilization (ρ = λ / cμ), queue depth, drop
                rate, and cascading-failure detection. Push traffic past capacity
                and you&apos;ll watch tail latency climb and queues saturate —
                exactly as queueing theory predicts.
              </p>
            </div>
          </div>
        </section>

        {/* Tech stack */}
        <section className="mx-auto w-full max-w-3xl px-6 py-16">
          <SectionHeading
            eyebrow="Under the hood"
            title="Built on a modern, typed stack."
          />
          <dl className="mt-10 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {TECH_STACK.map((tech) => (
              <div
                key={tech.name}
                className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:gap-6"
              >
                <dt className="w-44 shrink-0 font-medium">{tech.name}</dt>
                <dd className="text-text-secondary">{tech.role}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* CTA */}
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-3xl px-6 py-16 text-center">
            <span className="mx-auto grid size-11 place-items-center rounded-xl bg-accent-soft text-accent">
              <Compass className="size-6" />
            </span>
            <h2 className="mt-5 text-balance text-3xl font-semibold">
              Try it — it&apos;s open source.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-text-secondary">
              Everything runs in your browser. Read the code, file an issue, or
              just start designing.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/editor">
                  Open editor
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                  <GithubMark className="size-4" />
                  View source
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
