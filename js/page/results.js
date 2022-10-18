import * as util from "/js/util.js";
import * as html from "/js/lib/html.js";
import * as state from "/js/store/state.js";

export function page() {
  const rounds = [];

  for (const [index, round] of Object.entries(
    util.rounds(state.matches(state.selectedDate()))
  )) {
    rounds.push(roundTable(index, round));
  }

  return [
    datesList(state.dates(), state.selectedDate()),
    html.elem("main", {}, [
      html.elem("section", { class: "ranking" }, [
        rankingTable(util.ranking(state.matches(state.selectedDate()))),
      ]),
      html.elem("section", { class: "rounds" }, rounds),
    ]),
  ];
}

function datesList(dates, selectedDate) {
  function option(date) {
    let selected = {};
    if (date === selectedDate) {
      selected = { selected: "selected" };
    }
    return html.elem("option", { value: date, ...selected }, [html.text(date)]);
  }

  const options = [];
  for (const date of dates) {
    options.push(option(date));
  }

  return html.elem("nav", { class: "dates" }, [
    html.elem(
      "select",
      {
        onchange: "main.handle({ action: 'showResults', date: this.value })",
      },
      options
    ),
  ]);
}

function rankingTable(ranking) {
  const head = html.elem("thead", {}, [
    html.elem("tr", {}, [
      html.elem("th", { class: "name" }, [html.text("Name")]),
      html.elem("th", {}, [html.text("Spiele")]),
      html.elem("th", {}, [html.text("Quote")]),
      html.elem("th", {}, [html.text("Gegner")]),
      html.elem("th", {}, [html.text("Schnitt")]),
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
}

function percentage(number) {
  if (number == 1) {
    return 100;
  }
  let count = 1;
  if (number < 0.1) {
    count = 2;
  }
  return (100 * number).toFixed(count);
}

function roundTable(index, matches) {
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
}
