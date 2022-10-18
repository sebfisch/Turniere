import * as html from "/lib/html.js";
import * as state from "/lib/state.js";

export default function () {
  function option(date) {
    let selected = {};
    if (date === state.selectedDate()) {
      selected = { selected: "selected" };
    }
    return html.elem("option", { value: date, ...selected }, [html.text(date)]);
  }

  const options = [];
  for (const date of state.dates()) {
    options.push(option(date));
  }

  return html.elem(
    "select",
    {
      onchange: "main.handle({ action: 'selectDate', date: this.value })",
    },
    options
  );
}
