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
  for (const event of Object.keys(eventRanked)) {
    if (!matchesByEvent.hasOwnProperty(event)) {
      matchesByEvent[event] = [];
    }
  }
  storage.setItem("matchesByEvent", matchesByEvent);

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

export function unplayedMatches(event) {
  if (!event) {
    return [];
  }

  const matchesByEvent = storage.getItem("matchesByEvent");
  if (!matchesByEvent.hasOwnProperty(event)) {
    return [];
  }

  return matchesByEvent[event].filter((match) => match.games.length === 0);
}

export function removeUnplayedMatches() {
  const matchesByEvent = storage.getItem("matchesByEvent");
  for (const event of events()) {
    matchesByEvent[event] = matchesByEvent[event].filter(
      (match) => match.games.length > 0
    );
  }
  storage.setItem("matchesByEvent", matchesByEvent);
}

export function addUnplayedMatches(event, matches) {
  if (!event) {
    return;
  }

  matches.forEach((match) => (match.event = event));

  const matchesByEvent = storage.getItem("matchesByEvent");
  if (!matchesByEvent.hasOwnProperty(event)) {
    matchesByEvent[event] = [];
  }

  matchesByEvent[event].push(...matches);
  storage.setItem("matchesByEvent", matchesByEvent);
}

export function updateMatch(event, index, { home, away, games }) {
  if (
    !event ||
    (home.length === 0 && away.length === 0 && games.length === 0)
  ) {
    return;
  }

  const matchesByEvent = storage.getItem("matchesByEvent");
  if (!matchesByEvent.hasOwnProperty(event)) {
    console.log("cound not find matches for", event);
    return;
  }

  const matches = matchesByEvent[event];
  if (index >= matches.length) {
    console.log("adding new match");
    matches.push({ event, home, away, games });
  } else {
    matches[index].home = home;
    matches[index].away = away;
    matches[index].games = games;
  }
  storage.setItem("matchesByEvent", matchesByEvent);
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

export function todaysPlayers() {
  if (selectedEvent() === null) {
    return [];
  }
  return Object.keys(storage.getItem("playerPlays")[selectedEvent()]).sort();
}

export function isPlaying(player) {
  if (selectedEvent() === null) {
    return false;
  }
  return storage.getItem("playerPlays")[selectedEvent()][player];
}

export function setPlaying(player, playing) {
  if (selectedEvent() === null) {
    return;
  }
  const playerPlays = storage.getItem("playerPlays");
  playerPlays[selectedEvent()][player] = playing;
  storage.setItem("playerPlays", playerPlays);
}
