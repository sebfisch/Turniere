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

  const matchesByEvent = storage.getItem("matchesByEvent");
  const eventRanked = storage.getItem("eventRanked");
  for (const event of Object.keys(matchesByEvent)) {
    if (!eventRanked.hasOwnProperty(event)) {
      eventRanked[event] = false;
    }
  }
  storage.setItem("eventRanked", eventRanked);

  if (!storage.getItem("playerRanked")) {
    storage.setItem(
      "playerRanked",
      Object.fromEntries(
        util.allPlayers(matches()).map((player) => [player, true])
      )
    );
  }

  const playerRanked = storage.getItem("playerRanked");
  for (const player of util.allPlayers(matches())) {
    if (!playerRanked.hasOwnProperty(player)) {
      playerRanked[player] = true;
    }
  }
  storage.setItem("playerRanked", playerRanked);

  if (!storage.getItem("playerPlays")) {
    storage.setItem(
      "playerPlays",
      Object.fromEntries(
        events().map((event) => [
          event,
          Object.fromEntries(
            util.allPlayers(matches()).map((player) => [player, false])
          ),
        ])
      )
    );
  }

  const playerPlays = storage.getItem("playerPlays");
  for (const event of events()) {
    if (!playerPlays.hasOwnProperty(event)) {
      playerPlays[event] = {};
    }
    for (const player of util.allPlayers(matches())) {
      if (!playerPlays[event].hasOwnProperty(player)) {
        playerPlays[event][player] = false;
      }
    }
  }
  storage.setItem("playerPlays", playerPlays);
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
  if (event) {
    const matchesByEvent = storage.getItem("matchesByEvent");
    if (!matchesByEvent.hasOwnProperty(event)) {
      matchesByEvent[event] = [];
      storage.setItem("matchesByEvent", matchesByEvent);
    }
    const playerPlays = storage.getItem("playerPlays");
    if (!playerPlays.hasOwnProperty(event)) {
      playerPlays[event] = Object.fromEntries(
        util.allPlayers(matches()).map((player) => [player, false])
      );
      storage.setItem("playerPlays", playerPlays);
    }
  }
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

export function rankableEvents() {
  return Object.keys(storage.getItem("eventRanked")).sort();
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

export function eventPlayers(event) {
  if (event === null) {
    return [];
  }
  return Object.keys(storage.getItem("playerPlays")[event]).sort();
}

export function isPlaying(player) {
  return storage.getItem("playerPlays")[player];
}

export function setPlaying(player, playing) {
  if (selectedEvent() === null) {
    return;
  }
  const playerPlays = storage.getItem("playerPlays");
  playerPlays[selectedEvent()][player] = playing;
  storage.setItem("playerPlays", playerPlays);
}
