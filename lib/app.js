import * as html from "/lib/html.js";

export default function app(page, handlers) {
  const self = {};

  self.handle = ({ action, ...data }) => {
    handlers[action](data);
    html.reset(page(self));
  };

  self.cmd = (action, data = {}) => {
    return "main.handle(" + JSON.stringify({ action, ...data }) + ")";
  };

  return self;
}
