main = (() => {
  function init() {
    state.init();
  }

  function showResults({ date }) {
    state.selectDate(date);
  }

  return app(results.page, { init, showResults });
})();

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
