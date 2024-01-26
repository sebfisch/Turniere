import * as state from "../state.js";
import * as html from "../html.js";

import { pageHeader } from "../fragments/pageHeader.js";
import { MatchGraph } from "../graphs/MatchGraph.js";

export const page = (app) => {
  const graph = new MatchGraph(state.matches(state.selectedEvent()));

  return [
    pageHeader(),
    html.elem("main", {}, [html.elem("section", {}, [graph.asHtml()])]),
  ];
};
