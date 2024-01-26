import * as html from "./html.js";

export const matchPlayers = (match) => match.home.concat(match.away);

export function allPlayers(matches) {
  const result = {};
  for (const match of matches) {
    for (const home of match.home) result[home] = true;
    for (const away of match.away) result[away] = true;
  }
  return Object.keys(result).sort();
}

export const hasSamePlayers = (match1, match2) =>
  matchPlayers(match1).sort().join() === matchPlayers(match2).sort().join();

export const isMatchBetween = (match, player1, player2) =>
  (match.home.indexOf(player1) >= 0 && match.away.indexOf(player2) >= 0) ||
  (match.home.indexOf(player2) >= 0 && match.away.indexOf(player1) >= 0);

export const playerMatches = (player, matches) =>
  matches.filter((match) => matchPlayers(match).indexOf(player) >= 0);

export const flippedMatch = ({ home, away, games, event }) => ({
  home: away,
  away: home,
  games: games.map(flippedGame),
  event,
});

export const flippedGame = ({ home, away }) => ({ home: away, away: home });

export function homeWins(games) {
  const lastGame = games[games.length - 1];
  return lastGame.home > lastGame.away;
}

export const winners = (match) =>
  homeWins(match.games) ? match.home : match.away;

export const losers = (match) =>
  homeWins(match.games) ? match.away : match.home;

export const showParty = (party) => party.join("/");

export const showResult = (result) =>
  result.map((game) => [game.home, game.away].join(":")).join(" ");

export const percent = (num) =>
  num.toLocaleString("de-DE", {
    style: "percent",
    minimumSignificantDigits: 5,
    maximumSignificantDigits: 5,
  });

export const unique = (values) =>
  values
    .map(JSON.stringify)
    .filter((v, i, vs) => vs.indexOf(v) === i)
    .map(JSON.parse);

export function groupConsecutive(elems, sameGroup) {
  const groups = [];
  let prev = null;
  for (const elem of elems) {
    if (!prev || !sameGroup(prev, elem)) {
      groups.push([]);
    }
    groups[groups.length - 1].push(elem);

    prev = elem;
  }
  return groups;
}

export function combinations(elems) {
  const result = [];
  for (let fst = 0; fst < elems.length; fst++) {
    for (let snd = fst + 1; snd < elems.length; snd++) {
      result.push([elems[fst], elems[snd]]);
    }
  }
  return result;
}

export function intersection(set1, set2) {
  const result = [];
  for (const elem1 of set1) {
    if (set2.indexOf(elem1) >= 0) result.push(elem1);
  }
  return result;
}

export const matchRows = (matches) =>
  matches.map(({ home, away, games }) =>
    html.elem("tr", {}, [
      html.elem(
        "td",
        {
          class: ["home", ...(homeWins(games) ? ["winner"] : [])],
        },
        [html.text(showParty(home))]
      ),
      html.elem("td", { class: "result" }, [html.text(showResult(games))]),
      html.elem(
        "td",
        {
          class: ["away", ...(homeWins(games) ? [] : ["winner"])],
        },
        [html.text(showParty(away))]
      ),
    ])
  );
