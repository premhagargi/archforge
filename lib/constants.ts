import {
  Activity,
  BarChart3,
  Bell,
  Boxes,
  Cog,
  Database,
  DatabaseZap,
  Globe,
  HardDrive,
  ListOrdered,
  MonitorSmartphone,
  Network,
  Plug,
  Radio,
  Scale,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import {
  COMPONENT_CATEGORIES,
  LoadInputsSchema,
  type ComponentCatalogEntry,
  type ComponentCategory,
  type ComponentType,
  type LoadInputs,
} from "./types";

/* ============================================================================
 * Storage + schema
 * ========================================================================== */

/** Bump when a persisted shape changes incompatibly (see `storage.ts`). */
export const SCHEMA_VERSION = 1;

export const STORAGE_KEYS = {
  /** The diagram currently open in the editor (autosaved). */
  currentDiagram: "archforge:current-diagram",
  /** Index of locally saved diagrams (id → name/updatedAt). */
  diagramIndex: "archforge:diagram-index",
  /** Per-diagram saved payloads, suffixed with the diagram id. */
  diagramPrefix: "archforge:diagram:",
  /** UI preferences (last template, panel sizes, etc.). */
  preferences: "archforge:preferences",
} as const;

/* ============================================================================
 * Load-calculator constants (consumed by lib/load-calculator.ts, Phase 2)
 * ========================================================================== */

/** Rough sustained request throughput a single app server handles. */
export const RPS_PER_SERVER = 1_000;

/** Bytes <-> bits, kept explicit so bandwidth math reads clearly. */
export const BITS_PER_BYTE = 8;

/** Seconds in a day — request-rate denominators. */
export const SECONDS_PER_DAY = 86_400;

/**
 * DB scaling-strategy thresholds keyed off effective DB load (RPS at peak).
 * Each entry is the *upper* bound (exclusive) for that strategy.
 */
export const DB_SCALING_THRESHOLDS = {
  /** ≤ this → a single primary copes. */
  singlePrimaryMaxRps: 2_000,
  /** ≤ this → primary + read replicas. */
  replicasMaxRps: 8_000,
  /** ≤ this → vertical scale-up + replicas. */
  verticalMaxRps: 20_000,
  /** Above `verticalMaxRps` → horizontal sharding required. */
} as const;

/* ============================================================================
 * Default inputs
 * ========================================================================== */

/** Calculator seed values — all fields resolved from the schema defaults. */
export const DEFAULT_LOAD_INPUTS: LoadInputs = LoadInputsSchema.parse({});

/* ============================================================================
 * Component catalog — the single source of truth for the 20 component types.
 *
 * Each entry drives the palette, the node card, the simulator (service-time
 * distribution + servers + failure rate + queue capacity), and the doc gen.
 * Service times and parallelism are deliberately *opinionated but defensible*:
 * data stores have low parallelism (bottleneck-prone), edge/cache layers are
 * fast and highly parallel, AI + external calls are slow with high variance.
 * ========================================================================== */

export const COMPONENT_CATALOG: Record<ComponentType, ComponentCatalogEntry> = {
  client: {
    type: "client",
    label: "Client",
    icon: MonitorSmartphone,
    category: "Traffic",
    description: "End-user web or mobile app that originates requests.",
    defaultCapacity: "traffic source",
    defaultRiskLevel: "low",
    simulation: {
      serviceTime: { distribution: "deterministic", meanMs: 0 },
      servers: 1_000,
      failureRate: 0,
      queueCapacity: 1_000_000,
      routingFanout: 1,
    },
  },
  cdn: {
    type: "cdn",
    label: "CDN",
    icon: Globe,
    category: "Traffic",
    description: "Edge cache for static assets, close to users.",
    defaultCapacity: "~50k rps / pop",
    defaultRiskLevel: "low",
    simulation: {
      serviceTime: { distribution: "exponential", meanMs: 5 },
      servers: 64,
      failureRate: 0.001,
      queueCapacity: 50_000,
      routingFanout: 1,
    },
  },
  "load-balancer": {
    type: "load-balancer",
    label: "Load Balancer",
    icon: Scale,
    category: "Traffic",
    description: "Distributes traffic across healthy backends.",
    defaultCapacity: "~20k rps",
    defaultRiskLevel: "medium",
    simulation: {
      serviceTime: { distribution: "deterministic", meanMs: 1 },
      servers: 16,
      failureRate: 0.0005,
      queueCapacity: 40_000,
      routingFanout: 1,
    },
  },
  "api-gateway": {
    type: "api-gateway",
    label: "API Gateway",
    icon: Network,
    category: "Traffic",
    description: "Single entry point: routing, auth, rate limiting.",
    defaultCapacity: "~10k rps",
    defaultRiskLevel: "medium",
    simulation: {
      serviceTime: { distribution: "exponential", meanMs: 5 },
      servers: 16,
      failureRate: 0.001,
      queueCapacity: 20_000,
      routingFanout: 1,
    },
  },
  "auth-service": {
    type: "auth-service",
    label: "Auth Service",
    icon: ShieldCheck,
    category: "Compute",
    description: "Issues and verifies sessions, tokens, and permissions.",
    defaultCapacity: "~5k rps",
    defaultRiskLevel: "medium",
    simulation: {
      serviceTime: { distribution: "exponential", meanMs: 20 },
      servers: 8,
      failureRate: 0.002,
      queueCapacity: 8_000,
      routingFanout: 1,
    },
  },
  "app-service": {
    type: "app-service",
    label: "App Service",
    icon: Server,
    category: "Compute",
    description: "Monolithic or primary application server.",
    defaultCapacity: "~1k rps / instance",
    defaultRiskLevel: "medium",
    simulation: {
      serviceTime: { distribution: "exponential", meanMs: 40 },
      servers: 8,
      failureRate: 0.003,
      queueCapacity: 6_000,
      routingFanout: 1,
    },
  },
  microservice: {
    type: "microservice",
    label: "Microservice",
    icon: Boxes,
    category: "Compute",
    description: "Independently deployable bounded-context service.",
    defaultCapacity: "~1k rps / instance",
    defaultRiskLevel: "medium",
    simulation: {
      serviceTime: { distribution: "exponential", meanMs: 30 },
      servers: 6,
      failureRate: 0.003,
      queueCapacity: 5_000,
      routingFanout: 1,
    },
  },
  database: {
    type: "database",
    label: "Database",
    icon: Database,
    category: "Data",
    description: "Primary system of record (relational or document).",
    defaultCapacity: "~3k qps (primary)",
    defaultRiskLevel: "high",
    simulation: {
      // Low parallelism on purpose: the primary is the classic bottleneck.
      serviceTime: { distribution: "exponential", meanMs: 12 },
      servers: 2,
      failureRate: 0.002,
      queueCapacity: 2_000,
      routingFanout: 1,
    },
  },
  "read-replica": {
    type: "read-replica",
    label: "Read Replica",
    icon: DatabaseZap,
    category: "Data",
    description: "Asynchronously replicated read-only DB copy.",
    defaultCapacity: "~5k qps reads",
    defaultRiskLevel: "medium",
    simulation: {
      serviceTime: { distribution: "exponential", meanMs: 10 },
      servers: 3,
      failureRate: 0.002,
      queueCapacity: 3_000,
      routingFanout: 1,
    },
  },
  cache: {
    type: "cache",
    label: "Cache",
    icon: Zap,
    category: "Data",
    description: "In-memory key/value store (Redis / Memcached).",
    defaultCapacity: "~100k ops/s",
    defaultRiskLevel: "low",
    simulation: {
      serviceTime: { distribution: "exponential", meanMs: 2 },
      servers: 16,
      failureRate: 0.0005,
      queueCapacity: 20_000,
      routingFanout: 1,
    },
  },
  "message-queue": {
    type: "message-queue",
    label: "Message Queue",
    icon: ListOrdered,
    category: "Messaging",
    description: "Durable buffer decoupling producers from consumers.",
    defaultCapacity: "~50k msg/s",
    defaultRiskLevel: "low",
    simulation: {
      serviceTime: { distribution: "exponential", meanMs: 3 },
      servers: 8,
      failureRate: 0.0005,
      // Queues exist to absorb backpressure — very deep buffer.
      queueCapacity: 500_000,
      routingFanout: 1,
    },
  },
  worker: {
    type: "worker",
    label: "Worker",
    icon: Cog,
    category: "Compute",
    description: "Async/background job processor consuming a queue.",
    defaultCapacity: "~200 jobs/s / worker",
    defaultRiskLevel: "medium",
    simulation: {
      serviceTime: { distribution: "exponential", meanMs: 100 },
      servers: 4,
      failureRate: 0.005,
      queueCapacity: 20_000,
      routingFanout: 1,
    },
  },
  "object-storage": {
    type: "object-storage",
    label: "Object Storage",
    icon: HardDrive,
    category: "Data",
    description: "Blob store for media and large files (S3-like).",
    defaultCapacity: "~10k req/s",
    defaultRiskLevel: "low",
    simulation: {
      serviceTime: { distribution: "exponential", meanMs: 30 },
      servers: 32,
      failureRate: 0.001,
      queueCapacity: 20_000,
      routingFanout: 1,
    },
  },
  "search-index": {
    type: "search-index",
    label: "Search Index",
    icon: Search,
    category: "Data",
    description: "Inverted-index search engine (Elasticsearch-like).",
    defaultCapacity: "~2k queries/s",
    defaultRiskLevel: "medium",
    simulation: {
      serviceTime: { distribution: "exponential", meanMs: 25 },
      servers: 6,
      failureRate: 0.002,
      queueCapacity: 4_000,
      routingFanout: 1,
    },
  },
  "notification-service": {
    type: "notification-service",
    label: "Notification Service",
    icon: Bell,
    category: "Messaging",
    description: "Fans out push, email, and SMS notifications.",
    defaultCapacity: "~5k sends/s",
    defaultRiskLevel: "medium",
    simulation: {
      // Bound to third-party delivery: slower + flakier than internal calls.
      serviceTime: { distribution: "normal", meanMs: 50, stdDevMs: 25 },
      servers: 6,
      failureRate: 0.01,
      queueCapacity: 10_000,
      routingFanout: 1,
    },
  },
  monitoring: {
    type: "monitoring",
    label: "Monitoring",
    icon: Activity,
    category: "Observability",
    description: "Metrics, logs, traces, and alerting.",
    defaultCapacity: "high-ingest",
    defaultRiskLevel: "low",
    simulation: {
      serviceTime: { distribution: "exponential", meanMs: 10 },
      servers: 8,
      failureRate: 0.001,
      queueCapacity: 50_000,
      routingFanout: 1,
    },
  },
  analytics: {
    type: "analytics",
    label: "Analytics",
    icon: BarChart3,
    category: "Observability",
    description: "Event pipeline + warehouse for product analytics.",
    defaultCapacity: "batch / streaming",
    defaultRiskLevel: "low",
    simulation: {
      serviceTime: { distribution: "exponential", meanMs: 80 },
      servers: 6,
      failureRate: 0.002,
      queueCapacity: 50_000,
      routingFanout: 1,
    },
  },
  "external-api": {
    type: "external-api",
    label: "External API",
    icon: Plug,
    category: "External",
    description: "Third-party dependency (payments, maps, etc.).",
    defaultCapacity: "rate-limited",
    defaultRiskLevel: "high",
    simulation: {
      // Network + vendor variability: slow mean, fat tail, higher failures.
      serviceTime: { distribution: "normal", meanMs: 120, stdDevMs: 60 },
      servers: 8,
      failureRate: 0.02,
      queueCapacity: 2_000,
      routingFanout: 1,
    },
  },
  "ai-service": {
    type: "ai-service",
    label: "AI Service",
    icon: Sparkles,
    category: "Compute",
    description: "Model inference / embedding endpoint.",
    defaultCapacity: "~50 req/s / replica",
    defaultRiskLevel: "high",
    simulation: {
      // Inference is the slowest station with limited parallelism.
      serviceTime: { distribution: "normal", meanMs: 400, stdDevMs: 150 },
      servers: 4,
      failureRate: 0.01,
      queueCapacity: 1_000,
      routingFanout: 1,
    },
  },
  "event-bus": {
    type: "event-bus",
    label: "Event Bus",
    icon: Radio,
    category: "Messaging",
    description: "Pub/sub backbone for event-driven fan-out (Kafka-like).",
    defaultCapacity: "~100k events/s",
    defaultRiskLevel: "low",
    simulation: {
      serviceTime: { distribution: "exponential", meanMs: 2 },
      servers: 16,
      failureRate: 0.0005,
      queueCapacity: 500_000,
      // Pub/sub: forwards each event to every subscriber.
      routingFanout: 2,
    },
  },
};

/** Catalog as an ordered array (palette + iteration order). */
export const COMPONENT_LIST: ComponentCatalogEntry[] =
  Object.values(COMPONENT_CATALOG);

/** Catalog grouped by category, in canonical category order. */
export const CATALOG_BY_CATEGORY: {
  category: ComponentCategory;
  components: ComponentCatalogEntry[];
}[] = COMPONENT_CATEGORIES.map((category) => ({
  category,
  components: COMPONENT_LIST.filter((c) => c.category === category),
}));

/** O(1) catalog lookup with a typed return. */
export function getCatalogEntry(type: ComponentType): ComponentCatalogEntry {
  return COMPONENT_CATALOG[type];
}
