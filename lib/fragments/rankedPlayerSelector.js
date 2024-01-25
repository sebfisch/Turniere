import * as html from "/lib/html.js";
import * as state from "/lib/state.js";
import * as util from "/lib/util.js";

export const rankedPlayerSelector = (onChange) =>
  html.elem("div", { class: "ranked" }, [
    html.elem("form", {}, [
      html.elem(
        "ul",
        {},
        util.allPlayers(state.matches()).map((player) => {
          const checkbox = html.elem(
            "input",
            {
              type: "checkbox",
              value: player,
            },
            []
          );
          if (state.isActivePlayer(player)) {
            checkbox.checked = true;
          }
          checkbox.addEventListener("change", () => {
            state.activatePlayer(player, checkbox.checked);
            onChange();
          });
          return html.elem("li", {}, [checkbox, html.text(player)]);
        })
      ),
    ]),
  ]);
