"""
Buyer normalisation — maps raw buyer names to canonical entities with
parent org, type, and region classification.
Does NOT mutate the tenders table.

Usage:
    cd apps/agent
    uv run python src/enrich_buyers.py
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

# Region detection patterns
REGION_PATTERNS = {
    "London": ["london", "city of london", "westminster", "camden", "islington",
               "hackney", "tower hamlets", "southwark", "lambeth", "lewisham",
               "greenwich", "bexley", "bromley", "croydon", "merton", "sutton",
               "kingston", "richmond", "hounslow", "ealing", "hillingdon",
               "harrow", "barnet", "enfield", "haringey", "waltham forest",
               "redbridge", "havering", "barking", "newham", "wandsworth"],
    "South East": ["kent", "surrey", "sussex", "hampshire", "oxfordshire",
                   "berkshire", "buckinghamshire", "isle of wight", "brighton",
                   "portsmouth", "southampton", "reading", "slough", "milton keynes"],
    "South West": ["devon", "cornwall", "somerset", "dorset", "wiltshire",
                   "gloucestershire", "bristol", "bath", "plymouth", "exeter",
                   "swindon"],
    "East of England": ["essex", "suffolk", "norfolk", "cambridgeshire",
                        "hertfordshire", "bedfordshire", "peterborough", "luton",
                        "southend", "thurrock", "colchester", "ipswich", "norwich"],
    "West Midlands": ["birmingham", "coventry", "wolverhampton", "dudley",
                      "walsall", "sandwell", "solihull", "warwickshire",
                      "staffordshire", "shropshire", "herefordshire", "worcestershire"],
    "East Midlands": ["leicestershire", "nottinghamshire", "derbyshire",
                      "lincolnshire", "northamptonshire", "rutland",
                      "leicester", "nottingham", "derby"],
    "Yorkshire and The Humber": ["yorkshire", "leeds", "sheffield", "bradford",
                                  "hull", "york", "doncaster", "rotherham",
                                  "barnsley", "wakefield", "kirklees", "calderdale",
                                  "harrogate", "scarborough"],
    "North West": ["manchester", "liverpool", "lancashire", "cheshire",
                   "cumbria", "merseyside", "bolton", "wigan", "stockport",
                   "tameside", "oldham", "rochdale", "bury", "salford",
                   "trafford", "blackpool", "blackburn", "burnley", "preston",
                   "warrington", "halton", "st helens", "knowsley", "sefton", "wirral"],
    "North East": ["newcastle", "sunderland", "durham", "northumberland",
                   "gateshead", "south tyneside", "north tyneside",
                   "middlesbrough", "hartlepool", "darlington", "stockton",
                   "redcar"],
    "Scotland": ["scotland", "scottish", "edinburgh", "glasgow", "aberdeen",
                 "dundee", "highland", "fife", "perth", "stirling", "falkirk",
                 "lothian", "borders", "dumfries", "argyll", "ayrshire",
                 "lanarkshire", "renfrewshire", "inverclyde", "angus", "moray"],
    "Wales": ["wales", "welsh", "cardiff", "swansea", "newport", "wrexham",
              "flintshire", "denbighshire", "conwy", "gwynedd", "anglesey",
              "ceredigion", "pembrokeshire", "carmarthenshire", "powys",
              "monmouthshire", "caerphilly", "blaenau gwent", "torfaen",
              "bridgend", "vale of glamorgan", "rhondda", "neath", "merthyr"],
    "Northern Ireland": ["northern ireland", "belfast", "antrim", "armagh",
                         "down", "fermanagh", "londonderry", "derry", "tyrone",
                         "newry", "lisburn", "bangor"],
}


def normalise_name(raw: str) -> str:
    """Normalise a buyer name."""
    name = raw.strip()
    name = name.replace("&amp;", "&").replace("&#039;", "'").replace("&quot;", '"')
    name = name.title()
    name = name.replace("Nhs", "NHS").replace("Uk", "UK").replace("Llp", "LLP")
    name = name.replace("Plc", "PLC").replace("Dfe", "DfE").replace("Mod ", "MOD ")
    name = name.replace("Hmrc", "HMRC").replace("Dwp", "DWP").replace("Moj", "MOJ")
    name = name.replace("Defra", "DEFRA").replace("Dvla", "DVLA")
    return name


def classify_parent_org(name: str) -> str:
    """Classify the parent organisation from buyer name."""
    upper = name.upper()

    if "NHS" in upper or "HEALTH" in upper and ("TRUST" in upper or "ICB" in upper or "CCG" in upper):
        return "NHS"
    if "MINISTRY OF DEFENCE" in upper or upper.startswith("MOD ") or "DEFENCE " in upper:
        return "MOD"
    if "HM REVENUE" in upper or "HMRC" in upper:
        return "HMRC"
    if "DEPARTMENT FOR WORK" in upper or "DWP" in upper:
        return "DWP"
    if "HOME OFFICE" in upper:
        return "Home Office"
    if "DEPARTMENT FOR EDUCATION" in upper or "DFE" in upper:
        return "DfE"
    if "DEPARTMENT FOR TRANSPORT" in upper or "DFT" in upper:
        return "DfT"
    if "DEPARTMENT FOR ENVIRONMENT" in upper or "DEFRA" in upper:
        return "DEFRA"
    if "CABINET OFFICE" in upper:
        return "Cabinet Office"
    if "CROWN COMMERCIAL" in upper:
        return "CCS"
    if "FOREIGN" in upper or "COMMONWEALTH" in upper or "FCDO" in upper:
        return "FCDO"
    if "DEPARTMENT FOR INTERNATIONAL" in upper or "DFID" in upper:
        return "FCDO"
    if "HIGHWAYS" in upper:
        return "National Highways"
    if "ENVIRONMENT AGENCY" in upper:
        return "Environment Agency"
    if "NETWORK RAIL" in upper:
        return "Network Rail"
    if "POLICE" in upper or "CONSTABULARY" in upper:
        return "Police"
    if "FIRE" in upper and ("SERVICE" in upper or "RESCUE" in upper):
        return "Fire & Rescue"
    if "UNIVERSITY" in upper or "COLLEGE" in upper:
        return "Education"
    if "COUNCIL" in upper or "BOROUGH" in upper or "DISTRICT" in upper:
        return "Local Council"
    if "HOUSING" in upper and ("ASSOCIATION" in upper or "GROUP" in upper):
        return "Housing Association"
    return "Other"


def classify_buyer_type(parent_org: str) -> str:
    """Map parent org to buyer type."""
    central_gov = {"MOD", "HMRC", "DWP", "Home Office", "DfE", "DfT", "DEFRA",
                   "Cabinet Office", "CCS", "FCDO", "National Highways",
                   "Environment Agency", "Network Rail"}
    if parent_org in central_gov:
        return "central_gov"
    if parent_org == "NHS":
        return "nhs_trust"
    if parent_org == "Local Council":
        return "local_council"
    if parent_org in ("Police", "Fire & Rescue"):
        return "emergency_services"
    if parent_org == "Education":
        return "education"
    if parent_org == "Housing Association":
        return "housing"
    return "other"


def detect_region(name: str) -> str | None:
    """Detect region from buyer name."""
    lower = name.lower()
    for region, patterns in REGION_PATTERNS.items():
        for pattern in patterns:
            if pattern in lower:
                return region
    return None


def main():
    sys.stdout.reconfigure(line_buffering=True)

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    print("Fetching top 2000 buyers by frequency...", flush=True)
    cur.execute("""
        SELECT buyer_name, COUNT(*) as c
        FROM tenders
        WHERE buyer_name IS NOT NULL AND buyer_name != ''
        GROUP BY buyer_name
        ORDER BY c DESC
        LIMIT 2000
    """)
    top_buyers = cur.fetchall()
    print(f"Found {len(top_buyers)} distinct buyer names", flush=True)

    inserted = 0
    for row in top_buyers:
        raw = row["buyer_name"]
        canonical = normalise_name(raw)
        parent_org = classify_parent_org(raw)
        buyer_type = classify_buyer_type(parent_org)
        region = detect_region(raw)

        try:
            cur.execute("""
                INSERT INTO buyer_lookup (raw_name, canonical_name, parent_org, buyer_type, region)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (raw_name) DO UPDATE SET
                    canonical_name = EXCLUDED.canonical_name,
                    parent_org = EXCLUDED.parent_org,
                    buyer_type = EXCLUDED.buyer_type,
                    region = EXCLUDED.region
            """, (raw, canonical, parent_org, buyer_type, region))
            inserted += 1
        except Exception as e:
            print(f"  Skipped {raw[:50]}: {str(e)[:80]}", flush=True)

    conn.commit()
    cur.close()
    conn.close()

    print(f"\nDone. Inserted: {inserted}")


if __name__ == "__main__":
    main()
