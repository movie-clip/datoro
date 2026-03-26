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

# Broad technology candidate set (US + select global ADRs)
CANDIDATE_TICKERS = [
    'MSFT', 'AAPL', 'GOOGL', 'META', 'ORCL', 'SAP', 'IBM', 'CSCO', 'QCOM', 'AVGO',
    'ADBE', 'CRM', 'NOW', 'INTU', 'SNOW', 'MDB', 'DDOG', 'NET', 'TEAM', 'HUBS',
    'SHOP', 'SQ', 'PYPL', 'DOCU', 'ZM', 'TWLO', 'ASAN', 'OKTA', 'CRWD', 'ZS',
    'PANW', 'FTNT', 'WDAY', 'ANSS', 'CDNS', 'SNPS', 'AMD', 'NVDA', 'INTC', 'MU',
    'AMAT', 'LRCX', 'KLAC', 'ADI', 'NXPI', 'STM', 'ASML', 'TSM', 'SONY', 'NTDOY'
]

PROFILE_URL = 'https://financialmodelingprep.com/api/v3/profile/{ticker}?apikey={key}'
AS_REPORTED_URL = (
    'https://financialmodelingprep.com/api/v3/financial-statement-full-as-reported/'
    '{ticker}?period={period}&limit={limit}&apikey={key}'
)

OPERATIONAL_PATTERN = re.compile(
    r'(subscriber|subscription|membership|member|'
    r'activeuser|dailyactive|monthlyactive|activeaccounts|activecustomers|'
    r'mau|dau|contractwithcustomer|deferredrevenue|bookings|backlog|'
    r'churn|retention|arpu|average.*revenue.*user|engagement|hours|seats|'
    r'remainingperformanceobligation|billings)',
    re.I,
)

NOISE_TAGS = {
    'entityinteractivedatacurrent',
    'entityincorporationstatecountrycode',
}

NOISE_SUBSTRINGS = (
    'explanatory',
    'timingofsatisfaction',
    'definedbenefitplans',
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


def fetch_json(url: str, timeout: float = 12.0):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode('utf-8', errors='ignore'))


def category(tag: str) -> str:
    t = tag.lower()
    if re.search(r'subscriber|membership|member|paidmembership', t):
        return 'subscriber_membership'
    if re.search(r'activeuser|dailyactive|monthlyactive|activeaccounts|activecustomers|mau|dau|engagement|hours|seats', t):
        return 'user_engagement'
    if re.search(r'contractwithcustomer|deferredrevenue|remainingperformanceobligation|billings', t):
        return 'recurring_revenue_contracts'
    if re.search(r'bookings|backlog|churn|retention|arpu|average.*revenue.*user', t):
        return 'unit_economics_demand'
    return 'other_operational'


def is_it_sector(sector_value: str | None) -> bool:
    if not sector_value:
        return False
    s = sector_value.lower()
    return ('technology' in s) or ('information technology' in s)


def is_numeric_like(value: object) -> bool:
    if isinstance(value, (int, float)):
        return True
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return False
        try:
            float(text.replace(',', ''))
            return True
        except ValueError:
            return False
    return False


def main() -> None:
    socket.setdefaulttimeout(12)
    api_key = load_key()

    validated_it: list[dict] = []
    rejected: list[dict] = []

    print('Validating IT sector...', flush=True)
    for i, ticker in enumerate(CANDIDATE_TICKERS, start=1):
        try:
            url = PROFILE_URL.format(ticker=ticker, key=api_key)
            payload = fetch_json(url)
            row = payload[0] if isinstance(payload, list) and payload else {}
            sector = row.get('sector') if isinstance(row, dict) else None
            industry = row.get('industry') if isinstance(row, dict) else None

            if is_it_sector(sector):
                validated_it.append({
                    'ticker': ticker,
                    'sector': sector,
                    'industry': industry,
                })
            else:
                rejected.append({
                    'ticker': ticker,
                    'sector': sector,
                    'industry': industry,
                })
        except Exception as e:  # noqa: BLE001
            rejected.append({'ticker': ticker, 'sector': None, 'industry': f'ERROR: {e}'})

        time.sleep(0.03)
        print(f'  [{i}/{len(CANDIDATE_TICKERS)}] {ticker}', flush=True)

    tag_global: dict[str, dict] = {}
    per_ticker: list[dict] = []

    print(f'Analyzing as-reported tags for {len(validated_it)} IT tickers...', flush=True)
    for i, item in enumerate(validated_it, start=1):
        ticker = item['ticker']
        entry = {
            'ticker': ticker,
            'sector': item['sector'],
            'industry': item['industry'],
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
                url = AS_REPORTED_URL.format(ticker=ticker, period=period, limit=limit, key=api_key)
                payload = fetch_json(url)
                rows = payload if isinstance(payload, list) else ([payload] if isinstance(payload, dict) else [])
                rows = [x for x in rows if isinstance(x, dict)]
                entry['annualRows' if period == 'annual' else 'quarterRows'] = len(rows)
                rows_all.extend(rows)
            except urllib.error.HTTPError as e:
                entry['annualError' if period == 'annual' else 'quarterError'] = f'HTTP {e.code}'
            except socket.timeout:
                entry['annualError' if period == 'annual' else 'quarterError'] = 'timeout'
            except Exception as e:  # noqa: BLE001
                entry['annualError' if period == 'annual' else 'quarterError'] = str(e)

            time.sleep(0.03)

        tags = set()
        for row in rows_all:
            for field in EXACT_SUBSCRIBER_FIELDS:
                if field in row and row.get(field) is not None:
                    entry['exactSubscriberFieldCounts'][field] += 1

            for k, v in row.items():
                if v is None:
                    continue
                if k in NOISE_TAGS:
                    continue
                lower_k = k.lower()
                if any(noise in lower_k for noise in NOISE_SUBSTRINGS):
                    continue
                if OPERATIONAL_PATTERN.search(k):
                    if is_numeric_like(v):
                        tags.add(k)

        tags_sorted = sorted(tags)
        entry['operationalTags'] = tags_sorted

        cat_counts: dict[str, int] = {}
        for tag in tags_sorted:
            cat = category(tag)
            cat_counts[cat] = cat_counts.get(cat, 0) + 1

            rec = tag_global.setdefault(tag, {
                'tag': tag,
                'category': cat,
                'tickers': [],
            })
            if ticker not in rec['tickers']:
                rec['tickers'].append(ticker)

        entry['operationalTagCategories'] = cat_counts
        per_ticker.append(entry)

        print(f'  [{i}/{len(validated_it)}] {ticker}', flush=True)

    for rec in tag_global.values():
        rec['countTickers'] = len(rec['tickers'])

    tags_sorted = sorted(tag_global.values(), key=lambda x: x['countTickers'], reverse=True)
    top10 = tags_sorted[:10]

    with_exact_subscribers = [
        x for x in per_ticker
        if sum(x['exactSubscriberFieldCounts'].values()) > 0
    ]

    # Chart-friendly tags: broadly available + meaningful categories
    chart_friendly = [
        t for t in tags_sorted
        if t['category'] in {'recurring_revenue_contracts', 'unit_economics_demand', 'user_engagement', 'subscriber_membership'}
        and t['countTickers'] >= 3
    ][:15]

    today = date.today().isoformat()
    summary = {
        'researchDate': today,
        'sector': 'Information Technology / Technology (validated via profile.sector)',
        'candidates': len(CANDIDATE_TICKERS),
        'validatedITTickers': len(validated_it),
        'excludedNonITOrErrors': len(rejected),
        'uniqueOperationalTags': len(tags_sorted),
        'itTickersWithExactSubscribersFields': len(with_exact_subscribers),
        'top10Tags': top10,
        'recommendedChartFriendlyTags': chart_friendly,
    }

    out = {
        'summary': summary,
        'validatedIT': validated_it,
        'excluded': rejected,
        'tags': tags_sorted,
        'tickers': per_ticker,
    }

    json_path = ROOT / 'logs' / f'fmp-it-sector-tags-research-{today}.json'
    json_path.write_text(json.dumps(out, indent=2), encoding='utf-8')

    md_lines: list[str] = [
        f'# FMP IT Sector Operational Tags Research — {today}',
        '',
        '## Scope & Method',
        '- Candidate universe: 50 technology-leaning tickers.',
        '- Sector validation: FMP profile endpoint; include only `sector` containing Technology/Information Technology.',
        '- Data endpoint analyzed: `/api/v3/financial-statement-full-as-reported/{ticker}` for annual + quarter.',
        '- Objective: identify common and useful tags for IT-specific Metrics charts.',
        '',
        '## Headline Findings',
        f"- Candidates: **{summary['candidates']}**",
        f"- Validated IT tickers: **{summary['validatedITTickers']}**",
        f"- Excluded (non-IT/error): **{summary['excludedNonITOrErrors']}**",
        f"- Unique operational tags found: **{summary['uniqueOperationalTags']}**",
        f"- IT tickers with exact current SubscribersChart fields: **{summary['itTickersWithExactSubscribersFields']}**",
        '',
        '## Top 10 most-used tags in IT sector',
        '| Rank | Tag | Category | IT Tickers Using |',
        '|---:|---|---|---:|',
    ]

    for i, tag in enumerate(top10, start=1):
        md_lines.append(f"| {i} | {tag['tag']} | {tag['category']} | {tag['countTickers']} |")

    md_lines.extend([
        '',
        '## Recommended chart-friendly tags for IT sector',
        '| Tag | Category | IT Tickers Using |',
        '|---|---|---:|',
    ])
    for tag in chart_friendly:
        md_lines.append(f"| {tag['tag']} | {tag['category']} | {tag['countTickers']} |")

    md_lines.extend([
        '',
        '## Exact SubscribersChart field coverage (IT sector)',
        '| Ticker | streamingmembers | paidmemberships | netadds |',
        '|---|---:|---:|---:|',
    ])
    if with_exact_subscribers:
        for row in with_exact_subscribers:
            c = row['exactSubscriberFieldCounts']
            md_lines.append(
                f"| {row['ticker']} | {c['numberofstreamingmembers']} | {c['numberofpaidmemberships']} | {c['numberofpaidmembershipadditionslossesduringperiod']} |"
            )
    else:
        md_lines.append('| (none) | 0 | 0 | 0 |')

    md_lines.extend([
        '',
        '## Practical IT-sector chart plan',
        '1. Keep strict SubscribersChart only for tickers with exact subscriber fields.',
        '2. Add default IT panel using recurring-revenue contract tags (`contractwithcustomerliability*`, `deferredrevenue*`).',
        '3. Add secondary panel for demand/unit economics tags (`bookings`, `remainingperformanceobligation`, `billings`, `churn`, `retention`, `arpu`) when present.',
        '4. Drive panel visibility dynamically from per-ticker discovered tag map.',
    ])

    md_path = ROOT / 'docs' / f'FMP_IT_SECTOR_TAGS_RESEARCH_{today}.md'
    md_path.write_text('\n'.join(md_lines), encoding='utf-8')

    print(f'JSON_REPORT={json_path}')
    print(f'MD_REPORT={md_path}')
    print(f"VALIDATED_IT={summary['validatedITTickers']}")
    print(f"UNIQUE_TAGS={summary['uniqueOperationalTags']}")


if __name__ == '__main__':
    main()
