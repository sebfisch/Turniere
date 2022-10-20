// https://en.wikipedia.org/wiki/Floyd%E2%80%93Warshall_algorithm
// http://www.hoefner-online.de/home/pdfs/2012HoefnerMoellerFestschriftFaoc.pdf
import { DirectedGraph } from "./DirectedGraph.js";

export const Closure = (Graph) =>
  class extends Graph {
    closure(semiring, ResultGraph) {
      semiring = semiring || shortestPath;
      ResultGraph = ResultGraph || DirectedGraph;

      const result = new ResultGraph();

      for (const source of this.nodes) {
        for (const target of this.nodes) {
          const edge = result.edge(source.id, target.id);
          if (source.id === target.id) {
            edge.weight = semiring.one;
          } else if (this.hasEdge(source.id, target.id)) {
            edge.weight = semiring.fromEdge(this.edge(source.id, target.id));
          } else {
            edge.weight = semiring.zero;
          }
        }
      }

      for (const limit of this.nodes) {
        for (const source of this.nodes) {
          for (const target of this.nodes) {
            const edge = result.edge(source.id, target.id);
            const init = result.edge(source.id, limit.id);
            const tail = result.edge(limit.id, target.id);
            edge.weight = semiring.sum(
              edge.weight,
              semiring.product(init.weight, tail.weight)
            );
          }
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

// export const pointWinProb = {
//   fromEdge: ({ pointWinProb }) => pointWinProb,
//   sum: Math.max, // or min
//   zero: 0, // or 1 if min
//   product: (p, q) => p / (p + ((1 - p) * (1 - q)) / q),
//   one: 0.5,
// };
