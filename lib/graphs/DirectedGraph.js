export default class DirectedGraph {
  #edges = {};

  nodes() {
    const ns = Object.keys(this.#edges);
    const result = {};

    for (const n of ns) {
      result[n] = true;
      for (const s of this.successors(n)) {
        result[s] = true;
      }
    }

    return Object.keys(result);
  }

  successors(node) {
    return Object.keys(this.#edges[node] || {});
  }

  labels(from, to) {
    return (this.#edges[from] || {})[to];
  }

  addEdge(from, to, labels) {
    if (!this.#edges[from]) {
      this.#edges[from] = {};
    }

    if (!this.#edges[from][to]) {
      this.#edges[from][to] = [];
    }

    this.#edges[from][to].push(...labels);
  }
}
