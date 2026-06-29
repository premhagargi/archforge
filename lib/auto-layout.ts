import dagre from "@dagrejs/dagre";
import type { ArchNode, ArchEdge } from "@/lib/types";

/**
 * Run the Dagre graph layout algorithm over the supplied nodes and edges,
 * returning a new array of nodes with updated `position` values.
 *
 * Each node's position is adjusted so that the returned `{ x, y }` refers to
 * the node's **top-left corner** (React Flow convention) rather than its centre
 * (Dagre convention).
 *
 * @param nodes    Architecture nodes to lay out.
 * @param edges    Architecture edges that define the graph topology.
 * @param options  Optional overrides for Dagre graph parameters.
 *
 * @returns A new array of `ArchNode` objects with updated `position` fields.
 *          All other node properties are preserved unchanged.
 */
export function layoutDiagram(
  nodes: ArchNode[],
  edges: ArchEdge[],
  options?: {
    /** Direction of graph layout. Default: 'LR' (left-to-right). */
    rankdir?: "LR" | "TB";
    /** Minimum separation between nodes on the same rank. Default: 80. */
    nodesep?: number;
    /** Minimum separation between ranks. Default: 160. */
    ranksep?: number;
  },
): ArchNode[] {
  // Create a new Dagre directed graph
  const g = new dagre.graphlib.Graph();

  // Dagre requires a default edge label function — return an empty object
  g.setDefaultEdgeLabel(() => ({}));

  // Configure the graph-level layout parameters
  g.setGraph({
    rankdir: options?.rankdir ?? "LR",
    nodesep: options?.nodesep ?? 80,
    ranksep: options?.ranksep ?? 160,
  });

  // Register every node with its bounding-box dimensions
  nodes.forEach((n) =>
    g.setNode(n.id, { width: n.width ?? 200, height: n.height ?? 80 }),
  );

  // Register every edge (Dagre only needs source/target for topology)
  edges.forEach((e) => g.setEdge(e.source, e.target));

  // Compute the layout — mutates the graph in place
  dagre.layout(g);

  // Map computed centre positions back to top-left corner positions
  return nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: {
        // Dagre gives us the node centre; subtract half the node dimensions
        // to convert to the top-left origin that React Flow expects
        x: pos.x - (n.width ?? 200) / 2,
        y: pos.y - (n.height ?? 80) / 2,
      },
    };
  });
}
