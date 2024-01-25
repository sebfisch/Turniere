import * as html from "/lib/html.js";
import { eventSelector } from "/lib/fragments/eventSelector.js";

export const pageHeader = (showEventSelector) => {
  const parts = [
    html.elem("ul", { class: "links" }, [
      html.elem("li", {}, [
        html.elem("a", { href: "/?/ranking" }, [html.text("Rangliste")]),
      ]),
      html.elem("li", {}, [
        html.elem("a", { href: "/?/results" }, [html.text("Ergebnisse")]),
      ]),
    ]),
  ];
  if (showEventSelector) {
    parts.push(
      html.elem("div", { id: "event-selector", class: "events" }, [
        eventSelector(),
      ])
    );
  }
  return html.elem("header", {}, parts);
};
