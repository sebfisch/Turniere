import * as state from "/lib/state.js";
import * as html from "/lib/html.js";

import { pageHeader } from "/lib/fragments/pageHeader.js";
import { MatchGraph } from "/lib/graphs/MatchGraph.js";

export const page = (app) => {
  const graph = new MatchGraph(state.matches(state.selectedEvent()));

  return [
    pageHeader(),
    html.elem("main", {}, [html.elem("section", {}, [graph.asHtml()])]),
  ];
};
