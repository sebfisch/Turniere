import { default as app } from "/lib/app.js";

import * as state from "/lib/state.js";
import * as results from "/lib/pages/results.js";
import * as graph from "/lib/pages/graph.js";

function router(self) {
  const route = window.location.search.substring(1);

  const page = {
    "": results.page,
    graph: graph.page,
  }[route];

  if (page) {
    return page(self);
  } else {
    throw "no page found at " + route;
  }
}

window.main = app(router, {
  init: () => state.init(),
  selectDate: ({ date }) => state.selectDate(date),
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
      state.selectDate(null);
      state.loadMatches(oldMatches.concat(newMatches));
      main.handle({ action: "init" });
    } catch (error) {
      console.log(error);
      console.log("loading", oldMatches.length, "old matches");
      state.loadMatches(oldMatches);
    }
  });
});
