import * as storage from "/lib/storage.js";
import * as util from "/lib/util.js";

export function init() {
  if (!storage.getItem("matchesByEvent")) {
    loadMatches([]);
  }

  if (!storage.getItem("selectedEvent")) {
    selectEvent(events().reverse()[0] || null);
  }

  if (!storage.getItem("eventRanked")) {
    storage.setItem(
      "eventRanked",
      Object.fromEntries(events().map((event) => [event, true]))
    );
  }

  if (!storage.getItem("playerRanked")) {
    storage.setItem(
      "playerRanked",
      Object.fromEntries(
        util.allPlayers(matches()).map((player) => [player, true])
      )
    );
  }

  if (!storage.getItem("playerPlays")) {
    storage.setItem(
      "playerPlays",
      Object.fromEntries(
        util.allPlayers(matches()).map((player) => [player, false])
      )
    );
  }
}

export function loadMatches(matches) {
  const matchesByEvent = {};

  for (const match of matches) {
    if (!matchesByEvent[match.event]) {
      matchesByEvent[match.event] = [];
    }
    matchesByEvent[match.event].push(match);
  }

  storage.setItem("matchesByEvent", matchesByEvent);
}

export function selectEvent(event) {
  storage.setItem("selectedEvent", event);
}

export function selectedEvent() {
  return storage.getItem("selectedEvent");
}

export function events() {
  return Object.keys(storage.getItem("matchesByEvent")).sort();
}

export function matches(event) {
  if (event) {
    return storage.getItem("matchesByEvent")[event] || [];
  }

  const matches = [];
  for (const ms of Object.values(storage.getItem("matchesByEvent"))) {
    matches.push(...ms);
  }
  return matches;
}

export function isRankedEvent(event) {
  return storage.getItem("eventRanked")[event];
}

export function rankEvent(event, ranked) {
  const eventRanked = storage.getItem("eventRanked");
  eventRanked[event] = ranked;
  storage.setItem("eventRanked", eventRanked);
}

export function isRankedPlayer(player) {
  return storage.getItem("playerRanked")[player];
}

export function rankPlayer(player, ranked) {
  const playerRanked = storage.getItem("playerRanked");
  playerRanked[player] = ranked;
  storage.setItem("playerRanked", playerRanked);
}

export function isPlaying(player) {
  return storage.getItem("playerPlays")[player];
}

export function setPlaying(player, playing) {
  const playerPlays = storage.getItem("playerPlays");
  playerPlays[player] = playing;
  storage.setItem("playerPlays", playerPlays);
}
