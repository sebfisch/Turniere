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

// https://mathoverflow.net/questions/285998/associative-mean
const closerTo = (boundary) => (x, y) => {
  if (x <= boundary && y <= boundary) {
    return Math.max(x, y);
  }
  if (x >= boundary && y >= boundary) {
    return Math.min(x, y);
  }
  return boundary;
};

const liftToArrays = (fun) => (a, b) =>
  a.flatMap((x) => b.map((y) => fun(x, y)));

const combineProbs = (p, q) => p / (p + ((1 - p) * (1 - q)) / q);

const fromProb = (p) => {
  const result = { win: 1, loss: 0 };

  if (p <= 0.5) {
    result.loss = Math.max(result.loss, p);
  }

  if (p >= 0.5) {
    result.win = Math.min(result.win, p);
  }

  return result;
};

export const winLoss = {
  fromEdge: ({ points: { won, lost } }) => fromProb(won / (won + lost)),
  sum: (a, b) => ({
    win: Math.min(a.win, b.win),
    loss: Math.max(a.loss, b.loss),
  }),
  zero: { win: 1, loss: 0 },
  product: (a, b) => ({
    win: combineProbs(a.win, b.win),
    loss: combineProbs(a.loss, b.loss),
  }),
  one: { win: 0.5, loss: 0.5 },
};
