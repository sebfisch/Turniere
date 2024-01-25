import * as html from "/lib/html.js";
import * as state from "/lib/state.js";

export const rankedEventSelector = (onChange) =>
  html.elem("div", { class: "ranked" }, [
    html.elem("form", {}, [
      html.elem(
        "ul",
        {},
        state.events().map((event) => {
          const checkbox = html.elem(
            "input",
            {
              type: "checkbox",
              value: event,
            },
            []
          );
          if (state.isRankedEvent(event)) {
            checkbox.checked = true;
          }
          checkbox.addEventListener("change", () => {
            state.rankEvent(event, checkbox.checked);
            onChange();
          });
          return html.elem("li", {}, [checkbox, html.text(event)]);
        })
      ),
    ]),
  ]);
