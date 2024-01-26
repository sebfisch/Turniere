import * as util from "../util.js";
import * as html from "../html.js";
import * as state from "../state.js";

import { pageHeader } from "../fragments/pageHeader.js";

export const page = () => {
  const rounds = [];

  //   const graph = new PointGraph(state.matches(state.selectedEvent()));
  //   console.log(graph, graph.closure(winLoss));

  for (const [index, round] of Object.entries(
    roundsFrom(state.matches(state.selectedEvent()))
  )) {
    rounds.push(roundTable(index, round));
  }

  return [
    pageHeader(true), // show event selector
    html.elem("main", {}, [html.elem("section", { class: "rounds" }, rounds)]),
  ];
};

const roundTable = (index, matches) =>
  html.elem("table", { class: "matches" }, [
    html.elem("caption", {}, [html.text(parseInt(index) + 1 + ". Runde")]),
    ...util.matchRows(matches),
  ]);

function roundsFrom(matches) {
  const rounds = [];

  let currentRoundPlayers = [];
  let currentMatchPlayers = [];
  let currentRound = [];

  for (const match of matches) {
    const players = util.matchPlayers(match).sort();
    if (currentMatchPlayers.join() === players.join()) {
      currentRound.push(match);
    } else {
      currentRoundPlayers.push(...currentMatchPlayers);
      currentRoundPlayers = currentRoundPlayers.filter(
        (p, i, ps) => ps.indexOf(p) === i
      );
      currentMatchPlayers = players;
      if (players.filter((p) => currentRoundPlayers.includes(p)).length === 0) {
        currentRound.push(match);
      } else {
        currentRoundPlayers = [];
        rounds.push(currentRound);
        currentRound = [match];
      }
    }
  }

  if (currentRound.length > 0) {
    rounds.push(currentRound);
  }

  return rounds;
}
