export function matchPlayers(match) {
  return match.home.concat(match.away);
}

export function homeWins(games) {
  const lastGame = games[games.length - 1];
  return lastGame.home > lastGame.away;
}

export function winners(match) {
  if (homeWins(match.games)) {
    return match.home;
  } else {
    return match.away;
  }
}

export function losers(match) {
  if (homeWins(match.games)) {
    return match.away;
  } else {
    return match.home;
  }
}

export function showParty(party) {
  return party.sort().join("/");
}

export function showResult(result) {
  return result.map((game) => [game.home, game.away].join(":")).join(" ");
}
