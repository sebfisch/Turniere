import * as html from "/lib/html.js";
import * as util from "/lib/util.js";

import { default as components } from "/lib/graphs/components.js";

export default function HtmlRendered(Graph) {
  return class extends Graph {
    asHtml() {
      const rows = [];
      const levels = components(this);
      for (const level of levels) {
        let newRank = true;
        for (const source of rankNodes(level)) {
          const originalSource = this.node(source.id);
          const component = level.filter((cmp) =>
            cmp.nodes.some((n) => n.id === source.id)
          )[0];

          rows.push(
            html.elem("tr", { class: newRank ? ["new-rank"] : [] }, [
              html.elem("td", { title: degreeDiff(source) }, [
                html.text(source.id),
              ]),
              html.elem(
                "td",
                {},
                originalSource.successors.map((target) =>
                  html.elem(
                    "span",
                    {
                      class: component.hasNode(target.id) ? ["bold"] : [],
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
          newRank = false;
        }
      }

      return html.elem("table", { class: "graph" }, rows);
    }
  };
}

function rankNodes(level) {
  return level
    .flatMap((cmp) => cmp.nodes)
    .map((node) => ({ node, random: Math.random() }))
    .sort((a, b) => a.random - b.random)
    .map(({ node }) => node)
    .sort((a, b) => degreeDiff(b) - degreeDiff(a));
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
