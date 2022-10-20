export class DirectedGraph {
  #nodes = {};

  get nodes() {
    return Object.values(this.#nodes);
  }

  hasNode = (id) => !!this.#nodes[id];

  node(id) {
    let node = this.#nodes[id];
    if (!node) {
      node = new Node(id);
      this.#nodes[id] = node;
    }
    return node;
  }

  hasEdge = (sourceId, targetId) =>
    this.hasNode(sourceId) && this.node(sourceId).hasSuccessor(targetId);

  edge = (sourceId, targetId) =>
    this.node(sourceId).edgeTo(this.node(targetId));
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

  hasSuccessor = (targetId) => !!this.#forwards[targetId];
  hasPrecursor = (sourceId) => !!this.#backwards[sourceId];

  #connectedNodes(edges, nextKey) {
    return Object.keys(edges).map((nodeId) => edges[nodeId][nextKey]);
  }

  get successors() {
    return this.#connectedNodes(this.#forwards, "target");
  }

  get precursors() {
    return this.#connectedNodes(this.#backwards, "source");
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
