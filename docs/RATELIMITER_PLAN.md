`# FloodGate — Distributed Rate Limiter Library

> **A production-grade, sliding-window rate limiter for Node.js. Redis-backed, atomic, zero-approximation-error on burst detection. Plugs into Express, Fastify, and Next.js in one line.**

Published to npm as `floodgate-rl`. Open-source (MIT). Comes with a live dashboard.

This is a real engineering artifact, not a portfolio toy. Every algorithm decision has a paper citation. Every Redis operation is atomic. The dashboard shows real traffic in real time.

---

## 1. Why this exists

Rate limiting is a solved problem in theory and a mess in practice. Most libraries:
- Use fixed windows (cheap but has a 2× burst spike at window boundaries)
- Aren't atomic under concurrent load (race conditions under high RPS)
- Don't degrade gracefully when Redis is down
- Have no visibility into what's being limited and why

FloodGate fixes all four. It's the library you'd want to reach for on a real team.

---

## 2. Algorithms (all three, user's choice)

### 2a. Sliding Window Counter ← default
The sweet spot. O(1) memory per key, ~0.5% error rate at boundaries (acceptable in practice).

**How it works:**
```
currentCount = prevWindowCount × (1 - elapsedFraction) + currentWindowCount
```
Two Redis keys per limit key (current window + previous window), each with a TTL.
**One Lua script, one round-trip, fully atomic.**

Reference: Cloudflare engineering blog — "How we built ratelimiting"

### 2b. Sliding Window Log
Exact. Stores every request timestamp in a sorted set; counts entries in `[now - window, now]`.
O(n) memory where n = requests in the window. Use only when exactness matters more than memory.

```lua
ZREMRANGEBYSCORE key 0 (now - windowMs)
ZADD key now now
ZCARD key   -- compare to limit
EXPIRE key windowSeconds
```
All in one Lua script.

### 2c. Token Bucket
Classic leaky-bucket variant. Good for APIs that want to allow short bursts above the steady-state rate.
- `tokens`: current token count
- `lastRefill`: timestamp of last refill
- Refill rate: `limit / windowMs` tokens per ms
- On request: subtract 1 token, deny if < 0

Also Lua-scripted for Redis. In-memory fallback stores the same struct in a `Map`.

---

## 3. Tech stack

- **TypeScript** strict, `"module": "NodeNext"`, dual CJS+ESM output via `tsup`
- **ioredis** for Redis (cluster-safe, pipeline support)
- **Lua scripts** loaded via `SCRIPT LOAD` + `EVALSHA` (faster than `EVAL` on hot paths)
- **Vitest** for unit + integration tests (integration spins up `ioredis-mock` or a real Redis via Docker)
- **tsup** for building the npm package (CJS + ESM + `.d.ts`)
- **Next.js 16** for the live dashboard (separate `dashboard/` workspace, not bundled into the library)
- **npm workspaces** — monorepo: `packages/core`, `packages/express`, `packages/nextjs`, `apps/dashboard`

---

## 4. Package structure

```
floodgate/
  packages/
    core/               ← the engine (no Express dep, no Next dep)
      src/
        algorithms/
          sliding-window-counter.ts
          sliding-window-log.ts
          token-bucket.ts
        backends/
          redis.ts          ← ioredis adapter + Lua script loader
          memory.ts         ← in-process fallback (same interface)
        index.ts            ← RateLimiter class, createLimiter() factory
        types.ts
      scripts/
        sliding-window-counter.lua
        sliding-window-log.lua
        token-bucket.lua
    express/            ← express middleware adapter
      src/index.ts
    nextjs/             ← Next.js middleware + route handler adapter
      src/index.ts
  apps/
    dashboard/          ← Next.js 16 live dashboard
      app/
        page.tsx          ← stats overview
        api/stats/route.ts
        api/stream/route.ts  ← SSE for real-time push
  README.md
  package.json          ← workspace root
```

---

## 5. Core API

```typescript
import { createLimiter } from 'floodgate-rl'

const limiter = createLimiter({
  backend: 'redis',           // 'redis' | 'memory'
  redis: { host: 'localhost', port: 6379 },
  fallback: 'memory',         // automatic fallback when Redis is unreachable
  algorithm: 'sliding-window-counter', // default
})

// Check a key
const result = await limiter.check({
  key: `user:${userId}:api`,
  limit: 100,
  windowMs: 60_000,  // 1 minute
})

// result: { allowed: boolean, remaining: number, resetAt: number, retryAfter?: number }
```

### Express middleware
```typescript
import { rateLimit } from 'floodgate-rl/express'

app.use('/api', rateLimit({
  limiter,
  limit: 100,
  windowMs: 60_000,
  keyGenerator: (req) => req.ip,
  onBlocked: (req, res) => res.status(429).json({ error: 'Too many requests' }),
}))
```

### Next.js middleware
```typescript
// middleware.ts
import { withRateLimit } from 'floodgate-rl/nextjs'

export default withRateLimit({
  limiter,
  rules: [
    { matcher: '/api/auth/*', limit: 10, windowMs: 60_000 },
    { matcher: '/api/*',      limit: 200, windowMs: 60_000 },
  ],
  keyGenerator: (req) => req.headers.get('x-forwarded-for') ?? 'anon',
})
```

---

## 6. The Lua scripts (the core engineering)

### Sliding window counter (atomic, O(1))
```lua
-- Keys: [currentKey, prevKey]
-- Args: [limit, now, windowMs, ttlSeconds]
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[4])
end
local prev = tonumber(redis.call('GET', KEYS[2])) or 0
local elapsed = tonumber(ARGV[2]) % tonumber(ARGV[3])
local weight = 1 - (elapsed / tonumber(ARGV[3]))
local count = math.floor(prev * weight) + current
if count > tonumber(ARGV[1]) then
  return {0, tonumber(ARGV[1]) - count, -1}
end
return {1, tonumber(ARGV[1]) - count, 0}
```

This is the Cloudflare sliding window. **One INCR + one GET + one conditional EXPIRE = one Lua call = fully atomic.**

---

## 7. In-memory backend (Redis-down fallback)

Same interface as the Redis backend. Uses a `Map<string, WindowState>` with a periodic GC sweep (every 30 seconds) to evict expired keys. Thread-safe within a single Node process (Node's event loop gives you this for free).

The `createLimiter({ fallback: 'memory' })` option wires up automatic failover: if the Redis `check()` call throws, the limiter transparently falls through to the in-memory backend and emits a `'redis:error'` event for observability.

---

## 8. Dashboard

A Next.js 16 app in `apps/dashboard/`. Not bundled into the npm package — run separately.

**What it shows (real-time, via SSE):**
- Top 20 keys by request count (last 5 minutes)
- Block rate % over time (sparkline)
- Current RPS across all tracked keys
- Per-key breakdown: limit / used / remaining / resets at

**How it works:**
- The core library emits events (`check`, `blocked`, `error`) to an `EventEmitter`
- A thin collector in the dashboard's API aggregates these into 10-second buckets
- `/api/stream` serves an SSE stream; the dashboard React page subscribes on mount

No WebSocket server needed — SSE is simpler, one-directional, and works through any HTTP/2 proxy.

---

## 9. Phases

### Phase 1 — Core engine
- `packages/core/src/types.ts` — `LimitResult`, `LimitOptions`, `Backend` interface, `Algorithm` union
- `packages/core/src/backends/memory.ts` — in-memory sliding window counter
- `packages/core/src/algorithms/sliding-window-counter.ts` — pure math (no I/O), unit-testable
- `packages/core/src/index.ts` — `RateLimiter` class + `createLimiter()` factory
- Vitest unit tests: sliding window math, token bucket refill, boundary conditions

### Phase 2 — Redis backend
- Load Lua scripts via `SCRIPT LOAD` on connect, call via `EVALSHA`
- `packages/core/src/backends/redis.ts` — ioredis adapter
- All three algorithms as Lua scripts
- Automatic fallback wiring (`fallback` option)
- Integration tests: ioredis-mock + real Redis (Docker)

### Phase 3 — Middleware adapters
- `packages/express/` — rate limit middleware, `keyGenerator`, `onBlocked`, `skip`
- `packages/nextjs/` — `withRateLimit()` for `middleware.ts`, plus `rateLimit()` for route handlers
- Tests: supertest for Express; Next.js test utils for middleware

### Phase 4 — Dashboard
- `apps/dashboard/` Next.js 16 app
- SSE stream endpoint, 10-second bucket aggregator
- Top-keys table, block rate sparkline, per-key details
- Works with the in-memory backend (no Redis required to run the demo)

### Phase 5 — Package publishing & docs
- `tsup` dual CJS+ESM build, `exports` map in package.json
- README: quickstart (30 seconds to running), API reference, algorithm comparison table, Redis Lua script walkthrough
- GitHub Actions: typecheck + lint + vitest + publish on tag
- Live demo URL (Render or Railway, Redis free tier)

---

## 10. What this signals to interviewers

| What you built | What they hear |
|---|---|
| Lua scripts for atomic Redis ops | "Knows distributed systems primitives — not just happy-path CRUD" |
| Sliding window counter math | "Can implement algorithms from first principles" |
| Automatic Redis fallback | "Thinks about failure modes, not just the happy path" |
| Published npm package | "Ships real things that real developers can use" |
| Dashboard with SSE | "Cares about operability, not just correctness" |

At Cloudflare: *"I implemented their published sliding window algorithm as a library."*
At Datadog: *"I built observability into the core: every check emits an event for the dashboard."*
At Stripe: *"The fallback path is tested as thoroughly as the happy path."*

---

## 11. Time estimate

| Phase | Est. time |
|---|---|
| 1 — Core engine | 4–6 hours |
| 2 — Redis backend | 4–6 hours |
| 3 — Adapters | 3–4 hours |
| 4 — Dashboard | 4–6 hours |
| 5 — Polish + publish | 2–3 hours |
| **Total** | **~20 hours** |

One focused weekend. Smaller scope than ArchForge, but every line is load-bearing.
`