"""
Supplier normalisation — maps raw winner names to canonical company entities.
Reads top winners from tenders table, normalises names, writes to supplier_lookup.
Does NOT mutate the tenders table.

Usage:
    cd apps/agent
    uv run python src/enrich_suppliers.py
"""

import os
import re
import sys
import json
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").replace(
    "channel_binding=require&", ""
).replace("&channel_binding=require", "").replace(
    "channel_binding=require", ""
)

# Tussell 2025 Strategic Suppliers list
STRATEGIC_SUPPLIERS = {
    "Accenture", "Amey", "AtkinsRéalis", "Atkins", "Atos", "AWS", "Amazon Web Services",
    "Babcock", "BAE Systems", "Balfour Beatty", "BT", "British Telecommunications",
    "Capgemini", "Capita", "CGI", "Computacenter", "Deloitte", "DXC",
    "Bouygues", "Equans", "Ernst & Young", "EY", "Fujitsu", "G4S",
    "IBM", "ISS", "Jacobs", "KBR", "Kier", "KPMG", "Laing O'Rourke",
    "Leidos", "Microsoft", "Mitie", "Mott MacDonald", "Oracle",
    "PricewaterhouseCoopers", "PwC", "Serco", "Sodexo", "Sopra Steria",
    "Thales", "Tilbury Douglas", "Virgin Media", "Vodafone",
}

# Suffix patterns to strip for matching
SUFFIXES = [
    r'\s+plc\.?$', r'\s+ltd\.?$', r'\s+limited$', r'\s+llp$',
    r'\s+inc\.?$', r'\s+corporation$', r'\s+group$',
    r'\s+\(uk\)$', r'\s+uk$', r'\s+united kingdom$',
]


def normalise_name(raw: str) -> str:
    """Normalise a company name for canonical matching."""
    name = raw.strip()
    # Decode HTML entities
    name = name.replace("&amp;", "&").replace("&#039;", "'").replace("&quot;", '"')
    # Title case
    name = name.title()
    # Fix common title case issues
    name = name.replace("Llp", "LLP").replace("Plc", "PLC").replace("Ltd", "Ltd")
    name = name.replace("Uk", "UK").replace("Nhs", "NHS").replace("It ", "IT ")
    name = name.replace("Ibm", "IBM").replace("Bt ", "BT ").replace("Dxc", "DXC")
    name = name.replace("Bae", "BAE").replace("Kbr", "KBR").replace("Cgj", "CGI")
    name = name.replace("Aws", "AWS").replace("G4S", "G4S")
    return name


def canonical_key(name: str) -> str:
    """Generate a matching key by stripping suffixes and normalising."""
    key = name.upper().strip()
    key = key.replace("&AMP;", "&").replace("&#039;", "'")
    for suffix in SUFFIXES:
        key = re.sub(suffix, '', key, flags=re.IGNORECASE)
    key = re.sub(r'\s+', ' ', key).strip()
    return key


def is_strategic(canonical_name: str) -> bool:
    """Check if a canonical name matches a Tussell Strategic Supplier."""
    upper = canonical_name.upper()
    for ss in STRATEGIC_SUPPLIERS:
        if ss.upper() in upper:
            return True
    return False


def classify_type(canonical_name: str) -> str:
    """Classify company type from name patterns."""
    upper = canonical_name.upper()
    if any(s.upper() in upper for s in STRATEGIC_SUPPLIERS):
        return "strategic_supplier"
    if "NHS" in upper or "COUNCIL" in upper or "MINISTRY" in upper:
        return "public_body"
    if "CHARITY" in upper or "TRUST" in upper:
        return "charity"
    if "LLP" in upper:
        return "partnership"
    return "unknown"


def main():
    sys.stdout.reconfigure(line_buffering=True)

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Get top winners by frequency (sole awards only)
    print("Fetching top 1000 winners by frequency...", flush=True)
    cur.execute("""
        SELECT winner, COUNT(*) as c
        FROM tenders
        WHERE winner IS NOT NULL AND winner != '' AND winner NOT LIKE '%,%'
        GROUP BY winner
        ORDER BY c DESC
        LIMIT 1000
    """)
    top_winners = cur.fetchall()
    print(f"Found {len(top_winners)} distinct winner names", flush=True)

    # Build canonical groups
    groups = {}  # canonical_key → list of raw names
    for row in top_winners:
        raw = row["winner"]
        key = canonical_key(raw)
        if key not in groups:
            groups[key] = []
        groups[key].append(raw)

    print(f"Grouped into {len(groups)} canonical entities", flush=True)

    # For each group, pick the best canonical name and insert all raw variants
    inserted = 0
    skipped = 0
    for key, raw_names in groups.items():
        # Pick the most common variant as canonical
        canonical = normalise_name(raw_names[0])  # first is highest frequency
        strategic = is_strategic(canonical)
        company_type = classify_type(canonical)

        for raw in raw_names:
            try:
                cur.execute("""
                    INSERT INTO supplier_lookup (raw_name, canonical_name, company_type, is_strategic_supplier)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (raw_name) DO UPDATE SET
                        canonical_name = EXCLUDED.canonical_name,
                        company_type = EXCLUDED.company_type,
                        is_strategic_supplier = EXCLUDED.is_strategic_supplier
                """, (raw, canonical, company_type, strategic))
                inserted += 1
            except Exception as e:
                print(f"  Skipped {raw}: {str(e)[:80]}", flush=True)
                skipped += 1

    conn.commit()
    cur.close()
    conn.close()

    print(f"\nDone. Inserted: {inserted}, Skipped: {skipped}")
    print(f"Canonical entities: {len(groups)}")
    print(f"Strategic suppliers flagged: {sum(1 for g in groups.values() if is_strategic(normalise_name(g[0])))}")


if __name__ == "__main__":
    main()
