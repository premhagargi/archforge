import type {
  ArchNode,
  ArchEdge,
  Finding,
  FindingSeverity,
  LoadOutputs,
  ComponentType,
} from "@/lib/types";
import { createId } from "@/lib/utils";

/* ============================================================================
 * Graph helpers — not exported
 * ========================================================================== */

/** Build a forward adjacency list: node id → list of target node ids. */
function adjacency(
  nodes: ArchNode[],
  edges: ArchEdge[],
): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    const targets = adj.get(e.source);
    if (targets) targets.push(e.target);
  }
  return adj;
}

/** Build a reverse adjacency list: node id → list of source node ids. */
function reverseAdj(
  nodes: ArchNode[],
  edges: ArchEdge[],
): Map<string, string[]> {
  const radj = new Map<string, string[]>();
  for (const n of nodes) radj.set(n.id, []);
  for (const e of edges) {
    const sources = radj.get(e.target);
    if (sources) sources.push(e.source);
  }
  return radj;
}

/**
 * BFS reachability from `from` using the provided (forward or reverse)
 * adjacency list. Returns the set of all reachable node ids (including `from`).
 */
function reachable(from: string, adj: Map<string, string[]>): Set<string> {
  const visited = new Set<string>();
  const queue = [from];
  visited.add(from);
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of adj.get(current) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return visited;
}

/**
 * Find articulation points (cut vertices) using Tarjan's DFS algorithm.
 * The directed graph is treated as undirected so that AP detection captures
 * all structural bottlenecks, regardless of edge direction.
 *
 * disc  — DFS discovery time for each node
 * low   — lowest discovery time reachable via back-edges from the subtree
 * parent — DFS tree parent of each node (null for DFS roots)
 */
function articulationPoints(
  nodes: ArchNode[],
  edges: ArchEdge[],
): Set<string> {
  // Build undirected adjacency: each directed edge contributes two entries
  const undirAdj = new Map<string, string[]>();
  for (const n of nodes) undirAdj.set(n.id, []);
  for (const e of edges) {
    undirAdj.get(e.source)?.push(e.target);
    undirAdj.get(e.target)?.push(e.source);
  }

  const disc = new Map<string, number>();
  const low = new Map<string, number>();
  const parent = new Map<string, string | null>();
  const aps = new Set<string>();
  let timer = 0;

  function dfs(u: string): void {
    // Record discovery time and initialize low to self
    disc.set(u, timer);
    low.set(u, timer);
    timer++;
    let childCount = 0;

    for (const v of undirAdj.get(u) ?? []) {
      if (!disc.has(v)) {
        // Tree edge: v is discovered via u
        childCount++;
        parent.set(v, u);
        dfs(v);
        // Pull up the lowest reachable time from v's subtree
        low.set(u, Math.min(low.get(u)!, low.get(v)!));

        // AP rule 1: DFS root with more than one tree child
        if (parent.get(u) === null && childCount > 1) aps.add(u);
        // AP rule 2: non-root where v's subtree cannot reach above u
        if (parent.get(u) !== null && low.get(v)! >= disc.get(u)!)
          aps.add(u);
      } else if (v !== parent.get(u)) {
        // Back edge to an ancestor — update low
        low.set(u, Math.min(low.get(u)!, disc.get(v)!));
      }
    }
  }

  for (const n of nodes) {
    if (!disc.has(n.id)) {
      parent.set(n.id, null); // n.id is a DFS root
      dfs(n.id);
    }
  }

  return aps;
}

/** Filter nodes whose componentType is one of the given types. */
function nodesOfType(
  nodes: ArchNode[],
  ...types: ComponentType[]
): ArchNode[] {
  const typeSet = new Set<ComponentType>(types);
  return nodes.filter((n) => typeSet.has(n.data.componentType));
}

/* ============================================================================
 * Finding factory
 * ========================================================================== */

function makeFinding(
  ruleId: string,
  severity: FindingSeverity,
  title: string,
  explanation: string,
  suggestedFix: string,
  affectedNodeIds: string[],
): Finding {
  return {
    id: createId("finding"),
    ruleId,
    severity,
    title,
    explanation,
    suggestedFix,
    affectedNodeIds,
  };
}

/* ============================================================================
 * Main export
 * ========================================================================== */

/**
 * Evaluate 16 architecture rules against the diagram and optional load model.
 * Returns findings sorted: critical → warning → info.
 */
export function analyzeArchitecture(
  diagram: { nodes: ArchNode[]; edges: ArchEdge[] },
  loadOutputs?: LoadOutputs,
): Finding[] {
  const { nodes, edges } = diagram;
  if (nodes.length === 0) return [];
  const findings: Finding[] = [];

  /* --- Pre-compute node sets used by multiple rules --- */
  const clientNodes = nodesOfType(nodes, "client");
  const dbNodes = nodesOfType(nodes, "database");
  const cacheNodes = nodesOfType(nodes, "cache");
  const replicaNodes = nodesOfType(nodes, "read-replica");
  const lbNodes = nodesOfType(nodes, "load-balancer");
  const workerNodes = nodesOfType(nodes, "worker");
  const queueNodes = nodesOfType(nodes, "message-queue");
  const eventBusNodes = nodesOfType(nodes, "event-bus");
  const monitoringNodes = nodesOfType(nodes, "monitoring");
  const cdnNodes = nodesOfType(nodes, "cdn");
  const objectStorageNodes = nodesOfType(nodes, "object-storage");
  const searchIndexNodes = nodesOfType(nodes, "search-index");
  const appServiceNodes = nodesOfType(nodes, "app-service");
  const microserviceNodes = nodesOfType(nodes, "microservice");

  /* Adjacency lists shared across rules */
  const fullAdj = adjacency(nodes, edges);
  // reverseAdj is defined for completeness and available to rules that need it
  void reverseAdj(nodes, edges);

  /* ========================================================================
   * CRITICAL — 3 rules
   * ====================================================================== */

  /* Rule 1 — db-exposed
   * Any edge where the source is a client and the target is a database. */
  for (const edge of edges) {
    const src = nodes.find((n) => n.id === edge.source);
    const tgt = nodes.find((n) => n.id === edge.target);
    if (
      src?.data.componentType === "client" &&
      tgt?.data.componentType === "database"
    ) {
      findings.push(
        makeFinding(
          "db-exposed",
          "critical",
          "Database directly exposed to client",
          "A client node connects directly to a database, bypassing service and gateway layers. This exposes raw data access and bypasses all business logic, auth, and rate limiting.",
          "Route all database access through an app service or API gateway.",
          [src.id, tgt.id],
        ),
      );
    }
  }

  /* Rule 2 — spof
   * Articulation points whose removal disconnects any client from any
   * database, cache, or read-replica node. */
  const aps = articulationPoints(nodes, edges);
  const dataStoreNodes = nodesOfType(nodes, "database", "cache", "read-replica");

  for (const apId of aps) {
    if (clientNodes.length === 0 || dataStoreNodes.length === 0) break;

    // Rebuild adjacency without the candidate AP
    const filteredNodes = nodes.filter((n) => n.id !== apId);
    const filteredEdges = edges.filter(
      (e) => e.source !== apId && e.target !== apId,
    );
    const reducedAdj = adjacency(filteredNodes, filteredEdges);

    let isSpof = false;
    outer: for (const client of clientNodes) {
      if (client.id === apId) continue;
      const reachableWithAP = reachable(client.id, fullAdj);
      const reachableWithoutAP = reachable(client.id, reducedAdj);
      for (const ds of dataStoreNodes) {
        if (ds.id === apId) continue;
        // AP removal disconnects this client→data-store path
        if (reachableWithAP.has(ds.id) && !reachableWithoutAP.has(ds.id)) {
          isSpof = true;
          break outer;
        }
      }
    }

    if (isSpof) {
      findings.push(
        makeFinding(
          "spof",
          "critical",
          "Single point of failure",
          "This node sits on every path from clients to data stores. If it fails, the entire system becomes unavailable.",
          "Add redundant instances or bypass paths. Consider a load balancer to distribute traffic.",
          [apId],
        ),
      );
    }
  }

  /* Rule 3 — availability-risk
   * Database present but no load balancer AND no read replica. */
  if (
    dbNodes.length > 0 &&
    lbNodes.length === 0 &&
    replicaNodes.length === 0
  ) {
    findings.push(
      makeFinding(
        "availability-risk",
        "critical",
        "No high-availability setup",
        "The architecture has a primary database but no load balancer or read replica. A single database failure brings the system down.",
        "Add a load balancer before app servers and read replicas for the database.",
        dbNodes.map((n) => n.id),
      ),
    );
  }

  /* ========================================================================
   * WARNING — 10 rules
   * ====================================================================== */

  /* Rule 4 — no-lb */
  if (clientNodes.length > 0 && lbNodes.length === 0) {
    findings.push(
      makeFinding(
        "no-lb",
        "warning",
        "No load balancer",
        "Without a load balancer, traffic cannot be distributed and failover is manual.",
        "Add a load balancer between client and app servers.",
        clientNodes.map((n) => n.id),
      ),
    );
  }

  /* Rule 5 — no-cache */
  if (dbNodes.length > 0 && cacheNodes.length === 0) {
    findings.push(
      makeFinding(
        "no-cache",
        "warning",
        "No caching layer",
        "Every read hits the primary database. A cache absorbs the majority of read traffic at low cost.",
        "Add a Redis or Memcached cache in front of the database.",
        dbNodes.map((n) => n.id),
      ),
    );
  }

  /* Rule 6 — worker-no-queue */
  if (
    workerNodes.length > 0 &&
    queueNodes.length === 0 &&
    eventBusNodes.length === 0
  ) {
    findings.push(
      makeFinding(
        "worker-no-queue",
        "warning",
        "Worker without a queue",
        "Workers without a queue have no backpressure mechanism. Load spikes overwhelm workers directly.",
        "Add a message queue between producers and workers.",
        workerNodes.map((n) => n.id),
      ),
    );
  }

  /* Rule 7 — no-replicas: DB load > 1k RPS but no read replicas */
  if (
    loadOutputs &&
    loadOutputs.dbLoadRps > 1_000 &&
    dbNodes.length > 0 &&
    replicaNodes.length === 0
  ) {
    findings.push(
      makeFinding(
        "no-replicas",
        "warning",
        "Read-heavy load without read replicas",
        "DB load exceeds 1k RPS with no read replicas. The primary database will become a bottleneck.",
        "Add read replicas to distribute query load.",
        dbNodes.map((n) => n.id),
      ),
    );
  }

  /* Rule 8 — db-bottleneck: effective DB load exceeds 2k RPS */
  if (loadOutputs && loadOutputs.dbLoadRps > 2_000) {
    findings.push(
      makeFinding(
        "db-bottleneck",
        "warning",
        "Database bottleneck risk",
        "Effective DB load at peak exceeds 2,000 RPS — near the typical single-node limit.",
        "Add read replicas and increase cache hit ratio. Consider sharding for write-heavy load.",
        dbNodes.map((n) => n.id),
      ),
    );
  }

  /* Rule 9 — high-write
   * Proxy for write load: dbLoadRps − cacheSavingsRps approximates the write
   * + cache-miss read pressure that cannot be absorbed by replicas alone. */
  if (
    loadOutputs &&
    dbNodes.length > 0 &&
    loadOutputs.dbLoadRps - loadOutputs.cacheSavingsRps > 1_000
  ) {
    findings.push(
      makeFinding(
        "high-write",
        "warning",
        "High write load on database",
        "Write throughput is high enough to pressure the primary database.",
        "Consider write-optimized storage, a message queue to buffer writes, or sharding.",
        dbNodes.map((n) => n.id),
      ),
    );
  }

  /* Rule 10 — cache-no-db */
  if (
    cacheNodes.length > 0 &&
    dbNodes.length === 0 &&
    replicaNodes.length === 0
  ) {
    findings.push(
      makeFinding(
        "cache-no-db",
        "warning",
        "Cache with no backing store",
        "A cache without a backing store has no fallback on cold start or eviction.",
        "Add a database that the cache reads through on miss.",
        cacheNodes.map((n) => n.id),
      ),
    );
  }

  /* Rule 11 — scaling-risk: estimated server count exceeds 10 */
  if (loadOutputs && loadOutputs.suggestedServers > 10) {
    findings.push(
      makeFinding(
        "scaling-risk",
        "warning",
        "Large server footprint",
        "The estimated server count suggests significant infrastructure complexity.",
        "Plan auto-scaling groups, container orchestration, and capacity reservations.",
        [],
      ),
    );
  }

  /* Rule 12 — no-search
   * Any node with a tag or name containing "search" but no search-index node. */
  const searchImpliedNodes = nodes.filter(
    (n) =>
      n.data.tags.some((t) => t.toLowerCase().includes("search")) ||
      n.data.name.toLowerCase().includes("search"),
  );
  if (searchImpliedNodes.length > 0 && searchIndexNodes.length === 0) {
    findings.push(
      makeFinding(
        "no-search",
        "warning",
        "Search capability implied but no search index",
        "Nodes suggest search functionality but there is no dedicated search index.",
        "Add a search index (Elasticsearch, OpenSearch, or Typesense) for full-text search.",
        searchImpliedNodes.map((n) => n.id),
      ),
    );
  }

  /* Rule 13 — missing-write-queue
   * App or microservice present, DB load > 500 RPS, no queue or event bus. */
  const appOrMicroNodes = [...appServiceNodes, ...microserviceNodes];
  if (
    appOrMicroNodes.length > 0 &&
    loadOutputs &&
    loadOutputs.dbLoadRps > 500 &&
    queueNodes.length === 0 &&
    eventBusNodes.length === 0
  ) {
    findings.push(
      makeFinding(
        "missing-write-queue",
        "warning",
        "High-traffic write path without a queue",
        "Write traffic is significant but there is no message queue to buffer and smooth it.",
        "Add a message queue between the app tier and the database write path.",
        appOrMicroNodes.map((n) => n.id),
      ),
    );
  }

  /* ========================================================================
   * INFO — 3 rules
   * ====================================================================== */

  /* Rule 14 — no-monitoring */
  if (monitoringNodes.length === 0) {
    findings.push(
      makeFinding(
        "no-monitoring",
        "info",
        "No monitoring",
        "Without a monitoring node, incidents will go undetected until users report them.",
        "Add a monitoring node (Datadog, Prometheus/Grafana, CloudWatch).",
        [],
      ),
    );
  }

  /* Rule 15 — no-cdn */
  if (clientNodes.length > 0 && cdnNodes.length === 0) {
    findings.push(
      makeFinding(
        "no-cdn",
        "info",
        "No CDN",
        "Without a CDN, static assets are served from origin, increasing latency and origin load.",
        "Add a CDN to cache and serve static assets close to users.",
        clientNodes.map((n) => n.id),
      ),
    );
  }

  /* Rule 16 — no-object-storage
   * Any node with a tag containing "media", "file", or "storage" but no
   * object-storage node present. */
  const mediaKeywords = ["media", "file", "storage"];
  const mediaImpliedNodes = nodes.filter((n) =>
    n.data.tags.some((t) =>
      mediaKeywords.some((kw) => t.toLowerCase().includes(kw)),
    ),
  );
  if (mediaImpliedNodes.length > 0 && objectStorageNodes.length === 0) {
    findings.push(
      makeFinding(
        "no-object-storage",
        "info",
        "No object storage for media",
        "Nodes suggest media or file handling but no object storage is present.",
        "Add object storage (S3-compatible) for binary file storage.",
        mediaImpliedNodes.map((n) => n.id),
      ),
    );
  }

  /* ========================================================================
   * Sort: critical first, then warning, then info
   * ====================================================================== */
  const severityOrder: Record<FindingSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  findings.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  return findings;
}
