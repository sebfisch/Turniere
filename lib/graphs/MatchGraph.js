import * as util from "/lib/util.js";

import { AsHtml } from "./AsHtml.js";
import { DirectedGraph } from "./DirectedGraph.js";

export class MatchGraph extends AsHtml(DirectedGraph) {
  constructor(someMatches) {
    super();

    for (const matches of groupedMatches(someMatches)) {
      const players = util.matchPlayers(matches[0]);

      let winners = players.map((player) => player);
      let losers = players.map((player) => player);

      for (const match of matches) {
        const ws = util.winners(match);
        const ls = util.losers(match);
        winners = winners.filter((player) => ws.includes(player));
        losers = losers.filter((player) => ls.includes(player));
      }

      if (winners.length === 1 && losers.length === 1) {
        this.#addMatches(winners[0], losers[0], matches);
      }

      if (winners.length === 1 && losers.length === 0) {
        const winner = winners[0];
        for (const loser of players.filter((player) => player !== winner)) {
          const relevantMatches = matches.filter((match) =>
            util.losers(match).includes(loser)
          );
          this.#addMatches(winner, loser, relevantMatches);
        }
      }

      if (winners.length === 0 && losers.length === 1) {
        const loser = losers[0];
        for (const winner of players.filter((player) => player !== loser)) {
          const relevantMatches = matches.filter((match) =>
            util.winners(match).includes(winner)
          );
          this.#addMatches(winner, loser, relevantMatches);
        }
      }
    }
  }

  #addMatches(winner, loser, matches) {
    const edge = this.edge(winner, loser);
    if (!edge.matches) {
      edge.matches = [];
    }
    edge.matches.push(...matches);
  }
}

const groupedMatches = (matches) => {
  if (matches.length === 0) {
    return [];
  }

  let currentMatch = matches[0];

  if (currentMatch.home.length == 1) {
    return matches.map((match) => [match]);
  }

  const groups = [];
  let group = [currentMatch];

  for (let i = 1; i < matches.length; i++) {
    const nextMatch = matches[i];
    if (
      util.matchPlayers(currentMatch).sort().join() ===
      util.matchPlayers(nextMatch).sort().join()
    ) {
      group.push(nextMatch);
    } else {
      groups.push(group);
      group = [nextMatch];
    }

    currentMatch = nextMatch;
  }

  groups.push(group);

  return groups;
};
