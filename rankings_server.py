#!/usr/bin/env python3
"""Standalone rankings viewer web server.

Usage:
    python3 rankings_server.py [port]

Default port: 8765
"""

import json
import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

RANKINGS_DIR = Path(__file__).parent / "rankings"

HTML = """<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ranglisten</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@300;400&family=Roboto:wght@300;400&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  body {
    margin: 0;
    font-family: 'Roboto', sans-serif;
    font-weight: 300;
    font-size: 14pt;
    background: #fff;
    color: #000;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  h1 {
    margin: 0;
    padding: 0.5rem 1rem;
    font-size: 1.2rem;
    font-weight: 400;
    border-bottom: 1px solid #ccc;
  }

  #layout {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  #sidebar {
    width: 220px;
    min-width: 180px;
    padding: 1rem;
    border-right: 1px solid #ccc;
    overflow-y: auto;
    font-family: 'Roboto Condensed', sans-serif;
  }

  #sidebar details { margin: 0.2rem 0; }
  #sidebar summary {
    cursor: pointer;
    list-style: none;
    padding: 0.15rem 0.3rem;
    font-weight: 400;
    user-select: none;
  }
  #sidebar summary::-webkit-details-marker { display: none; }
  #sidebar summary::before { content: '▶ '; font-size: 0.7em; }
  #sidebar details[open] > summary::before { content: '▼ '; }

  #sidebar ul {
    list-style: none;
    margin: 0.2rem 0 0.2rem 1rem;
    padding: 0;
  }
  #sidebar li { margin: 0.15rem 0; }
  #sidebar a {
    text-decoration: none;
    color: inherit;
    display: block;
    padding: 0.15rem 0.3rem;
    border-radius: 3px;
  }
  #sidebar a:hover { background: #eee; }
  #sidebar a.active { background: #000; color: #fff; }

  #content {
    flex: 1;
    padding: 1.5rem 2rem;
    overflow-y: auto;
  }

  #content h2 {
    font-size: 1rem;
    font-weight: 400;
    margin: 0 0 1rem;
    color: #555;
  }

  table {
    border-collapse: collapse;
    font-family: 'Roboto Condensed', sans-serif;
  }
  th {
    font-weight: 400;
    text-align: left;
    border-bottom: 1px solid #000;
    padding: 0.2rem 1rem 0.2rem 0;
  }
  td {
    padding: 0.15rem 1rem 0.15rem 0;
  }
  td:first-child, th:first-child {
    text-align: right;
    color: #888;
    width: 2rem;
  }
  td:last-child, th:last-child {
    text-align: right;
    padding-right: 0;
  }

  #placeholder {
    color: #aaa;
    margin-top: 3rem;
  }

  .club { color: #aaa; font-size: 0.85em; margin-left: 0.3em; }

  #filter-section {
    margin-top: 1.5rem;
    border-top: 1px solid #ccc;
    padding-top: 0.8rem;
  }
  #filter-section h3 {
    font-size: 0.75rem;
    font-weight: 400;
    margin: 0 0 0.4rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .filter-group { margin-bottom: 0.8rem; }
  .filter-group label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    font-size: 0.85rem;
  }
  .filter-group label:hover { background: #eee; }

  .export-btn {
    margin-top: 1rem;
    display: block;
    padding: 0.3rem 0.8rem;
    font-family: 'Roboto Condensed', sans-serif;
    font-size: 0.85rem;
    font-weight: 400;
    background: none;
    border: 1px solid #ccc;
    border-radius: 3px;
    cursor: pointer;
    color: inherit;
  }
  .export-btn:hover { background: #eee; }

  .filter-select-all {
    font-size: 0.7rem;
    color: #aaa;
    margin: -0.2rem 0 0.3rem 0.3rem;
  }
  .filter-select-all a { color: #aaa; text-decoration: none; cursor: pointer; }
  .filter-select-all a:hover { color: #000; text-decoration: underline; }

  .player-club-group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
    color: #888;
    margin: 0.5rem 0 0.1rem;
    padding: 0 0.3rem;
  }
  .player-club-group-header:first-child { margin-top: 0.1rem; }
  .player-club-group-header .filter-select-all { margin: 0; }

  @media (prefers-color-scheme: dark) {
    body { background: #111; color: #eee; }
    h1 { border-color: #444; }
    #sidebar { border-color: #444; }
    #sidebar a:hover { background: #222; }
    #sidebar a.active { background: #eee; color: #111; }
    #content h2 { color: #888; }
    th { border-color: #eee; }
    td:first-child { color: #666; }
    .club { color: #666; }
    #filter-section { border-color: #444; }
    #filter-section h3 { color: #666; }
    .filter-group label:hover { background: #222; }
    .export-btn { border-color: #444; color: #eee; }
    .export-btn:hover { background: #222; }
    .filter-select-all a:hover { color: #eee; }
  }
</style>
</head>
<body>
<h1>Ranglisten</h1>
<div id="layout">
  <nav id="sidebar">
    <div id="nav-tree">Loading…</div>
    <div id="filter-section" style="display:none"></div>
  </nav>
  <main id="content">
    <p id="placeholder">Rangliste aus dem Menü wählen.</p>
  </main>
</div>
<script>
let currentData = null;
let currentPath = null;

function saveFilters() {
  if (!currentPath) return;
  const uncheckedClubs = [...document.querySelectorAll('#club-filter input:not(:checked)')].map(cb => cb.value);
  const uncheckedPlayers = [...document.querySelectorAll('#player-filter input:not(:checked)')].map(cb => cb.value);
  localStorage.setItem('rf:' + currentPath, JSON.stringify({ uncheckedClubs, uncheckedPlayers }));
}

function loadFilters() {
  const raw = localStorage.getItem('rf:' + currentPath);
  return raw ? JSON.parse(raw) : null;
}

async function loadTree() {
  const res = await fetch('/api/tree');
  const tree = await res.json();
  const navTree = document.getElementById('nav-tree');
  navTree.innerHTML = '';
  navTree.appendChild(buildNode(tree, ''));
}

function buildNode(node, path) {
  if (Array.isArray(node)) {
    const ul = document.createElement('ul');
    node.forEach(name => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      const filePath = path ? path + '/' + name : name;
      a.textContent = name;
      a.href = '#' + filePath;
      a.dataset.path = filePath;
      a.addEventListener('click', e => {
        e.preventDefault();
        document.querySelectorAll('#nav-tree a.active').forEach(el => el.classList.remove('active'));
        a.classList.add('active');
        loadRanking(filePath);
      });
      li.appendChild(a);
      ul.appendChild(li);
    });
    return ul;
  }

  const frag = document.createDocumentFragment();
  Object.keys(node).sort().forEach(key => {
    const childPath = path ? path + '/' + key : key;
    const details = document.createElement('details');
    details.open = true;
    const summary = document.createElement('summary');
    summary.textContent = key;
    details.appendChild(summary);
    details.appendChild(buildNode(node[key], childPath));
    frag.appendChild(details);
  });
  return frag;
}

async function loadRanking(path) {
  const content = document.getElementById('content');
  content.innerHTML = '<p style="color:#aaa">Lädt…</p>';
  document.getElementById('filter-section').style.display = 'none';

  currentPath = path;
  const res = await fetch('/api/ranking/' + path);
  if (!res.ok) {
    content.innerHTML = '<p style="color:red">Fehler beim Laden.</p>';
    return;
  }
  currentData = await res.json();

  const h2 = document.createElement('h2');
  h2.textContent = path.replace(/\\//g, ' \u203a ');
  content.innerHTML = '';
  content.appendChild(h2);

  buildFilters(currentData);
  renderTable(currentData);

  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'CSV exportieren';
  exportBtn.className = 'export-btn';
  exportBtn.addEventListener('click', exportCSV);
  content.appendChild(exportBtn);
}

function playerName(p) {
  return typeof p === 'object' ? p.name : p;
}

function playerClub(p) {
  return (typeof p === 'object' && p.club) ? p.club : null;
}

function makeSelectAllRow(onAll, onNone) {
  const row = document.createElement('div');
  row.className = 'filter-select-all';
  const aAll = document.createElement('a');
  aAll.textContent = 'alle';
  aAll.href = '#';
  aAll.addEventListener('click', e => { e.preventDefault(); onAll(); });
  row.appendChild(aAll);
  row.appendChild(document.createTextNode(' · '));
  const aNone = document.createElement('a');
  aNone.textContent = 'keine';
  aNone.href = '#';
  aNone.addEventListener('click', e => { e.preventDefault(); onNone(); });
  row.appendChild(aNone);
  return row;
}

function buildFilters(data) {
  const section = document.getElementById('filter-section');

  const clubs = [...new Set(data.map(e => playerClub(e.player)).filter(Boolean))].sort();
  if (clubs.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.innerHTML = '';
  section.style.display = '';

  const clubHeading = document.createElement('h3');
  clubHeading.textContent = 'Klubs';
  section.appendChild(clubHeading);

  section.appendChild(makeSelectAllRow(
    () => {
      document.querySelectorAll('#club-filter input').forEach(cb => cb.checked = true);
      updatePlayerFilter(currentData);
      renderTable(currentData);
      saveFilters();
    },
    () => {
      document.querySelectorAll('#club-filter input').forEach(cb => cb.checked = false);
      updatePlayerFilter(currentData);
      renderTable(currentData);
      saveFilters();
    }
  ));

  const clubGroup = document.createElement('div');
  clubGroup.className = 'filter-group';
  clubGroup.id = 'club-filter';
  clubs.forEach(club => {
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = club;
    cb.checked = true;
    cb.addEventListener('change', () => {
      updatePlayerFilter(currentData);
      renderTable(currentData);
      saveFilters();
    });
    label.appendChild(cb);
    label.appendChild(document.createTextNode(club));
    clubGroup.appendChild(label);
  });
  section.appendChild(clubGroup);

  // Restore saved club filter state
  const saved = loadFilters();
  if (saved?.uncheckedClubs?.length) {
    document.querySelectorAll('#club-filter input').forEach(cb => {
      if (saved.uncheckedClubs.includes(cb.value)) cb.checked = false;
    });
  }

  const playerHeading = document.createElement('h3');
  playerHeading.textContent = 'Spieler';
  section.appendChild(playerHeading);

  section.appendChild(makeSelectAllRow(
    () => {
      document.querySelectorAll('#player-filter input').forEach(cb => cb.checked = true);
      renderTable(currentData);
      saveFilters();
    },
    () => {
      document.querySelectorAll('#player-filter input').forEach(cb => cb.checked = false);
      renderTable(currentData);
      saveFilters();
    }
  ));

  const playerGroup = document.createElement('div');
  playerGroup.className = 'filter-group';
  playerGroup.id = 'player-filter';
  section.appendChild(playerGroup);

  updatePlayerFilter(data, saved?.uncheckedPlayers ?? null);
}

function getSelectedClubs() {
  return new Set(
    [...document.querySelectorAll('#club-filter input:checked')].map(cb => cb.value)
  );
}

function updatePlayerFilter(data, overrideUnchecked = null) {
  const playerGroup = document.getElementById('player-filter');
  if (!playerGroup) return;

  const selectedClubs = getSelectedClubs();
  const prevUnchecked = overrideUnchecked !== null
    ? new Set(overrideUnchecked)
    : new Set([...document.querySelectorAll('#player-filter input:not(:checked)')].map(cb => cb.value));

  playerGroup.innerHTML = '';

  const byClub = new Map();
  data.forEach(e => {
    const club = playerClub(e.player);
    if (!club || !selectedClubs.has(club)) return;
    if (!byClub.has(club)) byClub.set(club, []);
    byClub.get(club).push(playerName(e.player));
  });

  byClub.forEach((players, club) => {
    const clubCbs = [];

    const header = document.createElement('div');
    header.className = 'player-club-group-header';
    const clubSpan = document.createElement('span');
    clubSpan.textContent = club;
    header.appendChild(clubSpan);

    const links = document.createElement('span');
    links.className = 'filter-select-all';
    [['alle', true], ['keine', false]].forEach(([text, checked], i) => {
      if (i) links.appendChild(document.createTextNode(' · '));
      const a = document.createElement('a');
      a.textContent = text;
      a.href = '#';
      a.addEventListener('click', e => {
        e.preventDefault();
        clubCbs.forEach(cb => cb.checked = checked);
        renderTable(currentData);
        saveFilters();
      });
      links.appendChild(a);
    });
    header.appendChild(links);
    playerGroup.appendChild(header);

    players.forEach(name => {
      const label = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = name;
      cb.checked = !prevUnchecked.has(name);
      cb.addEventListener('change', () => { renderTable(currentData); saveFilters(); });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(name));
      playerGroup.appendChild(label);
      clubCbs.push(cb);
    });
  });
}

function renderTable(data) {
  const content = document.getElementById('content');
  const existing = content.querySelector('table');
  if (existing) existing.remove();

  const selectedClubs = getSelectedClubs();
  const playerCbs = [...document.querySelectorAll('#player-filter input')];
  const allPlayersChecked = playerCbs.length === 0 || playerCbs.every(cb => cb.checked);
  const selectedPlayers = allPlayersChecked
    ? null
    : new Set(playerCbs.filter(cb => cb.checked).map(cb => cb.value));

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>#</th><th>Spieler</th><th>Performance</th></tr>';
  const tbody = document.createElement('tbody');

  data.forEach((entry, i) => {
    const name = playerName(entry.player);
    const club = playerClub(entry.player);

    if (club && !selectedClubs.has(club)) return;
    if (selectedPlayers && !selectedPlayers.has(name)) return;

    const tr = document.createElement('tr');
    let playerCell = escHtml(name);
    if (club) playerCell += ' <span class="club">' + escHtml(club) + '</span>';
    tr.innerHTML =
      '<td>' + (i + 1) + '</td>' +
      '<td>' + playerCell + '</td>' +
      '<td>' + Math.round(entry.performance * 1000) + '</td>';
    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  const exportBtn = content.querySelector('.export-btn');
  exportBtn ? content.insertBefore(table, exportBtn) : content.appendChild(table);
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function exportCSV() {
  if (!currentData || !currentPath) return;

  const selectedClubs = getSelectedClubs();
  const playerCbs = [...document.querySelectorAll('#player-filter input')];
  const allPlayersChecked = playerCbs.length === 0 || playerCbs.every(cb => cb.checked);
  const selectedPlayers = allPlayersChecked
    ? null
    : new Set(playerCbs.filter(cb => cb.checked).map(cb => cb.value));

  const csvQuote = s => '"' + s.replace(/"/g, '""') + '"';
  const rows = ['#,Spieler,Verein,Performance'];
  currentData.forEach((entry, i) => {
    const name = playerName(entry.player);
    const club = playerClub(entry.player);
    if (club && !selectedClubs.has(club)) return;
    if (selectedPlayers && !selectedPlayers.has(name)) return;
    rows.push((i + 1) + ',' + csvQuote(name) + ',' + (club ? csvQuote(club) : '') + ',' + Math.round(entry.performance * 1000));
  });

  const blob = new Blob([rows.join('\\r\\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = currentPath.replace(/\\//g, '_') + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

loadTree();
</script>
</body>
</html>
"""


def build_tree(base: Path):
    """Recursively build a nested dict/list tree of .json files under base."""
    result = {}
    try:
        entries = sorted(base.iterdir(), key=lambda p: p.name)
    except PermissionError:
        return result

    files = [e.stem for e in entries if e.is_file() and e.suffix == ".json"]
    dirs = [e for e in entries if e.is_dir()]

    for d in dirs:
        subtree = build_tree(d)
        if subtree is not None:
            result[d.name] = subtree

    if files:
        if result:
            # mixed: attach files under a special key — keep as list at this level
            # by treating files as direct children alongside dirs; store as-is
            result["__files__"] = files
        else:
            return files

    return result or None


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"  {self.address_string()} {fmt % args}")

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_html(self, html: str):
        body = html.encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?")[0]

        if path in ("/", "/index.html"):
            self.send_html(HTML)

        elif path == "/api/tree":
            tree = build_tree(RANKINGS_DIR)
            self.send_json(tree or {})

        elif path.startswith("/api/ranking/"):
            rel = path[len("/api/ranking/"):]
            # Sanitize: no '..' allowed
            parts = Path(rel).parts
            if ".." in parts or not parts:
                self.send_json({"error": "invalid path"}, 400)
                return
            file_path = RANKINGS_DIR.joinpath(*parts).with_suffix(".json")
            if not file_path.exists() or not file_path.is_file():
                self.send_json({"error": "not found"}, 404)
                return
            with open(file_path, encoding="utf-8") as f:
                data = json.load(f)
            self.send_json(data)

        else:
            self.send_response(404)
            self.end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    server = HTTPServer(("", port), Handler)
    print(f"Rankings viewer running at http://localhost:{port}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
