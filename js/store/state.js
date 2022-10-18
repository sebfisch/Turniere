import * as storage from "/js/lib/storage.js";

export function init() {
  if (!storage.getItem("datedMatches")) {
    loadMatches([]);
  }

  if (!storage.getItem("selectedDate")) {
    selectDate(dates().reverse()[0] || null);
  }
}

export function loadMatches(matches) {
  const datedMatches = {};

  for (const match of matches) {
    if (!datedMatches[match.date]) {
      datedMatches[match.date] = [];
    }
    datedMatches[match.date].push(match);
  }

  storage.setItem("datedMatches", datedMatches);
}

export function selectDate(date) {
  storage.setItem("selectedDate", date);
}

export function selectedDate() {
  return storage.getItem("selectedDate");
}

export function dates() {
  return Object.keys(storage.getItem("datedMatches")).sort();
}

export function matches(date) {
  if (date) {
    return storage.getItem("datedMatches")[date];
  }

  const matches = [];
  for (const ms of Object.values(storage.getItem("datedMatches"))) {
    matches.push(...ms);
  }
  return matches;
}
