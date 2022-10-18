export function length() {
  return localStorage.length();
}

export function key(index) {
  return localStorage.key(index);
}

export function getItem(key) {
  return JSON.parse(localStorage.getItem(key));
}

export function setItem(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key) {
  localStorage.removeItem(key);
}

export function clear() {
  localStorage.clear();
}