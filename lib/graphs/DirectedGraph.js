export default class DirectedGraph {
  #nodes = {};

  get nodes() {
    return Object.values(this.#nodes);
  }

  hasNode(id) {
    return !!this.#nodes[id];
  }

  node(id) {
    let node = this.#nodes[id];
    if (!node) {
      node = new Node(id);
      this.#nodes[id] = node;
    }
    return node;
  }

  edge(sourceId, targetId, newEdge) {
    return this.node(sourceId).edgeTo(this.node(targetId), newEdge);
  }

  restrictedTo(ids) {
    const result = new DirectedGraph();
    for (const source of this.nodes) {
      if (ids.includes(source.id)) {
        result.node(source.id);
        for (const target of source.successors) {
          if (ids.includes(target.id)) {
            result.edge(source.id, target.id, this.edge(source.id, target.id));
          }
        }
      }
    }
    return result;
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

  get successors() {
    return this.#connectedNodes(this.#forwards, "target");
  }

  get predecessors() {
    return this.#connectedNodes(this.#backwards, "source");
  }

  get outDegree() {
    return this.successors.length;
  }

  get inDegree() {
    return this.predecessors.length;
  }

  edgeTo(that, newEdge) {
    let edge = this.#forwards[that.id];
    if (!edge) {
      newEdge = newEdge || new Edge(this, that);
      edge = newEdge;
      this.#forwards[that.#id] = edge;
      that.#backwards[this.#id] = edge;
    }
    return edge;
  }

  #connectedNodes(edges, nextKey) {
    return Object.keys(edges).map((nodeId) => edges[nodeId][nextKey]);
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
