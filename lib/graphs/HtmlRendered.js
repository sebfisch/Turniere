import * as html from "/lib/html.js";
import * as util from "/lib/util.js";

import { default as components } from "/lib/graphs/components.js";

export default function HtmlRendered(Graph) {
  return class extends Graph {
    asHtml() {
      const rows = [];
      for (const cmp of components(this)) {
        let isFirst = true;
        for (const source of cmp.nodes.sort(
          (a, b) => degreeDiff(b) - degreeDiff(a)
        )) {
          const border = isFirst;
          if (isFirst) {
            isFirst = false;
          }
          rows.push(
            html.elem("tr", { class: border ? ["border-top"] : [] }, [
              html.elem("td", { title: degreeDiff(source) }, [
                html.text(source.id),
              ]),
              html.elem(
                "td",
                {},
                this.node(source.id).successors.map((target) =>
                  html.elem(
                    "span",
                    {
                      class: cmp.hasNode(target.id) ? ["bold"] : [],
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
        }
      }

      return html.elem("table", { class: "graph" }, rows);
    }
  };
}

function degreeDiff(node) {
  return node.outDegree - node.inDegree;
}

function matchesString(matches) {
  return matches
    .map(
      (match) =>
        util.showParty(match.home) +
        " " +
        util.showResult(match.games) +
        " " +
        util.showParty(match.away)
    )
    .join("\n");
}
