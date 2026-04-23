#!/usr/bin/env python3
"""Scrape match results from dbv.turnier.de.

Supports two URL formats:
  League draw:   /sport/drawmatches.aspx?id=...&draw=...
  Tournament:    /tournament/{uuid}/matches/{date}

Usage:
    python scrape_drawmatches.py <url>
    python scrape_drawmatches.py [--skip-existing] <yaml_file>

Examples:
    python scrape_drawmatches.py "https://dbv.turnier.de/sport/drawmatches.aspx?id=97942D0C-DABA-453D-AF6B-78FE0548BFC0&draw=11"
    python scrape_drawmatches.py "https://dbv.turnier.de/tournament/12b5758b-1a70-44cf-896e-5007fc035d99/matches/20250906"
    python scrape_drawmatches.py matchlinks.yaml
    python scrape_drawmatches.py --skip-existing matchlinks.yaml
"""

import json
import os
import re
import sys
from urllib.parse import urljoin, urlparse

import yaml

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://dbv.turnier.de"
USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0"


def make_session(draw_url: str) -> requests.Session:
    session = requests.Session()
    session.headers["User-Agent"] = USER_AGENT
    parsed = urlparse(draw_url)
    return_path = parsed.path + ("?" + parsed.query if parsed.query else "")
    session.post(
        f"{BASE_URL}/cookiewall/Save",
        data={"ReturnUrl": return_path, "SettingsOpen": "false", "CookiePurposes": "1"},
    )
    return session


def fetch_soup(session: requests.Session, url: str) -> BeautifulSoup:
    resp = session.get(url)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "html.parser")


def get_league_name(soup: BeautifulSoup) -> str:
    table = soup.find("table", class_="ruler matches")
    if not table:
        return ""
    cap = table.find("caption")
    if not cap:
        return ""
    text = cap.get_text(strip=True)
    # Strip "Spielübersicht" prefix and surrounding separators
    text = re.sub(r"^Spielübersicht\s*", "", text)
    text = re.sub(r"^Regionen\s*[–-]\s*", "", text)
    return text.strip()


def club_from_team_name(team_name: str) -> str:
    """Strip trailing team number and optional parenthetical to get club name.

    E.g. "SV Grün-Weiß 3 (Aufstieg)" → "SV Grün-Weiß"
    """
    return re.sub(r'\s+\d+(\s*\([^)]*\))?\s*$', '', team_name).strip()


def get_matches(soup: BeautifulSoup, base_url: str) -> list[dict]:
    """Return ordered list of {url, home_team, away_team} from the draw overview page.

    Each match has two <a class="teamname"> links (home, then away) pointing to the
    same match URL. We collect both team names from those links.
    """
    table = soup.find("table", class_="ruler matches")
    if not table:
        return []
    # Preserve order via insertion-ordered dict keyed by match ID
    matches: dict[str, dict] = {}
    for a in table.find_all("a", class_="teamname"):
        href = a.get("href", "")
        m = re.search(r"match=(\d+)", href)
        if not m:
            continue
        match_id = m.group(1)
        team_name = a.get_text(strip=True)
        if match_id not in matches:
            matches[match_id] = {"url": urljoin(base_url, href), "teams": []}
        matches[match_id]["teams"].append(team_name)
    result = []
    for info in matches.values():
        teams = info["teams"]
        result.append({
            "url": info["url"],
            "home_team": teams[0] if teams else "",
            "away_team": teams[1] if len(teams) > 1 else "",
        })
    return result


def parse_scores(td) -> list[dict]:
    score_span = td.find("span", class_="score")
    if not score_span:
        return []
    scores = []
    for span in score_span.find_all("span"):
        text = span.get_text(strip=True)
        parts = text.split("-")
        if len(parts) == 2 and parts[0].isdigit() and parts[1].isdigit():
            scores.append({"home": int(parts[0]), "away": int(parts[1])})
    return scores


def parse_discipline_matches(
    soup: BeautifulSoup, league_name: str, home_team: str = "", away_team: str = ""
) -> list[dict]:
    home_club = club_from_team_name(home_team) if home_team else ""
    away_club = club_from_team_name(away_team) if away_team else ""

    def make_player(name: str, club: str) -> dict:
        p = {"name": name}
        if club:
            p["club"] = club
        return p

    matches = []
    for table in soup.find_all("table", class_="ruler matches"):
        thead = table.find("thead")
        if not thead or "Disziplin" not in thead.get_text():
            continue
        tbody = table.find("tbody")
        if not tbody:
            continue
        for row in tbody.find_all("tr"):
            tds = row.find_all("td", recursive=False)
            if len(tds) != 5:
                continue
            discipline = tds[0].get_text(strip=True)
            if not discipline:
                continue
            home = [make_player(a.get_text(strip=True), home_club) for a in tds[1].find_all("a")]
            away = [make_player(a.get_text(strip=True), away_club) for a in tds[3].find_all("a")]
            raw_score = tds[4].get_text(" ", strip=True)
            home_str = " / ".join(p["name"] for p in home) if home else "(none)"
            away_str = " / ".join(p["name"] for p in away) if away else "(none)"

            def skip(reason):
                print(f"    SKIP {discipline} | {home_str} - {away_str} | {raw_score} ({reason})", file=sys.stderr)

            if not home or not away:
                skip("missing players")
                continue
            unknown = {"unbekannter spieler", "unbekannte spielerin"}
            if any(p["name"].lower() in unknown for p in home + away):
                skip("unknown player")
                continue
            if "aufgabe" in raw_score.lower():
                skip("retired (Aufgabe)")
                continue
            games = parse_scores(tds[4])
            if not games:
                skip("no score")
                continue
            if all(g["away"] == 0 for g in games) or all(g["home"] == 0 for g in games):
                skip("forfeit (zero points)")
                continue
            matches.append({
                "event": f"{league_name} {discipline}",
                "home": home,
                "away": away,
                "games": games,
            })
        break  # only the first matching table per page
    return matches


def scrape(draw_url: str) -> list[dict]:
    session = make_session(draw_url)
    soup = fetch_soup(session, draw_url)

    league_name = get_league_name(soup)
    base = urljoin(draw_url, ".")
    team_matches = get_matches(soup, base)

    print(f"League: {league_name}", file=sys.stderr)
    print(f"Team matches found: {len(team_matches)}", file=sys.stderr)

    all_matches = []
    for i, tm in enumerate(team_matches, 1):
        print(f"  [{i}/{len(team_matches)}] {tm['url']}", file=sys.stderr)
        try:
            match_soup = fetch_soup(session, tm["url"])
            matches = parse_discipline_matches(
                match_soup, league_name, tm["home_team"], tm["away_team"]
            )
            all_matches.extend(matches)
        except Exception as e:
            print(f"    ERROR: {e}", file=sys.stderr)

    return all_matches


def is_tournament_url(url: str) -> bool:
    return bool(re.search(r'/tournament/[0-9a-f-]+/', url, re.I))


def get_tournament_name(soup: BeautifulSoup) -> str:
    h2 = soup.find("h2", class_="media__title")
    if h2:
        span = h2.find("span", class_="nav-link__value")
        if span:
            return span.get_text(strip=True)
    # Fallback: page title
    title = soup.find("title")
    if title:
        text = title.get_text(strip=True)
        # Strip " | Deutscher Badminton Verband" suffix
        text = re.sub(r'\s*\|\s*Deutscher Badminton Verband$', '', text)
        # Strip leading "Spiele - " prefix
        text = re.sub(r'^Spiele\s*[-–]\s*', '', text)
        return text.strip()
    return ""


def get_tournament_dates(soup: BeautifulSoup) -> list[str]:
    dates = []
    for a in soup.find_all("a", class_="js-date-selection-tab"):
        val = a.get("data-value", "")
        if re.match(r'^\d{8}$', val):
            dates.append(val)
    return dates


_club_cache: dict[str, str] = {}


def get_club_name(session: requests.Session, tournament_id: str, club_id: str) -> str:
    key = f"{tournament_id}:{club_id}"
    if key in _club_cache:
        return _club_cache[key]
    try:
        soup = fetch_soup(session, f"{BASE_URL}/sport/club.aspx?id={tournament_id}&club={club_id}")
        for tag in soup.find_all(["h4", "h5", "h2"]):
            text = tag.get_text(strip=True)
            m = re.match(r'Verein:\s*(.+?)(?:\s*\([^)]+\))?\s*$', text)
            if m:
                name = m.group(1).strip()
                _club_cache[key] = name
                return name
    except Exception:
        pass
    _club_cache[key] = ""
    return ""


def parse_tournament_day(
    soup: BeautifulSoup, tournament_name: str, session: requests.Session, tournament_id: str
) -> list[dict]:
    matches = []
    for match_div in soup.find_all("div", class_="match"):
        if "match--list" not in (match_div.get("class") or []):
            continue

        # Discipline: first header title item → strip to base code (e.g. "HD B - Gruppe A" → "HD")
        header_items = match_div.find_all("li", class_="match__header-title-item")
        draw_name = header_items[0].get_text(strip=True) if header_items else ""
        m = re.match(r'^([A-Z]{2,3})', draw_name)
        discipline = m.group(1) if m else draw_name

        # Players: two .match__row divs
        rows = match_div.find_all("div", class_="match__row")
        if len(rows) < 2:
            continue

        def extract_players(row) -> list[dict]:
            players = []
            for value_div in row.find_all("div", class_="match__row-title-value"):
                a = value_div.find("a", class_="nav-link")
                if not a:
                    continue
                name = re.sub(r'\s*\[\d+\]', '', a.get_text(strip=True)).strip()
                if not name:
                    continue
                club_id = a.get("data-club-id", "")
                club = get_club_name(session, tournament_id, club_id) if club_id else ""
                p: dict = {"name": name}
                if club:
                    p["club"] = club
                players.append(p)
            return players

        home = extract_players(rows[0])
        away = extract_players(rows[1])

        home_str = " / ".join(p["name"] for p in home) if home else "(none)"
        away_str = " / ".join(p["name"] for p in away) if away else "(none)"

        def skip(reason):
            print(f"    SKIP {discipline} | {home_str} - {away_str} | ({reason})", file=sys.stderr)

        if not home or not away:
            skip("missing players")
            continue

        # Scores: .match__result > ul.points, each ul has two li (side1, side2)
        result_div = match_div.find("div", class_="match__result")
        if not result_div:
            skip("no result div")
            continue
        games = []
        for ul in result_div.find_all("ul", class_="points"):
            cells = ul.find_all("li", class_="points__cell")
            if len(cells) == 2:
                try:
                    games.append({"home": int(cells[0].get_text(strip=True)),
                                  "away": int(cells[1].get_text(strip=True))})
                except ValueError:
                    pass

        if not games:
            skip("no score")
            continue
        if all(g["away"] == 0 for g in games) or all(g["home"] == 0 for g in games):
            skip("forfeit (zero points)")
            continue

        msg_span = match_div.find("span", class_="match__message")
        if msg_span:
            msg = msg_span.get_text(strip=True)
            if msg.lower() in {"retired", "walkover"}:
                scores_str = " ".join(f"{g['home']}-{g['away']}" for g in games)
                skip(f"{msg} | {scores_str}")
                continue

        matches.append({
            "event": f"{tournament_name} {discipline}",
            "home": home,
            "away": away,
            "games": games,
        })
    return matches


def scrape_tournament(url: str) -> list[dict]:
    m = re.search(r'/tournament/([0-9a-f-]+)/', url, re.I)
    if not m:
        raise ValueError(f"Cannot parse tournament ID from URL: {url}")
    tournament_id = m.group(1)

    session = make_session(url)
    base_matches_url = f"{BASE_URL}/tournament/{tournament_id}/matches"
    soup = fetch_soup(session, base_matches_url)

    tournament_name = get_tournament_name(soup)
    dates = get_tournament_dates(soup)

    print(f"Tournament: {tournament_name}", file=sys.stderr)
    print(f"Dates found: {dates}", file=sys.stderr)

    all_matches = []
    for date in dates:
        day_url = f"{BASE_URL}/tournament/{tournament_id}/Matches/MatchesInDay?date={date}"
        print(f"  Fetching {date}...", file=sys.stderr)
        try:
            day_soup = fetch_soup(session, day_url)
            day_matches = parse_tournament_day(day_soup, tournament_name, session, tournament_id)
            print(f"    {len(day_matches)} matches", file=sys.stderr)
            all_matches.extend(day_matches)
        except Exception as e:
            print(f"    ERROR: {e}", file=sys.stderr)

    return all_matches


def iter_links(node, path: list = []):
    if isinstance(node, str):
        yield path, node
    elif isinstance(node, dict):
        for k, v in node.items():
            yield from iter_links(v, path + [str(k)])


def process_yaml(yaml_path: str, skip_existing: bool = False):
    with open(yaml_path) as f:
        data = yaml.load(f, Loader=yaml.BaseLoader)
    links = list(iter_links(data))
    print(f"Found {len(links)} links in {yaml_path}", file=sys.stderr)
    for key_path, url in links:
        out_path = os.path.join(*key_path[:-1], key_path[-1] + ".json")
        if skip_existing and os.path.exists(out_path):
            print(f"SKIP (exists): {out_path}", file=sys.stderr)
            continue
        print(f"\n=== {out_path} ===", file=sys.stderr)
        try:
            matches = scrape_tournament(url) if is_tournament_url(url) else scrape(url)
            print(f"Total discipline matches: {len(matches)}", file=sys.stderr)
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            with open(out_path, "w") as f:
                json.dump(matches, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"ERROR scraping {url}: {e}", file=sys.stderr)


def main():
    args = sys.argv[1:]
    skip_existing = "--skip-existing" in args
    args = [a for a in args if not a.startswith("--")]
    if len(args) != 1:
        print(__doc__, file=sys.stderr)
        sys.exit(1)
    arg = args[0]
    if arg.endswith((".yaml", ".yml")):
        process_yaml(arg, skip_existing=skip_existing)
    else:
        url = arg
        matches = scrape_tournament(url) if is_tournament_url(url) else scrape(url)
        print(f"Total discipline matches: {len(matches)}", file=sys.stderr)
        print(json.dumps(matches, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
