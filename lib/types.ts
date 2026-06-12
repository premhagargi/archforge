import { z } from "zod";
import type { LucideIcon } from "lucide-react";

/* ============================================================================
 * ArchForge domain model
 *
 * Zod schemas are the single source of truth: every persisted / imported /
 * API-transferred shape is validated against a schema here, and the matching
 * TypeScript types are derived with `z.infer`. Static catalog data (icons,
 * simulation profiles) that never crosses a trust boundary is typed directly.
 * ========================================================================== */

/* ----------------------------------------------------------------------------
 * Enumerations
 * -------------------------------------------------------------------------- */

/** The 20 distributed-system building blocks ArchForge can model. */
export const COMPONENT_TYPES = [
  "client",
  "cdn",
  "load-balancer",
  "api-gateway",
  "auth-service",
  "app-service",
  "microservice",
  "database",
  "read-replica",
  "cache",
  "message-queue",
  "worker",
  "object-storage",
  "search-index",
  "notification-service",
  "monitoring",
  "analytics",
  "external-api",
  "ai-service",
  "event-bus",
] as const;

export const ComponentTypeSchema = z.enum(COMPONENT_TYPES);
export type ComponentType = z.infer<typeof ComponentTypeSchema>;

/** Palette groupings — also drives section headers in the component palette. */
export const COMPONENT_CATEGORIES = [
  "Traffic",
  "Compute",
  "Data",
  "Messaging",
  "Observability",
  "External",
] as const;

export const ComponentCategorySchema = z.enum(COMPONENT_CATEGORIES);
export type ComponentCategory = z.infer<typeof ComponentCategorySchema>;

export const RiskLevelSchema = z.enum(["low", "medium", "high"]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const FindingSeveritySchema = z.enum(["critical", "warning", "info"]);
export type FindingSeverity = z.infer<typeof FindingSeveritySchema>;

/** How a component's per-request service time is distributed in the simulator. */
export const ServiceTimeDistributionSchema = z.enum([
  "exponential", // memoryless; classic M/M/c queueing model
  "normal", // bounded jitter around a mean (truncated at 0)
  "deterministic", // fixed service time (M/D/c)
]);
export type ServiceTimeDistribution = z.infer<
  typeof ServiceTimeDistributionSchema
>;

/** Database scaling recommendation emitted by the load calculator. */
export const DB_SCALING_STRATEGIES = [
  "single-primary",
  "primary-with-replicas",
  "vertical-and-replicas",
  "sharded",
] as const;
export const DbScalingStrategySchema = z.enum(DB_SCALING_STRATEGIES);
export type DbScalingStrategy = z.infer<typeof DbScalingStrategySchema>;

/* ----------------------------------------------------------------------------
 * Simulation profile (static catalog data — typed, not schema-validated)
 *
 * Each catalog entry carries the parameters the discrete-event engine needs to
 * treat the node as a queueing station: a service-time distribution, a number
 * of parallel servers `c`, a base failure rate, and a bounded queue capacity.
 * -------------------------------------------------------------------------- */

export interface ServiceTime {
  /** Shape of the per-request processing-time distribution. */
  readonly distribution: ServiceTimeDistribution;
  /** Mean service time in milliseconds. */
  readonly meanMs: number;
  /** Standard deviation in ms (used by the `normal` distribution). */
  readonly stdDevMs?: number;
}

export interface ComponentSimProfile {
  /** Service-time distribution for one request at this node. */
  readonly serviceTime: ServiceTime;
  /** Number of parallel servers / workers (`c` in M/M/c). */
  readonly servers: number;
  /** Baseline probability a request fails at this node (0–1). */
  readonly failureRate: number;
  /** Max requests that can wait in this node's queue before drops occur. */
  readonly queueCapacity: number;
  /**
   * Relative share of incoming traffic this node forwards to each downstream
   * edge. Routing in the engine normalizes across a node's out-edges; this is
   * a hint for fan-out vs. single-path components (1 = forward all).
   */
  readonly routingFanout: number;
}

/* ----------------------------------------------------------------------------
 * Component catalog entry (static)
 * -------------------------------------------------------------------------- */

export interface ComponentCatalogEntry {
  readonly type: ComponentType;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly category: ComponentCategory;
  /** Short, human description shown in palette tooltips and node cards. */
  readonly description: string;
  /** Default capacity label seeded into new nodes (e.g. "~1k rps / instance"). */
  readonly defaultCapacity: string;
  readonly defaultRiskLevel: RiskLevel;
  readonly simulation: ComponentSimProfile;
}

/* ----------------------------------------------------------------------------
 * Node + edge model (React Flow compatible, persistence-safe subset)
 * -------------------------------------------------------------------------- */

export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type Position = z.infer<typeof PositionSchema>;

/** The editable payload carried by every architecture node. */
export const ArchNodeDataSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(280).default(""),
  componentType: ComponentTypeSchema,
  riskLevel: RiskLevelSchema.default("low"),
  /** Free-text capacity estimate, e.g. "10k rps", "500 GB". */
  estimatedCapacity: z.string().max(60).default(""),
  /** Longer engineering notes surfaced in the generated design doc. */
  notes: z.string().max(2000).default(""),
  tags: z.array(z.string().min(1).max(40)).default([]),
  /** Arbitrary user key/value metadata rendered in the inspector + doc. */
  customMetadata: z.record(z.string(), z.string()).default({}),
});
export type ArchNodeData = z.infer<typeof ArchNodeDataSchema>;

/**
 * Persisted node shape. Structurally a subset of React Flow's `Node<ArchNodeData>`
 * — runtime-only fields (`selected`, `dragging`, measured size) are omitted so
 * diagrams round-trip cleanly through storage and import/export.
 */
export const ArchNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("archNode").default("archNode"),
  position: PositionSchema,
  data: ArchNodeDataSchema,
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
});
export type ArchNode = z.infer<typeof ArchNodeSchema>;

/** Persisted edge shape — a subset of React Flow's `Edge`. */
export const ArchEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().nullish(),
  targetHandle: z.string().nullish(),
  type: z.string().default("smoothstep"),
  label: z.string().optional(),
  animated: z.boolean().optional(),
});
export type ArchEdge = z.infer<typeof ArchEdgeSchema>;

/* ----------------------------------------------------------------------------
 * Load model — 9 inputs feeding the closed-form calculator
 * -------------------------------------------------------------------------- */

export const LoadInputsSchema = z.object({
  /** Daily Active Users. */
  dailyActiveUsers: z.number().int().nonnegative().default(100_000),
  /** Average read+write requests issued per user per day. */
  requestsPerUserPerDay: z.number().nonnegative().default(50),
  /** Average payload size per request, in bytes. */
  avgPayloadBytes: z.number().nonnegative().default(2_048),
  /** Peak-to-average traffic multiplier (diurnal spikes). */
  peakFactor: z.number().min(1).max(20).default(3),
  /** Share of requests that are reads (writeRatio = 1 − readRatio). */
  readRatio: z.number().min(0).max(1).default(0.8),
  /** Fraction of reads served from cache (0–1). */
  cacheHitRatio: z.number().min(0).max(1).default(0.7),
  /** Average durable writes per user per day (drives storage growth). */
  writesPerUserPerDay: z.number().nonnegative().default(5),
  /** How long written data is retained, in days. */
  retentionDays: z.number().int().positive().default(365),
  /** Redundancy multiplier applied to the suggested server count (N+x). */
  redundancyFactor: z.number().min(1).max(5).default(1.5),
});
export type LoadInputs = z.infer<typeof LoadInputsSchema>;

/** 11 headline outputs (+ a categorical DB scaling strategy). */
export interface LoadOutputs {
  requestsPerDay: number;
  requestsPerHour: number;
  requestsPerMinute: number;
  averageRps: number;
  peakRps: number;
  /** Peak egress bandwidth in bytes/sec. */
  peakBandwidthBytesPerSec: number;
  bandwidthPerDayBytes: number;
  storageGrowthPerDayBytes: number;
  retentionStorageBytes: number;
  /** Effective DB request rate after cache absorption, at peak. */
  dbLoadRps: number;
  /** Read RPS removed from the DB by the cache, at peak. */
  cacheSavingsRps: number;
  suggestedServers: number;
  dbScalingStrategy: DbScalingStrategy;
}

/* ----------------------------------------------------------------------------
 * Architecture-review finding
 * -------------------------------------------------------------------------- */

export const FindingSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  severity: FindingSeveritySchema,
  title: z.string(),
  explanation: z.string(),
  suggestedFix: z.string(),
  affectedNodeIds: z.array(z.string()).default([]),
});
export type Finding = z.infer<typeof FindingSchema>;

/* ----------------------------------------------------------------------------
 * Diagram + versioned storage envelope
 * -------------------------------------------------------------------------- */

export const DiagramSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  nodes: z.array(ArchNodeSchema),
  edges: z.array(ArchEdgeSchema),
  loadInputs: LoadInputsSchema,
  createdAt: z.string(), // ISO-8601
  updatedAt: z.string(), // ISO-8601
});
export type Diagram = z.infer<typeof DiagramSchema>;

/**
 * What actually lands in localStorage / `.data/*.json`. The `schemaVersion`
 * lets `storage.ts` migrate or reject incompatible payloads.
 */
export const StorageEnvelopeSchema = z.object({
  schemaVersion: z.number().int().positive(),
  savedAt: z.string(),
  diagram: DiagramSchema,
});
export type StorageEnvelope = z.infer<typeof StorageEnvelopeSchema>;

/* ----------------------------------------------------------------------------
 * Template metadata (Phase 2 `lib/templates.ts`)
 * -------------------------------------------------------------------------- */

export interface DiagramTemplate {
  readonly id: string;
  readonly name: string;
  /** Short domain label for cards, e.g. "Links", "Social", "Messaging". */
  readonly category: string;
  readonly tagline: string;
  readonly description: string;
  /** Real-world traffic assumptions narrated in the example walkthroughs. */
  readonly trafficAssumptions: readonly string[];
  readonly scalingNotes: readonly string[];
  readonly knownBottlenecks: readonly string[];
  readonly tradeoffs: readonly string[];
  readonly loadInputs: LoadInputs;
  readonly nodes: readonly ArchNode[];
  readonly edges: readonly ArchEdge[];
}
