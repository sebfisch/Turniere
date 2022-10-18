import * as html from "/lib/html.js";

export default function HtmlRendered(Graph) {
  return class extends Graph {
    asHtml() {
      const rows = [];
      for (const node of this.nodes()) {
        const nodes = this.successors(node);
        rows.push(
          html.elem("tr", {}, [
            html.elem("td", {}, [html.text(node)]),
            html.elem("td", {}, [html.text(nodes.join(", "))]),
          ])
        );
      }

      return html.elem("table", {}, rows);
    }
  };
}
