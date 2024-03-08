import * as util from "../util.js";
import * as html from "../html.js";
import * as state from "../state.js";

import { pageHeader } from "../fragments/pageHeader.js";
import { selector } from "../fragments/selector.js";
import { eventSelector } from "../fragments/eventSelector.js";

let currentPlayerPerformances = {};

export const resetRanking = () => {
  const ranking = document.querySelector("#ranking");
  ranking.innerHTML = "";
  ranking.appendChild(rankingTable(rankingFrom(selectedMatches())));
};

export const resetTodaysPlayers = () => {
  const players = document.querySelector("#todays-players");
  players.innerHTML = "";
  players.appendChild(todaysPlayersSelector());
  players.appendChild(
    html.text(state.todaysPlayers().filter(state.isPlaying).length)
  );
};

export const resetEventsSelector = () => {
  const events = document.querySelector("#events");
  events.innerHTML = "";
  events.appendChild(eventsSelector());
};

export const resetEventSelector = () => {
  const events = document.querySelector("#event-selector");
  events.innerHTML = "";
  events.appendChild(eventSelector());
};

export const resetMatchesInputs = () => {
  const inputs = document.querySelector("#matches-inputs");
  inputs.innerHTML = "";
  matchesInputs().forEach((elem) => inputs.appendChild(elem));
  inputs.scrollTop = inputs.scrollHeight;
};

export const page = () => [
  pageHeader(true),
  html.elem("main", { class: "ranking" }, [
    html.elem("div", { id: "events" }, [eventsSelector()]),
    selector(
      util.allPlayers(state.matches()),
      state.isRankedPlayer,
      (player, checked) => {
        state.rankPlayer(player, checked);
        resetRanking();
      }
    ),
    html.elem("section", { id: "ranking" }, [
      rankingTable(rankingFrom(selectedMatches())),
    ]),
    html.elem("section", { id: "player-results" }, []),
    html.elem("div", { id: "todays-players" }, [
      todaysPlayersSelector(),
      html.text(state.todaysPlayers().filter(state.isPlaying).length),
    ]),
    nextRoundSection(),
  ]),
];

function nextRoundSection() {
  const remove = html.elem("button", {}, [html.text("ungespielte entfernen")]);
  remove.addEventListener("click", (e) => {
    e.preventDefault();
    state.removeUnplayedMatches();
    resetMatchesInputs();
  });

  const create = html.elem("button", {}, [html.text("nächste Runde")]);
  create.addEventListener("click", (e) => {
    e.preventDefault();
    state.addUnplayedMatches(
      state.selectedEvent(),
      nextMatches(parseInt(discipline.value))
    );
    resetMatchesInputs();
  });

  const doublesOption = html.elem("option", { value: 4 }, [
    html.text("Doppel"),
  ]);
  if (state.selectedEvent() && state.selectedEvent().includes("Doppel")) {
    doublesOption.setAttribute("selected", true);
  }
  const discipline = html.elem("select", {}, [
    html.elem("option", { value: 2 }, [html.text("Einzel")]),
    doublesOption,
  ]);

  const matches = matchesInputs();

  const save = html.elem("button", {}, [html.text("speichern")]);
  save.addEventListener("click", (e) => {
    e.preventDefault();
    matches.forEach((form) => saveMatchForm(form));
    resetMatchesInputs();
    resetRanking();
  });

  return html.elem("div", { class: "matches-forms" }, [
    html.elem("div", { id: "matches-inputs" }, [...matches]),
    html.elem("form", {}, [save, remove, create, discipline]),
  ]);
}

function matchesInputs() {
  const matches = state.matches(state.selectedEvent());
  matches.push({ home: [], away: [], games: [] });
  return matches.map((match, index) => {
    const form = html.elem("form", {}, [
      html.elem(
        "input",
        { type: "number", name: "index", value: index, hidden: true },
        []
      ),
      html.elem("input", {
        class: "home",
        type: "text",
        name: "home",
        value: util.showParty(match.home),
        placeholder: "Heim",
        tabindex: -1,
      }),
      html.elem("input", {
        class: "games",
        type: "text",
        name: "games",
        placeholder: "Ergebnis",
        value: util.showResult(match.games),
      }),
      html.elem("input", {
        type: "text",
        name: "away",
        value: util.showParty(match.away),
        placeholder: "Gast",
        tabindex: -1,
      }),
      html.elem("input", { type: "submit", hidden: true }, []),
    ]);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      saveMatchForm(form);
      resetMatchesInputs();
      resetRanking();
    });

    return form;
  });
}

function saveMatchForm(form) {
  const match = {
    home: form.home.value
      .trim()
      .split("/")
      .filter((s) => s.length > 0)
      .map((p) => p.trim()),
    games: form.games.value
      .trim()
      .split(" ")
      .filter((s) => s.length > 0)
      .map((game) => {
        const [h, a] = game.trim().split(":");
        return {
          home: parseInt(h.trim()),
          away: parseInt(a.trim()),
        };
      }),
    away: form.away.value
      .trim()
      .split("/")
      .filter((s) => s.length > 0)
      .map((p) => p.trim()),
  };
  state.updateMatch(state.selectedEvent(), form.index.value, match);
}

const eventsSelector = () =>
  selector(
    state.rankableEvents(),
    state.isRankedEvent,
    (event, checked) => {
      state.rankEvent(event, checked);
      resetRanking();
    },
    (event) => {
      state.selectEvent(event);
      state.rankEvent(event, true);
      resetEventSelector();
      resetEventsSelector();
      resetRanking();
    }
  );

const todaysPlayersSelector = () =>
  selector(
    state.todaysPlayers(),
    state.isPlaying,
    (player, checked) => {
      state.setPlaying(player, checked);
      resetTodaysPlayers();
    },
    (player) => {
      state.setPlaying(player, true);
      resetTodaysPlayers();
    }
  );

function selectedMatches() {
  return state
    .matches()
    .filter(
      (match) =>
        state.isRankedEvent(match.event) &&
        util.matchPlayers(match).every(state.isRankedPlayer)
    );
}

const rankingTable = (ranking) =>
  html.elem(
    "table",
    {},
    ranking.map(({ player, performance, matches }, index) => {
      const playerLink = html.elem("a", { href: "#" }, [html.text(player)]);
      playerLink.addEventListener("click", () => resetPlayerResults(player));

      return html.elem("tr", {}, [
        html.elem("td", { style: "text-align: right;" }, [
          html.text(index + 1),
          html.text("."),
        ]),
        html.elem("td", {}, [playerLink]),
        html.elem("td", { title: "gewertete Matches" }, [
          html.text(matches.length),
        ]),
        html.elem("td", { title: "relativer Leistungsdurchschnitt" }, [
          html.text(util.percent(performance)),
        ]),
      ]);
    })
  );

function rankingFrom(matches) {
  matches = matches.filter((match) => match.games.length > 0);
  const players = util.allPlayers(matches);
  const tpGames = matchesAsTwoPlayerGames(matches);
  return playerPerformances(players, tpGames)
    .map(({ player, performance }) => ({
      player,
      performance,
      matches: util.playerMatches(player, matches),
    }))
    .sort(({ performance: a }, { performance: b }) => b - a);
}

const matchesAsTwoPlayerGames = (matches) =>
  groupedMatches(matches).flatMap(groupAsTwoPlayerGames);

const groupedMatches = (matches) =>
  util.groupConsecutive(
    matches,
    (a, b) =>
      a.home.length > 1 &&
      b.home.length > 1 &&
      a.games.length === b.games.length &&
      util.hasSamePlayers(a, b)
  );

function groupAsTwoPlayerGames(group) {
  if (group[0].home.length === 1) {
    // implies group.length === 1
    const singlesMatch = group[0];
    return singlesMatch.games.map((points) => ({
      event: singlesMatch.event,
      home: singlesMatch.home[0],
      away: singlesMatch.away[0],
      points,
      matches: group,
    }));
  }

  // group contains doubles matches

  // discard if there is only a single match
  if (group.length === 1) {
    console.log("discarding singleton doubles match", group[0]);
    return [];
  }

  // Find all pairs of players who play against each other twice with swapped partners.
  return util
    .combinations(util.matchPlayers(group[0]))
    .map(([fst, snd]) => {
      const matches = group
        .filter((match) => util.isMatchBetween(match, fst, snd))
        .map((match) =>
          match.home.indexOf(fst) >= 0 ? match : util.flippedMatch(match)
        );
      return matches.map(({ event, games }) => ({
        event,
        games,
        home: fst,
        away: snd,
        matches,
      }));
    })
    .filter((matches) => {
      if (matches.length === 2) {
        return true;
      } else {
        if (matches.length > 0) {
          console.log("discarding doubles combination", matches);
        }
        return false;
      }
    })
    .map(([fst, snd]) => ({
      event: fst.event,
      home: fst.home,
      away: fst.away,
      points: [fst, snd]
        .flatMap(({ games }) => games) // do doubles matches still have only a single game?
        .reduce((a, b) => ({
          home: a.home + b.home,
          away: a.away + b.away,
        })),
      matches: fst.matches,
    }));
}

function playerPerformances(players, tpGames) {
  currentPlayerPerformances = {};

  for (const player of players) {
    currentPlayerPerformances[player] = 1;
  }

  let count = 0;
  let error = 1;
  const bound = 1e-9;
  while (count++ < 10000 && error > bound)
    error = adjustPerformances(players, tpGames);

  console.log(count, "iterations");

  const meanPerf = geoMean(Object.values(currentPlayerPerformances));
  for (const player of players) {
    currentPlayerPerformances[player] /= meanPerf;
  }

  return players.map((player) => ({
    player,
    performance: currentPlayerPerformances[player],
  }));
}

function adjustPerformances(players, tpGames) {
  const corrections = {};

  for (const player of players) {
    corrections[player] = [];
  }

  for (const game of tpGames) {
    const correction = homeCorrection(game.home, game.away, game.points);
    const weight = game.points.home + game.points.away;
    corrections[game.home].push({ value: correction, weight });
    corrections[game.away].push({ value: 1 / correction, weight });
  }

  let maxSpread = 1;
  for (const player of players) {
    const adjustment = weightedGeoMean(corrections[player]);
    currentPlayerPerformances[player] *= adjustment;
    maxSpread = Math.max(maxSpread, spread(adjustment));
  }

  return maxSpread - 1;
}

const homeCorrection = (home, away, points) =>
  Math.sqrt(
    (relativePoints(points) * currentPlayerPerformances[away]) /
      currentPlayerPerformances[home]
  );

const relativePoints = ({ home, away }) =>
  Math.max(0.5, home) / Math.max(0.5, away);

function resetPlayerResults(player) {
  const playerResults = document.querySelector("#player-results");
  playerResults.innerHTML = "";
  playerResultsElems(player).forEach((elem) => playerResults.appendChild(elem));
}

const playerResultsElems = (selectedPlayer) => [
  html.elem("h1", {}, [html.text(selectedPlayer)]),
  ...Object.entries(
    Object.groupBy(
      util.playerMatches(selectedPlayer, selectedMatches()),
      ({ event }) => event
    )
  )
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] === b[0] ? 0 : 1))
    .flatMap(([event, matches]) => [
      html.elem("h2", {}, [html.text(event)]),
      ...groupedMatches(matches).flatMap((group) => [
        html.elem("table", {}, util.matchRows(group)),
        html.elem(
          "table",
          {},
          groupAsTwoPlayerGames(group)
            .filter(
              ({ home, away }) => [home, away].indexOf(selectedPlayer) >= 0
            )
            .flatMap(({ home, away, points }) => {
              const correction = homeCorrection(home, away, points);
              return [
                playerRow(
                  home,
                  points.home,
                  points.home > points.away,
                  correction
                ),
                playerRow(
                  away,
                  points.away,
                  points.away > points.home,
                  1 / correction
                ),
              ];
            })
        ),
      ]),
    ]),
];

const playerRow = (player, points, winner, correction) => {
  const perf = currentPlayerPerformances[player];
  return html.elem("tr", {}, [
    html.elem("td", { class: "home" + (winner ? " winner" : "") }, [
      html.text(player),
    ]),
    html.elem("td", {}, [html.text(points)]),
    html.elem("td", {}, [html.text(util.percent(perf * correction))]),
  ]);
};

function nextMatches(playersPerMatch) {
  return combinations(playersPerMatch).flatMap((combination) => {
    if (playersPerMatch === 2) {
      return [
        {
          home: [combination[0]],
          away: [combination[1]],
          games: [],
        },
      ];
    }
    if (playersPerMatch === 4) {
      return [
        {
          home: [combination[0], combination[1]],
          away: [combination[2], combination[3]],
          games: [],
        },
        {
          home: [combination[0], combination[2]],
          away: [combination[1], combination[3]],
          games: [],
        },
        {
          home: [combination[0], combination[3]],
          away: [combination[1], combination[2]],
          games: [],
        },
      ];
    }
  });
}

function combinations(playersPerMatch) {
  return searchCombinations(
    initIxs(playersPerMatch),
    dropByes(playersPerMatch, state.todaysPlayers().filter(state.isPlaying))
  );
}

function dropByes(playersPerMatch, players) {
  const playerData = players.map((player) => ({
    player,
    performance: currentPlayerPerformances[player] || 1,
    matchCount: util.playerMatches(player, state.matches(state.selectedEvent()))
      .length,
  }));
  playerData.sort(
    (
      { performance: pa, matchCount: ma },
      { performance: pb, matchCount: mb }
    ) => mb - ma || pa - pb // highest match count and lowest performance first
  );
  console.log(
    "Freilos:",
    playerData
      .slice(0, playerData.length % playersPerMatch)
      .map(({ player }) => player)
      .join(", ")
  );
  playerData.splice(0, playerData.length % playersPerMatch);
  playerData.sort(
    ({ performance: pa }, { performance: pb }) => pb - pa // highest performance first
  );
  return playerData.map(({ player }) => player);
}

function havePlayedToday(players) {
  const names = players.sort().join();
  return state
    .matches(state.selectedEvent())
    .some((match) => names === util.matchPlayers(match).sort().join());
}

function moreThanMhavePlayedInLastNRounds(m, n, players) {
  return util
    .roundsFrom(state.matches(state.selectedEvent()))
    .slice(-n)
    .flat()
    .some(
      (match) => util.intersection(players, util.matchPlayers(match)).length > m
    );
}

function initIxs(playersPerMatch) {
  const result = [];
  for (let i = 0; i < playersPerMatch - 1; i++) {
    result.push(i);
  }
  return result;
}

function nextIxs(ixs) {
  const result = [...ixs];
  let i = 0;
  while (i < result.length - 1 && result[i] + 1 == result[i + 1]) {
    result[i] = i++;
  }
  result[i]++;
  return result;
}

function searchCombinations(ixs, players) {
  if (players.length == 0) {
    return [];
  }

  let [fst, ...rest] = players;
  if (ixs[ixs.length - 1] >= rest.length) {
    throw "no solution";
  }
  const others = ixs.map((ix) => rest[ix]);
  if (notDiverseEnough(ixs.length === 1, [fst, ...others])) {
    return searchCombinations(nextIxs(ixs), players);
  }
  for (const ix of ixs) {
    rest[ix] = null;
  }
  rest = rest.filter((p) => p);
  try {
    return [
      [fst, ...others],
      ...searchCombinations(initIxs(ixs.length + 1), rest),
    ];
  } catch (e) {
    return searchCombinations(nextIxs(ixs), players);
  }
}

function notDiverseEnough(isSingles, players) {
  if (isSingles) {
    return havePlayedToday(players);
  }
  return (
    havePlayedToday(players) || moreThanMhavePlayedInLastNRounds(2, 1, players)
  );
}

function arithMean(nums) {
  const sum = nums.reduce((a, b) => a + b);
  return sum / nums.length;
}

const geoMean = (nums) => Math.exp(arithMean(nums.map(Math.log)));

function weightedArithMean(entries) {
  const totalWeight = entries.reduce((total, { weight }) => total + weight, 0);
  const weightedSum = entries.reduce(
    (sum, { value, weight }) => sum + value * weight,
    0
  );
  return weightedSum / totalWeight;
}

const weightedGeoMean = (entries) =>
  Math.exp(
    weightedArithMean(
      entries.map(({ value, weight }) => ({ value: Math.log(value), weight }))
    )
  );

// function geoMedian(nums) {
//   const sorted = nums.toSorted();
//   const mid = Math.floor(sorted.length / 2);
//   if (sorted.length % 2 == 1) return sorted[mid];
//   else return geoMean([sorted[mid - 1], sorted[mid]]);
// }

const spread = (n) => (n < 1 ? 1 / n : n);

// function robustMean(nums) {
//   const median = geoMedian(nums);
//   return geoMean(nums.map((num) => num / median)).filter(
//     (num) => spread(num) < 10
//   );
// }

function trace(name, value) {
  console.log(name, value);
  return value;
}

// function expectedResultTo(points, homePerf, awayPerf) {
//   return homePerf < awayPerf
//     ? { home: Math.round((points * homePerf) / awayPerf), away: points }
//     : { home: points, away: Math.round((points * awayPerf) / homePerf) };
// }

// const winProb = (a, b) => a / (a + b);

// function probOfWinning(successes, prob) {
//   let result = 0;

//   for (let failures = 0; failures < successes; failures++)
//     result += negBin(prob, successes, failures);

//   return result;
// }

// https://en.wikipedia.org/wiki/Negative_binomial_distribution
// function negBin(prob, successes, failures) {
//   return (
//     binomial(successes + failures - 1, failures) *
//     prob ** successes *
//     (1 - prob) ** failures
//   );
// }

// https://en.wikipedia.org/wiki/Binomial_coefficient
// function binomial(n, k) {
//   let result = 1;
//   while (k >= 1) {
//     result *= n-- / k--;
//   }
//   return result;
// }
