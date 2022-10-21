import { DirectedGraph } from "./DirectedGraph.js";
import { Closure } from "./Closure.js";

export class PointGraph extends Closure(DirectedGraph) {
  constructor(someMatches) {
    super();
    this.#buildPointGraph(someMatches);
  }

  #buildPointGraph(someMatches) {
    for (const match of someMatches) {
      for (const homeId of match.home) {
        for (const awayId of match.away) {
          for (const game of match.games) {
            this.#points(homeId, awayId).won += game.home;
            this.#points(homeId, awayId).lost += game.away;
            this.#points(awayId, homeId).won += game.away;
            this.#points(awayId, homeId).lost += game.home;
          }
        }
      }
    }
  }

  #points(sourceId, targetId) {
    const edge = this.edge(sourceId, targetId);
    if (!edge.points) {
      edge.points = { won: 0, lost: 0 };
    }
    return edge.points;
  }
}
