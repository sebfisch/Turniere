#!/usr/bin/env python3
"""Scrape team match discipline results from dbv.turnier.de.

Usage:
    python scrape_drawmatches.py <draw_url>

Example:
    python scrape_drawmatches.py "https://dbv.turnier.de/sport/drawmatches.aspx?id=97942D0C-DABA-453D-AF6B-78FE0548BFC0&draw=11"
"""

import json
import re
import sys
from urllib.parse import urljoin, urlparse

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


def main():
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        sys.exit(1)
    draw_url = sys.argv[1]
    matches = scrape(draw_url)
    print(f"Total discipline matches: {len(matches)}", file=sys.stderr)
    print(json.dumps(matches, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
