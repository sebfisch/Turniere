export default function (Graph) {
  return class extends Graph {
    #seen;
    #preds;
    #nodes;
    #roots;

    sccs() {
      this.#seen = {};
      this.#preds = {};
      this.#nodes = [];
      this.#roots = {};

      for (const node of this.nodes()) {
        this.#visit(node);
      }

      for (const node of this.#nodes) {
        this.#assign(node, node);
      }

      return this.#roots;
    }

    #visit(node) {
      if (!this.#seen[node]) {
        this.#seen[node] = true;
        for (const succ of this.successors(node)) {
          if (!this.#preds[succ]) {
            this.#preds[succ] = [];
          }
          this.#preds[succ].push(node);
          this.#visit(succ);
          this.#nodes.unshift(node);
        }
      }
    }

    #assign(node, root) {
      if (!this.#roots[node]) {
        this.#roots[node] = root;
        for (const pred of this.#preds[node] || []) {
          this.#assign(pred, root);
        }
      }
    }
  };
}
