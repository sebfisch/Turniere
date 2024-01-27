import * as util from "../util.js";
import * as html from "../html.js";
import * as state from "../state.js";

import { pageHeader } from "../fragments/pageHeader.js";

export const page = () => {
  const rounds = [];

  //   const graph = new PointGraph(state.matches(state.selectedEvent()));
  //   console.log(graph, graph.closure(winLoss));

  for (const [index, round] of Object.entries(
    util.roundsFrom(state.matches(state.selectedEvent()))
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
