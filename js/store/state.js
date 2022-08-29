state = (() => {
  function init() {
    if (!storage.getItem("datedMatches")) {
      loadMatches([]);
    }

    if (!storage.getItem("selectedDate")) {
      selectDate(dates().reverse()[0] || null);
    }
  }

  function loadMatches(matches) {
    const datedMatches = {};

    for (const match of matches) {
      if (!datedMatches[match.date]) {
        datedMatches[match.date] = [];
      }
      datedMatches[match.date].push(match);
    }

    storage.setItem("datedMatches", datedMatches);
  }

  function selectDate(date) {
    storage.setItem("selectedDate", date);
  }

  function selectedDate() {
    return storage.getItem("selectedDate");
  }

  function dates() {
    return Object.keys(storage.getItem("datedMatches")).sort();
  }

  function matches(date) {
    if (date) {
      return storage.getItem("datedMatches")[date];
    }

    const matches = [];
    for (const ms of Object.values(storage.getItem("datedMatches"))) {
      matches.push(...ms);
    }
    return matches;
  }

  return { init, loadMatches, dates, selectDate, selectedDate, matches };
})();
