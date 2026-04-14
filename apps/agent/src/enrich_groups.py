"""
Assign group_name to all suppliers in supplier_lookup.
Auto-derives group from canonical name, then applies manual overrides
for known corporate groups with multiple trading entities.

Usage:
    cd apps/agent
    uv run python src/enrich_groups.py
"""

import os
import re
import sys
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").replace(
    "channel_binding=require&", ""
).replace("&channel_binding=require", "").replace(
    "channel_binding=require", ""
)

# Manual group overrides for known corporate groups
# Pattern: if canonical_name contains KEY → group_name = VALUE
GROUP_OVERRIDES = {
    # Big 4
    "Deloitte": "Deloitte",
    "KPMG": "KPMG",
    "Pricewaterhouse": "PwC",
    "Pwc": "PwC",
    "Ernst & Young": "EY",
    "Ernst And Young": "EY",

    # Strategy consulting
    "McKinsey": "McKinsey",
    "Mckinsey": "McKinsey",
    "Boston Consulting": "BCG",
    "Bain & Company": "Bain",
    "PA Consulting": "PA Consulting",
    "Accenture": "Accenture",

    # IT resellers / VARs
    "Softcat": "Softcat",
    "Insight Direct": "Insight",
    "Specialist Computer Centres": "SCC",
    "Scc ": "SCC",
    "CDW": "CDW",
    "Computacenter": "Computacenter",
    "Phoenix Software": "Phoenix Software",
    "XMA": "XMA",
    "Boxxe": "Boxxe",
    "Bytes Software": "Bytes",
    "Software Box": "Software Box",
    "Certes Computing": "Certes",
    "Trustmarque": "Trustmarque",

    # Major IT
    "Dell": "Dell",
    "Microsoft": "Microsoft",
    "Oracle": "Oracle",
    "IBM": "IBM",
    "Fujitsu": "Fujitsu",
    "Atos": "Atos",
    "Capgemini": "Capgemini",
    "CGI": "CGI",
    "DXC": "DXC",
    "Sopra Steria": "Sopra Steria",
    "Amazon": "AWS",
    "Aws": "AWS",

    # Engineering / Construction
    "WSP": "WSP",
    "Aecom": "AECOM",
    "AECOM": "AECOM",
    "Atkins": "AtkinsRéalis",
    "Mott Macdonald": "Mott MacDonald",
    "Mott MacDonald": "Mott MacDonald",
    "Jacobs": "Jacobs",
    "Balfour Beatty": "Balfour Beatty",
    "Kier": "Kier",
    "Amey": "Amey",
    "Ove Arup": "Arup",
    "Arup": "Arup",
    "Turner & Townsend": "Turner & Townsend",
    "Arcadis": "Arcadis",
    "Stantec": "Stantec",

    # Defence
    "BAE System": "BAE Systems",
    "Babcock": "Babcock",
    "Thales": "Thales",
    "Leidos": "Leidos",
    "KBR": "KBR",
    "Qinetiq": "QinetiQ",

    # Outsourcing / FM
    "Capita": "Capita",
    "Serco": "Serco",
    "G4S": "G4S",
    "Mitie": "Mitie",
    "Sodexo": "Sodexo",
    "ISS": "ISS",
    "Bouygues": "Bouygues",
    "Equans": "Bouygues",
    "Interserve": "Interserve",

    # Telecoms
    "British Telecom": "BT",
    "Bt ": "BT",
    "Vodafone": "Vodafone",
    "Virgin Media": "Virgin Media",

    # Recruitment
    "Hays Specialist": "Hays",
    "Hays Recruitment": "Hays",
    "Reed Specialist": "Reed",
    "Alexander Mann": "Alexander Mann",
    "LA International": "LA International",

    # Other notable
    "Civica": "Civica",
    "Kainos": "Kainos",
    "Allpay": "Allpay",
    "Stryker": "Stryker",
    "Philips": "Philips",
    "Siemens": "Siemens",
    "GE ": "GE Healthcare",
    "Grant Thornton": "Grant Thornton",
    "Mazars": "Mazars",
    "BDO": "BDO",
}

# Suffixes to strip when auto-deriving group name
STRIP_PATTERNS = [
    r'\s*\(UK\)\s*', r'\s*\(United Kingdom\)\s*',
    r'\s+PLC\.?\s*$', r'\s+Ltd\.?\s*$', r'\s+Limited\s*$',
    r'\s+LLP\s*$', r'\s+Inc\.?\s*$', r'\s+Corporation\s*$',
    r'\s+Group\s*$', r'\s+UK\s*$', r'\s+Services?\s*$',
]


def derive_group(canonical_name: str) -> str:
    """Derive group_name from canonical_name."""
    # Check manual overrides first — use word boundary for short patterns
    lower = canonical_name.lower()
    for pattern, group in GROUP_OVERRIDES.items():
        p = pattern.lower()
        if len(p) <= 4:
            # Short patterns: must match at start or as whole word
            if lower.startswith(p) or f" {p}" in f" {lower}" or lower == p.strip():
                return group
        else:
            if p in lower:
                return group

    # Auto-derive: strip legal suffixes
    group = canonical_name
    for pattern in STRIP_PATTERNS:
        group = re.sub(pattern, '', group, flags=re.IGNORECASE).strip()

    # If nothing left, use original
    if not group or len(group) < 3:
        group = canonical_name

    return group


def main():
    sys.stdout.reconfigure(line_buffering=True)

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Get all canonical names
    cur.execute("SELECT DISTINCT canonical_name FROM supplier_lookup ORDER BY canonical_name;")
    canonicals = [row["canonical_name"] for row in cur.fetchall()]
    print(f"Processing {len(canonicals)} canonical suppliers...", flush=True)

    updated = 0
    manual_matches = 0
    auto_derived = 0

    for canonical in canonicals:
        group = derive_group(canonical)

        # Track whether it was a manual override or auto
        is_manual = any(p.lower() in canonical.lower() for p in GROUP_OVERRIDES)
        if is_manual:
            manual_matches += 1
        else:
            auto_derived += 1

        cur.execute("""
            UPDATE supplier_lookup SET group_name = %s
            WHERE canonical_name = %s AND (group_name IS NULL OR group_name != %s)
        """, (group, canonical, group))
        updated += cur.rowcount

    conn.commit()

    # Report coverage
    cur.execute("""
        SELECT COUNT(DISTINCT group_name) as groups,
               COUNT(*) as total_rows,
               COUNT(group_name) as has_group
        FROM supplier_lookup
    """)
    stats = cur.fetchone()

    cur.execute("""
        WITH grouped AS (
            SELECT sl.group_name, SUM(t.value_amount) as total_value
            FROM tenders t
            JOIN supplier_lookup sl ON t.winner = sl.raw_name
            WHERE sl.group_name IS NOT NULL
            GROUP BY sl.group_name
        )
        SELECT COUNT(*) as groups_with_value,
               ROUND(SUM(total_value)::numeric / 1000000000, 2) as total_value_b
        FROM grouped
    """)
    value_stats = cur.fetchone()

    cur.close()
    conn.close()

    print(f"\nDone.")
    print(f"Canonical suppliers: {len(canonicals)}")
    print(f"Manual group matches: {manual_matches}")
    print(f"Auto-derived groups: {auto_derived}")
    print(f"Rows updated: {updated}")
    print(f"Distinct groups: {stats['groups']}")
    print(f"Rows with group_name: {stats['has_group']}/{stats['total_rows']}")
    print(f"Groups with value data: {value_stats['groups_with_value']}")
    print(f"Total value covered: £{value_stats['total_value_b']}B")


if __name__ == "__main__":
    main()
