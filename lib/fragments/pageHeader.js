import * as html from "/lib/html.js";
import { default as dateSelector } from "/lib/fragments/dateSelector.js";

export default function () {
  return html.elem("header", {}, [
    html.elem("ul", { class: "links" }, [
      html.elem("li", {}, [
        html.elem("a", { href: "/" }, [html.text("Ergebnisse")]),
      ]),
      html.elem("li", {}, [
        html.elem("a", { href: "/?graph" }, [html.text("Grafisch")]),
      ]),
    ]),
    html.elem("div", { class: "dates" }, [dateSelector()]),
  ]);
}
