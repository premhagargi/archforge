# ArchForge

**Design distributed systems visually. Simulate real load. Detect architectural bottlenecks. Generate production-grade system-design documentation.**

ArchForge is an open-source, browser-based platform for engineers who want to think seriously about system design — not just draw boxes. It combines an infinite canvas with three genuinely non-trivial engines: a discrete-event load simulator, a deterministic graph-based architecture review engine, and a design-doc generator. Real-time multiplayer collaboration is built in via Yjs CRDTs over WebSockets.

---

## Features

**Visual architecture canvas**
Drag, drop, and connect 20 real distributed-system components — clients, CDNs, load balancers, databases, caches, message queues, workers, and more. Infinite canvas with auto-layout (dagre), multi-select, and a full inspector for every node.

**Discrete-event load simulator**
Push real traffic through your design. A seeded event-driven engine (M/M/c queuing model) reports p50/p95/p99 latency, utilization, queue depth, drop rate, and cascading failures — per node and end-to-end. Runs in a Web Worker for instant in-editor feedback; the same engine runs server-side at `/api/simulate`.

**Deterministic architecture review engine**
Sixteen graph-based rules flag single points of failure, exposed databases, missing caches, and scaling risks. Built on DFS reachability and Tarjan's articulation-point algorithm — not heuristics, not AI.

**Design-doc generation**
Generate a 16-section system-design document from the actual diagram: architecture overview, component inventory, traffic model, request flow, caching strategy, failure modes, recommendations. Every sentence is computed from real data; no lorem ipsum.

**Real-time multiplayer**
Two engineers can edit the same diagram simultaneously. Yjs CRDTs sync over a WebSocket server co-located with the Next.js app (one process, one port). Reconnects automatically with exponential backoff.

**8 reference architectures**
URL Shortener, Instagram Feed, WhatsApp Chat, Food Delivery, File Storage, Search Engine, Video Streaming, Notification System — each with pre-positioned nodes, traffic assumptions, known bottlenecks, and tradeoffs.

---

## Getting started

```bash
git clone https://github.com/premhagargi/archforge
cd archforge
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The editor is at `/editor`. No database, no auth, no environment variables required to run locally. Diagrams are saved to `localStorage` by default; the REST API persists to `.data/diagrams/*.json`.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16.2 (App Router) + React 19 | Server Components, route handlers, one deployable |
| Canvas | @xyflow/react (React Flow v12) | Best-in-class graph canvas for React |
| State | Zustand + zundo | Minimal, temporal (undo/redo), no boilerplate |
| Validation | Zod v4 | Single source of truth for all persisted shapes |
| Simulation | Custom discrete-event engine | Seeded mulberry32 RNG, min-heap event queue, M/M/c |
| Collaboration | Yjs + y-protocols + ws | CRDT sync, standard wire format, no separate service |
| Styling | Tailwind CSS v4 | CSS-variable design tokens, warm editorial palette |
| Layout | @dagrejs/dagre | Deterministic left-to-right graph layout |
| Icons | lucide-react | Consistent, tree-shakeable |

---

## Architecture

```
Browser (React)                      Custom Node server (server.ts) — one process, one port
┌──────────────────────────┐        ┌────────────────────────────────────────────────────┐
│ React Flow canvas         │        │ Next.js request handler                            │
│ Zustand + zundo store     │        │  Route Handlers (app/api/**)                       │
│ Yjs Y.Doc ◄── bind ──►    │        │   POST /api/simulate      (server-side sim)        │
│ WebSocketProvider ◄─WS──► │◄══WS══►│   CRUD /api/diagrams[/id]                          │
│ Web Worker (sim, instant) │        │   GET  /api/share/[id]                             │
│ localStorage (offline)    │        │ ws.Server (Upgrade: /api/rooms/:id/socket)         │
└──────────────────────────┘        │ RoomHub (room → Set<WebSocket>, authoritative doc)  │
                                     │ DiagramStore (file ⇄ .data/diagrams/*.json)        │
                                     └────────────────────────────────────────────────────┘
```

The WebSocket server is attached to the same HTTP server as Next.js via the `upgrade` event — no separate process, no separate port. The `RoomHub` holds an authoritative `Y.Doc` per room; on connect it sends a full sync step 1 so latecomers catch up instantly.

---

## Simulation engine

The simulator is a **discrete-event engine** — it processes a priority queue of `arrival` and `departure` events ordered by wall-clock time, rather than stepping through time in fixed increments.

Each node in the diagram is modelled as an M/M/c queue:
- **λ** (arrival rate) is driven by the upstream edge traffic
- **μ** (service rate) = 1 / `meanServiceTimeMs` from the component catalog
- **c** = number of parallel servers
- **ρ = λ / (c·μ)** = utilization. ρ > 0.95 → the node is flagged as a cascading failure risk

Service times are sampled from configurable distributions (exponential, normal, deterministic) using a **seeded mulberry32 PRNG**, making results fully reproducible.

The engine validates the closed-form load-calculator estimates: if `calculateLoad()` says you need 8 servers, running a simulation at that RPS should confirm utilization near 1/8 per server.

---

## Architecture review engine

The review engine runs 16 deterministic rules against the diagram graph. Key algorithms:

**Articulation point detection (Tarjan's algorithm)**
A node is a single point of failure if removing it disconnects any client from any data store. The engine finds all articulation points via a DFS that tracks discovery time (`disc`) and low-link values (`low`). If an AP lies on a client-to-data path, it fires the `spof` critical finding.

**Reachability (DFS)**
Used to check whether clients can reach databases directly (fires `db-exposed`), and whether nodes that should have backing stores actually do.

**Load-sensitive rules**
Rules like `db-bottleneck` and `no-replicas` fire only when `loadOutputs` are available, so warnings are calibrated to actual traffic rather than topology alone.

---

## Real-time collaboration

Collaboration uses [Yjs](https://github.com/yjs/yjs) CRDTs with the standard `y-protocols` sync/awareness wire format:

1. Client connects to `ws://host/api/rooms/:id/socket`
2. Server sends **sync step 1** (state vector) immediately
3. Client responds with **sync step 2** (missing updates)
4. Both sides are now consistent; subsequent updates are broadcast as binary diffs
5. Awareness (cursors, selection) uses a separate awareness protocol channel

The `RoomHub` holds an in-memory `Y.Doc` per room. When a room empties it is garbage collected. For multi-instance deploys, `y-redis` (Redis pub/sub) can replace the in-memory hub without changing the client.

---

## Deployment

### Docker

```bash
docker build -t archforge .
docker run -p 3000:3000 archforge
```

The container runs `server.ts` (compiled to `server.js` during build), serving both HTTP and WebSocket on port 3000.

### Render / Railway / Fly.io

Set the start command to `node server.js` (not `next start` — the custom server handles WebSocket upgrades). Single-instance deployments work out of the box; multi-instance requires the `y-redis` adapter.

Environment variables (all optional):

```
PORT=3000
HOSTNAME=0.0.0.0
NODE_ENV=production
```

---

## Project structure

```
app/
  page.tsx                    landing
  editor/page.tsx             editor shell (dynamic, ssr:false)
  templates/page.tsx
  examples/url-shortener/
  about/page.tsx
  api/
    diagrams/route.ts         GET list, POST create
    diagrams/[id]/route.ts    GET, PUT, DELETE
    simulate/route.ts         POST heavy server-side sim
    share/[id]/route.ts       GET shared diagram + design doc
server.ts                     custom server: Next.js + ws.Server on one port
components/
  editor/                     ArchitectureCanvas, ArchNode, ComponentPalette,
                              InspectorPanel, TopToolbar, AnalysisPanel,
                              LoadSimulator, MarkdownExporter, EditorShell
  landing/                    SiteNav, SiteFooter, FeatureCard, ...
  ui/                         button, input, textarea, select, tabs, dialog,
                              dropdown-menu, tooltip, slider, badge, separator
lib/
  types.ts                    Zod schemas + inferred TypeScript types
  constants.ts                COMPONENT_CATALOG (20 types, sim profiles)
  load-calculator.ts          calculateLoad() — 13 closed-form formulas
  analysis-engine.ts          analyzeArchitecture() — 16 deterministic rules
  markdown-generator.ts       generateDesignDoc() — 16-section doc
  storage.ts                  localStorage adapter (Zod-validated envelope)
  auto-layout.ts              layoutDiagram() — dagre LR
  templates.ts                8 reference architectures
  simulation/
    rng.ts                    seeded mulberry32 PRNG
    distributions.ts          exponential / normal / deterministic sampling
    engine.ts                 discrete-event simulator (min-heap, M/M/c)
    metrics.ts                percentiles, utilization labels, buildSimConfig
    worker.ts                 Web Worker entry point
    client.ts                 worker client (promise API)
  collab/
    yjs-doc.ts                Y.Doc wrapper (nodes/edges as Y.Map)
    websocket-provider.ts     thin client provider (y-protocols, auto-reconnect)
  server/
    store.ts                  DiagramStore (file-based, .data/diagrams/)
    room-hub.ts               in-memory RoomHub (authoritative Y.Doc per room)
    ws-server.ts              WebSocket server (noServer, Upgrade handler)
store/
  architecture-store.ts       Zustand + zundo (undo/redo, all editor actions)
```

---

## Resume

Built ArchForge to demonstrate full-stack platform engineering depth across three non-trivial systems:

- **Discrete-event simulator** — seeded M/M/c queue engine (mulberry32 RNG, min-heap event queue, Box-Muller normal sampling). Reports p50/p95/p99 latency, utilization, cascading failures. Validates closed-form load estimates with real queueing behaviour.

- **Deterministic graph review engine** — 16 rules built on DFS reachability and Tarjan's articulation-point algorithm. Identifies SPOFs, exposed databases, missing caches, and load-sensitive scaling risks without heuristics or AI.

- **CRDT real-time collaboration** — Yjs documents synced over WebSockets using the y-protocols sync/awareness wire format. Custom server co-locates the WebSocket upgrade handler with the Next.js HTTP server on one port. In-memory RoomHub fans out binary CRDT diffs to all peers.

---

## License

MIT
