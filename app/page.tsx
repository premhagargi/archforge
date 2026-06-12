import Link from "next/link";
import {
  ArrowRight,
  FileText,
  GaugeCircle,
  Lock,
  PencilRuler,
  Radio,
  ShieldCheck,
  Activity,
  GitBranch,
  Boxes,
} from "lucide-react";

import { TEMPLATES } from "@/lib/templates";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/landing/site-nav";
import { SiteFooter } from "@/components/landing/site-footer";
import { SectionHeading } from "@/components/landing/section-heading";
import { FeatureCard } from "@/components/landing/feature-card";
import { TemplateCard } from "@/components/landing/template-card";
import { HeroDiagram } from "@/components/landing/hero-diagram";
import { GithubMark, GITHUB_URL } from "@/components/brand/github-mark";

const FEATURES = [
  {
    icon: PencilRuler,
    title: "Visual architecture canvas",
    description:
      "Drag, drop, and connect 20 real distributed-system components. A calm, infinite canvas with auto-layout, multi-select, and an inspector for every node.",
  },
  {
    icon: GaugeCircle,
    title: "Discrete-event load simulator",
    description:
      "Push real traffic through your design. A seeded event-driven engine reports p50/p95/p99 latency, utilization, queue depth, drops, and cascading failures.",
  },
  {
    icon: ShieldCheck,
    title: "Deterministic review engine",
    description:
      "Sixteen graph-based rules flag single points of failure, exposed databases, missing caches, and scaling risks — reachability and articulation points, not guesswork.",
  },
  {
    icon: FileText,
    title: "Design-doc generation",
    description:
      "Turn any diagram into a production-ready system-design document. Every section is computed from your actual topology and traffic — no lorem, no AI filler.",
  },
  {
    icon: Radio,
    title: "Real-time collaboration",
    description:
      "Design together. Yjs CRDTs sync over WebSockets with live cursors and selections — multiplayer architecture without a dedicated realtime backend.",
  },
  {
    icon: Lock,
    title: "Local-first & open source",
    description:
      "Runs entirely in your browser, localStorage-first and offline-friendly. No accounts, no paywalls. Optional cloud save and share when you want it.",
  },
] as const;

const STEPS = [
  {
    icon: Boxes,
    title: "Model",
    description:
      "Drop components onto the canvas and connect them. Set capacity, risk, and metadata per node — or start from a real-world template.",
  },
  {
    icon: Activity,
    title: "Simulate",
    description:
      "Dial in DAU, payloads, and read/write ratios. Run the simulator and watch tail latency climb and queues saturate as you approach capacity.",
  },
  {
    icon: GitBranch,
    title: "Review & export",
    description:
      "Get prioritized warnings with suggested fixes, then export a complete Markdown design doc — or share a live session with your team.",
  },
] as const;

const SHOWCASE = TEMPLATES.slice(0, 6);

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.05fr_1fr] lg:py-28">
            <div className="flex flex-col items-start gap-6">
              <Badge variant="accent">Open-source · runs in your browser</Badge>
              <h1 className="text-balance text-5xl font-semibold leading-[1.04] sm:text-6xl">
                Design systems like an architect.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-text-secondary">
                Model distributed systems on a canvas, simulate real traffic
                with a discrete-event engine, catch bottlenecks with
                deterministic review rules, and generate a production-ready
                design doc — collaboratively.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/editor">
                    Start designing
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/templates">Browse templates</Link>
                </Button>
              </div>
              <p className="text-sm text-muted">
                No sign-up. Deterministic engines — no AI hand-waving.
              </p>
            </div>

            <HeroDiagram className="w-full" />
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto w-full max-w-6xl px-6 py-20 lg:py-28">
          <SectionHeading
            eyebrow="Capabilities"
            title="Three real engines, one calm canvas."
            description="ArchForge isn't a diagram-drawing toy. Under the canvas sit a discrete-event simulator, a graph-based review engine, and a design-doc generator — all running locally."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-y border-border bg-secondary-bg/50">
          <div className="mx-auto w-full max-w-6xl px-6 py-20 lg:py-28">
            <SectionHeading
              align="center"
              eyebrow="How it works"
              title="From blank canvas to design doc in three moves."
            />
            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <div key={step.title} className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-accent text-white">
                      <step.icon className="size-5" />
                    </span>
                    <span className="text-sm font-semibold uppercase tracking-wide text-muted">
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold">{step.title}</h3>
                  <p className="text-base leading-7 text-text-secondary">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Templates showcase */}
        <section className="mx-auto w-full max-w-6xl px-6 py-20 lg:py-28">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              eyebrow="Templates"
              title="Start from a real system."
              description="Eight reference architectures, each with traffic assumptions, scaling notes, and known bottlenecks baked in."
            />
            <Button asChild variant="outline" className="shrink-0">
              <Link href="/templates">
                Browse all templates
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SHOWCASE.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </section>

        {/* Engineering / honesty band */}
        <section className="border-y border-border bg-text text-background">
          <div className="mx-auto w-full max-w-6xl px-6 py-20 lg:py-28">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              Engineered, not hand-waved
            </span>
            <h2 className="mt-3 max-w-2xl text-balance text-3xl font-semibold text-background sm:text-4xl">
              The hard parts are real math, not a language model.
            </h2>
            <div className="mt-12 grid gap-10 md:grid-cols-3">
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-accent">
                  Discrete-event simulation
                </p>
                <p className="leading-7 text-background/70">
                  A seeded event loop with a min-heap queue, per-node bounded
                  queues and parallel servers, retries, and failure injection —
                  M/M/c queueing behaviour you can verify against theory.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-accent">
                  Graph-based review
                </p>
                <p className="leading-7 text-background/70">
                  Client-reachability, adjacency, and articulation-point analysis
                  drive sixteen deterministic rules. Same diagram in, same
                  findings out — every time.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-accent">
                  CRDT collaboration
                </p>
                <p className="leading-7 text-background/70">
                  Yjs documents synchronized over a self-hosted WebSocket server
                  with the y-protocols sync/awareness handshake — conflict-free,
                  no dedicated realtime service.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Open-source CTA */}
        <section className="mx-auto w-full max-w-3xl px-6 py-20 text-center lg:py-28">
          <h2 className="text-balance text-3xl font-semibold sm:text-4xl">
            Open the canvas and start building.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-text-secondary">
            ArchForge is free, open source, and MIT licensed. No account
            required — your work stays in your browser until you choose to share
            it.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/editor">
                Open editor
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                <GithubMark className="size-4" />
                View on GitHub
              </a>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
