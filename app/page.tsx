import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Check,
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
import { Reveal } from "@/components/landing/reveal";
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

const HERO_TRUST = [
  "Real-time collaboration",
  "Load simulation",
  "Architecture reviews",
  "Open source",
] as const;

export default function HomePage() {
  return (
    <div className="marketing-page flex min-h-screen flex-col">
      <SiteNav />

      <main className="flex-1">
        {/* Hero — full-bleed, the architecture image *is* the hero. Pulled up
            behind the transparent nav (-mt-16) so the image shows through it. */}
        <section className="relative -mt-16 flex min-h-svh items-center overflow-hidden border-b border-border pt-16">
          {/* Architecture visual. Slightly oversized and gently floating so the
              diagram feels alive — no parallax, no hard edges. Hidden on mobile,
              where the hero is text-only on the warm background. */}
          <div
            aria-hidden
            className="animate-hero-image-in absolute -inset-4 hidden [animation-delay:150ms] lg:block"
          >
            <div className="animate-float absolute inset-0">
              <Image
                src="/images/hero-architecture.png"
                alt=""
                fill
                sizes="(min-width: 1024px) 100vw, 0px"
                quality={90}
                loading="eager"
                fetchPriority="high"
                className="object-contain object-right"
              />
            </div>
          </div>

          {/* Readability wash over the desktop image — strong on the left,
              clear over the diagram on the right. No image on mobile, so no
              wash needed there. */}
          <div
            aria-hidden
            className="absolute inset-0 hidden lg:block bg-[linear-gradient(90deg,rgba(248,246,242,0.97)_0%,rgba(248,246,242,0.88)_30%,rgba(248,246,242,0.38)_56%,rgba(248,246,242,0)_74%)]"
          />
          {/* Bottom fade so the image melts into the page background. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent"
          />

          <div className="relative z-10 mx-auto w-full max-w-[1280px] px-6 py-24">
            <Reveal className="flex max-w-2xl flex-col items-center gap-7 text-center lg:items-start lg:text-left">
              <Badge variant="accent">Open-source · runs in your browser</Badge>
              <h1 className="text-balance text-5xl font-medium leading-[1.02] sm:text-6xl lg:text-7xl">
                Design systems that scale.
                <span className="mt-1.5 block text-gradient-accent">
                  Architect better.
                </span>
              </h1>
              <p className="max-w-xl text-lg leading-8 text-text-secondary">
                Visualize distributed systems, collaborate in real time,
                simulate load, detect bottlenecks, and generate
                production-ready architecture documentation.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/editor">
                    Start Designing
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/editor?template=url-shortener">View Demo</Link>
                </Button>
              </div>
              <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-1 lg:justify-start">
                {HERO_TRUST.map((item) => (
                  <li
                    key={item}
                    className="inline-flex items-center gap-1.5 text-sm text-text-secondary"
                  >
                    <Check className="size-4 shrink-0 text-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* Features */}
        <section className="relative overflow-hidden px-6 py-20 lg:py-28">
          <div
            aria-hidden
            className="bg-blueprint pointer-events-none absolute inset-0 opacity-40"
          />
          <div className="relative mx-auto w-full max-w-6xl">
            <Reveal>
              <SectionHeading
                eyebrow="Capabilities"
                title="Three real engines, one calm canvas."
                description="ArchForge isn't a diagram-drawing toy. Under the canvas sit a discrete-event simulator, a graph-based review engine, and a design-doc generator — all running locally."
              />
            </Reveal>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature, i) => (
                <Reveal key={feature.title} className="h-full" delay={i * 70}>
                  <FeatureCard {...feature} className="h-full" />
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="relative overflow-hidden border-y border-border bg-secondary-bg/50">
          <div
            aria-hidden
            className="bg-blueprint pointer-events-none absolute inset-0 opacity-50"
          />
          <div className="relative mx-auto w-full max-w-6xl px-6 py-20 lg:py-28">
            <Reveal>
              <SectionHeading
                align="center"
                eyebrow="How it works"
                title="From blank canvas to design doc in three moves."
              />
            </Reveal>
            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <Reveal key={step.title} delay={i * 90}>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-accent text-white shadow-sm">
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
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Templates showcase */}
        <section className="mx-auto w-full max-w-6xl px-6 py-20 lg:py-28">
          <Reveal>
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
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SHOWCASE.map((template, i) => (
              <Reveal key={template.id} className="h-full" delay={i * 70}>
                <TemplateCard template={template} className="h-full" />
              </Reveal>
            ))}
          </div>
        </section>

        {/* Engineering / honesty band */}
        <section className="grain grain-dark relative overflow-hidden border-y border-border bg-text text-background">
          <div
            aria-hidden
            className="bg-blueprint-dark pointer-events-none absolute inset-0"
          />
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="animate-drift-slow absolute -right-24 top-0 size-[30rem] rounded-full bg-accent/20 blur-3xl" />
          </div>
          <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-20 lg:py-28">
            <Reveal>
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                Engineered, not hand-waved
              </span>
              <h2 className="mt-3 max-w-2xl text-balance text-3xl font-semibold text-background sm:text-4xl">
                The hard parts are real math, not a language model.
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-10 md:grid-cols-3">
              <Reveal delay={0}>
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
              </Reveal>
              <Reveal delay={100}>
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-accent">
                    Graph-based review
                  </p>
                  <p className="leading-7 text-background/70">
                    Client-reachability, adjacency, and articulation-point
                    analysis drive sixteen deterministic rules. Same diagram in,
                    same findings out — every time.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={200}>
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-accent">
                    CRDT collaboration
                  </p>
                  <p className="leading-7 text-background/70">
                    Yjs documents synchronized over a self-hosted WebSocket
                    server with the y-protocols sync/awareness handshake —
                    conflict-free, no dedicated realtime service.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Open-source CTA */}
        <section className="relative overflow-hidden px-6 py-20 text-center lg:py-28">
          <div
            aria-hidden
            className="bg-aurora pointer-events-none absolute inset-0 opacity-70"
          />
          <Reveal className="relative mx-auto w-full max-w-3xl">
            <h2 className="text-balance text-3xl font-semibold sm:text-4xl">
              Open the canvas and start building.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-text-secondary">
              ArchForge is free, open source, and MIT licensed. No account
              required — your work stays in your browser until you choose to
              share it.
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
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
