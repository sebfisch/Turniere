import { default as dateSelector } from "/lib/fragments/dateSelector.js";

export function page(app) {
  return [dateSelector()];
}
