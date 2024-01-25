import * as html from "/lib/html.js";

export const selector = (items, isSelected, onChange) =>
  html.elem("div", { class: "selector" }, [
    html.elem("form", {}, [
      html.elem(
        "ul",
        {},
        items.map((item) => {
          const checkbox = html.elem(
            "input",
            {
              type: "checkbox",
              value: item,
            },
            []
          );
          if (isSelected(item)) {
            checkbox.checked = true;
          }
          checkbox.addEventListener("change", () => {
            onChange(item, checkbox.checked);
          });
          return html.elem("li", {}, [checkbox, html.text(item)]);
        })
      ),
    ]),
  ]);
