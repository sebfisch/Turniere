export function reset(nodes = []) {
  const body = document.getElementsByTagName("body")[0];
  body.innerHTML = "";
  for (const node of nodes) {
    body.appendChild(node);
  }
}

export function text(str) {
  return document.createTextNode(str);
}

export function elem(name, attrs = {}, children = []) {
  const e = document.createElement(name);

  for (const [key, val] of Object.entries(attrs)) {
    if (val.join) {
      e.setAttribute(key, val.join(" "));
    } else {
      e.setAttribute(key, val);
    }
  }

  for (const child of children) {
    e.appendChild(child);
  }

  return e;
}
