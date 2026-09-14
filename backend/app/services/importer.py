from __future__ import annotations

import csv
import io
import json
import re
import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy.orm import Session

from ..models import Contractor, ImportBatch, Project


COLUMN_ALIASES: dict[str, list[str]] = {
    "source_record_id": ["work_id", "work id", "workid", "recommendation_id", "record_id", "serial_no", "s_no", "id", "work code"],
    "state": ["state", "state_name", "state / ut", "state/ut"],
    "district": ["district", "district_name", "dist"],
    "constituency_id": ["constituency", "constituency_name", "constituency_id", "ls_constituency", "parliamentary_constituency"],
    "mp_id": ["mp_name", "hon_ble_mp", "mp", "member_of_parliament", "mp_id", "hon'ble mp", "name_of_mp"],
    "project_type": ["category", "sector", "work_category", "type", "project_type", "work_type"],
    "description": ["work_title", "title", "work_name", "description", "work description", "work_detail", "work_name_and_location"],
    "location": ["location", "village", "block", "panchayat", "place", "site", "area"],
    "recommended_amount": ["recommended_amount", "recommended amount", "recommended_cost", "recommended_amt", "amount_recommended"],
    "sanctioned_amount": ["sanctioned_amount", "sanctioned amount", "sanctioned_cost", "sanctioned_amt", "amount", "cost", "sanction_cost"],
    "released_amount": ["released_amount", "released amount", "released_amt", "fund_released", "installment_released"],
    "expenditure": ["expenditure", "expenditure (₹)", "expenditure_amount", "utilised_amount", "vendor_payments", "expenditure_amt", "actual_expenditure"],
    "recommendation_date": ["recommendation_date", "recommended_date", "date_of_recommendation", "rec_date"],
    "sanction_date": ["sanction_date", "sanctioned_date", "date_of_sanction", "sanction_dt"],
    "start_date": ["start_date", "commencement_date", "date_of_start"],
    "completion_date": ["completion_date", "completed_date", "date_of_completion", "actual_completion_date"],
    "status": ["status", "work_status", "stage", "current_status"],
    "implementing_agency": ["implementing_agency", "agency", "ia", "executing_agency", "nodal_agency"],
    "contractor_name": ["contractor", "contractor_name", "vendor", "vendor_name", "agency_name"],
    "latitude": ["latitude", "lat", "gps_lat", "geo_lat"],
    "longitude": ["longitude", "lon", "long", "gps_lon", "geo_lon"],
}


def _clean_amount(val: Any) -> float:
    if val is None or val == "":
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace("₹", "").replace(",", "").replace(" ", "")
    # Handle 'Cr' or 'Crore'
    if re.search(r"cr(ore)?s?", s, re.IGNORECASE):
        num_str = re.sub(r"[^0-9.]", "", s)
        try:
            return float(num_str) * 10000000.0
        except ValueError:
            return 0.0
    # Handle 'Lakh' or 'L'
    if re.search(r"l(akh)?s?", s, re.IGNORECASE):
        num_str = re.sub(r"[^0-9.]", "", s)
        try:
            return float(num_str) * 100000.0
        except ValueError:
            return 0.0
    try:
        return float(re.sub(r"[^0-9.-]", "", s))
    except (ValueError, TypeError):
        return 0.0


def _clean_date(val: Any) -> date | None:
    if not val or val == "" or str(val).strip().lower() in ("nan", "none", "null", "—", "-"):
        return None
    if isinstance(val, date):
        return val
    if isinstance(val, datetime):
        return val.date()
    val_str = str(val).strip()
    formats = [
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%d.%m.%Y",
        "%Y/%m/%d",
        "%d-%b-%Y",
        "%d-%b-%y",
        "%b %d, %Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(val_str, fmt).date()
        except ValueError:
            continue
    return None


def _clean_float(val: Any) -> float | None:
    if val is None or str(val).strip().lower() in ("", "nan", "none", "null", "—", "-"):
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _normalize_headers(row_keys: list[str]) -> dict[str, str]:
    """Map arbitrary incoming keys to canonical internal fields using normalized alphanumeric keys."""
    mapping = {}
    clean = lambda s: re.sub(r"[^a-z0-9]", "", str(s).lower())
    clean_aliases = {canonical: [clean(a) for a in aliases] for canonical, aliases in COLUMN_ALIASES.items()}
    for canonical, aliases in clean_aliases.items():
        for raw_k in row_keys:
            if clean(raw_k) in aliases:
                mapping[canonical] = raw_k
                break
    return mapping


def ensure_default_contractor(db: Session) -> Contractor:
    """Ensure standard unassigned contractor exists for official records lacking contractor info."""
    unassigned_id = "CTR-OFFICIAL-UNASSIGNED"
    c = db.query(Contractor).filter(Contractor.contractor_id == unassigned_id).first()
    if not c:
        c = Contractor(
            contractor_id=unassigned_id,
            name="Unassigned / Departmental Execution",
            registration_info="Official eSAKSHI Publication (Public Unassigned)",
            district="All Districts",
        )
        db.add(c)
        db.commit()
    return c


def ingest_records(
    db: Session,
    records: list[dict[str, Any]],
    source_name: str = "Official data import pipeline — awaiting authorized source data",
    file_name: str = "import.csv",
    data_source: str = "official",
    source_url: str = "https://mplads.mospi.gov.in/digigov/dashboard.html",
) -> dict[str, Any]:
    """Ingest a list of records into projects table with provenance tracking and validation."""
    if not records:
        return {"batch_id": None, "total": 0, "valid": 0, "errors": 0, "message": "No records to import"}

    default_ctr = ensure_default_contractor(db)
    batch_id = f"BATCH-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8]}"
    now = datetime.utcnow()

    # Determine header mapping from first record
    first_record = records[0]
    header_map = _normalize_headers(list(first_record.keys()))

    valid_count = 0
    error_count = 0
    missing_coords = 0
    missing_contractors = 0
    financial_inconsistencies = 0

    contractor_cache: dict[str, str] = {}

    for idx, raw in enumerate(records):
        try:
            def get_val(field: str, default: Any = None) -> Any:
                k = header_map.get(field)
                return raw.get(k, default) if k else raw.get(field, default)

            # Mandatory / core identifiers
            src_id = str(get_val("source_record_id") or f"MOSPI-{batch_id[-6:]}-{idx + 1:04d}").strip()
            state = str(get_val("state") or "National").strip()
            district = str(get_val("district") or "Central").strip()
            constituency = str(get_val("constituency_id") or f"{district} Constituency").strip()
            mp = str(get_val("mp_id") or "Hon'ble Member of Parliament").strip()
            category = str(get_val("project_type") or "Community Infrastructure").strip()
            description = str(get_val("description") or f"MPLADS developmental work in {district}").strip()
            location = str(get_val("location") or f"{district}, {state}").strip()
            status = str(get_val("status") or "Sanctioned").strip()
            agency = str(get_val("implementing_agency") or "District Authority / DRDA").strip()

            sanctioned = _clean_amount(get_val("sanctioned_amount"))
            recommended = _clean_amount(get_val("recommended_amount"))
            released = _clean_amount(get_val("released_amount"))
            expenditure = _clean_amount(get_val("expenditure"))

            rec_date = _clean_date(get_val("recommendation_date"))
            sanc_date = _clean_date(get_val("sanction_date"))
            start_dt = _clean_date(get_val("start_date"))
            comp_dt = _clean_date(get_val("completion_date"))

            lat = _clean_float(get_val("latitude"))
            lon = _clean_float(get_val("longitude"))

            # Coordinates validation (India bounding box ~ 6N to 38N, 68E to 98E)
            if lat is not None and lon is not None:
                if not (6.0 <= lat <= 38.0 and 68.0 <= lon <= 98.0):
                    lat, lon = None, None

            if lat is None or lon is None:
                missing_coords += 1

            # Contractor handling
            contractor_name = get_val("contractor_name")
            contractor_id = None
            if contractor_name and str(contractor_name).strip() not in ("", "nan", "None", "Unassigned", "—", "-"):
                name_clean = str(contractor_name).strip()
                if name_clean not in contractor_cache:
                    c = db.query(Contractor).filter(Contractor.name == name_clean).first()
                    if not c:
                        cid = f"CTR-{uuid.uuid4().hex[:6].upper()}"
                        c = Contractor(
                            contractor_id=cid,
                            name=name_clean,
                            registration_info="Official Portal Registered Vendor",
                            district=district,
                        )
                        db.add(c)
                        db.flush()
                    contractor_cache[name_clean] = c.contractor_id
                contractor_id = contractor_cache[name_clean]
            else:
                missing_contractors += 1
                contractor_id = default_ctr.contractor_id

            # Determine quality status tag
            quality_flags = []
            if lat is None or lon is None:
                quality_flags.append("partial_coordinates")
            if contractor_id == default_ctr.contractor_id:
                quality_flags.append("missing_contractor")
            if expenditure > sanctioned * 1.15:
                quality_flags.append("high_expenditure_variance")
                financial_inconsistencies += 1
            if sanctioned <= 0:
                quality_flags.append("zero_amount")

            quality_status = "; ".join(quality_flags) if quality_flags else "clean"

            # Check if project_id exists or create unique project_id
            project_id = f"MOSPI-{src_id}" if not src_id.startswith("MOSPI-") else src_id
            existing = db.query(Project).filter(Project.project_id == project_id).first()
            if existing:
                project_id = f"{project_id}-{idx + 1}"

            proj = Project(
                project_id=project_id,
                mp_id=mp,
                constituency_id=constituency,
                state=state,
                district=district,
                project_type=category,
                location=location,
                description=description,
                recommended_amount=recommended,
                sanctioned_amount=sanctioned,
                released_amount=released,
                expenditure=expenditure,
                recommendation_date=rec_date,
                sanction_date=sanc_date,
                start_date=start_dt,
                completion_date=comp_dt,
                status=status,
                implementing_agency=agency,
                contractor_id=contractor_id,
                latitude=lat,
                longitude=lon,
                data_source=data_source,
                source_record_id=src_id,
                source_url=source_url,
                import_batch_id=batch_id,
                imported_at=now,
                data_quality_status=quality_status,
                created_at=now,
            )
            db.add(proj)
            valid_count += 1
        except Exception as e:
            error_count += 1

    total_records = len(records)
    quality_penalty = (
        (missing_coords / max(total_records, 1)) * 25.0
        + (missing_contractors / max(total_records, 1)) * 15.0
        + (error_count / max(total_records, 1)) * 40.0
        + (financial_inconsistencies / max(total_records, 1)) * 20.0
    )
    quality_score = max(10.0, round(100.0 - quality_penalty, 1))

    batch = ImportBatch(
        batch_id=batch_id,
        source_name=source_name,
        file_name=file_name,
        total_records=total_records,
        valid_records=valid_count,
        error_records=error_count,
        missing_coords_count=missing_coords,
        missing_contractors_count=missing_contractors,
        data_quality_score=quality_score,
        created_at=now,
        metadata_json={
            "data_source": data_source,
            "financial_inconsistencies": financial_inconsistencies,
            "states": list(set(r.get("state") or r.get("State") for r in records if r.get("state") or r.get("State"))),
        },
    )
    db.add(batch)
    db.commit()

    return {
        "batch_id": batch_id,
        "source_name": source_name,
        "file_name": file_name,
        "total_records": total_records,
        "valid_records": valid_count,
        "error_records": error_count,
        "missing_coords_count": missing_coords,
        "missing_contractors_count": missing_contractors,
        "data_quality_score": quality_score,
        "message": f"Successfully imported {valid_count} official records under batch {batch_id}",
    }


def parse_csv_content(content: str | bytes) -> list[dict[str, Any]]:
    """Parse raw CSV string or bytes into list of dictionaries."""
    if isinstance(content, bytes):
        content = content.decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(content))
    return [row for row in reader if any(row.values())]


def parse_json_content(content: str | bytes) -> list[dict[str, Any]]:
    """Parse raw JSON string or bytes into list of dictionaries."""
    if isinstance(content, bytes):
        content = content.decode("utf-8", errors="replace")
    data = json.loads(content)
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        # Look for standard keys like 'data', 'works', 'records', 'items'
        for k in ("data", "works", "records", "items", "projects"):
            if k in data and isinstance(data[k], list):
                return data[k]
        return [data]
    return []
