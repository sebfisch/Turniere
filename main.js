import { default as app } from "/js/lib/app.js";

import * as state from "/js/store/state.js";
import * as results from "/js/page/results.js";

window.main = app(results.page, {
  init: () => state.init(),
  showResults: ({ date }) => state.selectDate(date),
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
