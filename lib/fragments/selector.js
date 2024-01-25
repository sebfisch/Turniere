import * as html from "/lib/html.js";

export function selector(items, isSelected, onChange, onSubmit) {
  const boxes = html.elem(
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
  );

  const formElems = [boxes];

  const input = html.elem("input", { type: "text", name: "item" });
  if (onSubmit) {
    formElems.push(input);
  }

  const form = html.elem("form", {}, formElems);
  if (onSubmit) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      onSubmit(input.value);
    });
  }

  return html.elem("div", { class: "selector" }, [form]);
}
