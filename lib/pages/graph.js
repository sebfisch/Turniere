import * as state from "/lib/state.js";
import * as html from "/lib/html.js";

import { default as pageHeader } from "/lib/fragments/pageHeader.js";

import MatchGraph from "/lib/graphs/MatchGraph.js";

export function page(app) {
  const graph = new MatchGraph(state.matches(state.selectedDate()));
  console.log(graph.sccs());

  return [
    pageHeader(),
    html.elem("main", {}, [html.elem("section", {}, [graph.asHtml()])]),
  ];
}
