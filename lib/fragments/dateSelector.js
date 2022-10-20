import * as html from "/lib/html.js";
import * as state from "/lib/state.js";

export const dateSelector = () =>
  html.elem(
    "select",
    {
      onchange: "main.handle({ action: 'selectDate', date: this.value })",
    },
    state.dates().map((date) => option(date))
  );

const option = (date) =>
  html.elem(
    "option",
    {
      value: date,
      ...(date === state.selectedDate() ? { selected: "selected" } : {}),
    },
    [html.text(date)]
  );
