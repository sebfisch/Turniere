import * as html from "/lib/html.js";
import { dateSelector } from "/lib/fragments/dateSelector.js";

export const pageHeader = () =>
  html.elem("header", {}, [
    html.elem("ul", { class: "links" }, [
      html.elem("li", {}, [
        html.elem("a", { href: "/?/results" }, [html.text("Ergebnisse")]),
      ]),
      html.elem("li", {}, [
        html.elem("a", { href: "/?/graph" }, [html.text("Grafisch")]),
      ]),
    ]),
    html.elem("div", { class: "dates" }, [dateSelector()]),
  ]);
