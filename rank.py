#!/usr/bin/env python3
"""
Badminton skill ranking via Poisson score model.
Port of lib/tf.ranking.js to pure Python (no dependencies).

Usage:
  python3 rank.py 25_26/*.json --discipline HD
  python3 rank.py 25_26/club.json --list-events
  python3 rank.py 25_26/*.json --filter "Landesliga.*HD"
  python3 rank.py rankings/25_26_27.yaml

YAML config mode: pass a .yaml file instead of JSON match files to build
several rankings in one run. Output files are written next to the config:
<config dir>/<config stem>/<top-level key>/<ranking name>.json. Match file
globs are resolved relative to the current working directory. Requires PyYAML.
"""

import argparse
import json
import math
import re
import sys
from collections import Counter


def player_key(p):
    """Normalize player entry (string or dict) to name string."""
    return p["name"] if isinstance(p, dict) else p


def player_club(p):
    """Extract club string from player entry, or None."""
    return p.get("club") if isinstance(p, dict) else None


def load_matches(files):
    matches = []
    for path in files:
        with open(path) as f:
            data = json.load(f)
        file_matches = data if isinstance(data, list) else data.get('matches', [])
        matches.extend(file_matches)
    return matches


_MIXED_RE = re.compile(r'^(?:GD|MIX|MX)(\d*)$')


def canon_discipline(code):
    """Canonical form of a discipline code: GD, MIX and MX are equivalent."""
    m = _MIXED_RE.match(code)
    return 'MX' + m.group(1) if m else code


def discipline_matches(event, disc):
    """True if the event's discipline (its last word) matches disc.

    Prefix match, so HE also catches HE1 and HE2; GD and MX catch each other.
    """
    words = event.split()
    code = canon_discipline(words[-1]) if words else ''
    return code.startswith(canon_discipline(disc))


def build_event_filter(args):
    predicates = []
    if args.discipline:
        for d in args.discipline:
            predicates.append(lambda e, d=d: discipline_matches(e, d))
    if args.event:
        event_set = set(args.event)
        predicates.append(lambda e: e in event_set)
    if args.filter:
        pattern = re.compile(args.filter)
        predicates.append(lambda e: bool(pattern.search(e)))
    if not predicates:
        return lambda e: True
    return lambda e: any(p(e) for p in predicates)


def softplus(x):
    """Numerically stable log(1 + exp(x))."""
    if x >= 0:
        return x + math.log1p(math.exp(-x))
    return math.log1p(math.exp(x))


def sigmoid(x):
    if x >= 0:
        return 1.0 / (1.0 + math.exp(-x))
    ex = math.exp(x)
    return ex / (1.0 + ex)


def rank_players(matches, max_iter=1000000, patience=1000):
    # Collect players and build name→club map
    player_set = set()
    name_to_club = {}
    for m in matches:
        for p in m['home'] + m['away']:
            name = player_key(p)
            player_set.add(name)
            club = player_club(p)
            if club and name not in name_to_club:
                name_to_club[name] = club
    players = sorted(player_set)
    n = len(players)
    if n == 0:
        return []

    idx = {p: i for i, p in enumerate(players)}

    # Precompile matches to index arrays
    compiled = [
        {
            'home': [idx[player_key(p)] for p in m['home']],
            'away': [idx[player_key(p)] for p in m['away']],
            'games': [(g['home'], g['away']) for g in m['games']],
        }
        for m in matches
    ]

    # Count matches per player
    match_counts = [0] * n
    for match in compiled:
        for i in match['home'] + match['away']:
            match_counts[i] += 1

    # Parameters
    skills = [0.0] * n

    # Adam state
    m1 = [0.0] * n  # first moment
    m2 = [0.0] * n  # second moment
    lr = 0.05
    beta1, beta2, eps = 0.9, 0.999, 1e-8
    lam = 1e-2  # L2 regularization

    # Convergence
    tol_abs = 1e-3
    tol_rel = 1e-3
    tol_grad = 1e-3
    ema_g = float('inf')
    beta_g = 0.9

    # Windowed loss comparison (compare to loss `window` steps ago, not just prev step).
    window = 50
    loss_history = []

    # Patience-based plateau detection.
    best_loss = float('inf')
    no_improve_count = 0

    print(f"Ranking {n} players from {len(compiled)} matches", file=sys.stderr)

    for step in range(max_iter):
        # Zero-center (translation invariance, speeds up convergence)
        mean_s = sum(skills) / n
        skills = [s - mean_s for s in skills]

        # Compute loss and gradient
        loss = 0.0
        grad = [0.0] * n

        for match in compiled:
            diff = (
                sum(skills[i] for i in match['home'])
                - sum(skills[i] for i in match['away'])
            )
            sig = sigmoid(diff)
            for A, B in match['games']:
                total = A + B
                loss += total * softplus(diff) - A * diff
                g_diff = total * sig - A
                for i in match['home']:
                    grad[i] += g_diff
                for i in match['away']:
                    grad[i] -= g_diff

        # L2 regularization
        for i in range(n):
            loss += lam * skills[i] ** 2
            grad[i] += 2.0 * lam * skills[i]

        # Gradient norm for convergence check
        g_norm = math.sqrt(sum(g * g for g in grad))
        ema_g = (
            beta_g * ema_g + (1 - beta_g) * g_norm
            if math.isfinite(ema_g)
            else g_norm
        )

        # Windowed loss comparison
        loss_history.append(loss)
        if len(loss_history) > window:
            loss_history.pop(0)
        ref_loss = loss_history[0]  # oldest entry: `window` steps ago, or step 0

        d_abs = abs(ref_loss - loss)
        d_rel = d_abs / (abs(ref_loss) + 1e-12)

        # Patience counter
        if loss < best_loss - tol_abs:
            best_loss = loss
            no_improve_count = 0
        else:
            no_improve_count += 1

        if step % 50 == 0:
            print(
                f"Step {step}: NLL={loss:.6f}, emaG={ema_g:.2e}, "
                f"noImprove={no_improve_count}/{patience}",
                file=sys.stderr,
            )

        # Fast-convergence path (existing logic, now uses windowed d_abs/d_rel).
        if d_abs < tol_abs and d_rel < tol_rel and ema_g < tol_grad:
            print(
                f"Converged at step {step} "
                f"(NLL={loss:.6f}, dAbs={d_abs:.2e}, dRel={d_rel:.2e}, emaG={ema_g:.2e})",
                file=sys.stderr,
            )
            break

        # Patience-based plateau path (new primary termination for stuck runs).
        if no_improve_count >= patience:
            print(
                f"Plateau detected at step {step}: no improvement in {patience} steps "
                f"(NLL={loss:.6f}, bestNLL={best_loss:.6f}, emaG={ema_g:.2e})",
                file=sys.stderr,
            )
            break

        # Adam update
        t = step + 1
        for i in range(n):
            g = grad[i]
            m1[i] = beta1 * m1[i] + (1 - beta1) * g
            m2[i] = beta2 * m2[i] + (1 - beta2) * g * g
            m_hat = m1[i] / (1 - beta1 ** t)
            v_hat = m2[i] / (1 - beta2 ** t)
            skills[i] -= lr * m_hat / (math.sqrt(v_hat) + eps)
    else:
        print("Training stopped: max iterations reached.", file=sys.stderr)

    def player_obj(name):
        obj = {'name': name}
        if name in name_to_club:
            obj['club'] = name_to_club[name]
        return obj

    result = sorted(
        [
            {
                'player': player_obj(p),
                'skill': round(skills[idx[p]], 6),
                'performance': round(math.exp(skills[idx[p]]), 6),
                'matches': match_counts[idx[p]],
            }
            for p in players
        ],
        key=lambda x: x['performance'],
        reverse=True,
    )
    return result


def run_config(config_path, max_iter=1000000, patience=1000):
    """Build multiple rankings from a YAML config file.

    Output goes to <config stem>/<top-level key>/<ranking name>.json next
    to the config file; each top-level key holds `matches` (globs,
    resolved from the cwd) and `rankings` (name -> list of disciplines).
    """
    import glob
    import os

    import yaml

    with open(config_path) as f:
        config = yaml.safe_load(f)

    config_dir = os.path.dirname(os.path.abspath(config_path))
    config_stem = os.path.splitext(os.path.basename(config_path))[0]

    for group, spec in config.items():
        patterns = spec['matches']
        if isinstance(patterns, str):
            patterns = [patterns]
        files = sorted({
            path
            for pattern in patterns
            for path in glob.glob(pattern, recursive=True)
        })
        if not files:
            print(f"{group}: no files match {patterns}", file=sys.stderr)
            continue
        matches = load_matches(files)
        print(
            f"{group}: {len(matches)} matches from {len(files)} files",
            file=sys.stderr,
        )

        out_dir = os.path.join(config_dir, config_stem, group)
        os.makedirs(out_dir, exist_ok=True)

        for name, disciplines in spec['rankings'].items():
            filtered = [
                m for m in matches
                if m.get('games') and len(m['games']) > 0
                and any(
                    discipline_matches(m.get('event', ''), d)
                    for d in disciplines
                )
            ]
            print(
                f"{group}/{name}: {len(filtered)} matches "
                f"({', '.join(disciplines)})",
                file=sys.stderr,
            )
            if filtered:
                result = rank_players(
                    filtered, max_iter=max_iter, patience=patience
                )
            else:
                print(f"{group}/{name}: no matches, writing empty ranking",
                      file=sys.stderr)
                result = []
            out_path = os.path.join(out_dir, f"{name}.json")
            with open(out_path, 'w') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
                f.write('\n')
            print(f"Wrote {out_path}", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(
        description='Rank badminton players from match JSON files.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Discipline codes: Einzel, Doppel, HE, HE1, HE2, HD, DE, DD, GD, MX
Disciplines match by prefix (HE also catches HE1 and HE2), and GD/MX/MIX
are treated as equivalent.

Examples:
  %(prog)s 25_26/*.json --list-events
  %(prog)s 25_26/*.json --discipline HD
  %(prog)s 25_26/*.json --discipline HE1 --discipline HE2
  %(prog)s 25_26/club.json --discipline Einzel
  %(prog)s 25_26/*.json --filter "Landesliga.*HD"
  %(prog)s 25_26/*.json --event "SHBV – O19-Landesliga – Landesliga Nord HD"
  %(prog)s rankings/25_26_27.yaml
""",
    )
    parser.add_argument(
        'files', nargs='+',
        help='JSON match files, or YAML config files for batch mode',
    )
    parser.add_argument(
        '--max-iter', type=int, default=1000000, metavar='N',
        help='Maximum optimisation steps (default: 1000000).',
    )
    parser.add_argument(
        '--patience', type=int, default=1000, metavar='N',
        help='Stop if no improvement by tol_abs in the last N steps (default: 1000).',
    )
    parser.add_argument(
        '--discipline', action='append', metavar='DISC',
        help='Filter by discipline suffix (e.g. HD, Einzel). Repeatable (OR).',
    )
    parser.add_argument(
        '--event', action='append', metavar='EVENT',
        help='Filter by exact event name. Repeatable (OR).',
    )
    parser.add_argument(
        '--filter', metavar='REGEX',
        help='Filter by Python regex applied to event name.',
    )
    parser.add_argument(
        '--list-events', action='store_true',
        help='List all events with match counts as JSON and exit.',
    )
    args = parser.parse_args()

    yaml_files = [f for f in args.files if f.endswith(('.yaml', '.yml'))]
    if yaml_files:
        if len(yaml_files) != len(args.files):
            parser.error('cannot mix YAML config files with JSON match files')
        if args.discipline or args.event or args.filter or args.list_events:
            parser.error('filter options do not apply in YAML config mode')
        for config_path in yaml_files:
            run_config(
                config_path, max_iter=args.max_iter, patience=args.patience
            )
        return

    matches = load_matches(args.files)

    if args.list_events:
        counts = Counter(m.get('event', '') for m in matches if m.get('games'))
        result = [
            {'event': e, 'matches': c}
            for e, c in sorted(counts.items())
        ]
        json.dump(result, sys.stdout, indent=2, ensure_ascii=False)
        print()
        return

    event_filter = build_event_filter(args)
    filtered = [
        m for m in matches
        if m.get('games') and len(m['games']) > 0
        and event_filter(m.get('event', ''))
    ]

    print(
        f"Loaded {len(filtered)} matches (from {len(matches)} total)",
        file=sys.stderr,
    )

    if not filtered:
        print('No matches found for the given filter.', file=sys.stderr)
        json.dump([], sys.stdout, ensure_ascii=False)
        print()
        return

    result = rank_players(filtered, max_iter=args.max_iter, patience=args.patience)
    json.dump(result, sys.stdout, indent=2, ensure_ascii=False)
    print()


if __name__ == '__main__':
    main()
