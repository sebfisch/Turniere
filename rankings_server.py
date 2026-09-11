#!/usr/bin/env python3
"""Standalone rankings viewer web server.

Usage:
    python3 rankings_server.py [port]

Default port: 8765
"""

import json
import os
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

BASE_DIR = Path(__file__).parent
RANKINGS_DIR = BASE_DIR / "rankings"
MATCHES_DIR = BASE_DIR / "matches"

sys.path.insert(0, str(BASE_DIR))
import rank as rank_mod  # noqa: E402

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

  #tournament {
    margin-top: 2.5rem;
    border-top: 1px solid #ccc;
    padding-top: 1rem;
    max-width: 48rem;
  }
  #tournament h3 {
    font-size: 0.75rem;
    font-weight: 400;
    margin: 1.2rem 0 0.4rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  #tournament h3:first-child { margin-top: 0; }
  .t-block {
    border-top: 1px dashed #ccc;
    padding-top: 0.5rem;
    margin-top: 1.5rem;
  }
  .t-block:first-of-type { border-top: none; padding-top: 0; margin-top: 0; }
  .t-participants label.other { opacity: 0.55; }
  .t-settings {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }
  .t-settings label {
    display: flex;
    flex-direction: column;
    font-size: 0.7rem;
    color: #888;
    gap: 0.15rem;
  }
  .t-buttons form { display: flex; gap: 0.4rem; }
  .t-settings input, .t-settings select, .t-buttons input {
    font-family: 'Roboto Condensed', sans-serif;
    font-size: 0.9rem;
    padding: 0.25rem 0.4rem;
    border: 1px solid #ccc;
    border-radius: 3px;
    background: none;
    color: inherit;
  }
  .t-settings input[name=event] { width: 14rem; }
  .t-settings input[name=file] { width: 16rem; }
  .t-participants {
    display: flex;
    flex-wrap: wrap;
    gap: 0.1rem 1.2rem;
    font-family: 'Roboto Condensed', sans-serif;
    font-size: 0.9rem;
  }
  .t-participants label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    cursor: pointer;
  }
  .t-participants label:hover { background: #eee; }
  .t-participants .remove {
    color: #aaa;
    text-decoration: none;
    padding: 0 0.2rem;
  }
  .t-participants .remove:hover { color: #c00; }
  .t-count { color: #888; font-size: 0.8rem; margin: 0.3rem 0; }
  #tournament .filter-select-all { margin: 0.4rem 0 0.2rem 0.3rem; }
  .t-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin-top: 1rem;
  }
  .t-buttons .export-btn { margin-top: 0; }
  .t-round form {
    display: flex;
    gap: 0.5rem;
    margin: 0.3rem 0;
  }
  .t-round input {
    font-family: 'Roboto Condensed', sans-serif;
    font-size: 0.9rem;
    padding: 0.25rem 0.4rem;
    border: 1px solid #ccc;
    border-radius: 3px;
    background: none;
    color: inherit;
  }
  .t-round input.party { width: 16rem; }
  .t-round input.games { width: 9rem; text-align: center; }
  .t-round-head { color: #888; font-size: 0.85rem; margin: 0.6rem 0 0.2rem; }
  .t-status { font-size: 0.85rem; margin: 0.5rem 0; color: #888; white-space: pre-line; }
  .t-status.error { color: #c00; }

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
    #tournament { border-color: #444; }
    .t-block { border-color: #444; }
    #tournament h3 { color: #666; }
    .t-settings input, .t-settings select, .t-buttons input, .t-round input { border-color: #444; }
    .t-participants label:hover { background: #222; }
    .t-participants .remove { color: #666; }
    .t-participants .remove:hover { color: #f66; }
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

function buildFileList(names, path) {
  const ul = document.createElement('ul');
  names.forEach(name => {
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

function buildNode(node, path) {
  if (Array.isArray(node)) {
    return buildFileList(node, path);
  }

  const frag = document.createDocumentFragment();
  Object.keys(node).sort((a, b) => {
    if (a === '') return 1;
    if (b === '') return -1;
    return a.localeCompare(b);
  }).forEach(key => {
    if (key === '') { frag.appendChild(buildFileList(node[''], path)); return; }
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

  buildTournament();
}

function currentFilterSets() {
  const selectedClubs = getSelectedClubs();
  const playerCbs = [...document.querySelectorAll('#player-filter input')];
  const allPlayersChecked = playerCbs.length === 0 || playerCbs.every(cb => cb.checked);
  const selectedPlayers = allPlayersChecked
    ? null
    : new Set(playerCbs.filter(cb => cb.checked).map(cb => cb.value));
  return { selectedClubs, selectedPlayers };
}

function isVisibleEntry(entry, { selectedClubs, selectedPlayers }) {
  const club = playerClub(entry.player);
  if (club && !selectedClubs.has(club)) return false;
  if (selectedPlayers && !selectedPlayers.has(playerName(entry.player))) return false;
  return true;
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

  if (data.length === 0) {
    section.style.display = 'none';
    return;
  }

  const clubs = [...new Set(data.map(e => playerClub(e.player)).filter(Boolean))].sort();

  section.innerHTML = '';
  section.style.display = '';

  if (clubs.length > 0) {
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
  }

  // Restore saved club filter state
  const saved = loadFilters();
  if (clubs.length > 0 && saved?.uncheckedClubs?.length) {
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
  const hasClubFilter = document.getElementById('club-filter') !== null;
  const prevUnchecked = overrideUnchecked !== null
    ? new Set(overrideUnchecked)
    : new Set([...document.querySelectorAll('#player-filter input:not(:checked)')].map(cb => cb.value));

  playerGroup.innerHTML = '';

  function makePlayerCheckbox(name) {
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = name;
    cb.checked = !prevUnchecked.has(name);
    cb.addEventListener('change', () => { renderTable(currentData); saveFilters(); });
    label.appendChild(cb);
    label.appendChild(document.createTextNode(name));
    return { label, cb };
  }

  function makeClubGroupHeader(title, getCbs) {
    const header = document.createElement('div');
    header.className = 'player-club-group-header';
    const clubSpan = document.createElement('span');
    clubSpan.textContent = title;
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
        getCbs().forEach(cb => cb.checked = checked);
        renderTable(currentData);
        saveFilters();
      });
      links.appendChild(a);
    });
    header.appendChild(links);
    return header;
  }

  if (hasClubFilter) {
    const byClub = new Map();
    const noClubPlayers = [];
    data.forEach(e => {
      const club = playerClub(e.player);
      const name = playerName(e.player);
      if (!club) { noClubPlayers.push(name); return; }
      if (!selectedClubs.has(club)) return;
      if (!byClub.has(club)) byClub.set(club, []);
      byClub.get(club).push(name);
    });

    const sortedByClub = [...byClub.entries()].sort(([a], [b]) => a.localeCompare(b));
    sortedByClub.forEach(([club, players]) => {
      players.sort((a, b) => a.localeCompare(b));
      const clubCbs = [];
      playerGroup.appendChild(makeClubGroupHeader(club, () => clubCbs));
      players.forEach(name => {
        const { label, cb } = makePlayerCheckbox(name);
        playerGroup.appendChild(label);
        clubCbs.push(cb);
      });
    });

    if (noClubPlayers.length > 0) {
      noClubPlayers.sort((a, b) => a.localeCompare(b));
      const noClubCbs = [];
      playerGroup.appendChild(makeClubGroupHeader('Ohne Verein', () => noClubCbs));
      noClubPlayers.forEach(name => {
        const { label, cb } = makePlayerCheckbox(name);
        playerGroup.appendChild(label);
        noClubCbs.push(cb);
      });
    }
  } else {
    const allPlayers = [...new Set(data.map(e => playerName(e.player)))].sort((a, b) => a.localeCompare(b));
    allPlayers.forEach(name => {
      const { label } = makePlayerCheckbox(name);
      playerGroup.appendChild(label);
    });
  }
}

function renderTable(data) {
  const content = document.getElementById('content');
  const existing = content.querySelector('table');
  if (existing) existing.remove();

  const filters = currentFilterSets();

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>#</th><th>Spieler</th><th style="text-align:right">Spiele</th><th>Performance</th></tr>';
  const tbody = document.createElement('tbody');

  data.forEach((entry, i) => {
    const name = playerName(entry.player);
    const club = playerClub(entry.player);

    if (!isVisibleEntry(entry, filters)) return;

    const tr = document.createElement('tr');
    let playerCell = escHtml(name);
    if (club) playerCell += ' <span class="club">' + escHtml(club) + '</span>';
    tr.innerHTML =
      '<td>' + (i + 1) + '</td>' +
      '<td>' + playerCell + '</td>' +
      '<td style="text-align:right">' + (entry.matches ?? '') + '</td>' +
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

  const filters = currentFilterSets();

  const csvQuote = s => '"' + s.replace(/"/g, '""') + '"';
  const rows = ['#,Spieler,Verein,Spiele,Performance'];
  currentData.forEach((entry, i) => {
    const name = playerName(entry.player);
    const club = playerClub(entry.player);
    if (!isVisibleEntry(entry, filters)) return;
    rows.push((i + 1) + ',' + csvQuote(name) + ',' + (club ? csvQuote(club) : '') + ',' + (entry.matches ?? '') + ',' + Math.round(entry.performance * 1000));
  });

  const blob = new Blob([rows.join('\\r\\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = currentPath.replace(/\\//g, '_') + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Tournament mode ----------

let configs = [];
let matchFiles = [];
let tState = null;

async function loadMeta() {
  try {
    const [cfgRes, filesRes] = await Promise.all([fetch('/api/configs'), fetch('/api/matchfiles')]);
    configs = await cfgRes.json();
    matchFiles = await filesRes.json();
  } catch (e) {
    configs = [];
    matchFiles = [];
  }
}

function tKey() { return 'tt:' + currentPath; }

function seasonPrefix() {
  const seasons = [...new Set(matchFiles.map(f => f.split('/')[0]))]
    .filter(s => /^\\d\\d_\\d\\d$/.test(s))
    .sort();
  if (seasons.length) return seasons[seasons.length - 1];
  const now = new Date();
  const y = now.getFullYear() - 2000 - (now.getMonth() < 6 ? 1 : 0);
  return String(y).padStart(2, '0') + '_' + String(y + 1).padStart(2, '0');
}

function defaultTournament(id) {
  const now = new Date();
  const date = now.getFullYear() + '.' +
    String(now.getMonth() + 1).padStart(2, '0') + '.' +
    String(now.getDate()).padStart(2, '0');
  const disc = currentPath.toLowerCase().includes('doppel') ? 'Doppel' : 'Einzel';
  const seg = currentPath.split('/')[0];
  return {
    id,
    event: date + ' ' + disc,
    file: seasonPrefix() + '/intern/' + date + '.json',
    config: configs.includes(seg) ? seg : (configs[0] || ''),
    minNew: 2,  // minimum new opponents per doubles round
    round: [],  // [{ byes: [...], matches: [{ home: 'a/b', result: '11:5 ...', away: 'c/d' }] }]
  };
}

function defaultTState() {
  return {
    players: [],  // { name, extern, t: tournament id or null } — pool shared by all tournaments
    tournaments: [defaultTournament(1)],
    nextId: 2,
  };
}

function loadTState() {
  try {
    const raw = localStorage.getItem(tKey());
    if (!raw) return defaultTState();
    const st = JSON.parse(raw);
    if (!st.tournaments) {
      // Migrate older single-tournament formats.
      const def = defaultTournament(1);
      let round = Array.isArray(st.round) ? st.round : [];
      if (round.length && !round[0].matches) round = [{ byes: st.byes || [], matches: round }];
      return {
        players: (st.players || []).map(p => ({ name: p.name, extern: p.extern, t: p.playing ? 1 : null })),
        tournaments: [{
          id: 1,
          event: st.event || def.event,
          file: st.file || def.file,
          config: st.config || def.config,
          minNew: 2,
          round,
        }],
        nextId: 2,
      };
    }
    st.players = st.players || [];
    if (!Array.isArray(st.tournaments) || !st.tournaments.length) {
      st.tournaments = [defaultTournament(1)];
    }
    st.tournaments.forEach(t => {
      if (!Array.isArray(t.round)) t.round = [];
      if (t.minNew == null) t.minNew = 2;
    });
    if (!st.nextId) st.nextId = Math.max(...st.tournaments.map(t => t.id)) + 1;
    return st;
  } catch (e) {}
  return defaultTState();
}

function saveTState() { localStorage.setItem(tKey(), JSON.stringify(tState)); }

const tEls = new Map();  // tournament id -> { participants, count, round, status, save, discard }

function tStatus(t, msg, isError) {
  const els = tEls.get(t.id);
  if (!els) return;
  els.status.textContent = msg || '';
  els.status.className = 't-status' + (isError ? ' error' : '');
}

function tButton(text, onClick) {
  const b = document.createElement('button');
  b.textContent = text;
  b.className = 'export-btn';
  b.type = onClick ? 'button' : 'submit';
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

function buildTournament() {
  tState = loadTState();
  const known = new Set((currentData || []).map(e => playerName(e.player)));
  tState.players.forEach(p => { p.extern = !known.has(p.name); });
  const validIds = new Set(tState.tournaments.map(t => t.id));
  tState.players.forEach(p => { if (p.t != null && !validIds.has(p.t)) p.t = null; });

  const content = document.getElementById('content');
  const old = document.getElementById('tournament');
  if (old) old.remove();
  const section = document.createElement('section');
  section.id = 'tournament';
  tEls.clear();

  const datalist = document.createElement('datalist');
  datalist.id = 'matchfile-list';
  matchFiles.forEach(f => {
    const o = document.createElement('option');
    o.value = f;
    datalist.appendChild(o);
  });
  section.appendChild(datalist);

  tState.tournaments.forEach((t, i) => section.appendChild(tournamentBlock(t, i, known)));

  const addRow = document.createElement('div');
  addRow.className = 't-buttons';
  addRow.appendChild(tButton('+ Turnier', addTournament));
  section.appendChild(addRow);

  content.appendChild(section);
  renderAllParticipants();
  tState.tournaments.forEach(t => renderRound(t));
  loadTournamentRankings();
}

const tHeading = text => {
  const e = document.createElement('h3');
  e.textContent = text;
  return e;
};

function tournamentBlock(t, index, known) {
  const block = document.createElement('div');
  block.className = 't-block';

  block.appendChild(tHeading('Turnier ' + (index + 1)));

  const settings = document.createElement('div');
  settings.className = 't-settings';
  const makeField = (labelText, input) => {
    const label = document.createElement('label');
    label.appendChild(document.createTextNode(labelText));
    label.appendChild(input);
    settings.appendChild(label);
    return label;
  };

  const eventInput = document.createElement('input');
  eventInput.type = 'text';
  eventInput.name = 'event';
  eventInput.value = t.event;
  eventInput.placeholder = '2026.09.10 Doppel';
  eventInput.addEventListener('change', () => {
    t.event = eventInput.value;
    saveTState();
    syncMinNewVisibility();
    loadTournamentRankings();
  });
  makeField('Event (letztes Wort: Disziplin)', eventInput);

  const fileInput = document.createElement('input');
  fileInput.type = 'text';
  fileInput.name = 'file';
  fileInput.value = t.file;
  fileInput.placeholder = '26_27/intern/alle.json';
  fileInput.setAttribute('list', 'matchfile-list');
  fileInput.addEventListener('change', () => { t.file = fileInput.value; saveTState(); loadTournamentRankings(); });
  makeField('Match-Datei (unter matches/)', fileInput);

  const configSelect = document.createElement('select');
  configSelect.name = 'config';
  configs.forEach(c => {
    const o = document.createElement('option');
    o.value = c;
    o.textContent = c;
    if (c === t.config) o.selected = true;
    configSelect.appendChild(o);
  });
  configSelect.addEventListener('change', () => { t.config = configSelect.value; saveTState(); });
  makeField('Ranglisten-Konfiguration', configSelect);

  const minNewSelect = document.createElement('select');
  minNewSelect.name = 'minNew';
  [0, 1, 2, 3].forEach(n => {
    const o = document.createElement('option');
    o.value = n;
    o.textContent = n;
    if (n === t.minNew) o.selected = true;
    minNewSelect.appendChild(o);
  });
  minNewSelect.addEventListener('change', () => {
    t.minNew = parseInt(minNewSelect.value);
    saveTState();
  });
  const minNewField = makeField('Mind. neue Gegner pro Runde', minNewSelect);
  // Only meaningful for doubles (singles keep the fixed no-repeat rule).
  const syncMinNewVisibility = () => {
    minNewField.style.display = playersPerMatchFor(t.event) === 4 ? '' : 'none';
  };
  syncMinNewVisibility();

  block.appendChild(settings);

  block.appendChild(tHeading('Spieler'));

  const addRow = document.createElement('div');
  addRow.className = 't-buttons';
  addRow.appendChild(tButton('Sichtbare Spieler übernehmen', () => addVisiblePlayers(t)));

  const extForm = document.createElement('form');
  const extInput = document.createElement('input');
  extInput.type = 'text';
  extInput.placeholder = 'Weiterer Spieler';
  extForm.appendChild(extInput);
  extForm.appendChild(tButton('Hinzufügen', null));
  extForm.addEventListener('submit', e => {
    e.preventDefault();
    const name = extInput.value.trim();
    if (!name) return;
    const existing = tState.players.find(p => p.name === name);
    if (existing) existing.t = t.id;
    else tState.players.push({ name, extern: !known.has(name), t: t.id });
    extInput.value = '';
    saveTState();
    renderAllParticipants();
  });
  addRow.appendChild(extForm);
  block.appendChild(addRow);

  block.appendChild(makeSelectAllRow(
    () => {
      tState.players.forEach(p => { p.t = t.id; });
      saveTState();
      renderAllParticipants();
    },
    () => {
      tState.players.forEach(p => { if (p.t === t.id) p.t = null; });
      saveTState();
      renderAllParticipants();
    }
  ));

  const participants = document.createElement('div');
  participants.className = 't-participants';
  block.appendChild(participants);
  const count = document.createElement('div');
  count.className = 't-count';
  block.appendChild(count);

  block.appendChild(tHeading('Runden'));
  const round = document.createElement('div');
  round.className = 't-round';
  block.appendChild(round);
  const status = document.createElement('div');
  status.className = 't-status';
  block.appendChild(status);

  const buttons = document.createElement('div');
  buttons.className = 't-buttons';
  buttons.appendChild(tButton('Nächste Runde', () => generateRound(t)));
  const save = tButton('Speichern', () => saveRound(t));
  buttons.appendChild(save);
  const discard = tButton('Matches verwerfen', () => discardMatches(t));
  buttons.appendChild(discard);
  if (tState.tournaments.length > 1) {
    buttons.appendChild(tButton('Turnier entfernen', () => removeTournament(t)));
  }
  block.appendChild(buttons);

  tEls.set(t.id, { participants, count, round, status, save, discard });
  return block;
}

function addTournament() {
  syncRoundFromForms();
  const t = defaultTournament(tState.nextId++);
  const last = tState.tournaments[tState.tournaments.length - 1];
  if (last) { t.file = last.file; t.config = last.config; }
  // Event names must differ; keep the discipline as the last word.
  const events = new Set(tState.tournaments.map(x => x.event));
  if (events.has(t.event)) {
    const words = t.event.split(' ');
    const disc = words.pop();
    for (let n = 2; ; n++) {
      const candidate = [...words, '(' + n + ')', disc].join(' ');
      if (!events.has(candidate)) { t.event = candidate; break; }
    }
  }
  tState.tournaments.push(t);
  saveTState();
  buildTournament();
}

function removeTournament(t) {
  syncRoundFromForms();
  if (t.round.some(r => r.matches.length) &&
      !confirm('Turnier mit ungespeicherten Matches entfernen?')) return;
  tState.tournaments = tState.tournaments.filter(x => x !== t);
  tState.players.forEach(p => { if (p.t === t.id) p.t = null; });
  if (!tState.tournaments.length) tState.tournaments = [defaultTournament(tState.nextId++)];
  saveTState();
  buildTournament();
}

function addVisiblePlayers(t) {
  const filters = currentFilterSets();
  const existing = new Set(tState.players.map(p => p.name));
  (currentData || []).forEach(entry => {
    if (!isVisibleEntry(entry, filters)) return;
    const name = playerName(entry.player);
    if (!existing.has(name)) {
      tState.players.push({ name, extern: false, t: t.id });
      existing.add(name);
    }
  });
  saveTState();
  renderAllParticipants();
}

function renderAllParticipants() {
  tState.tournaments.forEach(t => renderParticipants(t));
}

let tRankings = new Map();  // tournament id -> Map(name -> { rank, performance, matches })
let dayPlayers = new Set(); // players with saved matches in any displayed tournament

async function loadTournamentRankings() {
  const rankings = new Map();
  const played = new Set();
  await Promise.all(tState.tournaments.map(async t => {
    const file = t.file.trim();
    const event = t.event.trim();
    if (!file || !event) return;
    try {
      const res = await fetch('/api/event-ranking?file=' + encodeURIComponent(file) +
        '&event=' + encodeURIComponent(event));
      if (!res.ok) return;
      const entries = await res.json();
      const m = new Map();
      entries.forEach((e, i) => {
        const name = playerName(e.player);
        m.set(name, { rank: i + 1, performance: e.performance, matches: e.matches });
        played.add(name);
      });
      rankings.set(t.id, m);
    } catch (e) {}
  }));
  tRankings = rankings;
  dayPlayers = played;
  renderAllParticipants();
}

function renderParticipants(t) {
  const els = tEls.get(t.id);
  if (!els) return;
  els.participants.innerHTML = '';
  tState.players.sort((a, b) => a.name.localeCompare(b.name));
  // Order the pool by this tournament's own ranking; players without
  // matches in it follow alphabetically.
  const ranking = tRankings.get(t.id);
  const rankOf = p => (ranking && ranking.has(p.name)) ? ranking.get(p.name).rank : Infinity;
  const order = [...tState.players].sort((a, b) =>
    rankOf(a) - rankOf(b) || a.name.localeCompare(b.name));
  const indexById = new Map(tState.tournaments.map((x, i) => [x.id, i + 1]));
  order.forEach(p => {
    const info = ranking && ranking.get(p.name);
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = p.t === t.id;
    if (p.t != null && p.t !== t.id) {
      label.className = 'other';
      label.title = 'spielt in Turnier ' + indexById.get(p.t);
    }
    cb.addEventListener('change', () => {
      p.t = cb.checked ? t.id : null;  // exclusive: checking here unchecks everywhere else
      saveTState();
      renderAllParticipants();
    });
    label.appendChild(cb);
    label.appendChild(document.createTextNode(
      (info ? info.rank + '. ' : '') + p.name + (p.extern ? ' *' : '')
    ));
    if (info) {
      const perfSpan = document.createElement('span');
      perfSpan.className = 'club';
      perfSpan.textContent = Math.round(info.performance * 1000);
      perfSpan.title = info.matches + ' Matches in diesem Turnier';
      label.appendChild(perfSpan);
    }
    if (!dayPlayers.has(p.name)) {
      const rm = document.createElement('a');
      rm.textContent = '×';
      rm.href = '#';
      rm.className = 'remove';
      rm.title = 'aus allen Turnieren entfernen';
      rm.addEventListener('click', e => {
        e.preventDefault();
        tState.players = tState.players.filter(q => q !== p);
        saveTState();
        renderAllParticipants();
      });
      label.appendChild(rm);
    }
    els.participants.appendChild(label);
  });
  els.count.textContent = tState.players.filter(p => p.t === t.id).length + ' Spieler ausgewählt' +
    (tState.players.some(p => p.extern) ? ' (* nicht in der Rangliste)' : '');
}

function renderRound(t) {
  const els = tEls.get(t.id);
  if (!els) return;
  els.round.innerHTML = '';
  const has = t.round.some(r => r.matches.length);
  els.save.style.display = has ? '' : 'none';
  els.discard.style.display = has ? '' : 'none';
  t.round.forEach((round, ri) => {
    const head = document.createElement('div');
    head.className = 't-round-head';
    head.textContent = 'Runde ' + (ri + 1) +
      (round.byes && round.byes.length ? ' – Freilos: ' + round.byes.join(', ') : '');
    els.round.appendChild(head);
    round.matches.forEach(m => {
      const form = document.createElement('form');
      form.innerHTML =
        '<input class="party" type="text" name="home" placeholder="Heim">' +
        '<input class="games" type="text" name="result" placeholder="Ergebnis">' +
        '<input class="party" type="text" name="away" placeholder="Gast">';
      form.home.value = m.home;
      form.result.value = m.result || '';
      form.away.value = m.away;
      form.addEventListener('submit', e => e.preventDefault());
      form.addEventListener('change', syncRoundFromForms);
      els.round.appendChild(form);
    });
  });
}

function syncRoundFromForms() {
  tState.tournaments.forEach(t => {
    const els = tEls.get(t.id);
    if (!els) return;
    const forms = [...els.round.querySelectorAll('form')];
    let i = 0;
    t.round.forEach(round => round.matches.forEach(m => {
      const form = forms[i++];
      if (!form) return;
      m.home = form.home.value;
      m.result = form.result.value;
      m.away = form.away.value;
    }));
  });
  saveTState();
}

function discardMatches(t) {
  syncRoundFromForms();
  const anyResult = t.round.some(r => r.matches.some(m => (m.result || '').trim()));
  if (anyResult && !confirm('Eingetragene Ergebnisse verwerfen?')) return;
  t.round = [];
  saveTState();
  renderRound(t);
  tStatus(t, '');
}

// ----- round generation (ported from the old lib/ implementation) -----

const matchPlayerNames = m => m.home.concat(m.away).map(playerName);

function playersPerMatchFor(event) {
  const words = event.trim().split(/\\s+/);
  const code = (words[words.length - 1] || '').toUpperCase();
  return /^(DOPPEL|HD|DD|GD|MX|MIX)/.test(code) ? 4 : 2;
}

// Two players are "acquainted" if they appeared in any match together today
// (in any displayed tournament, saved or pending).
const pairKey = (a, b) => a < b ? a + '|' + b : b + '|' + a;

function diversityIndex(matches) {
  const matchKeys = new Set();
  const pairs = new Set();
  matches.forEach(m => {
    const names = matchPlayerNames(m).sort();
    matchKeys.add(names.join('|'));
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        pairs.add(pairKey(names[i], names[j]));
      }
    }
  });
  return { matchKeys, pairs };
}

// Singles: never repeat an exact pairing. Doubles: each of the four players
// may be acquainted with at most (3 - minNew) of the other three.
function notDiverseEnough(isSingles, players, index, minNew) {
  if (isSingles) return index.matchKeys.has([...players].sort().join('|'));
  if (minNew <= 0) return false;
  const maxKnown = 3 - minNew;
  return players.some(p =>
    players.filter(q => q !== p && index.pairs.has(pairKey(p, q))).length > maxKnown
  );
}

function initIxs(playersPerMatch) {
  const result = [];
  for (let i = 0; i < playersPerMatch - 1; i++) result.push(i);
  return result;
}

function nextIxs(ixs) {
  const result = [...ixs];
  let i = 0;
  while (i < result.length - 1 && result[i] + 1 === result[i + 1]) {
    result[i] = i++;
  }
  result[i]++;
  return result;
}

function searchCombinations(ixs, players, index, minNew) {
  if (players.length === 0) return [];
  let [fst, ...rest] = players;
  if (ixs[ixs.length - 1] >= rest.length) throw 'no solution';
  const others = ixs.map(ix => rest[ix]);
  if (notDiverseEnough(ixs.length === 1, [fst, ...others], index, minNew)) {
    return searchCombinations(nextIxs(ixs), players, index, minNew);
  }
  for (const ix of ixs) rest[ix] = null;
  rest = rest.filter(p => p);
  try {
    return [[fst, ...others], ...searchCombinations(initIxs(ixs.length + 1), rest, index, minNew)];
  } catch (e) {
    return searchCombinations(nextIxs(ixs), players, index, minNew);
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Byes go to randomly drawn players among those with the most matches
// in this tournament (spilling into the next tier if needed).
function drawByes(players, counts, byeCount) {
  const tiers = new Map();
  players.forEach(p => {
    const c = counts[p] || 0;
    if (!tiers.has(c)) tiers.set(c, []);
    tiers.get(c).push(p);
  });
  const byes = [];
  [...tiers.keys()].sort((a, b) => b - a).forEach(c => {
    if (byes.length >= byeCount) return;
    byes.push(...shuffle(tiers.get(c)).slice(0, byeCount - byes.length));
  });
  return byes;
}

function gauss() {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Order by skill with random jitter on the log scale, scaled to the mean
// gap between neighbours: keeps pairings between similarly ranked players
// while varying them between rounds.
function jitteredBySkill(players, perf) {
  const logs = new Map(players.map(p => [p, Math.log(perf[p] || 1)]));
  const sorted = [...logs.values()].sort((a, b) => b - a);
  let gapSum = 0;
  for (let i = 1; i < sorted.length; i++) gapSum += sorted[i - 1] - sorted[i];
  const sigma = sorted.length > 1 ? Math.max(gapSum / (sorted.length - 1), 0.02) : 0.1;
  return players
    .map(p => ({ p, key: logs.get(p) + sigma * gauss() }))
    .sort((a, b) => b.key - a.key)
    .map(({ p }) => p);
}

function combosToMatches(combos, playersPerMatch) {
  return combos.flatMap(c => playersPerMatch === 2
    ? [{ home: [c[0]], away: [c[1]] }]
    : [
        { home: [c[0], c[1]], away: [c[2], c[3]] },
        { home: [c[0], c[2]], away: [c[1], c[3]] },
        { home: [c[0], c[3]], away: [c[1], c[2]] },
      ]);
}

const parseParty = s => s.split('/').map(x => x.trim()).filter(x => x);

// Today's matches: every displayed tournament's saved matches (each displayed
// file, filtered by the displayed event names) plus all pending unsaved
// matches — so byes and diversity follow players who switch tournaments.
async function collectDayMatches() {
  const files = [...new Set(tState.tournaments.map(x => x.file.trim()).filter(f => f))];
  const events = new Set(tState.tournaments.map(x => x.event.trim()).filter(e => e));
  const saved = [];
  for (const f of files) {
    const res = await fetch('/api/matchfile/' + f);
    if (!res.ok) throw new Error(f);
    (await res.json()).forEach(m => { if (events.has(m.event)) saved.push(m); });
  }
  const pending = tState.tournaments.flatMap(x => x.round.flatMap(r => r.matches)).map(m => ({
    home: parseParty(m.home),
    away: parseParty(m.away),
    games: [],
  }));
  return saved.concat(pending);
}

async function generateRound(t) {
  syncRoundFromForms();
  const event = t.event.trim();
  const file = t.file.trim();
  if (!event || !file) { tStatus(t, 'Event und Match-Datei angeben.', true); return; }

  const players = tState.players.filter(p => p.t === t.id).map(p => p.name);
  const ppm = playersPerMatchFor(event);
  if (players.length < ppm) {
    tStatus(t, 'Zu wenige Spieler (' + players.length + ') für ' + (ppm === 2 ? 'Einzel' : 'Doppel') + '.', true);
    return;
  }

  let dayMatches;
  try {
    dayMatches = await collectDayMatches();
  } catch (e) {
    tStatus(t, 'Match-Datei konnte nicht geladen werden: ' + e.message, true);
    return;
  }

  const counts = {};
  dayMatches.forEach(m => matchPlayerNames(m).forEach(p => { counts[p] = (counts[p] || 0) + 1; }));
  const perf = {};
  (currentData || []).forEach(e => { perf[playerName(e.player)] = e.performance; });
  const index = diversityIndex(dayMatches);

  const byeCount = players.length % ppm;
  for (let attempt = 0; attempt < 100; attempt++) {
    const byes = byeCount ? drawByes(players, counts, byeCount) : [];
    const active = players.filter(p => !byes.includes(p));
    const ordered = jitteredBySkill(active, perf);
    try {
      const combos = searchCombinations(initIxs(ppm), ordered, index, t.minNew);
      t.round.push({
        byes,
        matches: combosToMatches(combos, ppm).map(m => ({
          home: m.home.join('/'),
          result: '',
          away: m.away.join('/'),
        })),
      });
      saveTState();
      renderRound(t);
      tStatus(t, '');
      return;
    } catch (e) { /* retry with fresh byes and jitter */ }
  }
  tStatus(t, 'Keine Runde gefunden, die die Diversitäts-Regeln erfüllt.', true);
}

function parseGames(text) {
  const games = [];
  for (const part of text.trim().split(/\\s+/).filter(s => s)) {
    const m = part.match(/^(\\d+)[:.](\\d+)$/);
    if (!m) return null;
    games.push({ home: parseInt(m[1]), away: parseInt(m[2]) });
  }
  return games;
}

function setTournamentBusy(busy) {
  document.querySelectorAll('#tournament button, #tournament input, #tournament select')
    .forEach(el => el.disabled = busy);
}

async function saveRound(t) {
  syncRoundFromForms();
  const event = t.event.trim();
  const played = [];
  const keptRounds = [];
  let keptCount = 0;
  for (const round of t.round) {
    const kept = [];
    for (const m of round.matches) {
      const games = parseGames(m.result || '');
      if (games === null) { tStatus(t, 'Ungültiges Ergebnis: "' + m.result + '"', true); return; }
      if (games.length === 0) { kept.push(m); keptCount++; continue; }
      const home = parseParty(m.home);
      const away = parseParty(m.away);
      if (!home.length || !away.length) { tStatus(t, 'Spieler fehlen in einem Match.', true); return; }
      played.push({ home, away, games, event });
    }
    if (kept.length) keptRounds.push({ byes: round.byes, matches: kept });
  }
  if (played.length === 0) { tStatus(t, 'Keine Ergebnisse eingetragen.', true); return; }

  tStatus(t, 'Speichert und berechnet Rangliste…');
  setTournamentBusy(true);
  try {
    const res = await fetch('/api/save-matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: t.file.trim(), matches: played, config: t.config }),
    });
    const result = await res.json();
    if (!res.ok || !result.ok) {
      throw new Error((result.log || [result.error || 'Unbekannter Fehler']).join('\\n'));
    }
    t.round = keptRounds;
    saveTState();
    const tid = t.id;
    const msg = played.length + ' Matches gespeichert' +
      (keptCount ? ', ' + keptCount + ' ungespielte behalten' : '') + '.';
    await loadMeta();
    await loadRanking(currentPath);
    tStatus({ id: tid }, msg);
  } catch (e) {
    setTournamentBusy(false);
    tStatus(t, 'Fehler beim Speichern: ' + e.message, true);
  }
}

loadMeta().then(loadTree);
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
            result[""] = files  # "" can never be a valid dir/file name
        else:
            return files

    return result or None


def safe_json_path(base: Path, rel: str):
    """Resolve rel below base with a .json suffix, or None if invalid."""
    parts = Path(rel).parts
    if not parts or ".." in parts or Path(rel).is_absolute():
        return None
    p = base.joinpath(*parts)
    # Append (not with_suffix, which would truncate dotted names like 2026.09.10)
    if p.suffix != ".json":
        p = p.with_name(p.name + ".json")
    return p


def valid_match(m):
    if not isinstance(m, dict):
        return False
    if not isinstance(m.get("event"), str) or not m["event"].strip():
        return False
    for side in ("home", "away"):
        players = m.get(side)
        if (
            not isinstance(players, list) or not players
            or not all(isinstance(p, str) and p.strip() for p in players)
        ):
            return False
    games = m.get("games")
    if not isinstance(games, list) or not games:
        return False
    return all(
        isinstance(g, dict)
        and isinstance(g.get("home"), int) and isinstance(g.get("away"), int)
        for g in games
    )


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

        elif path == "/api/configs":
            configs = sorted(
                p.stem
                for p in RANKINGS_DIR.glob("*.yaml")
                if p.is_file()
            )
            self.send_json(configs)

        elif path == "/api/matchfiles":
            files = sorted(
                str(p.relative_to(MATCHES_DIR))
                for p in MATCHES_DIR.rglob("*.json")
                if p.is_file()
            )
            self.send_json(files)

        elif path.startswith("/api/matchfile/"):
            rel = path[len("/api/matchfile/"):]
            file_path = safe_json_path(MATCHES_DIR, rel)
            if file_path is None:
                self.send_json({"error": "invalid path"}, 400)
                return
            if not file_path.exists():
                self.send_json([])
                return
            with open(file_path, encoding="utf-8") as f:
                data = json.load(f)
            matches = data if isinstance(data, list) else data.get("matches", [])
            self.send_json(matches)

        elif path == "/api/event-ranking":
            qs = parse_qs(urlparse(self.path).query)
            rel = (qs.get("file") or [""])[0]
            event = (qs.get("event") or [""])[0]
            file_path = safe_json_path(MATCHES_DIR, rel) if rel else None
            if file_path is None or not event:
                self.send_json({"error": "file and event required"}, 400)
                return
            if not file_path.exists():
                self.send_json([])
                return
            with open(file_path, encoding="utf-8") as f:
                data = json.load(f)
            matches = data if isinstance(data, list) else data.get("matches", [])
            filtered = [
                m for m in matches
                if m.get("games") and m.get("event") == event
            ]
            self.send_json(rank_mod.rank_players(filtered) if filtered else [])

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

    def do_POST(self):
        if self.path.split("?")[0] != "/api/save-matches":
            self.send_response(404)
            self.end_headers()
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
        except (ValueError, json.JSONDecodeError):
            self.send_json({"error": "invalid request body"}, 400)
            return

        rel = body.get("path")
        matches = body.get("matches")
        config = body.get("config")

        if not isinstance(rel, str) or not rel.strip():
            self.send_json({"error": "missing match file path"}, 400)
            return
        file_path = safe_json_path(MATCHES_DIR, rel.strip())
        if file_path is None:
            self.send_json({"error": "invalid match file path"}, 400)
            return

        if (
            not isinstance(matches, list) or not matches
            or not all(valid_match(m) for m in matches)
        ):
            self.send_json({"error": "invalid matches"}, 400)
            return

        if not isinstance(config, str) or Path(config).name != config:
            self.send_json({"error": "invalid config"}, 400)
            return
        config_path = (RANKINGS_DIR / config).with_suffix(".yaml")
        if not config_path.is_file():
            self.send_json({"error": f"config {config} not found"}, 400)
            return

        # Append to the match file (create it if necessary).
        if file_path.exists():
            with open(file_path, encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, dict):
                data.setdefault("matches", []).extend(matches)
            else:
                data.extend(matches)
        else:
            file_path.parent.mkdir(parents=True, exist_ok=True)
            data = matches
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")
        print(f"  saved {len(matches)} matches to {file_path}")

        # Rebuild the rankings for the selected config.
        proc = subprocess.run(
            [sys.executable, str(BASE_DIR / "rank.py"), str(config_path)],
            cwd=BASE_DIR,
            capture_output=True,
            text=True,
        )
        log_lines = proc.stderr.strip().splitlines()[-20:]
        self.send_json({
            "ok": proc.returncode == 0,
            "added": len(matches),
            "file": str(file_path.relative_to(MATCHES_DIR)),
            "log": log_lines,
        }, 200 if proc.returncode == 0 else 500)


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
