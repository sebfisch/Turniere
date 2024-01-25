import * as state from "/lib/state.js";
import * as results from "/lib/pages/results.js";
import * as ranking from "/lib/pages/ranking.js";
import * as graph from "/lib/pages/graph.js";

import { app } from "/lib/app.js";

function router(self) {
  const route = window.location.search.substring(1);

  const page = {
    "": ranking.page,
    "/": ranking.page,
    "/ranking": ranking.page,
    "/results": results.page,
    "/graph": graph.page,
  }[route];

  if (page) {
    return page(self);
  } else {
    throw "no page found at " + route;
  }
}

window.main = app(router, {
  init: () => state.init(),
  selectEvent: ({ event }) => state.selectEvent(event),
  selectRankingEvent: ({ checkbox }) => ranking.selectEvent(checkbox),
});

window.addEventListener("load", () => main.handle({ action: "init" }));

document.addEventListener("copy", () => {
  navigator.clipboard.writeText(JSON.stringify(state.matches()));
});

document.addEventListener("paste", () => {
  const oldMatches = state.matches();
  navigator.clipboard.readText().then((txt) => {
    try {
      const newMatches = JSON.parse(txt);
      state.selectEvent(null);
      state.loadMatches(oldMatches.concat(newMatches));
      main.handle({ action: "init" });
    } catch (error) {
      console.log(error);
      console.log("loading", oldMatches.length, "old matches");
      state.loadMatches(oldMatches);
    }
  });
});
