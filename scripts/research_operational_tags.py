from __future__ import annotations

import json
import re
import socket
import time
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

TICKERS = [
    'NFLX', 'DIS', 'WBD', 'PARA', 'ROKU', 'SPOT', 'DUOL', 'PTON', 'CHGG', 'UDMY',
    'MTCH', 'BMBL', 'PINS', 'SNAP', 'META', 'GOOGL', 'AAPL', 'AMZN', 'MSFT',
    'UBER', 'LYFT', 'ABNB', 'DASH', 'RBLX', 'EA', 'TTWO', 'CRM', 'NOW', 'SHOP',
    'SNOW', 'CRWD', 'DOCU', 'ZM', 'TWLO', 'ASAN',
]

BASE = 'https://financialmodelingprep.com/api/v3/financial-statement-full-as-reported'
OPERATIONAL_PATTERN = re.compile(
    r'(subscriber|subscription|membership|member|'
    r'activeuser|dailyactive|monthlyactive|activeaccounts|activecustomers|'
    r'mau|dau|contractwithcustomer|deferredrevenue|bookings|backlog|'
    r'churn|retention|arpu|average.*revenue.*user|engagement|hours|seats)',
    re.I,
)
EXACT_SUBSCRIBER_FIELDS = [
    'numberofstreamingmembers',
    'numberofpaidmemberships',
    'numberofpaidmembershipadditionslossesduringperiod',
]


def load_key() -> str:
    for name in ('.env.local', '.env.development.local', '.env'):
        p = ROOT / name
        if not p.exists():
            continue
        for line in p.read_text(encoding='utf-8', errors='ignore').splitlines():
            if line.startswith('FMP_API_KEY='):
                key = line.split('=', 1)[1].strip().strip('"').strip("'")
                if key:
                    return key
    raise RuntimeError('FMP_API_KEY not found in .env files')


def category(tag: str) -> str:
    t = tag.lower()
    if re.search(r'subscriber|membership|member|paidmembership', t):
        return 'subscriber_membership'
    if re.search(r'activeuser|dailyactive|monthlyactive|activeaccounts|activecustomers|mau|dau|seats|engagement|hours', t):
        return 'user_engagement'
    if re.search(r'contractwithcustomer|deferredrevenue', t):
        return 'contract_deferred_revenue'
    if re.search(r'bookings|backlog|churn|retention|arpu|average.*revenue.*user', t):
        return 'saas_unit_economics'
    return 'other_operational'


def fetch_rows(api_key: str, ticker: str, period: str, limit: int) -> list[dict]:
    url = f'{BASE}/{ticker}?period={period}&limit={limit}&apikey={api_key}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=12) as resp:
        payload = json.loads(resp.read().decode('utf-8', errors='ignore'))
    if isinstance(payload, list):
        return [x for x in payload if isinstance(x, dict)]
    if isinstance(payload, dict):
        return [payload]
    return []


def main() -> None:
    socket.setdefaulttimeout(12)
    api_key = load_key()

    global_tags: dict[str, dict] = {}
    results: list[dict] = []

    total = len(TICKERS)
    for idx, ticker in enumerate(TICKERS, start=1):
        print(f'[{idx}/{total}] {ticker}', flush=True)
        entry = {
            'ticker': ticker,
            'annualRows': 0,
            'quarterRows': 0,
            'annualError': None,
            'quarterError': None,
            'exactSubscriberFieldCounts': {k: 0 for k in EXACT_SUBSCRIBER_FIELDS},
            'operationalTags': [],
            'operationalTagCategories': {},
        }

        rows_all: list[dict] = []
        for period, limit in (('annual', 3), ('quarter', 5)):
            try:
                rows = fetch_rows(api_key, ticker, period, limit)
                entry['annualRows' if period == 'annual' else 'quarterRows'] = len(rows)
                rows_all.extend(rows)
            except urllib.error.HTTPError as e:
                entry['annualError' if period == 'annual' else 'quarterError'] = f'HTTP {e.code}'
            except socket.timeout:
                entry['annualError' if period == 'annual' else 'quarterError'] = 'timeout'
            except Exception as e:  # noqa: BLE001
                entry['annualError' if period == 'annual' else 'quarterError'] = str(e)
            time.sleep(0.03)

        for field in EXACT_SUBSCRIBER_FIELDS:
            entry['exactSubscriberFieldCounts'][field] = sum(
                1 for row in rows_all if field in row and row.get(field) is not None
            )

        tags = set()
        for row in rows_all:
            for key, value in row.items():
                if value is None:
                    continue
                if OPERATIONAL_PATTERN.search(key):
                    tags.add(key)

        sorted_tags = sorted(tags)
        entry['operationalTags'] = sorted_tags

        cat_counts: dict[str, int] = {}
        for tag in sorted_tags:
            cat = category(tag)
            cat_counts[cat] = cat_counts.get(cat, 0) + 1

            rec = global_tags.setdefault(tag, {'tag': tag, 'category': cat, 'tickers': []})
            if ticker not in rec['tickers']:
                rec['tickers'].append(ticker)

        entry['operationalTagCategories'] = cat_counts
        results.append(entry)

    for rec in global_tags.values():
        rec['countTickers'] = len(rec['tickers'])

    global_sorted = sorted(global_tags.values(), key=lambda x: x['countTickers'], reverse=True)

    tickers_with_operational = [r for r in results if r['operationalTags']]
    tickers_with_exact = [
        r for r in results if sum(r['exactSubscriberFieldCounts'].values()) > 0
    ]

    today = date.today().isoformat()
    summary = {
        'researchDate': today,
        'endpoint': '/api/v3/financial-statement-full-as-reported/{ticker}?period=annual|quarter',
        'tickerCount': len(TICKERS),
        'tickersWithAnyOperationalTags': len(tickers_with_operational),
        'tickersWithExactSubscriberFields': len(tickers_with_exact),
        'uniqueOperationalTags': len(global_sorted),
        'topGlobalTags': global_sorted[:30],
    }

    out = {'summary': summary, 'tickers': results}
    json_path = ROOT / 'logs' / f'fmp-operational-tags-research-{today}.json'
    json_path.write_text(json.dumps(out, indent=2), encoding='utf-8')

    rows_sorted = sorted(
        results,
        key=lambda r: (sum(r['exactSubscriberFieldCounts'].values()), len(r['operationalTags'])),
        reverse=True,
    )

    md_lines: list[str] = [
        f'# FMP Operational Tags Research — {today}',
        '',
        '## Scope',
        '- Endpoint: `/api/v3/financial-statement-full-as-reported/{ticker}` (annual + quarter)',
        f'- Tickers analyzed: {len(TICKERS)}',
        '- Objective: identify subscriber/operational tags usable for Metrics tab',
        '',
        '## Results',
        f"- Tickers with any operational tags: **{summary['tickersWithAnyOperationalTags']}/{summary['tickerCount']}**",
        f"- Tickers with exact SubscribersChart fields: **{summary['tickersWithExactSubscriberFields']}**",
        f"- Unique operational tags: **{summary['uniqueOperationalTags']}**",
        '',
        '### Exact SubscribersChart coverage',
        '| Ticker | streamingmembers | paidmemberships | netadds |',
        '|---|---:|---:|---:|',
    ]

    printed = False
    for row in rows_sorted:
        c = row['exactSubscriberFieldCounts']
        if sum(c.values()) == 0:
            continue
        printed = True
        md_lines.append(
            f"| {row['ticker']} | {c['numberofstreamingmembers']} | {c['numberofpaidmemberships']} | {c['numberofpaidmembershipadditionslossesduringperiod']} |"
        )
    if not printed:
        md_lines.append('| (none) | 0 | 0 | 0 |')

    md_lines.extend([
        '',
        '### Top tags by ticker coverage',
        '| Tag | Category | Tickers |',
        '|---|---|---:|',
    ])
    for rec in global_sorted[:25]:
        md_lines.append(f"| {rec['tag']} | {rec['category']} | {rec['countTickers']} |")

    md_lines.extend([
        '',
        '### Per-ticker snapshot',
        '| Ticker | Annual | Quarter | Op tags | Category mix |',
        '|---|---:|---:|---:|---|',
    ])
    for row in rows_sorted:
        cats = ', '.join(f'{k}:{v}' for k, v in sorted(row['operationalTagCategories'].items())) or '-'
        md_lines.append(
            f"| {row['ticker']} | {row['annualRows']} | {row['quarterRows']} | {len(row['operationalTags'])} | {cats} |"
        )

    md_lines.extend([
        '',
        '## Recommended implementation plan',
        '1. Keep strict SubscribersChart for exact fields only.',
        '2. Add fallback operational charts for contract liability and user/member variants.',
        '3. Build ticker-level operational tag map cache and choose panel rendering dynamically.',
        '4. Maintain a curated mapping file for top subscription-heavy tickers.',
    ])

    md_path = ROOT / 'docs' / f'FMP_OPERATIONAL_TAGS_RESEARCH_{today}.md'
    md_path.write_text('\n'.join(md_lines), encoding='utf-8')

    print(f'JSON_REPORT={json_path}')
    print(f'MD_REPORT={md_path}')
    print(f'TICKERS={len(TICKERS)}')
    print(f"WITH_OPERATIONAL={summary['tickersWithAnyOperationalTags']}")
    print(f"WITH_EXACT_SUBSCRIBER={summary['tickersWithExactSubscriberFields']}")
    print(f"UNIQUE_TAGS={summary['uniqueOperationalTags']}")


if __name__ == '__main__':
    main()
