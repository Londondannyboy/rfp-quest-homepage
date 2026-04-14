"""
Sector tagging — classifies all tenders by primary sector using keyword rules.
Writes to tender_categories table. Processes in batches of 10,000 with 1s sleep.
Does NOT mutate the tenders table.

Usage:
    cd apps/agent
    uv run python src/enrich_categories.py
"""

import os
import sys
import time
import psycopg2
import psycopg2.extras
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").replace(
    "channel_binding=require&", ""
).replace("&channel_binding=require", "").replace(
    "channel_binding=require", ""
)

SECTOR_RULES = {
    "Digital & Technology": [
        "digital", "software", "it ", "it-", "cyber", "data ",
        "cloud", "technology", "ict ", "computing", "network",
        "telecoms", "telecommunications", "broadband", "internet",
        "saas", "platform", "database", "server", "laptop",
        "desktop", "printer", "microsoft", "oracle", "sap ",
        "portal", "licensing", "erp", "crm", "ecommerce",
        "integration", "hosting", "helpdesk", "service desk",
        "cisco",
    ],
    "Healthcare": [
        "nhs", "hospital", "clinical", "health", "medical",
        "pharmaceutical", "pharmacy", "dental", "ambulance",
        "pathology", "radiology", "surgical", "patient",
        "mental health", "primary care", "gp ", "nursing",
        "pump", "insulin", "prosthetic", "diagnostic",
        "wound care", "clinical waste", "medical device",
        "therapy", "physiotherapy",
    ],
    "Construction": [
        "construction", "building", "demolition", "civil engineering",
        "highways", "road", "bridge", "roofing", "scaffolding",
        "refurbishment", "renovation", "modular", "groundwork",
        "structural", "piling", "cladding",
        "landscape", "drainage", "kitchen", "bathroom",
        "refurb", "retrofit", "dilapidation", "civils",
        "earthwork", "paving", "fencing",
    ],
    "Facilities Management": [
        "facilities", "cleaning", "maintenance", "fm ",
        "catering", "security guard", "waste management",
        "grounds maintenance", "pest control", "window cleaning",
        "janitorial", "portering",
        "grounds", "waste", "recycling", "parking",
        "reception", "porterage", "window clean",
    ],
    "Professional Services": [
        "consultancy", "advisory", "audit", "legal",
        "accountancy", "actuarial", "management consulting",
        "strategy", "programme management", "project management",
        "assurance", "due diligence",
        "research", "evaluation", "assessment", "feasibility",
        "appraisal", "investigation", "review", "benchmarking",
    ],
    "Transport": [
        "transport", "rail", "bus ", "fleet", "vehicle",
        "passenger", "taxi", "freight", "logistics",
        "shipping", "aviation", "airport",
    ],
    "Defence": [
        "defence", "defense", "military", "mod ",
        "armed forces", "navy", "army", "raf ",
        "munitions", "weapons", "submarine",
    ],
    "Education": [
        "school", "university", "education", "college",
        "training", "apprentice", "learning", "curriculum",
        "teacher", "pupil", "student",
    ],
    "Social Care": [
        "social care", "care home", "domiciliary",
        "looked after", "children's services", "fostering",
        "adoption", "supported living", "respite",
        "safeguarding", "vulnerable",
        "supporting families", "learning disability",
        "substance misuse", "homelessness",
    ],
    "Energy & Environment": [
        "energy", "renewable", "solar", "wind farm",
        "carbon", "environmental", "ecology", "flood",
        "water treatment", "sewage", "recycling",
    ],
    "Housing": [
        "housing", "social housing", "affordable homes",
        "tenant", "landlord", "sheltered", "homelessness",
        "temporary accommodation",
    ],
    "Financial Services": [
        "banking", "insurance", "pension", "treasury",
        "investment", "payment", "billing", "payroll",
        "financial", "debt recovery",
    ],
}

BATCH_SIZE = 10000
SLEEP_BETWEEN_BATCHES = 1


def classify_sector(title: str, description: str | None) -> str:
    """Classify a tender into a primary sector."""
    text = (title + " " + (description or "")).lower()
    scores = {}
    for sector, keywords in SECTOR_RULES.items():
        score = sum(1 for kw in keywords if kw in text)
        if score > 0:
            scores[sector] = score
    if not scores:
        return "Other"
    return max(scores, key=scores.get)


def main():
    sys.stdout.reconfigure(line_buffering=True)

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Count total tenders
    cur.execute("SELECT COUNT(*) as c FROM tenders;")
    total = cur.fetchone()["c"]
    print(f"Total tenders: {total}", flush=True)

    # Count already classified
    cur.execute("SELECT COUNT(*) as c FROM tender_categories;")
    already = cur.fetchone()["c"]
    print(f"Already classified: {already}", flush=True)

    # Process in batches
    offset = 0
    classified = 0
    batch_num = 0

    while offset < total:
        batch_num += 1
        cur.execute("""
            SELECT t.ocid, t.title, t.description
            FROM tenders t
            LEFT JOIN tender_categories tc ON t.ocid = tc.tender_ocid
            WHERE tc.tender_ocid IS NULL OR tc.primary_sector = 'Other'
            ORDER BY t.ocid
            LIMIT %s OFFSET %s
        """, (BATCH_SIZE, offset))
        rows = cur.fetchall()

        if not rows:
            break

        # Classify all rows in memory, then bulk insert
        values = []
        for row in rows:
            sector = classify_sector(row["title"], row["description"])
            values.append((row["ocid"], sector))
            classified += 1

        execute_values(
            cur,
            """INSERT INTO tender_categories (tender_ocid, primary_sector)
               VALUES %s
               ON CONFLICT (tender_ocid) DO UPDATE SET
                   primary_sector = EXCLUDED.primary_sector,
                   classified_at = NOW()""",
            values,
            page_size=1000,
        )
        conn.commit()
        print(f"  Batch {batch_num}: classified {classified} tenders", flush=True)
        offset += BATCH_SIZE
        time.sleep(SLEEP_BETWEEN_BATCHES)

    cur.close()
    conn.close()

    print(f"\nDone. Total classified: {classified}")


if __name__ == "__main__":
    main()
