util = (() => {
  function rounds(matches) {
    const rounds = [];

    let currentRoundPlayers = [];
    let currentMatchPlayers = [];
    let currentRound = [];

    for (const match of matches) {
      const players = matchPlayers(match).sort();
      if (currentMatchPlayers.join() === players.join()) {
        currentRound.push(match);
      } else {
        currentRoundPlayers.push(...currentMatchPlayers);
        currentRoundPlayers = currentRoundPlayers.filter(
          (p, i, ps) => ps.indexOf(p) === i
        );
        currentMatchPlayers = players;
        if (
          players.filter((p) => currentRoundPlayers.includes(p)).length === 0
        ) {
          currentRound.push(match);
        } else {
          currentRoundPlayers = [];
          rounds.push(currentRound);
          currentRound = [match];
        }
      }
    }

    if (currentRound.length > 0) {
      rounds.push(currentRound);
    }

    return rounds;
  }

  function matchPlayers(match) {
    return match.home.concat(match.away);
  }

  function ranking(matches) {
    const players = {};

    for (const match of matches) {
      for (const player of matchPlayers(match)) {
        if (!players[player]) {
          players[player] = { name: player, count: 0, wins: 0, opponents: [] };
        }
        players[player].count += 1;
      }
      for (const winner of homeWins(match.games) ? match.home : match.away) {
        players[winner].wins += 1;
      }
      for (const home of match.home) {
        for (const away of match.away) {
          players[home].opponents.push(away);
          players[away].opponents.push(home);
        }
      }
    }

    const ranking = Object.values(players);

    for (const player of ranking) {
      player.success = success(player);
      const opponents = player.opponents;
      player.opponents = { count: 0, wins: 0 };
      for (const opponent of opponents) {
        player.opponents.count += players[opponent].count;
        player.opponents.wins += players[opponent].wins;
      }
      player.opponents.success = success(player.opponents);
      player.average = (player.success + player.opponents.success) / 2;
    }

    return ranking.sort(
      (p, q) =>
        q.average - p.average || q.success - p.success || q.count - p.count
    );
  }

  function homeWins(games) {
    const lastGame = games[games.length - 1];
    return lastGame.home > lastGame.away;
  }

  function success(winsCount) {
    if (winsCount.count === 0) {
      return 0;
    }
    return winsCount.wins / winsCount.count;
  }

  function showParty(party) {
    return party.sort().join("/");
  }

  function showResult(result) {
    return result.map((game) => [game.home, game.away].join(":")).join(" ");
  }

  return { rounds, matchPlayers, ranking, homeWins, showParty, showResult };
})();
