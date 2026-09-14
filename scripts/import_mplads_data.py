"""CLI tool to import official or external MPLADS datasets into MPLAD Sentinel."""
from __future__ import annotations

import argparse
import json
import os
import sys

# Ensure repository root is on sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.app.database import SessionLocal, engine, upgrade_database_schema
from backend.app.services.importer import ingest_records, parse_csv_content, parse_json_content
from backend.app.ml.anomaly_engine import run_anomaly_analysis


def main():
    parser = argparse.ArgumentParser(description="Import MPLADS official datasets into MPLAD Sentinel")
    parser.add_argument("--file", "-f", required=True, help="Path to CSV or JSON data file")
    parser.add_argument("--source", "-s", default="official", choices=["official", "synthetic", "audit"], help="Data source tag")
    parser.add_argument("--name", "-n", default="MoSPI eSAKSHI Official Portal", help="Human-readable source portal name")
    parser.add_argument("--run-anomaly", action="store_true", default=True, help="Run anomaly engine after ingestion")
    args = parser.parse_args()

    file_path = os.path.abspath(args.file)
    if not os.path.exists(file_path):
        print(f"[-] Error: File not found at {file_path}")
        sys.exit(1)

    print(f"[*] Ensuring database schema is up-to-date...")
    upgrade_database_schema(engine)

    print(f"[*] Reading file: {file_path}")
    with open(file_path, "rb") as f:
        raw_bytes = f.read()

    if file_path.endswith(".json"):
        records = parse_json_content(raw_bytes)
    else:
        records = parse_csv_content(raw_bytes)

    if not records:
        print("[-] Error: No records found in file.")
        sys.exit(1)

    print(f"[*] Parsed {len(records)} records. Ingesting into database...")
    with SessionLocal() as db:
        result = ingest_records(
            db=db,
            records=records,
            source_name=args.name,
            file_name=os.path.basename(file_path),
            data_source=args.source,
        )

        print("\n==================================================")
        print("         MPLAD SENTINEL INGESTION REPORT          ")
        print("==================================================")
        print(f"  Batch ID             : {result['batch_id']}")
        print(f"  Source Name          : {result['source_name']}")
        print(f"  Total Processed      : {result['total_records']}")
        print(f"  Valid Records Saved  : {result['valid_records']}")
        print(f"  Error Records        : {result['error_records']}")
        print(f"  Missing Coordinates  : {result['missing_coords_count']} ({result['missing_coords_count'] / max(result['total_records'], 1) * 100:.1f}%)")
        print(f"  Missing Contractors  : {result['missing_contractors_count']} ({result['missing_contractors_count'] / max(result['total_records'], 1) * 100:.1f}%)")
        print(f"  Data Quality Score   : {result['data_quality_score']} / 100")
        print("==================================================\n")

        if args.run_anomaly:
            print("[*] Running adaptive multi-engine anomaly analysis...")
            analysis = run_anomaly_analysis(db, data_source=args.source)
            print(f"[+] Anomaly Engine: {analysis.get('message', 'Completed')}")
            print(f"    Total Analysed   : {analysis.get('analysed', 0)}")
            print(f"    Critical Risk    : {analysis.get('critical_projects', 0)}")

    print("\n[+] Ingestion and analysis completed successfully!")


if __name__ == "__main__":
    main()
