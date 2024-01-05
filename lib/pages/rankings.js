import * as html from "/lib/html.js";

import { pageHeader } from "/lib/fragments/pageHeader.js";

export const page = () => {
  return [pageHeader(), html.elem("main", {}, [])];
};
