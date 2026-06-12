# ArchForge — Implementation Plan

> **Design scalable systems visually. Simulate load. Detect bottlenecks. Generate architecture documentation.**

ArchForge is an open-source visual system-design platform. Engineers drag-and-drop
distributed-system components onto a canvas, connect them, **simulate real traffic with a
discrete-event engine**, get **deterministic architecture-review warnings**, auto-generate a
**production-grade system-design document**, and **collaborate in real time over WebSockets** —
all inside a single Next.js application served by one custom Node process (Next.js + an attached
WebSocket server share the same port; no separate realtime microservice).

This document is the source-of-truth build plan. It is broken into 9 phases. Each phase ends
with a clean `tsc --noEmit`; full `next build` + tests are verified at the end of Phases 2, 5,
7, and 9.

---

## 1. Goals & non-goals

**Goals**
- A tool that *feels* like a real engineering product (Excalidraw-for-system-design / Figma-for-architecture), not a portfolio toy or CRUD app.
- Three genuinely non-trivial engines: a **discrete-event load simulator**, a **deterministic architecture-review engine**, and a **design-doc generator**.
- **Real-time multiplayer** canvas using CRDTs (Yjs) synced over a **WebSocket** transport.
- Warm, editorial, Claude-inspired design language (calm, human, premium — never generic SaaS).

**Non-goals**
- No authentication, no paywalls, no third-party database **required** to run.
- No separate realtime microservice. All HTTP APIs stay Next.js Route Handlers; the WebSocket
  endpoint is attached to the **same Node process** via a thin custom server (one deployable, one
  port). External services (Redis, KV) are *optional* scale-out only.

---

## 2. Hard constraints

| Constraint | Decision |
|---|---|
| Everything inside one Next.js app | All HTTP APIs are Route Handlers under `app/api/`. The only addition is a thin custom server (`server.ts`) that boots Next.js **and** attaches a WebSocket server on the same port — still one process, one deploy. |
| Persistence | localStorage-first (offline). Optional cloud save/share via a file-backed `DiagramStore` adapter behind Route Handlers. |
| Real-time transport | Yjs CRDT synced over a **WebSocket** connection (`ws` server attached to the Next.js HTTP server), fanned out by an in-memory `RoomHub` keyed by room id. Runs under a single long-lived Node process. Redis pub/sub (`y-redis`) = documented optional cross-instance adapter. |
| No AI in the product | The review engine is **deterministic rules**. The simulator is **real event-driven math**. Honesty is a feature. |

---

## 3. Tech stack

- **Next.js 16.2** (App Router) + **React 19.2**, **TypeScript** strict.
- **Tailwind CSS v4** (`@tailwindcss/postcss`) with CSS-variable design tokens.
- **@xyflow/react** (React Flow v12) for the canvas.
- **Zustand** + **zundo** (temporal middleware) for state + undo/redo.
- **Yjs** for CRDT collaboration, synced over WebSockets (`ws` on the server, `y-protocols` sync/awareness wire format; client uses a thin custom `WebSocket` provider).
- **@dagrejs/dagre** for auto-layout.
- **Zod** for all validation (storage envelope, import, API payloads).
- **Lucide** icons. UI primitives hand-built on **Radix UI** + **class-variance-authority** (shadcn-style, but vendored for full control on Next 16 / Tailwind v4).
- **Vitest** for unit tests (calculator, analysis engine, simulator).

### Next.js 16 specifics this plan accounts for
- **`params` / `searchParams` are Promises** — always `await`. Route handlers type context with the global `RouteContext<'/path'>` helper; pages use `PageProps<'/path'>`.
- **Turbopack is the default** bundler for `dev` and `build`. Web Workers must use the `new Worker(new URL('./worker.ts', import.meta.url))` form (Turbopack-compatible).
- **`next lint` removed** → ESLint flat config (`eslint.config.mjs`) run directly.
- **WebSockets** are not supported inside Route Handlers, so a thin **custom server** (`server.ts`, run with `tsx`/compiled) creates the Next.js app via `next({})`, takes over `request`/`upgrade`, and mounts a `ws.Server` (`noServer: true`) that handles the HTTP `Upgrade` for `/api/rooms/:id/socket`. `dev`/`start` scripts point at this server; HTTP routes are untouched.
- `next/dynamic` with `ssr: false` is only valid inside Client Components → the editor uses a thin `'use client'` wrapper to lazy-load the canvas.

---

## 4. Architecture overview

```
Browser (React)                         Custom Node server (server.ts) — one process, one port
┌────────────────────────────┐         ┌──────────────────────────────────────────────┐
│ React Flow canvas          │         │ Next.js request handler                        │
│ Zustand + zundo store      │         │  Route Handlers (app/api/**)                   │
│ Yjs Y.Doc  ◄── bind ──►    │         │   POST /api/simulate           (heavy sim)     │
│ WebSocketProvider ◄──WS──► │◄═══WS══►│   CRUD /api/diagrams[/id]                      │
│ Web Worker (sim, instant)  │         │   GET  /api/share/[id]                          │
│ localStorage (offline)     │         │ ── ws.Server (Upgrade: /api/rooms/:id/socket) ─│
└────────────────────────────┘         │ ── in-memory RoomHub (room → Set<WebSocket>) ─│
                                        │ ── DiagramStore adapter (file ⇄ KV) ──        │
                                        │ ── lib/simulation (pure, shared client+server)│
                                        └──────────────────────────────────────────────┘
```

### Folder structure (target)
```
app/
  layout.tsx  page.tsx                 # landing
  editor/page.tsx                      # client wrapper → loads canvas (ssr:false)
  templates/page.tsx
  examples/url-shortener/page.tsx
  about/page.tsx
  api/
    diagrams/route.ts                  # GET list, POST create
    diagrams/[id]/route.ts             # GET, PUT, DELETE
    simulate/route.ts                  # POST heavy server-side sim
    share/[id]/route.ts                # GET shared diagram + rendered doc
                                       # (realtime: WS upgrade on /api/rooms/:id/socket,
                                       #  handled in server.ts — not a Route Handler)
server.ts                              # custom server: Next.js + ws.Server on one port
components/
  editor/  ArchitectureCanvas · ArchNode · ComponentPalette · InspectorPanel
           TopToolbar · AnalysisPanel · LoadSimulator · MarkdownExporter
  landing/ SiteNav · SiteFooter · FeatureCard · SectionHeading
  ui/      button · input · textarea · label · select · tabs · dialog
           dropdown-menu · tooltip · slider · badge · separator
lib/
  types.ts  constants.ts
  load-calculator.ts  analysis-engine.ts  markdown-generator.ts
  storage.ts  auto-layout.ts  templates.ts  utils.ts
  simulation/  types · rng · distributions · engine · metrics · worker · client
  collab/      yjs-doc · websocket-provider   # client Yjs provider over a raw WebSocket
  server/      store · room-hub · ws-server    # room-hub fan-out + ws connection handler
store/
  architecture-store.ts
docs/
  IMPLEMENTATION_PLAN.md  (this file)
```

---

## 5. Design system

CSS variables in `app/globals.css`, mapped into the Tailwind v4 `@theme` and the UI tokens:

| Token | Value | | Token | Value |
|---|---|---|---|---|
| `--background` | `#F8F6F2` | | `--accent` | `#cc785c` |
| `--secondary-bg` | `#F3F0EA` | | `--accent-hover` | `#9E5C30` |
| `--surface` | `#FFFFFF` | | `--success` | `#4F7A5A` |
| `--border` | `#E5E1D8` | | `--warning` | `#B6872D` |
| `--text` | `#26231E` | | `--critical` | `#B24A3A` |
| `--text-secondary` | `#5E584E` | | `--grid` | `#E9E5DC` |
| `--muted` | `#857D72` | | | |

Typography: **Inter** via `next/font`. Editorial scale — generous leading, slightly tightened
tracking on large headers, strong hierarchy, lots of whitespace. Focus rings use `--accent`.

---

## 6. Component catalog (20 types)

Single source of truth in `lib/constants.ts` (`COMPONENT_CATALOG`). Each entry drives the
palette, the node card, the simulator, and the generated docs:

`client · cdn · load-balancer · api-gateway · auth-service · app-service · microservice ·
database · read-replica · cache · message-queue · worker · object-storage · search-index ·
notification-service · monitoring · analytics · external-api · ai-service · event-bus`

Each catalog entry: `label`, Lucide `icon`, `category` (Traffic / Compute / Data / Messaging /
Observability / External), `description`, default `capacity` + `riskLevel`, and a **simulation
profile** (`serviceTimeMs` distribution params, `parallelism`/servers `c`, `failureRate`,
`queueCapacity`).

Node data model (`ArchNodeData`): `name, description, componentType, riskLevel ('low'|'medium'|'high'),
estimatedCapacity, notes, tags: string[], customMetadata: Record<string,string>`.

---

# Phases

## Phase 1 — Foundation ◄ in progress
Scaffold (done: Next 16 + TS + Tailwind v4), install deps, vendor UI primitives, design tokens,
domain vocabulary. Ships an empty-but-styled shell.
- Install: `@xyflow/react zustand zundo zod @dagrejs/dagre lucide-react clsx tailwind-merge class-variance-authority sonner yjs` + Radix primitives; `vitest` (dev).
- `lib/utils.ts` (`cn`), `components/ui/*` primitives.
- `app/globals.css` + Tailwind theme: full color system, Inter, typography scale, focus rings.
- `lib/types.ts` (20 component types, all data models, **Zod** schemas + storage envelope, `z.infer` types).
- `lib/constants.ts` (`COMPONENT_CATALOG` incl. sim profiles, `STORAGE_KEYS`, `SCHEMA_VERSION`, default load inputs).
- `app/layout.tsx` (metadata/OG, Inter, Toaster) + placeholder routes.

## Phase 2 — Domain engines (pure `lib/`)
- `load-calculator.ts` — `calculateLoad(LoadInputs): LoadOutputs`; **every formula commented** (RPM/RPH/RPD, bandwidth, storage growth/retention, DB load, cache savings, suggested servers, DB-scaling strategy).
- `analysis-engine.ts` — `analyzeArchitecture(diagram, loadOutputs?): Finding[]`; graph helpers (adjacency, client-reachability, articulation points) + all **16 rules** (severity/title/explanation/suggestedFix/affectedNodeIds), sorted critical→info.
- `markdown-generator.ts` — `generateDesignDoc(...)`: all **16 sections**, every sentence computed from the actual diagram (no lorem).
- `storage.ts` — save/load/clear/export/import; **Zod-validated**, versioned envelope, SSR-safe, toasts on error.
- `auto-layout.ts` — dagre left-to-right `layoutDiagram`.
- `templates.ts` — **8 full templates** (URL Shortener, Instagram Feed, WhatsApp Chat, Food Delivery, File Storage, Search Engine, Video Streaming, Notification System): pre-positioned nodes/edges, traffic assumptions, scaling notes, bottlenecks, tradeoffs.
- **Vitest** golden tests for calculator + analysis engine.

## Phase 3 — Discrete-event simulation engine (the 10/10 core)
`lib/simulation/`, pure & deterministic:
- `rng.ts` (seeded mulberry32 → reproducible), `distributions.ts` (exponential/normal/deterministic service times).
- `engine.ts` — event-driven simulator: min-heap event queue (arrival/departure), per-node bounded queues + `c` parallel servers, routing along edges, retries, failure injection, backpressure. Emits per-node + end-to-end latency samples, drops, utilization.
- `metrics.ts` — percentiles (p50/p95/p99), throughput, utilization `ρ=λ/(cμ)`, queue depth, drop rate, **cascading-failure detection**. Queueing-theory refs (Little's Law `L=λW`) in comments.
- `worker.ts` + `client.ts` — run in a **Web Worker** for instant in-editor feedback; identical engine reused server-side in Phase 6.
- Vitest: M/M/1 cases converge to theoretical values.

## Phase 4 — State store
`store/architecture-store.ts` — Zustand wrapped in `temporal` (zundo). State: nodes, edges,
diagramName, selection, loadInputs; memoized `loadOutputs` + `findings`. Actions: React-Flow
controlled handlers, add/update/delete/duplicate/rename node, setLoadInputs, loadTemplate,
reset, import, applyAutoLayout, save (+ debounced autosave). zundo `partialize` → `{nodes,edges}`,
debounced ~300 ms, limit 100. Keyboard map (Ctrl+Z / Shift+Z / D / S, Delete).

## Phase 5 — Editor UI (`app/editor` + `components/editor/`)
Client-only via `dynamic(..., { ssr: false })`. Layout: `TopToolbar` / (`ComponentPalette` |
`ArchitectureCanvas` | `InspectorPanel`) / `AnalysisPanel` drawer.
- `ArchitectureCanvas` — ReactFlow, warm dot-grid, Controls + MiniMap, palette drag-drop (`screenToFlowPosition`), multi-select / pan / zoom, smoothstep edges.
- `ArchNode` — calm card: icon tile + type label + risk dot; name; 2-line description; capacity badge + tag chips; 4 handles; accent selected state.
- `ComponentPalette` (categorized, searchable, drag **and** click-to-add).
- `InspectorPanel` (all editable fields incl. custom-metadata k/v rows; multi-select bulk delete; empty = diagram meta + quick stats).
- `TopToolbar` (undo/redo/auto-layout/fit/zoom; Save; Templates dropdown; Import; Export menu JSON/Markdown/Copy; Reset w/ confirm — **every button wired**).
- `AnalysisPanel` tabs: **Warnings** (click affected → select/zoom) · **Load Analysis** (`LoadSimulator`) · **Simulation** (run sim → latency histogram + percentile cards + saturation/cascade callouts) · **Recommendations** · **Summary**.
- `LoadSimulator` (9 inputs → 11 outputs, live) · `MarkdownExporter` (dialog preview, Copy + Download `.md`).
- Verify `next build` + manual editor smoke test.

## Phase 6 — Next.js API layer (Route Handlers)
- `lib/server/store.ts` — `DiagramStore` interface + file-based impl (`.data/diagrams/*.json`); KV adapter documented.
- `app/api/diagrams/route.ts` (GET list / POST) · `app/api/diagrams/[id]/route.ts` (GET/PUT/DELETE) — all Zod-validated.
- `app/api/simulate/route.ts` (POST) — heavy server-side sim via the Phase-3 engine.
- `app/api/share/[id]/route.ts` — read-only shared diagram + server-rendered design doc.
- Toolbar gains "Save to cloud / Share link" (localStorage stays the offline default).

## Phase 7 — Real-time collaboration (Yjs over WebSockets, custom server, no separate microservice)
- **Deps:** `ws` + `y-protocols` (sync + awareness wire format); `@types/ws`, `tsx` (dev) to run the TS custom server.
- `server.ts` — custom server: `const app = next({ dev }); const handle = app.getRequestHandler();`
  create an `http.Server` that delegates normal requests to `handle`, and on the `upgrade` event
  route `/api/rooms/:id/socket` to a `ws.Server({ noServer: true })` (other paths fall through to
  Next/HMR). Same port for HTTP + WS. `dev`/`start` npm scripts boot this file.
- `lib/server/room-hub.ts` — in-memory `Map<roomId, Room>`; each `Room` holds the authoritative
  `Y.Doc` + `awareness` + `Set<WebSocket>`. Fan-out binary updates to all peers except the sender;
  presence TTL/GC; destroy empty rooms. (No Next.js coupling — pure, unit-testable.)
- `lib/server/ws-server.ts` — per-connection handler implementing the y-protocols handshake:
  on connect send **sync step 1**; handle incoming `messageSync` (`readSyncMessage`) and
  `messageAwareness`; broadcast updates + awareness changes via the RoomHub; clean up on `close`.
- `lib/collab/yjs-doc.ts` (`Y.Map` nodes/edges + `Awareness`) · `lib/collab/websocket-provider.ts`
  (thin client provider over a raw `WebSocket`: same y-protocols framing, auto-reconnect with
  backoff, `connected`/`synced` status, awareness flush) · bind Y.Doc ↔ Zustand so remote edits
  render live (observe deep; guard against echo loops with an `origin` tag).
- Presence: cursors, selection highlights, random color/name (no auth). "Share session" puts a
  room id in the URL; the editor opens `ws(s)://<host>/api/rooms/<id>/socket`.
- Caveat documented: in-memory RoomHub assumes single-instance deploy; **`y-redis`** (Redis
  pub/sub) = optional cross-instance scale-out adapter.
- Verify: two browser windows edit the same room live; kill/restart a socket → provider reconnects
  and re-syncs from the server's authoritative `Y.Doc`.

## Phase 8 — Marketing & content pages
- `app/page.tsx` (landing): nav · Hero (`"Design systems like an architect."` + sub + CTA, with a static diagram built from real `ArchNode` styling) · Features (6) · How It Works (3 steps) · Templates showcase · Engineering benefits · Open-source CTA · footer.
- `app/templates/page.tsx` (8 cards → `/editor?template=id`) · `app/examples/url-shortener/page.tsx` (editorial walkthrough from the template object) · `app/about/page.tsx` (mission, honest "deterministic rules, not AI" + how the sim works, tech stack).
- Shared `components/landing/*`.

## Phase 9 — Docs, deploy, polish
- Premium `README.md` (overview, screenshot placeholders, features, architecture diagram, tech-stack table, getting started, simulation & collaboration design notes, roadmap, contributing, **resume bullets**, MIT). `LICENSE`.
- `Dockerfile` + single-instance deploy notes (Render/Railway/Fly run `node server.js`, **not**
  `next start`, so the WebSocket upgrade + in-memory `RoomHub` work; needs a host that allows WS
  and sticky/single-instance). `.env.example`.
- GitHub Actions CI (typecheck + lint + test + build). Empty states, a11y labels, focus styles, final pass.

---

## 7. Load-model formulas (documented in `lib/load-calculator.ts`)

```
requestsPerDay     = DAU × avgRequestsPerUserPerDay
requestsPerHour    = requestsPerDay / 24
requestsPerMinute  = requestsPerHour / 60
peakBandwidthBps   = peakRPS × avgPayloadBytes
bandwidthPerDay    = requestsPerDay × avgPayloadBytes
writesPerDay       = DAU × avgWritesPerUser
storageGrowthPerDay= writesPerDay × avgPayloadBytes
retentionStorage   = storageGrowthPerDay × retentionDays
dbLoadRPS          = peakRPS × writeRatio + peakRPS × readRatio × (1 − cacheHitRatio)
cacheSavingsRPS    = peakRPS × readRatio × cacheHitRatio
suggestedServers   = ceil(peakRPS / RPS_PER_SERVER) × redundancyFactor   # RPS_PER_SERVER ≈ 1000
dbScalingStrategy  = threshold(dbLoadRPS) → single primary | + read replicas | vertical + replicas | shard
```

The discrete-event simulator (Phase 3) **validates** these closed-form estimates with real
queueing behavior (utilization, tail latency, drops, cascades).

---

## 8. Architecture-review rules (16, deterministic)

**Critical** — DB exposed to client (client→database edge); single point of failure (articulation
node on every client→data path); availability risk (DB present, no LB, no replica).
**Warning** — missing load balancer; missing cache (DB, no cache); missing queue (worker or
write-heavy load, no queue); worker not connected to queue; missing read replicas (read-heavy +
DB, no replica); cache misconfiguration; DB bottleneck risk (`dbLoadRPS` over threshold); high
write-load risk; scaling risk; search service missing.
**Info** — no monitoring; no CDN (client present, no CDN); no object storage (media tags/types present).

Each finding → `{ severity, title, explanation, suggestedFix, affectedNodeIds }`.

---

## 9. Verification (end-to-end)

1. `npm run build` + `tsc --noEmit` clean; `vitest` green.
2. Editor: drag/connect/rename/duplicate/delete, undo/redo, auto-layout, fit, **save → refresh persists**, reset, export → import round-trips identically.
3. All 8 templates load cleanly; findings + markdown doc generate with real content.
4. **Simulation**: run on URL-shortener template → percentiles sane; raising RPS past capacity shows rising p99 + drops + a cascade callout; client (Worker) and `/api/simulate` agree.
5. **Collaboration**: two windows join one room → node moves/edits + cursors sync live; reconnect works.
6. Review spot-checks: client→DB ⇒ critical; remove monitoring ⇒ info; read-heavy + single DB ⇒ warning.
7. All 5 routes render without client errors.

---

## 10. Resume value

With the simulation engine + real-time collaboration, ArchForge moves from a strong portfolio
piece (~8/10) to a standout (~9.5/10) for full-stack / frontend-platform / developer-tooling roles
(especially Atlassian, Stripe, Datadog, Cloudflare). Differentiators that read as "a strong
engineer built this": a **discrete-event simulator** (queueing theory, event loop, tail-latency
analysis), a **deterministic graph-based review engine** (articulation points, reachability), and
**CRDT real-time collaboration over a self-hosted WebSocket server** (y-protocols sync/awareness,
in-memory room fan-out) co-located in the same Node process as the Next.js app. Lead the résumé
bullet with the **engine**, not the canvas.

**Bullets**
- Built ArchForge, an open-source visual system-design platform enabling engineers to model distributed systems, simulate infrastructure scale with a discrete-event engine, detect architectural bottlenecks, and generate production-ready system-design documentation.
- Implemented interactive architecture modeling with React Flow, TypeScript, Zustand, and Next.js, plus a seeded discrete-event load simulator computing p50/p95/p99 latency, utilization, and cascading-failure behavior.
- Designed a deterministic, graph-based architecture-review engine that identifies availability, scalability, caching, and single-point-of-failure risks across distributed-system topologies.
- Built real-time multiplayer collaboration with Yjs CRDTs synchronized over WebSockets, implementing the y-protocols sync/awareness handshake and an in-memory room fan-out hub attached to the same Node process that serves the Next.js app — no separate realtime backend.
