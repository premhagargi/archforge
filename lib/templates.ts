import { COMPONENT_CATALOG, DEFAULT_LOAD_INPUTS } from "./constants";
import type {
  ArchEdge,
  ArchNode,
  ArchNodeData,
  ComponentType,
  DiagramTemplate,
  LoadInputs,
} from "./types";

/* ============================================================================
 * Reference architectures.
 *
 * Each template is a complete, loadable diagram (positioned nodes + edges +
 * traffic assumptions) plus an editorial narrative consumed by the marketing
 * pages. Positions are laid out left-to-right in coarse columns; `auto-layout`
 * (dagre) can re-flow them in the editor.
 * ========================================================================== */

/** Column / row helpers for a calm left-to-right layout. */
const COL = (i: number) => i * 240;
const ROW = (i: number) => i * 150;

function node(
  id: string,
  componentType: ComponentType,
  name: string,
  col: number,
  row: number,
  opts: Partial<ArchNodeData> = {},
): ArchNode {
  const entry = COMPONENT_CATALOG[componentType];
  return {
    id,
    type: "archNode",
    position: { x: COL(col), y: ROW(row) },
    data: {
      name,
      componentType,
      description: opts.description ?? entry.description,
      riskLevel: opts.riskLevel ?? entry.defaultRiskLevel,
      estimatedCapacity: opts.estimatedCapacity ?? entry.defaultCapacity,
      notes: opts.notes ?? "",
      tags: opts.tags ?? [],
      customMetadata: opts.customMetadata ?? {},
    },
  };
}

function edge(source: string, target: string, label?: string): ArchEdge {
  return {
    id: `${source}__${target}`,
    source,
    target,
    type: "smoothstep",
    ...(label ? { label } : {}),
  };
}

function load(overrides: Partial<LoadInputs>): LoadInputs {
  return { ...DEFAULT_LOAD_INPUTS, ...overrides };
}

/* ----------------------------------------------------------------------------
 * 1. URL Shortener
 * -------------------------------------------------------------------------- */
const urlShortener: DiagramTemplate = {
  id: "url-shortener",
  name: "URL Shortener",
  category: "Links",
  tagline: "Billions of redirects, a tiny write path.",
  description:
    "A bit.ly-style service: a write-light, read-heavy system where short codes are generated once and resolved millions of times. The whole design hinges on absorbing redirect reads before they reach the database.",
  trafficAssumptions: [
    "Reads (redirect lookups) outnumber writes (link creation) ~20:1.",
    "Hot links concentrate traffic — a small set of codes drive most reads.",
    "Redirect latency must stay low: it sits on the user's critical path.",
    "Short codes are immutable once created, which makes them trivially cacheable.",
  ],
  scalingNotes: [
    "Put a cache in front of the database; a 90%+ hit rate keeps DB load flat as traffic grows.",
    "Generate codes with a counter/base62 or hashing scheme to avoid read-before-write contention.",
    "Add read replicas only if cache misses still pressure the primary.",
    "Push static assets and 301/302 responses to the CDN edge where possible.",
  ],
  knownBottlenecks: [
    "The primary database on a cache-miss storm (cold cache after deploy).",
    "Hot-key skew overwhelming a single cache shard.",
    "Analytics writes contending with redirect reads if they share the path.",
  ],
  tradeoffs: [
    "301 (permanent) caching boosts speed but makes link edits/expiry hard to honor.",
    "Counter-based codes are dense but leak volume; hashed codes are opaque but can collide.",
    "Synchronous click analytics add latency; async via a queue trades freshness for speed.",
  ],
  loadInputs: load({
    dailyActiveUsers: 2_000_000,
    requestsPerUserPerDay: 30,
    avgPayloadBytes: 512,
    peakFactor: 4,
    readRatio: 0.95,
    cacheHitRatio: 0.9,
    writesPerUserPerDay: 2,
    retentionDays: 730,
    redundancyFactor: 1.5,
  }),
  nodes: [
    node("client", "client", "Web & Mobile", 0, 1),
    node("lb", "load-balancer", "Load Balancer", 1, 1),
    node("api", "api-gateway", "API Gateway", 2, 1),
    node("svc", "app-service", "Shortener Service", 3, 1),
    node("cache", "cache", "Redirect Cache", 4, 0, {
      estimatedCapacity: "~100k ops/s",
      tags: ["read-path", "hot-keys"],
    }),
    node("db", "database", "Link Store", 4, 2, {
      riskLevel: "high",
      notes: "System of record for code → URL mappings.",
    }),
    node("analytics", "analytics", "Click Analytics", 3, 3, {
      tags: ["async"],
    }),
  ],
  edges: [
    edge("client", "lb"),
    edge("lb", "api"),
    edge("api", "svc"),
    edge("svc", "cache", "lookup"),
    edge("svc", "db", "miss / write"),
    edge("svc", "analytics", "click event"),
  ],
};

/* ----------------------------------------------------------------------------
 * 2. Instagram Feed
 * -------------------------------------------------------------------------- */
const instagramFeed: DiagramTemplate = {
  id: "instagram-feed",
  name: "Instagram Feed",
  category: "Social",
  tagline: "Fan-out on write, read your timeline instantly.",
  description:
    "A photo-sharing home feed. The hard part is timeline assembly: precompute feeds on write so the read path is a single cache lookup, while media is served from object storage via a CDN.",
  trafficAssumptions: [
    "Extremely read-heavy: users scroll far more than they post.",
    "Media dominates bandwidth; the API payload is small metadata.",
    "Celebrity accounts create fan-out hot spots (millions of followers).",
    "Feeds tolerate slight staleness — eventual consistency is acceptable.",
  ],
  scalingNotes: [
    "Fan-out-on-write: a worker pushes new posts into each follower's feed cache.",
    "Serve images/videos from object storage behind a CDN, never through the app tier.",
    "Use read replicas for profile/graph reads; keep the primary for writes.",
    "Fall back to fan-out-on-read for very high-follower accounts to bound write amplification.",
  ],
  knownBottlenecks: [
    "Fan-out workers backing up when a popular user posts.",
    "Feed cache memory growth across hundreds of millions of users.",
    "Replica lag surfacing as missing recent posts.",
  ],
  tradeoffs: [
    "Fan-out-on-write makes reads cheap but writes expensive and bursty.",
    "Storing full feeds is fast but memory-hungry; storing IDs is leaner but adds a hydration hop.",
    "Aggressive CDN TTLs cut origin load but slow the appearance of edited media.",
  ],
  loadInputs: load({
    dailyActiveUsers: 50_000_000,
    requestsPerUserPerDay: 80,
    avgPayloadBytes: 4_096,
    peakFactor: 3,
    readRatio: 0.9,
    cacheHitRatio: 0.85,
    writesPerUserPerDay: 4,
    retentionDays: 3_650,
    redundancyFactor: 2,
  }),
  nodes: [
    node("client", "client", "Mobile App", 0, 1),
    node("cdn", "cdn", "Media CDN", 1, 3, { tags: ["media"] }),
    node("lb", "load-balancer", "Load Balancer", 1, 1),
    node("api", "api-gateway", "API Gateway", 2, 1),
    node("feed", "app-service", "Feed Service", 3, 1),
    node("cache", "cache", "Feed Cache", 4, 0, { tags: ["timeline"] }),
    node("replica", "read-replica", "Graph Replica", 4, 1),
    node("db", "database", "Posts DB", 4, 2, { riskLevel: "high" }),
    node("media", "object-storage", "Media Store", 2, 3, { tags: ["media"] }),
    node("mq", "message-queue", "Fan-out Queue", 3, 2),
    node("worker", "worker", "Feed Builder", 4, 3),
  ],
  edges: [
    edge("client", "lb"),
    edge("client", "cdn", "images"),
    edge("cdn", "media"),
    edge("lb", "api"),
    edge("api", "feed"),
    edge("feed", "cache", "read feed"),
    edge("feed", "replica", "graph"),
    edge("feed", "db", "write post"),
    edge("feed", "media", "upload"),
    edge("feed", "mq", "new post"),
    edge("mq", "worker"),
    edge("worker", "cache", "push to feeds"),
  ],
};

/* ----------------------------------------------------------------------------
 * 3. WhatsApp Chat
 * -------------------------------------------------------------------------- */
const whatsappChat: DiagramTemplate = {
  id: "whatsapp-chat",
  name: "WhatsApp Chat",
  category: "Messaging",
  tagline: "Persistent connections, at-least-once delivery.",
  description:
    "A real-time messaging backbone. Long-lived connections terminate at a gateway; messages flow through a durable queue so delivery survives offline recipients, with a store-and-forward worker doing the heavy lifting.",
  trafficAssumptions: [
    "Write-heavy: every message is a durable write plus one or more deliveries.",
    "Connections are sticky and long-lived, not request/response.",
    "Recipients are frequently offline — messages must be buffered, not dropped.",
    "Presence and typing indicators add high-frequency, low-value chatter.",
  ],
  scalingNotes: [
    "Terminate WebSocket connections at a horizontally scaled gateway tier.",
    "Route messages through a queue for at-least-once delivery and backpressure.",
    "Keep presence in an in-memory cache with short TTLs, not the primary DB.",
    "Shard the message store by conversation to spread write load.",
  ],
  knownBottlenecks: [
    "Connection-gateway memory and file-descriptor limits under fan-in.",
    "The message store on group chats with large membership.",
    "Notification fan-out to push providers during broadcast spikes.",
  ],
  tradeoffs: [
    "At-least-once delivery is robust but forces client-side dedupe.",
    "Storing full history aids search but multiplies write and storage cost.",
    "Strong ordering per conversation simplifies clients but limits sharding freedom.",
  ],
  loadInputs: load({
    dailyActiveUsers: 100_000_000,
    requestsPerUserPerDay: 150,
    avgPayloadBytes: 1_024,
    peakFactor: 3,
    readRatio: 0.4,
    cacheHitRatio: 0.6,
    writesPerUserPerDay: 80,
    retentionDays: 365,
    redundancyFactor: 2,
  }),
  nodes: [
    node("client", "client", "Mobile Clients", 0, 1),
    node("lb", "load-balancer", "Load Balancer", 1, 1),
    node("gateway", "api-gateway", "Connection Gateway", 2, 1, {
      description: "Terminates long-lived WebSocket connections.",
      tags: ["websocket", "sticky"],
    }),
    node("chat", "microservice", "Chat Service", 3, 1),
    node("cache", "cache", "Presence Cache", 4, 0),
    node("mq", "message-queue", "Delivery Queue", 3, 2),
    node("worker", "worker", "Delivery Worker", 4, 2),
    node("db", "database", "Message Store", 5, 2, { riskLevel: "high" }),
    node("notif", "notification-service", "Push Notifier", 5, 3),
    node("media", "object-storage", "Media Store", 4, 3, { tags: ["media"] }),
  ],
  edges: [
    edge("client", "lb"),
    edge("lb", "gateway"),
    edge("gateway", "chat"),
    edge("chat", "cache", "presence"),
    edge("chat", "mq", "enqueue"),
    edge("chat", "media", "attachments"),
    edge("mq", "worker"),
    edge("worker", "db", "persist"),
    edge("worker", "notif", "if offline"),
  ],
};

/* ----------------------------------------------------------------------------
 * 4. Food Delivery
 * -------------------------------------------------------------------------- */
const foodDelivery: DiagramTemplate = {
  id: "food-delivery",
  name: "Food Delivery",
  category: "Marketplace",
  tagline: "Three-sided marketplace, real-time dispatch.",
  description:
    "A DoorDash-style platform coordinating customers, restaurants, and couriers. Microservices own each domain; orders drive an async dispatch pipeline, and third-party maps/payments sit on the critical path.",
  trafficAssumptions: [
    "Spiky, time-of-day demand (lunch and dinner peaks).",
    "Mixed read/write: browsing menus (read) vs. placing/tracking orders (write).",
    "Location updates from couriers are frequent and write-heavy.",
    "External dependencies (maps, payments) add latency and failure modes.",
  ],
  scalingNotes: [
    "Split by domain: order, restaurant, and delivery services scale independently.",
    "Cache menus and restaurant search aggressively — they change slowly.",
    "Drive dispatch and notifications off a queue to smooth demand spikes.",
    "Add circuit breakers and timeouts around external maps/payment APIs.",
  ],
  knownBottlenecks: [
    "Dispatch worker throughput during peak meal windows.",
    "External payment/maps APIs becoming the tail-latency driver.",
    "Order DB write contention from high-frequency status updates.",
  ],
  tradeoffs: [
    "Microservices isolate failure but add network hops and operational overhead.",
    "Aggressive menu caching risks showing sold-out items.",
    "Synchronous payment authorization is safer but couples checkout to a third party.",
  ],
  loadInputs: load({
    dailyActiveUsers: 8_000_000,
    requestsPerUserPerDay: 40,
    avgPayloadBytes: 2_048,
    peakFactor: 5,
    readRatio: 0.7,
    cacheHitRatio: 0.7,
    writesPerUserPerDay: 6,
    retentionDays: 1_095,
    redundancyFactor: 1.5,
  }),
  nodes: [
    node("client", "client", "Customer App", 0, 1),
    node("lb", "load-balancer", "Load Balancer", 1, 1),
    node("api", "api-gateway", "API Gateway", 2, 1),
    node("auth", "auth-service", "Auth Service", 3, 0),
    node("orders", "microservice", "Order Service", 3, 1),
    node("restaurants", "microservice", "Restaurant Service", 3, 2),
    node("delivery", "microservice", "Delivery Service", 3, 3),
    node("search", "search-index", "Restaurant Search", 4, 2),
    node("cache", "cache", "Menu Cache", 4, 1),
    node("db", "database", "Orders DB", 5, 1, { riskLevel: "high" }),
    node("mq", "message-queue", "Dispatch Queue", 4, 3),
    node("worker", "worker", "Dispatch Worker", 5, 3),
    node("notif", "notification-service", "Notifications", 6, 3),
    node("maps", "external-api", "Maps & Payments", 5, 4, { riskLevel: "high" }),
  ],
  edges: [
    edge("client", "lb"),
    edge("lb", "api"),
    edge("api", "auth"),
    edge("api", "orders"),
    edge("api", "restaurants"),
    edge("api", "delivery"),
    edge("orders", "cache"),
    edge("orders", "db"),
    edge("restaurants", "search"),
    edge("orders", "mq", "order placed"),
    edge("mq", "worker"),
    edge("worker", "notif"),
    edge("worker", "maps", "routing"),
    edge("orders", "maps", "payment"),
  ],
};

/* ----------------------------------------------------------------------------
 * 5. File Storage
 * -------------------------------------------------------------------------- */
const fileStorage: DiagramTemplate = {
  id: "file-storage",
  name: "File Storage",
  category: "Storage",
  tagline: "Upload once, serve from the edge, process async.",
  description:
    "A Dropbox-style service. Large blobs land in object storage while a metadata DB tracks ownership and versions; thumbnails, virus scans, and indexing happen off the upload path via a queue.",
  trafficAssumptions: [
    "Payloads are large (files), so bandwidth and storage growth dominate.",
    "Downloads outnumber uploads and are highly cacheable at the edge.",
    "Post-upload processing (scan, thumbnail, index) is async and bursty.",
    "Metadata operations are small but frequent (listing, sharing, sync).",
  ],
  scalingNotes: [
    "Never proxy file bytes through the app tier — use pre-signed direct-to-storage URLs.",
    "Serve downloads via CDN; keep object storage as the origin.",
    "Offload scanning/thumbnailing to workers behind a queue.",
    "Keep metadata in a separate, smaller, highly-available database.",
  ],
  knownBottlenecks: [
    "Object storage request rate on viral public files.",
    "Worker pool throughput for large-file processing.",
    "Metadata DB on heavy sync/list workloads.",
  ],
  tradeoffs: [
    "Direct-to-storage uploads are efficient but complicate access control.",
    "Long CDN TTLs cut origin cost but slow propagation of replaced files.",
    "Synchronous virus scanning is safer but delays the upload acknowledgement.",
  ],
  loadInputs: load({
    dailyActiveUsers: 3_000_000,
    requestsPerUserPerDay: 20,
    avgPayloadBytes: 1_048_576,
    peakFactor: 3,
    readRatio: 0.6,
    cacheHitRatio: 0.5,
    writesPerUserPerDay: 8,
    retentionDays: 3_650,
    redundancyFactor: 2,
  }),
  nodes: [
    node("client", "client", "Desktop & Web", 0, 1),
    node("cdn", "cdn", "Download CDN", 1, 0, { tags: ["downloads"] }),
    node("lb", "load-balancer", "Load Balancer", 1, 1),
    node("api", "api-gateway", "API Gateway", 2, 1),
    node("auth", "auth-service", "Auth Service", 3, 0),
    node("upload", "app-service", "Upload Service", 3, 1),
    node("storage", "object-storage", "Object Store", 4, 0, { riskLevel: "medium" }),
    node("meta", "database", "Metadata DB", 4, 1),
    node("cache", "cache", "Metadata Cache", 4, 2),
    node("mq", "message-queue", "Processing Queue", 3, 2),
    node("worker", "worker", "Scan / Thumbnail", 4, 3),
    node("search", "search-index", "File Search", 5, 2),
  ],
  edges: [
    edge("client", "cdn", "download"),
    edge("cdn", "storage"),
    edge("client", "lb"),
    edge("lb", "api"),
    edge("api", "auth"),
    edge("api", "upload"),
    edge("upload", "storage", "put blob"),
    edge("upload", "meta"),
    edge("upload", "cache"),
    edge("upload", "mq", "post-process"),
    edge("mq", "worker"),
    edge("worker", "storage"),
    edge("upload", "search", "index"),
  ],
};

/* ----------------------------------------------------------------------------
 * 6. Search Engine
 * -------------------------------------------------------------------------- */
const searchEngine: DiagramTemplate = {
  id: "search-engine",
  name: "Search Engine",
  category: "Search",
  tagline: "Query fast, index continuously, rank well.",
  description:
    "A full-text search service. Queries hit an inverted index fronted by a cache, while a continuous indexing pipeline keeps documents fresh by consuming change events from the source of truth.",
  trafficAssumptions: [
    "Read-heavy: queries vastly outnumber document updates.",
    "Query latency is the product — tail latency matters as much as the mean.",
    "Popular queries repeat, making result caching highly effective.",
    "Index freshness has a tolerable lag for most documents.",
  ],
  scalingNotes: [
    "Cache hot query results; invalidate on relevant document changes.",
    "Shard and replicate the index for both capacity and query throughput.",
    "Run indexing off a change-event queue so writes never block reads.",
    "Track query analytics to tune ranking and spot abusive traffic.",
  ],
  knownBottlenecks: [
    "Index nodes under fan-out for broad, low-selectivity queries.",
    "Indexer lag during bulk document imports.",
    "Cache churn from long-tail unique queries.",
  ],
  tradeoffs: [
    "Larger shards improve recall locality but slow recovery and rebalancing.",
    "Near-real-time indexing improves freshness but raises write amplification.",
    "Caching results boosts speed but can serve stale rankings.",
  ],
  loadInputs: load({
    dailyActiveUsers: 10_000_000,
    requestsPerUserPerDay: 25,
    avgPayloadBytes: 2_048,
    peakFactor: 4,
    readRatio: 0.92,
    cacheHitRatio: 0.8,
    writesPerUserPerDay: 1,
    retentionDays: 3_650,
    redundancyFactor: 2,
  }),
  nodes: [
    node("client", "client", "Search Box", 0, 1),
    node("lb", "load-balancer", "Load Balancer", 1, 1),
    node("api", "api-gateway", "API Gateway", 2, 1),
    node("query", "app-service", "Query Service", 3, 1),
    node("index", "search-index", "Inverted Index", 4, 0, { riskLevel: "high" }),
    node("cache", "cache", "Results Cache", 4, 1),
    node("db", "database", "Document Store", 4, 2),
    node("mq", "message-queue", "Change Stream", 3, 3),
    node("indexer", "worker", "Indexer", 4, 3),
    node("analytics", "analytics", "Query Analytics", 5, 1),
  ],
  edges: [
    edge("client", "lb"),
    edge("lb", "api"),
    edge("api", "query"),
    edge("query", "cache", "hot results"),
    edge("query", "index", "search"),
    edge("query", "db", "hydrate"),
    edge("query", "analytics", "log query"),
    edge("db", "mq", "doc changed"),
    edge("mq", "indexer"),
    edge("indexer", "index", "update"),
  ],
};

/* ----------------------------------------------------------------------------
 * 7. Video Streaming
 * -------------------------------------------------------------------------- */
const videoStreaming: DiagramTemplate = {
  id: "video-streaming",
  name: "Video Streaming",
  category: "Media",
  tagline: "Transcode once, stream from the edge forever.",
  description:
    "A YouTube/Netflix-style pipeline. Uploads are transcoded into multiple bitrates by a worker pool, stored once in an origin, and then served overwhelmingly from the CDN edge — the origin and app tier barely see playback traffic.",
  trafficAssumptions: [
    "Bandwidth-dominated: video bytes dwarf every other payload.",
    "Playback is overwhelmingly served from CDN edges, not the origin.",
    "Uploads are rare but extremely expensive (transcoding) compared to reads.",
    "Catalog metadata reads are small, frequent, and cacheable.",
  ],
  scalingNotes: [
    "Transcode asynchronously into adaptive-bitrate renditions via a worker pool.",
    "Serve all segments from the CDN; treat object storage as a cold origin.",
    "Cache catalog/metadata reads to keep the app tier light.",
    "Use a queue to decouple upload spikes from transcoding capacity.",
  ],
  knownBottlenecks: [
    "Transcoder pool throughput and cost during upload bursts.",
    "Origin egress on CDN cache-miss (cold or long-tail content).",
    "Metadata DB during catalog-wide updates.",
  ],
  tradeoffs: [
    "More bitrate renditions improve playback but multiply storage and transcoding cost.",
    "Deep CDN caching cuts origin load but raises storage at the edge.",
    "Pre-transcoding everything wastes compute on never-watched content vs. on-demand lag.",
  ],
  loadInputs: load({
    dailyActiveUsers: 40_000_000,
    requestsPerUserPerDay: 15,
    avgPayloadBytes: 2_000_000,
    peakFactor: 3,
    readRatio: 0.97,
    cacheHitRatio: 0.9,
    writesPerUserPerDay: 1,
    retentionDays: 3_650,
    redundancyFactor: 2,
  }),
  nodes: [
    node("client", "client", "Players", 0, 1),
    node("cdn", "cdn", "Streaming CDN", 1, 0, { tags: ["segments"] }),
    node("lb", "load-balancer", "Load Balancer", 1, 1),
    node("api", "api-gateway", "API Gateway", 2, 1),
    node("stream", "app-service", "Streaming Service", 3, 1),
    node("storage", "object-storage", "Origin Store", 2, 0, { riskLevel: "medium" }),
    node("cache", "cache", "Catalog Cache", 4, 0),
    node("db", "database", "Metadata DB", 4, 1),
    node("mq", "message-queue", "Transcode Queue", 3, 2),
    node("transcoder", "worker", "Transcoder", 4, 2),
    node("analytics", "analytics", "Watch Analytics", 5, 1),
  ],
  edges: [
    edge("client", "cdn", "playback"),
    edge("cdn", "storage", "origin pull"),
    edge("client", "lb"),
    edge("lb", "api"),
    edge("api", "stream"),
    edge("stream", "cache"),
    edge("stream", "db"),
    edge("stream", "analytics"),
    edge("stream", "mq", "new upload"),
    edge("mq", "transcoder"),
    edge("transcoder", "storage", "renditions"),
  ],
};

/* ----------------------------------------------------------------------------
 * 8. Notification System
 * -------------------------------------------------------------------------- */
const notificationSystem: DiagramTemplate = {
  id: "notification-system",
  name: "Notification System",
  category: "Infra",
  tagline: "One event in, many channels out — reliably.",
  description:
    "A multi-channel notification platform. Producer events land on an event bus, get queued per channel, and are delivered by workers through push/email/SMS providers — with retries, rate limits, and observability baked in.",
  trafficAssumptions: [
    "Send-heavy: ingestion is small, but fan-out to channels multiplies work.",
    "Bursty by nature (a single campaign can emit millions of sends).",
    "External providers impose rate limits and variable latency.",
    "Delivery must be reliable and idempotent, with retries on failure.",
  ],
  scalingNotes: [
    "Decouple producers from delivery with an event bus plus per-channel queues.",
    "Scale sender workers per channel; respect provider rate limits with backpressure.",
    "Deduplicate and template using a cache to avoid redundant provider calls.",
    "Instrument everything — delivery rates and failures drive on-call response.",
  ],
  knownBottlenecks: [
    "Provider rate limits capping outbound throughput.",
    "Queue backlog growth during large campaign bursts.",
    "Dedupe/template cache misses amplifying provider load.",
  ],
  tradeoffs: [
    "At-least-once delivery is reliable but requires idempotency keys to avoid duplicates.",
    "Per-channel queues isolate failures but multiply operational surface.",
    "Aggressive batching improves provider efficiency but adds delivery latency.",
  ],
  loadInputs: load({
    dailyActiveUsers: 20_000_000,
    requestsPerUserPerDay: 10,
    avgPayloadBytes: 512,
    peakFactor: 6,
    readRatio: 0.2,
    cacheHitRatio: 0.5,
    writesPerUserPerDay: 10,
    retentionDays: 90,
    redundancyFactor: 2,
  }),
  nodes: [
    node("client", "client", "Producer Apps", 0, 1),
    node("api", "api-gateway", "Notification API", 1, 1),
    node("bus", "event-bus", "Event Bus", 2, 1),
    node("mq", "message-queue", "Channel Queues", 3, 1),
    node("worker", "worker", "Sender Workers", 4, 1),
    node("notif", "notification-service", "Channel Router", 5, 1),
    node("providers", "external-api", "Push / Email / SMS", 6, 1, {
      riskLevel: "high",
    }),
    node("cache", "cache", "Template / Dedupe", 4, 0),
    node("db", "database", "Delivery Log", 4, 2),
    node("monitoring", "monitoring", "Monitoring", 5, 2),
  ],
  edges: [
    edge("client", "api"),
    edge("api", "bus", "publish"),
    edge("bus", "mq", "route"),
    edge("mq", "worker"),
    edge("worker", "cache", "template"),
    edge("worker", "notif"),
    edge("notif", "providers", "deliver"),
    edge("worker", "db", "record"),
    edge("worker", "monitoring", "metrics"),
  ],
};

/* ----------------------------------------------------------------------------
 * Exports
 * -------------------------------------------------------------------------- */

/** All templates in display order. */
export const TEMPLATES: readonly DiagramTemplate[] = [
  urlShortener,
  instagramFeed,
  whatsappChat,
  foodDelivery,
  fileStorage,
  searchEngine,
  videoStreaming,
  notificationSystem,
];

const TEMPLATES_BY_ID: ReadonlyMap<string, DiagramTemplate> = new Map(
  TEMPLATES.map((t) => [t.id, t]),
);

/** Look up a template by id, or `undefined` if unknown. */
export function getTemplate(id: string): DiagramTemplate | undefined {
  return TEMPLATES_BY_ID.get(id);
}
