import type { ArchNode, ArchEdge, LoadOutputs, Finding } from "@/lib/types";
import { formatBytes, formatCompact } from "@/lib/utils";

/* ============================================================================
 * Internal helpers
 * ========================================================================== */

/**
 * Produce a Mermaid flowchart node declaration that encodes the component type
 * via shape conventions:
 *   client / cdn          → ([name])  stadium / pill
 *   load-balancer         → {name}    rhombus
 *   database / cache /
 *   read-replica /
 *   object-storage        → [(name)]  cylinder
 *   everything else       → [name]    rectangle
 */
function mermaidShape(node: ArchNode): string {
  // Strip characters that break Mermaid shape syntax
  const name = node.data.name.replace(/[\[\]{}"]/g, " ").trim();
  switch (node.data.componentType) {
    case "client":
    case "cdn":
      return `  ${node.id}([${name}])`;
    case "load-balancer":
      return `  ${node.id}{${name}}`;
    case "database":
    case "cache":
    case "read-replica":
    case "object-storage":
      return `  ${node.id}[(${name})]`;
    default:
      return `  ${node.id}[${name}]`;
  }
}

/* ============================================================================
 * Main export
 * ========================================================================== */

/**
 * Generate a complete 16-section Markdown design document for an architecture
 * diagram. Every sentence is derived from actual diagram data — no
 * placeholder text is emitted.
 *
 * @param diagram      Diagram name plus its nodes and edges.
 * @param loadOutputs  Optional computed load metrics (from calculateLoad).
 * @param findings     Optional list of architecture findings (from analyzeArchitecture).
 */
export function generateDesignDoc(
  diagram: { name: string; nodes: ArchNode[]; edges: ArchEdge[] },
  loadOutputs?: LoadOutputs,
  findings?: Finding[],
): string {
  const { name, nodes, edges } = diagram;
  const today = new Date().toISOString().slice(0, 10);

  /* --- Pre-compute node sets used across multiple sections --- */
  const clientNodes = nodes.filter((n) => n.data.componentType === "client");
  const dbNodes = nodes.filter((n) => n.data.componentType === "database");
  const cacheNodes = nodes.filter((n) => n.data.componentType === "cache");
  const replicaNodes = nodes.filter(
    (n) => n.data.componentType === "read-replica",
  );
  const lbNodes = nodes.filter((n) => n.data.componentType === "load-balancer");
  const workerNodes = nodes.filter((n) => n.data.componentType === "worker");
  const monNodes = nodes.filter((n) => n.data.componentType === "monitoring");
  const authNodes = nodes.filter(
    (n) => n.data.componentType === "auth-service",
  );
  const gatewayNodes = nodes.filter(
    (n) => n.data.componentType === "api-gateway",
  );
  const appServiceNodes = nodes.filter(
    (n) => n.data.componentType === "app-service",
  );
  const microserviceNodes = nodes.filter(
    (n) => n.data.componentType === "microservice",
  );
  const DATA_NODE_TYPES = new Set([
    "database",
    "cache",
    "read-replica",
    "object-storage",
    "search-index",
  ]);
  const dataNodes = nodes.filter((n) =>
    DATA_NODE_TYPES.has(n.data.componentType),
  );

  const criticalFindings = findings?.filter((f) => f.severity === "critical") ?? [];
  const warningFindings = findings?.filter((f) => f.severity === "warning") ?? [];

  /* Build forward adjacency and node lookup for request-flow tracing */
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) adj.get(e.source)?.push(e.target);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const lines: string[] = [];

  /* ==========================================================================
   * 1. Title
   * ======================================================================== */
  lines.push(`# ${name} — System Design`);
  lines.push(``);
  lines.push(`_Generated on ${today}_`);
  lines.push(``);

  /* ==========================================================================
   * 2. Executive Summary
   * ======================================================================== */
  lines.push(`## Executive Summary`);
  lines.push(``);

  // Sentence 1 — components present
  const summaryParts: string[] = [];
  if (clientNodes.length > 0) {
    summaryParts.push(
      `${clientNodes.length} client endpoint${clientNodes.length > 1 ? "s" : ""}`,
    );
  }
  if (appServiceNodes.length > 0 || microserviceNodes.length > 0) {
    const svcCount = appServiceNodes.length + microserviceNodes.length;
    const svcLabel =
      microserviceNodes.length > 0 && appServiceNodes.length === 0
        ? "microservice"
        : appServiceNodes.length > 0 && microserviceNodes.length === 0
          ? "application service"
          : "service";
    summaryParts.push(`${svcCount} ${svcLabel}${svcCount > 1 ? "s" : ""}`);
  }
  if (dbNodes.length > 0) {
    summaryParts.push(
      `${dbNodes.length} primary database${dbNodes.length > 1 ? "s" : ""}`,
    );
  }
  if (summaryParts.length > 0) {
    lines.push(
      `This system connects ${summaryParts.join(", ")}, forming a ${nodes.length}-component distributed architecture.`,
    );
  } else {
    lines.push(`This diagram contains ${nodes.length} component${nodes.length !== 1 ? "s" : ""}.`);
  }

  // Sentence 2 — notable architectural layers
  const layerTraits: string[] = [];
  if (lbNodes.length > 0) layerTraits.push("load balancing");
  if (cacheNodes.length > 0) layerTraits.push("in-memory caching");
  if (replicaNodes.length > 0) layerTraits.push("read replicas");
  if (
    nodes.some((n) =>
      ["message-queue", "event-bus"].includes(n.data.componentType),
    )
  )
    layerTraits.push("asynchronous messaging");
  if (monNodes.length > 0) layerTraits.push("operational monitoring");

  if (layerTraits.length > 0) {
    lines.push(
      `The architecture incorporates ${layerTraits.join(", ")} to improve reliability and throughput.`,
    );
  }

  // Sentence 3 — scale summary or component count
  if (loadOutputs) {
    lines.push(
      `At peak the system sustains ${formatCompact(loadOutputs.peakRps)} RPS across ${loadOutputs.suggestedServers} server${loadOutputs.suggestedServers !== 1 ? "s" : ""} using a ${loadOutputs.dbScalingStrategy} database strategy.`,
    );
  } else {
    lines.push(
      `The diagram spans ${new Set(nodes.map((n) => n.data.componentType)).size} distinct component type${new Set(nodes.map((n) => n.data.componentType)).size !== 1 ? "s" : ""}; configure the load model to generate quantitative capacity targets.`,
    );
  }
  lines.push(``);

  /* ==========================================================================
   * 3. Architecture Overview — Mermaid flowchart
   * ======================================================================== */
  lines.push(`## Architecture Overview`);
  lines.push(``);
  lines.push("```mermaid");
  lines.push("flowchart LR");
  for (const node of nodes) {
    lines.push(mermaidShape(node));
  }
  for (const edge of edges) {
    const labelPart = edge.label ? ` |${edge.label}|` : "";
    lines.push(`  ${edge.source} -->${labelPart} ${edge.target}`);
  }
  lines.push("```");
  lines.push(``);

  /* ==========================================================================
   * 4. Component Inventory
   * ======================================================================== */
  lines.push(`## Component Inventory`);
  lines.push(``);
  lines.push(`| Component | Type | Estimated Capacity | Risk Level |`);
  lines.push(`|-----------|------|--------------------|------------|`);
  for (const node of nodes) {
    const capacity = node.data.estimatedCapacity || "—";
    lines.push(
      `| ${node.data.name} | ${node.data.componentType} | ${capacity} | ${node.data.riskLevel} |`,
    );
  }
  lines.push(``);

  /* ==========================================================================
   * 5. Traffic & Load Model
   * ======================================================================== */
  lines.push(`## Traffic & Load Model`);
  lines.push(``);
  if (loadOutputs) {
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Peak RPS | ${formatCompact(loadOutputs.peakRps)} |`);
    lines.push(`| Average RPS | ${formatCompact(loadOutputs.averageRps)} |`);
    lines.push(
      `| Bandwidth / day | ${formatBytes(loadOutputs.bandwidthPerDayBytes)} |`,
    );
    lines.push(
      `| Storage growth / day | ${formatBytes(loadOutputs.storageGrowthPerDayBytes)} |`,
    );
    lines.push(
      `| DB load RPS (peak) | ${formatCompact(loadOutputs.dbLoadRps)} |`,
    );
    lines.push(
      `| Cache savings RPS | ${formatCompact(loadOutputs.cacheSavingsRps)} |`,
    );
    lines.push(`| Suggested servers | ${loadOutputs.suggestedServers} |`);
    lines.push(
      `| DB scaling strategy | ${loadOutputs.dbScalingStrategy} |`,
    );
  } else {
    lines.push(`Load model not configured.`);
  }
  lines.push(``);

  /* ==========================================================================
   * 6. Request Flow
   * ======================================================================== */
  lines.push(`## Request Flow`);
  lines.push(``);

  if (clientNodes.length === 0) {
    lines.push(`No client nodes found in the diagram.`);
  } else {
    let stepIndex = 1;
    // BFS from each client, describing every hop up to the first data node
    for (const client of clientNodes) {
      const visited = new Set<string>();
      const queue: { id: string }[] = [{ id: client.id }];
      visited.add(client.id);

      while (queue.length > 0) {
        const { id } = queue.shift()!;
        for (const targetId of adj.get(id) ?? []) {
          if (visited.has(targetId)) continue;
          visited.add(targetId);
          const src = nodeById.get(id);
          const tgt = nodeById.get(targetId);
          if (!src || !tgt) continue;
          lines.push(
            `${stepIndex}. **${src.data.name}** → **${tgt.data.name}**: ` +
              `Request travels from ${src.data.componentType} to ${tgt.data.componentType}.`,
          );
          stepIndex++;
          // Continue traversal unless we have reached a data node
          if (!DATA_NODE_TYPES.has(tgt.data.componentType)) {
            queue.push({ id: targetId });
          }
        }
      }
    }

    if (stepIndex === 1) {
      lines.push(`No connected paths found from client nodes.`);
    }
  }
  lines.push(``);

  /* ==========================================================================
   * 7. Data Layer
   * ======================================================================== */
  lines.push(`## Data Layer`);
  lines.push(``);

  if (dataNodes.length === 0) {
    lines.push(`No data layer components are present in this diagram.`);
  } else {
    const roleDescriptions: Record<string, string> = {
      database:
        "Primary system of record — handles durable reads and writes.",
      cache:
        "In-memory key/value layer — absorbs read traffic before it reaches the primary database.",
      "read-replica":
        "Asynchronously replicated read-only copy — offloads query load from the primary.",
      "object-storage":
        "Blob store — holds media, large files, and binary assets.",
      "search-index":
        "Inverted-index engine — provides full-text and faceted search.",
    };
    for (const node of dataNodes) {
      const role =
        roleDescriptions[node.data.componentType] ?? "Data layer component.";
      const cap = node.data.estimatedCapacity
        ? ` Estimated capacity: ${node.data.estimatedCapacity}.`
        : "";
      lines.push(
        `- **${node.data.name}** (${node.data.componentType}): ${role}${cap}`,
      );
    }
  }
  lines.push(``);

  /* ==========================================================================
   * 8. Caching Strategy
   * ======================================================================== */
  lines.push(`## Caching Strategy`);
  lines.push(``);

  if (cacheNodes.length === 0) {
    lines.push(`No caching layer configured.`);
  } else {
    for (const cn of cacheNodes) {
      const cap = cn.data.estimatedCapacity
        ? ` with a capacity of ${cn.data.estimatedCapacity}`
        : "";
      lines.push(
        `- **${cn.data.name}**: An in-memory cache${cap} sits in the read path to serve repeated queries before they reach the primary database.`,
      );
    }
    if (loadOutputs) {
      const pct = Math.round(
        (loadOutputs.cacheSavingsRps / Math.max(loadOutputs.peakRps, 1)) * 100,
      );
      lines.push(``);
      lines.push(
        `At peak, the cache layer absorbs **${formatCompact(loadOutputs.cacheSavingsRps)} RPS** — roughly ${pct}% of peak traffic — reducing primary database read pressure accordingly.`,
      );
    }
  }
  lines.push(``);

  /* ==========================================================================
   * 9. Scalability Analysis
   * ======================================================================== */
  lines.push(`## Scalability Analysis`);
  lines.push(``);

  if (criticalFindings.length === 0 && warningFindings.length === 0) {
    lines.push(`No scalability issues detected.`);
  } else {
    if (criticalFindings.length > 0) {
      lines.push(`### Critical Issues`);
      lines.push(``);
      for (const f of criticalFindings) {
        lines.push(`- **${f.title}**: ${f.explanation}`);
      }
    }
    if (warningFindings.length > 0) {
      if (criticalFindings.length > 0) lines.push(``);
      lines.push(`### Warnings`);
      lines.push(``);
      for (const f of warningFindings) {
        lines.push(`- **${f.title}**: ${f.explanation}`);
      }
    }
  }
  lines.push(``);

  /* ==========================================================================
   * 10. Failure Modes & Mitigations
   * ======================================================================== */
  lines.push(`## Failure Modes & Mitigations`);
  lines.push(``);

  if (criticalFindings.length === 0) {
    lines.push(`No critical issues.`);
  } else {
    for (const f of criticalFindings) {
      lines.push(`- **${f.title}**: ${f.suggestedFix}`);
    }
  }
  lines.push(``);

  /* ==========================================================================
   * 11. Performance Targets
   * ======================================================================== */
  lines.push(`## Performance Targets`);
  lines.push(``);

  if (loadOutputs) {
    lines.push(`| Target | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(
      `| Peak RPS design ceiling | ${formatCompact(loadOutputs.peakRps)} |`,
    );
    lines.push(
      `| Server count (with redundancy) | ${loadOutputs.suggestedServers} |`,
    );
    lines.push(`| p95 latency budget | ≤ 200 ms end-to-end |`);
    lines.push(
      `| DB load at peak | ${formatCompact(loadOutputs.dbLoadRps)} RPS — ${loadOutputs.dbScalingStrategy} strategy |`,
    );
  } else {
    lines.push(
      `Load model not configured. Define traffic inputs in the Load Calculator panel to generate quantitative performance targets.`,
    );
  }
  lines.push(``);

  /* ==========================================================================
   * 12. Monitoring & Observability
   * ======================================================================== */
  lines.push(`## Monitoring & Observability`);
  lines.push(``);

  if (monNodes.length > 0) {
    for (const mn of monNodes) {
      const cap = mn.data.estimatedCapacity
        ? ` (${mn.data.estimatedCapacity})`
        : "";
      lines.push(
        `- **${mn.data.name}**${cap}: Provides metrics, logs, traces, and alerting coverage for this system.`,
      );
    }
  } else {
    lines.push(
      `No monitoring component is present. Without observability, incidents go undetected until end-users report them. ` +
        `Add a monitoring node (Datadog, Prometheus/Grafana, or CloudWatch) to gain visibility into latency, error rates, and resource utilisation.`,
    );
  }
  lines.push(``);

  /* ==========================================================================
   * 13. Security Considerations
   * ======================================================================== */
  lines.push(`## Security Considerations`);
  lines.push(``);

  if (authNodes.length === 0 && gatewayNodes.length === 0) {
    lines.push(
      `Neither an auth service nor an API gateway is present. All downstream service endpoints are unprotected from unauthenticated or malformed requests. ` +
        `Add an API gateway for centralised rate limiting and routing, and an auth service for authentication and authorisation.`,
    );
  } else {
    if (authNodes.length > 0) {
      for (const an of authNodes) {
        lines.push(
          `- **${an.data.name}** (auth-service): Manages authentication, token issuance, and session validation.`,
        );
      }
    } else {
      lines.push(
        `- No dedicated auth service is present. Ensure authentication logic is implemented within the application tier.`,
      );
    }
    if (gatewayNodes.length > 0) {
      for (const gn of gatewayNodes) {
        lines.push(
          `- **${gn.data.name}** (api-gateway): Provides a single ingress point with centralised routing, rate limiting, and auth enforcement.`,
        );
      }
    } else {
      lines.push(
        `- No API gateway is present. Consider adding one as a policy enforcement point for rate limiting and request validation.`,
      );
    }
  }
  lines.push(``);

  /* ==========================================================================
   * 14. Deployment Architecture
   * ======================================================================== */
  lines.push(`## Deployment Architecture`);
  lines.push(``);

  const hasMicroservices = microserviceNodes.length > 0;
  const hasAppService = appServiceNodes.length > 0;
  const hasWorkers = workerNodes.length > 0;
  const hasQueuing = nodes.some((n) =>
    ["message-queue", "event-bus"].includes(n.data.componentType),
  );

  if (hasMicroservices && !hasAppService) {
    lines.push(
      `The system follows a **microservices architecture** with ${microserviceNodes.length} independently deployable service${microserviceNodes.length > 1 ? "s" : ""}: ${microserviceNodes.map((n) => n.data.name).join(", ")}.`,
    );
  } else if (hasAppService && !hasMicroservices) {
    lines.push(
      `The system uses a **monolithic application service** architecture centred on ${appServiceNodes.map((n) => n.data.name).join(", ")}.`,
    );
  } else if (hasMicroservices && hasAppService) {
    lines.push(
      `The system combines a primary application service (${appServiceNodes.map((n) => n.data.name).join(", ")}) with ${microserviceNodes.length} microservice${microserviceNodes.length > 1 ? "s" : ""} (${microserviceNodes.map((n) => n.data.name).join(", ")}), forming a hybrid decomposition.`,
    );
  } else {
    lines.push(
      `Deployment pattern inferred from ${nodes.length} component${nodes.length !== 1 ? "s" : ""}. No explicit application service or microservice nodes found.`,
    );
  }

  if (hasWorkers && hasQueuing) {
    const workerNames = workerNodes.map((n) => n.data.name).join(", ");
    lines.push(
      `Asynchronous processing is handled by ${workerNodes.length} worker${workerNodes.length > 1 ? "s" : ""} (${workerNames}) consuming from message queues or event buses.`,
    );
  } else if (hasWorkers && !hasQueuing) {
    lines.push(
      `Background workers (${workerNodes.map((n) => n.data.name).join(", ")}) are present but no queue is configured — add a message queue for backpressure management.`,
    );
  }

  if (lbNodes.length > 0) {
    lines.push(
      `Traffic is distributed via ${lbNodes.map((n) => n.data.name).join(", ")}.`,
    );
  }
  lines.push(``);

  /* ==========================================================================
   * 15. Known Bottlenecks & Tradeoffs
   * ======================================================================== */
  lines.push(`## Known Bottlenecks & Tradeoffs`);
  lines.push(``);

  if (warningFindings.length === 0) {
    lines.push(`No bottlenecks identified.`);
  } else {
    for (const f of warningFindings) {
      lines.push(
        `- **${f.title}**: ${f.explanation} — _${f.suggestedFix}_`,
      );
    }
  }
  lines.push(``);

  /* ==========================================================================
   * 16. Recommendations
   * ======================================================================== */
  lines.push(`## Recommendations`);
  lines.push(``);

  const allFindings = findings ?? [];
  // Deduplicate fix strings while preserving order
  const seen = new Set<string>();
  const uniqueFixes = allFindings
    .map((f) => f.suggestedFix)
    .filter((fix) => {
      if (seen.has(fix)) return false;
      seen.add(fix);
      return true;
    });

  if (uniqueFixes.length === 0) {
    lines.push(
      `No recommendations — the architecture has no detected issues.`,
    );
  } else {
    uniqueFixes.forEach((fix, i) => {
      lines.push(`${i + 1}. ${fix}`);
    });
  }
  lines.push(``);

  return lines.join("\n");
}
