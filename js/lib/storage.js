storage = (() => {
  function length() {
    return localStorage.length()
  }

  function key(index) {
    return localStorage.key(index)
  }

  function getItem(key) {
    return JSON.parse(localStorage.getItem(key))
  }

  function setItem(key, value) {
    localStorage.setItem(key, JSON.stringify(value))
  }

  function removeItem(key) {
    localStorage.removeItem(key)
  }

  function clear() {
    localStorage.clear()
  }

  return { length, key, getItem, setItem, removeItem, clear }
})()