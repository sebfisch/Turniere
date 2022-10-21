export class DirectedGraph {
  #nodes = {};

  static complete(nodeIds, Graph) {
    Graph = Graph || DirectedGraph;
    const result = new Graph();
    for (const sourceId of nodeIds) {
      for (const targetId of nodeIds) {
        result.edge(sourceId, targetId);
      }
    }
    return result;
  }

  get nodes() {
    return Object.values(this.#nodes);
  }

  node(id) {
    let node = this.#nodes[id];
    if (!node) {
      node = new Node(id);
      this.#nodes[id] = node;
    }
    return node;
  }

  get edges() {
    return this.nodes.flatMap((node) => node.edges);
  }

  edge(sourceId, targetId) {
    return this.node(sourceId).edgeTo(this.node(targetId));
  }
}

class Node {
  #id;
  #forwards = {};
  #backwards = {};

  constructor(id) {
    this.#id = id;
  }

  get id() {
    return this.#id;
  }

  get edges() {
    return Object.values(this.#forwards);
  }

  get successors() {
    return this.edges.map((edge) => edge["target"]);
  }

  get precursors() {
    return Object.values(this.#backwards).map((edge) => edge["source"]);
  }

  edgeTo(that) {
    let edge = this.#forwards[that.id];
    if (!edge) {
      edge = new Edge(this, that);
      this.#forwards[that.id] = edge;
      that.#backwards[this.id] = edge;
    }
    return edge;
  }
}

class Edge {
  source;
  target;

  constructor(source, target) {
    this.source = source;
    this.target = target;
  }
}
