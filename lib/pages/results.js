import * as util from "/lib/util.js";
import * as html from "/lib/html.js";
import * as state from "/lib/state.js";

import { pageHeader } from "/lib/fragments/pageHeader.js";
import { PointGraph } from "/lib/graphs/PointGraph.js";
import { winLoss } from "/lib/graphs/Closure.js";

export const page = () => {
  const rounds = [];

  const graph = new PointGraph(state.matches(state.selectedDate()));
  console.log(graph, graph.closure(winLoss));

  for (const [index, round] of Object.entries(
    util.rounds(state.matches(state.selectedDate()))
  )) {
    rounds.push(roundTable(index, round));
  }

  return [
    pageHeader(),
    html.elem("main", {}, [
      html.elem("section", { class: "ranking" }, [
        rankingTable(util.ranking(state.matches(state.selectedDate()))),
      ]),
      html.elem("section", { class: "rounds" }, rounds),
    ]),
  ];
};

const rankingTable = (ranking) => {
  const head = html.elem("thead", {}, [
    html.elem("tr", {}, [
      html.elem("th", { class: "name" }, [html.text("Name")]),
      html.elem("th", {}, [html.text("Spiele")]),
      html.elem("th", {}, [html.text("Quote")]),
      html.elem("th", {}, [html.text("Gegner")]),
      html.elem("th", {}, [html.text("Mittel")]),
    ]),
  ]);
  const rows = [];

  for (const player of ranking) {
    rows.push(
      html.elem("tr", {}, [
        html.elem("td", { class: "name" }, [html.text(player.name)]),
        html.elem("td", {}, [html.text(player.count)]),
        html.elem("td", { class: "success" }, [
          html.text(percentage(player.success) + "%"),
        ]),
        html.elem("td", { class: "success" }, [
          html.text(percentage(player.opponents.success) + "%"),
        ]),
        html.elem("td", { class: "success" }, [
          html.text(percentage(player.average) + "%"),
        ]),
      ])
    );
  }

  return html.elem("table", {}, [head, html.elem("tbody", {}, rows)]);
};

const percentage = (number) => {
  if (number == 1) {
    return 100;
  }
  let count = 1;
  if (number < 0.1) {
    count = 2;
  }
  return (100 * number).toFixed(count);
};

const roundTable = (index, matches) => {
  const rows = [];
  for (const match of matches) {
    rows.push(
      html.elem("tr", {}, [
        html.elem(
          "td",
          {
            class: ["home", ...(util.homeWins(match.games) ? ["winner"] : [])],
          },
          [html.text(util.showParty(match.home))]
        ),
        html.elem("td", { class: "result" }, [
          html.text(util.showResult(match.games)),
        ]),
        html.elem(
          "td",
          {
            class: ["away", ...(util.homeWins(match.games) ? [] : ["winner"])],
          },
          [html.text(util.showParty(match.away))]
        ),
      ])
    );
  }

  return html.elem("table", { class: "matches" }, [
    html.elem("caption", {}, [html.text(parseInt(index) + 1 + ". Runde")]),
    ...rows,
  ]);
};
