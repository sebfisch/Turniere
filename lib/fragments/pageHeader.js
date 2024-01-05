import * as html from "/lib/html.js";
import { dateSelector } from "/lib/fragments/dateSelector.js";

export const pageHeader = (showDateSelector) => {
  const parts = [
    html.elem("ul", { class: "links" }, [
      html.elem("li", {}, [
        html.elem("a", { href: "/?/rankings" }, [html.text("Ranglisten")]),
      ]),
      html.elem("li", {}, [
        html.elem("a", { href: "/?/results" }, [html.text("Ergebnisse")]),
      ]),
    ]),
  ];
  if (showDateSelector) {
    parts.push(html.elem("div", { class: "dates" }, [dateSelector()]));
  }
  return html.elem("header", {}, parts);
};
