import * as html from "../html.js";
import * as state from "../state.js";

export const eventSelector = () =>
  html.elem(
    "select",
    {
      onchange: "main.handle({ action: 'selectEvent', event: this.value })",
    },
    state.events().map((event) => option(event))
  );

const option = (event) =>
  html.elem(
    "option",
    {
      value: event,
      ...(event === state.selectedEvent() ? { selected: "selected" } : {}),
    },
    [html.text(event)]
  );
