import * as html from "/lib/html.js";
import * as util from "/lib/util.js";

import { Components } from "./Components.js";

export const AsHtml = (Graph) =>
  class extends Components(Graph) {
    asHtml() {
      const rows = [];
      const components = this.components();
      for (const component of components) {
        let newComponent = true;
        for (const sourceId of component) {
          const source = this.node(sourceId);
          rows.push(
            html.elem("tr", { class: newComponent ? ["new-component"] : [] }, [
              html.elem("td", {}, [html.text(source.id)]),
              html.elem(
                "td",
                {},
                source.successors.map((target) =>
                  html.elem(
                    "span",
                    {
                      title: matchesString(
                        this.edge(source.id, target.id).matches
                      ),
                    },
                    [html.text(target.id)]
                  )
                )
              ),
            ])
          );
          newComponent = false;
        }
      }

      return html.elem("table", { class: "graph" }, rows);
    }
  };

const matchesString = (matches) =>
  matches
    .map(
      (match) =>
        `${util.showParty(match.home)} ${util.showResult(
          match.games
        )} ${util.showParty(match.away)}`
    )
    .join("\n");
