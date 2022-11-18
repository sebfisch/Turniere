// https://en.wikipedia.org/wiki/Kosaraju%27s_algorithm
export const Components = (Graph) =>
  class extends Graph {
    #seen;
    #ordered;

    #visit(node) {
      if (!this.#seen[node.id]) {
        this.#seen[node.id] = true;
        for (const succ of node.successors) {
          this.#visit(succ);
        }
        this.#ordered.unshift(node);
      }
    }

    #assign(node, component) {
      if (!this.#seen[node.id]) {
        this.#seen[node.id] = true;
        for (const prec of node.precursors) {
          this.#assign(prec, component);
        }
        component.push(node.id);
      }
    }

    components() {
      this.#seen = {};
      this.#ordered = [];

      for (const node of this.nodes) {
        this.#visit(node);
      }
      this.#seen = {};

      const result = [];
      let component = [];
      for (const node of this.#ordered) {
        this.#assign(node, component);
        if (component.length > 0) {
          result.push(component);
          component = [];
        }
      }

      return result;
    }
  };
