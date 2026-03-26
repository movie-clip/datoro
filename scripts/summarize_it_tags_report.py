from __future__ import annotations

import json
from collections import defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'logs' / f'fmp-it-sector-tags-research-{date.today().isoformat()}.json'
if not source.exists():
    raise SystemExit(f'Missing source file: {source}')

data = json.loads(source.read_text(encoding='utf-8'))
tickers = data.get('tickers', [])
validated = data.get('validatedIT', [])

# Curated signal terms and exclusions for IT charting relevance
include_terms = (
    'contractwithcustomer',
    'deferredrevenue',
    'remainingperformanceobligation',
    'bookings',
    'billings',
    'churn',
    'retention',
    'arpu',
    'subscription',
    'subscriber',
    'membership',
    'member',
    'activeuser',
    'dailyactive',
    'monthlyactive',
    'activeaccounts',
    'activecustomers',
    'mau',
    'dau',
    'seats',
)
exclude_terms = (
    'entityincorporationstatecountrycode',
    'definedbenefitplans',
    'explanatory',
    'timingofsatisfaction',
    'sharebasedcompensation',
)

def is_curated(tag: str) -> bool:
    t = tag.lower()
    if any(x in t for x in exclude_terms):
        return False
    return any(x in t for x in include_terms)

def cat(tag: str) -> str:
    t = tag.lower()
    if any(x in t for x in ('subscriber','membership','member','paidmembership')):
        return 'subscriber_membership'
    if any(x in t for x in ('activeuser','dailyactive','monthlyactive','activeaccounts','activecustomers','mau','dau','seats')):
        return 'user_engagement'
    if any(x in t for x in ('contractwithcustomer','deferredrevenue','remainingperformanceobligation','billings')):
        return 'recurring_revenue_contracts'
    if any(x in t for x in ('bookings','churn','retention','arpu')):
        return 'unit_economics_demand'
    return 'other_operational'

count = defaultdict(int)
users = defaultdict(set)
for row in tickers:
    tk = row.get('ticker')
    for tag in row.get('operationalTags', []):
        if is_curated(tag):
            count[tag] += 1
            users[tag].add(tk)

rows = sorted(
    [{'tag': k, 'countTickers': len(users[k]), 'category': cat(k)} for k in count],
    key=lambda x: x['countTickers'],
    reverse=True,
)

top10 = rows[:10]

tickers_with_subscriber_exact = [
    r for r in tickers
    if sum((r.get('exactSubscriberFieldCounts') or {}).values()) > 0
]

md = []
md.append(f"# IT Sector Tags — Curated Top 10 ({date.today().isoformat()})")
md.append('')
md.append('## Method')
md.append('- Source: previously collected IT-sector raw file')
md.append(f'- Source file: {source.name}')
md.append('- Filter: keep only chart-relevant recurring-revenue, subscriber, engagement, and unit-economics tags; remove noisy legal/text tags.')
md.append('')
md.append('## Coverage')
md.append(f'- Validated IT tickers: **{len(validated)}**')
md.append(f'- Tickers with exact SubscribersChart fields: **{len(tickers_with_subscriber_exact)}**')
md.append('')
md.append('## Top 10 common tags for IT charts')
md.append('| Rank | Tag | Category | IT Tickers |')
md.append('|---:|---|---|---:|')
for i, r in enumerate(top10, start=1):
    md.append(f"| {i} | {r['tag']} | {r['category']} | {r['countTickers']} |")

md.append('')
md.append('## Recommendation')
md.append('1. Use `contractwithcustomerliabilitycurrent`, `contractwithcustomerliabilitynoncurrent`, `contractwithcustomerliabilityrevenuerecognized`, and `increasedecreaseincontractwithcustomerliability` as default IT recurring-revenue chart tags.')
md.append('2. Add `remainingperformanceobligation` tags as forward-demand chart where available.')
md.append('3. Keep SubscribersChart strictly opt-in only for exact subscriber fields.')

out_md = ROOT / 'docs' / f'FMP_IT_SECTOR_TOP10_TAGS_{date.today().isoformat()}.md'
out_md.write_text('\n'.join(md), encoding='utf-8')

out_json = ROOT / 'logs' / f'fmp-it-sector-top10-tags-{date.today().isoformat()}.json'
out_json.write_text(json.dumps({'top10': top10, 'validatedIT': len(validated)}, indent=2), encoding='utf-8')

print(f'MD_REPORT={out_md}')
print(f'JSON_REPORT={out_json}')
print(f'VALIDATED_IT={len(validated)}')
print(f'TOP10_COUNT={len(top10)}')
