import * as util from "/lib/util.js";
import * as html from "/lib/html.js";
import * as state from "/lib/state.js";

import { pageHeader } from "/lib/fragments/pageHeader.js";
import { PointGraph } from "/lib/graphs/PointGraph.js";
import { winLoss } from "/lib/graphs/Closure.js";

export const page = () => {
  const rounds = [];

  //   const graph = new PointGraph(state.matches(state.selectedDate()));
  //   console.log(graph, graph.closure(winLoss));

  for (const [index, round] of Object.entries(
    roundsFrom(state.matches(state.selectedDate()))
  )) {
    rounds.push(roundTable(index, round));
  }

  return [
    pageHeader(true), // show date selector
    html.elem("main", {}, [html.elem("section", { class: "rounds" }, rounds)]),
  ];
};

const roundTable = (index, matches) => {
  const rows = [];
  for (const match of matches) {
    rows.push(
      html.elem("tr", {}, [
        html.elem(
          "td",
          {
            class: ["home", ...(util.homeWins(match.games) ? ["winner"] : [])],
          },
          [html.text(util.showParty(match.home))]
        ),
        html.elem("td", { class: "result" }, [
          html.text(util.showResult(match.games)),
        ]),
        html.elem(
          "td",
          {
            class: ["away", ...(util.homeWins(match.games) ? [] : ["winner"])],
          },
          [html.text(util.showParty(match.away))]
        ),
      ])
    );
  }

  return html.elem("table", { class: "matches" }, [
    html.elem("caption", {}, [html.text(parseInt(index) + 1 + ". Runde")]),
    ...rows,
  ]);
};

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
