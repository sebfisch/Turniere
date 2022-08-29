results = (() => {
  function page() {
    const rounds = [];

    for (const [index, round] of Object.entries(
      util.rounds(state.matches(state.selectedDate()))
    )) {
      rounds.push(roundTable(index, round));
    }

    return [
      datesList(state.dates(), state.selectedDate()),
      doc.elem("main", {}, [
        doc.elem("section", { class: "ranking" }, [
          rankingTable(util.ranking(state.matches(state.selectedDate()))),
        ]),
        doc.elem("section", { class: "rounds" }, rounds),
      ]),
    ];
  }

  function datesList(dates, selectedDate) {
    function option(date) {
      let selected = {};
      if (date === selectedDate) {
        selected = { selected: "selected" };
      }
      return doc.elem("option", { value: date, ...selected }, [doc.text(date)]);
    }

    const options = [];
    for (const date of dates) {
      options.push(option(date));
    }

    return doc.elem("nav", { class: "dates" }, [
      doc.elem(
        "select",
        {
          onchange: "main.handle({ action: 'showResults', date: this.value })",
        },
        options
      ),
    ]);
  }

  function rankingTable(ranking) {
    const head = doc.elem("thead", {}, [
      doc.elem("tr", {}, [
        doc.elem("th", { class: "name" }, [doc.text("Name")]),
        doc.elem("th", {}, [doc.text("Spiele")]),
        doc.elem("th", {}, [doc.text("Quote")]),
        doc.elem("th", {}, [doc.text("Gegner")]),
        doc.elem("th", {}, [doc.text("Schnitt")]),
      ]),
    ]);
    const rows = [];

    for (const player of ranking) {
      rows.push(
        doc.elem("tr", {}, [
          doc.elem("td", { class: "name" }, [doc.text(player.name)]),
          doc.elem("td", {}, [doc.text(player.count)]),
          doc.elem("td", { class: "success" }, [
            doc.text(percentage(player.success) + "%"),
          ]),
          doc.elem("td", { class: "success" }, [
            doc.text(percentage(player.opponents.success) + "%"),
          ]),
          doc.elem("td", { class: "success" }, [
            doc.text(percentage(player.average) + "%"),
          ]),
        ])
      );
    }

    return doc.elem("table", {}, [head, doc.elem("tbody", {}, rows)]);
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
        doc.elem("tr", {}, [
          doc.elem(
            "td",
            {
              class: [
                "home",
                ...(util.homeWins(match.games) ? ["winner"] : []),
              ],
            },
            [doc.text(util.showParty(match.home))]
          ),
          doc.elem("td", { class: "result" }, [
            doc.text(util.showResult(match.games)),
          ]),
          doc.elem(
            "td",
            {
              class: [
                "away",
                ...(util.homeWins(match.games) ? [] : ["winner"]),
              ],
            },
            [doc.text(util.showParty(match.away))]
          ),
        ])
      );
    }

    return doc.elem("table", { class: "matches" }, [
      doc.elem("caption", {}, [doc.text(parseInt(index) + 1 + ". Runde")]),
      ...rows,
    ]);
  }

  return { page };
})();
