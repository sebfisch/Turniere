import * as util from "/lib/util.js";
import * as html from "/lib/html.js";
import * as state from "/lib/state.js";

import { pageHeader } from "/lib/fragments/pageHeader.js";
import { rankedEventSelector } from "/lib/fragments/rankedEventSelector.js";
import { rankedPlayerSelector } from "/lib/fragments/rankedPlayerSelector.js";

let currentPlayerPerformances = {};

export const reset = () => {
  const ranking = document.querySelector("#ranking");
  ranking.innerHTML = "";
  ranking.appendChild(rankingTable(rankingFrom(selectedMatches())));
};

export const page = () => [
  pageHeader(),
  html.elem("main", { class: "ranking" }, [
    rankedEventSelector(reset),
    rankedPlayerSelector(reset),
    html.elem("section", { id: "ranking" }, [
      rankingTable(rankingFrom(selectedMatches())),
    ]),
    html.elem("section", { id: "player-results" }, []),
  ]),
];

function selectedMatches() {
  return state
    .matches()
    .filter(
      (match) =>
        state.isRankedEvent(match.event) &&
        util.matchPlayers(match).every(state.isActivePlayer)
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

//function doubles

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
    corrections[game.home].push(correction);
    corrections[game.away].push(1 / correction);
  }

  let maxSpread = 1;
  for (const player of players) {
    const adjustment = geoMean(corrections[player]);
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

function arithMean(nums) {
  const sum = nums.reduce((a, b) => a + b);
  return sum / nums.length;
}

const geoMean = (nums) => Math.exp(arithMean(nums.map(Math.log)));

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
