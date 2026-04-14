"""
Weekly enrichment refresh — runs buyer_intelligence aggregation and
CPV vertical/niche mapping for new records.

Railway cron: 0 4 * * 0 (Sunday 4am UTC)
Command: uv run python src/cron_weekly_enrichment.py

NOTE: This only runs buyer_intelligence and vertical mapping.
supplier_lookup and buyer_lookup are NOT included — they only need
updating when new companies/buyers appear in significant volume.
enrich_categories (sector tagging) is NOT included — keyword rules
don't change between runs. New tenders get classified on the next
full run, which is manual.
"""

import subprocess
import sys
import os
from datetime import datetime

def run_script(name: str):
    """Run a Python script and report result."""
    print(f"\n{'='*60}", flush=True)
    print(f"  Running {name} at {datetime.now().isoformat()}", flush=True)
    print(f"{'='*60}", flush=True)

    result = subprocess.run(
        [sys.executable, f"src/{name}"],
        cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        capture_output=False,
    )

    if result.returncode != 0:
        print(f"  ERROR: {name} exited with code {result.returncode}", flush=True)
    else:
        print(f"  SUCCESS: {name} completed", flush=True)

    return result.returncode


def main():
    sys.stdout.reconfigure(line_buffering=True)
    print(f"Weekly enrichment cron started at {datetime.now().isoformat()}", flush=True)

    # Step 1: Refresh buyer intelligence (aggregates from latest tenders)
    rc1 = run_script("enrich_buyer_intelligence.py")

    # Step 2: Map verticals/niches for any new CPV codes
    rc2 = run_script("enrich_verticals.py")

    if rc1 == 0 and rc2 == 0:
        print(f"\nAll enrichment tasks completed successfully.", flush=True)
    else:
        print(f"\nSome tasks failed. Check logs above.", flush=True)


if __name__ == "__main__":
    main()
