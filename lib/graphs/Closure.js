// https://en.wikipedia.org/wiki/Floyd%E2%80%93Warshall_algorithm
// http://www.hoefner-online.de/home/pdfs/2012HoefnerMoellerFestschriftFaoc.pdf
import { DirectedGraph } from "./DirectedGraph.js";

export const Closure = (Graph) =>
  class extends Graph {
    closure(semiring, ResultGraph) {
      semiring = semiring || shortestPath;
      ResultGraph = ResultGraph || DirectedGraph;

      const result = DirectedGraph.complete(
        this.nodes.map((node) => node.id),
        ResultGraph
      );

      for (const edge of result.edges) {
        edge.weight = semiring.zero;
      }

      for (const node of result.nodes) {
        result.edge(node.id, node.id).weight = semiring.one;
      }

      for (const edge of this.edges) {
        result.edge(edge.source.id, edge.target.id).weight =
          semiring.fromEdge(edge);
      }

      for (const limit of result.nodes) {
        for (const edge of result.edges) {
          const init = result.edge(edge.source.id, limit.id);
          const tail = result.edge(limit.id, edge.target.id);
          edge.weight = semiring.sum(
            edge.weight,
            semiring.product(init.weight, tail.weight)
          );
        }
      }

      return result;
    }
  };

export const shortestPath = {
  fromEdge: () => 1,
  sum: Math.min,
  zero: Infinity,
  product: (x, y) => x + y,
  one: 0,
};

export const widestPath = {
  fromEdge: ({ matches }) => matches.length / matches[0].home.length,
  sum: Math.max,
  zero: -Infinity,
  product: Math.min,
  one: Infinity,
};

const unlessNaN = (fun) => (x, y) => {
  if (isNaN(x)) {
    return y;
  }
  if (isNaN(y)) {
    return x;
  }
  return fun(x, y);
};

export const winLoss = {
  fromEdge: ({ points: { won, lost } }) => won / (won + lost),
  sum: unlessNaN(Math.min),
  zero: NaN,
  product: (p, q) => p / (p + ((1 - p) * (1 - q)) / q),
  one: 0.5,
};
