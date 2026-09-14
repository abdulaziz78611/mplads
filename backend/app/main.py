from __future__ import annotations

import os
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

from fastapi import Body, Depends, FastAPI, File, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
import bcrypt
from jose import jwt
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from .config import get_settings
from .database import Base, SessionLocal, engine, get_db, upgrade_database_schema
from .ml.anomaly_engine import run_anomaly_analysis
from .models import Alert, AnomalyDetail, AuditLog, Contractor, ImportBatch, Investigation, Payment, Project, RiskScore, User
from .schemas import AlertUpdate, DataQualityReport, ImportBatchResponse, InvestigationCreate, InvestigationUpdate, LoginRequest
from .seed.demo_data import seed_demo_data
from .services.importer import ensure_default_contractor, ingest_records, parse_csv_content, parse_json_content

settings = get_settings()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


app = FastAPI(
    title="MPLAD Sentinel API",
    version="2.0.0",
    description="Official-dataset integrated intelligence and anomaly detection API for MPLADS monitoring.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Db = Annotated[Session, Depends(get_db)]


@app.on_event("startup")
def initialise_app() -> None:
    upgrade_database_schema(engine)
    with SessionLocal() as db:
        ensure_default_contractor(db)
        # Check if synthetic demo data exists
        if not db.query(Project).filter(Project.data_source == "synthetic").first():
            seed_demo_data(db)

        # Check if official data exists; auto-seed from data/official if absent
        if not db.query(Project).filter(Project.data_source == "official").first():
            official_csv = os.path.join(os.path.dirname(__file__), "..", "..", "data", "official", "mplads_official_sample.csv")
            if os.path.exists(official_csv):
                with open(official_csv, "rb") as f:
                    recs = parse_csv_content(f.read())
                ingest_records(
                    db,
                    recs,
                    source_name="Official Data Pipeline — Schema Validation Dataset",
                    file_name="mplads_official_sample.csv",
                    data_source="official",
                )
                run_anomaly_analysis(db, data_source="official")

        if not db.query(Investigation).first():
            db.add_all([
                Investigation(project_id="MPLAD-DEMO-00421", officer="Aditi Sharma", status="Under Review", remarks="Field inspection scheduled to cross-check water pipe network augmentation and payment milestone dates against sanction letter."),
                Investigation(project_id="MPLAD-DEMO-00422", officer="Aditi Sharma", status="Open", remarks="Proximity alert flagged against MPLAD-DEMO-00421. Comparing technical project drawings and DPR files."),
                Investigation(project_id="MPLAD-00001", officer="Rajesh Kumar", status="Verification Requested", remarks="Contractor allocation and expenditure ratio audit requested from district division."),
            ])
            db.commit()


def _project_json(p: Project, include_financials: bool = False) -> dict:
    risk = p.risk_score
    cname = p.contractor.name if p.contractor else ("Unassigned / Departmental Execution" if p.data_source == "official" else "Unassigned")
    payload = {
        "project_id": p.project_id,
        "state": p.state,
        "district": p.district,
        "constituency_id": p.constituency_id,
        "project_type": p.project_type,
        "location": p.location,
        "contractor_id": p.contractor_id,
        "contractor_name": cname,
        "sanctioned_amount": p.sanctioned_amount,
        "expenditure": p.expenditure,
        "status": p.status,
        "latitude": p.latitude,
        "longitude": p.longitude,
        "risk_score": risk.final_risk_score if risk else 0,
        "risk_level": risk.risk_level if risk else "Low",
        "data_source": p.data_source or "synthetic",
        "source_record_id": p.source_record_id,
        "source_url": p.source_url,
        "import_batch_id": p.import_batch_id,
        "imported_at": p.imported_at,
        "data_quality_status": p.data_quality_status or "clean",
    }
    if include_financials:
        payload.update({
            "mp_id": p.mp_id,
            "description": p.description,
            "recommended_amount": p.recommended_amount,
            "released_amount": p.released_amount,
            "remaining_amount": (p.sanctioned_amount or 0.0) - (p.expenditure or 0.0),
            "utilisation_percent": round(100 * (p.expenditure or 0.0) / max(p.sanctioned_amount or 1, 1), 1),
            "recommendation_date": p.recommendation_date,
            "sanction_date": p.sanction_date,
            "start_date": p.start_date,
            "completion_date": p.completion_date,
            "implementing_agency": p.implementing_agency,
            "payments": [
                {
                    "payment_id": x.payment_id,
                    "payment_date": x.payment_date,
                    "amount": x.amount,
                    "recipient": x.recipient,
                    "payment_type": x.payment_type,
                }
                for x in sorted(p.payments, key=lambda x: x.payment_date)
            ],
        })
    return payload


def _get_project_or_404(db: Session, project_id: str) -> Project:
    project = (
        db.query(Project)
        .options(
            joinedload(Project.contractor),
            joinedload(Project.payments),
            joinedload(Project.risk_score),
            joinedload(Project.anomalies),
        )
        .filter(Project.project_id == project_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "mplad-sentinel-api", "version": "2.0.0"}


@app.post("/api/auth/login")
def login(body: LoginRequest, db: Db) -> dict:
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    token = jwt.encode({"sub": str(user.id), "role": user.role, "exp": expire}, settings.secret_key, algorithm="HS256")
    return {"access_token": token, "token_type": "bearer", "user": {"name": user.full_name, "email": user.email, "role": user.role}}


@app.get("/api/dashboard/summary")
def dashboard_summary(
    db: Db,
    data_source: str | None = None,
    state: str | None = None,
    district: str | None = None,
    project_type: str | None = None,
    risk_level: str | None = None,
    year: str | None = None,
) -> dict:
    query = db.query(Project).options(joinedload(Project.risk_score), joinedload(Project.contractor), joinedload(Project.anomalies))
    if data_source and data_source != "all":
        query = query.filter(Project.data_source == data_source)
    if state: query = query.filter(Project.state == state)
    if district: query = query.filter(Project.district == district)
    if project_type: query = query.filter(Project.project_type == project_type)
    items = query.all()

    if year and year != "all":
        s_year = year.replace("–", "-").strip()
        if "-" in s_year:
            parts = [p.strip() for p in s_year.split("-") if p.strip().isdigit()]
            if len(parts) >= 2:
                start_yr = int(parts[0])
                p2 = int(parts[1])
                end_yr = p2 if len(parts[1]) == 4 else (start_yr // 100) * 100 + p2
                start_d, end_d = date(start_yr, 4, 1), date(end_yr, 3, 31)
                def in_bounds(p: Project) -> bool:
                    dt = p.sanction_date or p.recommendation_date or (p.created_at.date() if p.created_at else None)
                    return dt is not None and (start_d <= dt <= end_d)
                items = [x for x in items if in_bounds(x)]
        elif s_year.isdigit():
            yr = int(s_year)
            start_d, end_d = date(yr, 1, 1), date(yr, 12, 31)
            def in_bounds(p: Project) -> bool:
                dt = p.sanction_date or p.recommendation_date or (p.created_at.date() if p.created_at else None)
                return dt is not None and (start_d <= dt <= end_d)
            items = [x for x in items if in_bounds(x)]

    if risk_level:
        items = [x for x in items if x.risk_score and x.risk_score.risk_level == risk_level]

    scores = [x.risk_score.final_risk_score for x in items if x.risk_score]
    by_state: dict[str, int] = Counter(x.state for x in items)
    by_type: dict[str, int] = Counter(x.project_type for x in items)
    risk_dist = Counter(x.risk_score.risk_level if x.risk_score else "Low" for x in items)
    monthly: defaultdict[str, int] = defaultdict(int)
    expenditure_trend: defaultdict[str, float] = defaultdict(float)

    for x in items:
        dt = x.sanction_date or (x.created_at.date() if x.created_at else date.today())
        key = dt.strftime("%Y-%m")
        monthly[key] += 1
        expenditure_trend[key] += (x.expenditure or 0.0)

    high = sorted([x for x in items if x.risk_score and x.risk_score.final_risk_score > 60], key=lambda x: x.risk_score.final_risk_score, reverse=True)[:10]

    official_total = db.query(Project).filter(Project.data_source == "official").count()
    synthetic_total = db.query(Project).filter(Project.data_source == "synthetic").count()

    # Active-dataset-isolated open alerts count
    alert_query = db.query(Alert).join(Project, Alert.project_id == Project.project_id).filter(Alert.status.in_(["Open", "Under Review", "Verification Requested"]))
    if data_source and data_source != "all":
        alert_query = alert_query.filter(Project.data_source == data_source)
    open_alerts_count = alert_query.count()

    disclaimer = (
        "Target Source: MoSPI MPLADS–eSAKSHI (https://mplads.mospi.gov.in). Current Dataset: 180 schema-conforming validation records based on official data structure. An anomaly indicates statistical pattern deviation and does not prove fraud or wrongdoing."
        if data_source == "official"
        else "Demonstration dataset — 1,202 synthetic benchmark records for multi-engine decision-support evaluation. An anomaly does not prove fraud or wrongdoing."
    )

    return {
        "disclaimer": disclaimer,
        "kpis": {
            "total_projects": len(items),
            "total_sanctioned_amount": round(sum(x.sanctioned_amount or 0.0 for x in items), 2),
            "total_expenditure": round(sum(x.expenditure or 0.0 for x in items), 2),
            "projects_under_review": open_alerts_count,
            "high_risk_projects": sum(1 for score in scores if 60 < score <= 80),
            "critical_risk_projects": sum(1 for score in scores if score > 80),
            "average_risk_score": round(sum(scores) / max(len(scores), 1), 1),
            "official_count": official_total,
            "synthetic_count": synthetic_total,
            "active_data_source": data_source or "all",
        },
        "projects_by_state": [{"name": k, "value": v} for k, v in sorted(by_state.items(), key=lambda z: z[1], reverse=True)],
        "projects_by_type": [{"name": k, "value": v} for k, v in sorted(by_type.items(), key=lambda z: z[1], reverse=True)],
        "risk_distribution": [{"name": level, "value": risk_dist.get(level, 0)} for level in ["Low", "Medium", "High", "Critical"]],
        "monthly_trend": [{"month": k, "projects": monthly[k], "expenditure": round(expenditure_trend[k], 2)} for k in sorted(monthly)],
        "high_risk_projects": [_project_json(x) | {"main_anomaly": x.anomalies[0].anomaly_type if x.anomalies else "Composite anomaly"} for x in high],
    }


@app.get("/api/filter-options")
def filter_options(db: Db, data_source: str | None = None) -> dict:
    query = db.query(Project)
    if data_source and data_source != "all":
        query = query.filter(Project.data_source == data_source)

    states = [x[0] for x in query.with_entities(Project.state).distinct().order_by(Project.state) if x[0]]
    districts = [x[0] for x in query.with_entities(Project.district).distinct().order_by(Project.district) if x[0]]
    types = [x[0] for x in query.with_entities(Project.project_type).distinct().order_by(Project.project_type) if x[0]]
    contractors = [{"id": x.contractor_id, "name": x.name} for x in db.query(Contractor).order_by(Contractor.name)]

    return {
        "states": states,
        "districts": districts,
        "project_types": types,
        "contractors": contractors,
        "data_sources": ["official", "synthetic", "all"],
    }


@app.get("/api/projects")
def list_projects(
    db: Db,
    data_source: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=5, le=100),
    search: str | None = None,
    state: str | None = None,
    district: str | None = None,
    constituency: str | None = None,
    project_type: str | None = None,
    contractor_id: str | None = None,
    risk_level: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    sort_by: str = "risk_score",
    order: str = "desc",
) -> dict:
    query = db.query(Project).options(joinedload(Project.risk_score), joinedload(Project.contractor))
    if data_source and data_source != "all":
        query = query.filter(Project.data_source == data_source)

    if search:
        term = f"%{search.lower()}%"
        query = query.outerjoin(Contractor).filter(
            func.lower(Project.project_id).like(term)
            | func.lower(Project.location).like(term)
            | func.lower(Project.description).like(term)
            | func.lower(Contractor.name).like(term)
        )
    for field, value in [
        (Project.state, state),
        (Project.district, district),
        (Project.constituency_id, constituency),
        (Project.project_type, project_type),
        (Project.contractor_id, contractor_id),
        (Project.status, status_filter),
    ]:
        if value:
            query = query.filter(field == value)

    items = query.all()
    if risk_level:
        items = [x for x in items if x.risk_score and x.risk_score.risk_level == risk_level]

    reverse = order != "asc"
    sort_map = {
        "risk_score": lambda x: x.risk_score.final_risk_score if x.risk_score else 0,
        "amount": lambda x: x.sanctioned_amount or 0.0,
        "state": lambda x: x.state or "",
        "project_id": lambda x: x.project_id,
    }
    items.sort(key=sort_map.get(sort_by, sort_map["risk_score"]), reverse=reverse)
    total = len(items)
    page_items = items[(page - 1) * page_size: page * page_size]
    return {"items": [_project_json(x) for x in page_items], "total": total, "page": page, "page_size": page_size, "pages": max(1, (total + page_size - 1) // page_size)}


@app.get("/api/projects/{project_id}")
def project_detail(project_id: str, db: Db) -> dict:
    p = _get_project_or_404(db, project_id)
    data = _project_json(p, include_financials=True)
    data["risk_components"] = (
        {
            "rule_score": p.risk_score.rule_score,
            "ml_score": p.risk_score.ml_score,
            "statistical_score": p.risk_score.statistical_score,
            "network_score": p.risk_score.network_score,
            "final_risk_score": p.risk_score.final_risk_score,
            "risk_level": p.risk_score.risk_level,
        }
        if p.risk_score
        else None
    )
    data["anomalies"] = [
        {
            "anomaly_id": x.anomaly_id,
            "anomaly_type": x.anomaly_type,
            "severity": x.severity,
            "measured_value": x.measured_value,
            "expected_value": x.expected_value,
            "explanation": x.explanation,
            "evidence": x.evidence,
        }
        for x in p.anomalies
    ]
    data["investigations"] = [
        {
            "id": x.investigation_id,
            "officer": x.officer,
            "status": x.status,
            "remarks": x.remarks,
            "created_at": x.created_at,
            "updated_at": x.updated_at,
        }
        for x in db.query(Investigation).filter(Investigation.project_id == project_id).order_by(Investigation.created_at.desc())
    ]
    return data


@app.get("/api/projects/{project_id}/risk")
def project_risk(project_id: str, db: Db) -> dict:
    p = _get_project_or_404(db, project_id)
    if not p.risk_score:
        raise HTTPException(status_code=404, detail="Risk analysis has not been run")
    return {
        "project_id": project_id,
        "rule_score": p.risk_score.rule_score,
        "ml_score": p.risk_score.ml_score,
        "statistical_score": p.risk_score.statistical_score,
        "network_score": p.risk_score.network_score,
        "final_risk_score": p.risk_score.final_risk_score,
        "risk_level": p.risk_score.risk_level,
        "methodology": "Adaptive multi-engine: Rules (30-40%), Isolation Forest (30-35%), Z-Score (20-25%), Network (0-20% depending on vendor linkage).",
    }


@app.get("/api/projects/{project_id}/network")
def project_network(project_id: str, db: Db) -> dict:
    p = _get_project_or_404(db, project_id)
    cid = p.contractor_id or "CTR-OFFICIAL-UNASSIGNED"
    cname = p.contractor.name if p.contractor else "Unassigned / Departmental Execution"

    related = db.query(Project).options(joinedload(Project.risk_score)).filter(Project.contractor_id == cid).order_by(Project.sanctioned_amount.desc()).limit(18).all()
    nodes = [
        {"id": f"contractor:{cid}", "label": cname, "type": "contractor"},
        {"id": f"district:{p.district}", "label": p.district or "District", "type": "district"},
        {"id": f"agency:{p.implementing_agency}", "label": p.implementing_agency or "Agency", "type": "agency"},
    ]
    edges = []
    for item in related:
        nodes.append({"id": f"project:{item.project_id}", "label": item.project_id, "type": "project", "risk_level": item.risk_score.risk_level if item.risk_score else "Low"})
        edges.extend([
            {"source": f"contractor:{cid}", "target": f"project:{item.project_id}"},
            {"source": f"project:{item.project_id}", "target": f"district:{item.district}"},
            {"source": f"project:{item.project_id}", "target": f"agency:{item.implementing_agency}"},
        ])
        if item.district != p.district:
            nodes.append({"id": f"district:{item.district}", "label": item.district, "type": "district"})
        if item.implementing_agency != p.implementing_agency:
            nodes.append({"id": f"agency:{item.implementing_agency}", "label": item.implementing_agency, "type": "agency"})

    return {
        "nodes": list({x["id"]: x for x in nodes}.values()),
        "edges": edges,
        "summary": {
            "contractor_projects": db.query(Project).filter(Project.contractor_id == cid).count(),
            "districts": db.query(Project.district).filter(Project.contractor_id == cid).distinct().count(),
            "agencies": db.query(Project.implementing_agency).filter(Project.contractor_id == cid).distinct().count(),
        },
    }


@app.get("/api/contractors")
def list_contractors(db: Db, data_source: str | None = None, search: str | None = None) -> list[dict]:
    query = db.query(Contractor)
    if search:
        query = query.filter(func.lower(Contractor.name).like(f"%{search.lower()}%"))
    contractors = query.all()
    if not contractors:
        return []

    p_query = db.query(Project.contractor_id, Project.sanctioned_amount, RiskScore.final_risk_score).outerjoin(RiskScore, RiskScore.project_id == Project.project_id)
    if data_source and data_source != "all":
        p_query = p_query.filter(Project.data_source == data_source)

    project_rows = p_query.all()
    stats: dict[str, dict] = defaultdict(lambda: {"count": 0, "value": 0.0, "high_risk": 0, "risk_sum": 0.0})
    for cid, amount, score in project_rows:
        if cid:
            s = stats[cid]
            s["count"] += 1
            s["value"] += amount or 0.0
            if score is not None and score > 60:
                s["high_risk"] += 1
            s["risk_sum"] += (score or 0.0)

    items = []
    for c in contractors:
        s = stats[c.contractor_id]
        total_p = s["count"]
        if total_p == 0 and data_source == "official" and c.contractor_id.startswith("CTR-") and not c.contractor_id.startswith("CTR-OFFICIAL"):
            continue
        items.append({
            "contractor_id": c.contractor_id,
            "name": c.name or "Unassigned",
            "district": c.district or "Unknown",
            "total_projects": total_p,
            "total_value": round(s["value"], 2),
            "high_risk_projects": s["high_risk"],
            "average_risk": round(s["risk_sum"] / max(total_p, 1), 1),
        })
    return sorted(items, key=lambda x: (x["high_risk_projects"], x["total_value"]), reverse=True)


@app.get("/api/contractors/{contractor_id}")
def contractor_detail(contractor_id: str, db: Db) -> dict:
    c = db.query(Contractor).filter(Contractor.contractor_id == contractor_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contractor not found")
    ps = db.query(Project).options(joinedload(Project.risk_score), joinedload(Project.contractor)).filter(Project.contractor_id == contractor_id).all()
    distribution = Counter(x.risk_score.risk_level if x.risk_score else "Low" for x in ps)
    timeline = defaultdict(lambda: {"projects": 0, "value": 0.0})
    for p in ps:
        dt = p.sanction_date or (p.created_at.date() if p.created_at else date.today())
        key = dt.strftime("%Y")
        timeline[key]["projects"] += 1
        timeline[key]["value"] += (p.sanctioned_amount or 0.0)
    return {
        "contractor_id": c.contractor_id,
        "name": c.name,
        "registration_info": c.registration_info,
        "home_district": c.district,
        "total_projects": len(ps),
        "total_value": sum(x.sanctioned_amount or 0.0 for x in ps),
        "average_project_value": sum(x.sanctioned_amount or 0.0 for x in ps) / max(len(ps), 1),
        "districts": sorted({x.district for x in ps if x.district}),
        "risk_distribution": [{"name": k, "value": distribution.get(k, 0)} for k in ["Low", "Medium", "High", "Critical"]],
        "timeline": [{"year": k, **v} for k, v in sorted(timeline.items())],
        "projects": [_project_json(x) for x in sorted(ps, key=lambda z: z.risk_score.final_risk_score if z.risk_score else 0, reverse=True)[:50]],
    }


@app.get("/api/alerts")
def list_alerts(
    db: Db,
    data_source: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    severity: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=5, le=100),
) -> dict:
    query = db.query(Alert, Project, RiskScore).join(Project, Alert.project_id == Project.project_id).join(RiskScore, RiskScore.project_id == Project.project_id)
    if data_source and data_source != "all":
        query = query.filter(Project.data_source == data_source)
    if status_filter:
        query = query.filter(Alert.status == status_filter)
    if severity:
        query = query.filter(Alert.severity == severity)

    rows = query.order_by(RiskScore.final_risk_score.desc()).all()
    entries = [
        {
            "alert_id": a.alert_id,
            "project_id": a.project_id,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "risk_score": r.final_risk_score,
            "description": a.description,
            "status": a.status,
            "created_at": a.created_at,
            "state": p.state,
            "district": p.district,
            "data_source": p.data_source,
        }
        for a, p, r in rows
    ]
    return {"items": entries[(page - 1) * page_size: page * page_size], "total": len(entries), "page": page, "pages": max(1, (len(entries) + page_size - 1) // page_size)}


@app.patch("/api/alerts/{alert_id}")
def update_alert(alert_id: str, body: AlertUpdate, db: Db) -> dict:
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    before = alert.status
    alert.status = body.status
    db.add(AuditLog(action="alert_status_updated", entity_type="alert", entity_id=alert_id, details={"from": before, "to": body.status}))
    db.commit()
    db.refresh(alert)
    return {"alert_id": alert.alert_id, "status": alert.status, "updated_at": alert.updated_at}


@app.post("/api/investigations", status_code=status.HTTP_201_CREATED)
def create_investigation(body: InvestigationCreate, db: Db) -> dict:
    _get_project_or_404(db, body.project_id)
    item = Investigation(**body.model_dump())
    db.add(item)
    db.flush()
    db.add(AuditLog(action="investigation_created", entity_type="investigation", entity_id=str(item.investigation_id), details={"project_id": body.project_id, "status": body.status}))
    db.commit()
    db.refresh(item)
    return {"investigation_id": item.investigation_id, "project_id": item.project_id, "status": item.status, "remarks": item.remarks}


@app.get("/api/investigations")
def list_investigations(db: Db, data_source: str | None = None) -> list[dict]:
    query = db.query(Investigation, Project).join(Project, Investigation.project_id == Project.project_id)
    if data_source and data_source != "all":
        query = query.filter(Project.data_source == data_source)
    rows = query.order_by(Investigation.updated_at.desc()).all()
    return [
        {
            "investigation_id": i.investigation_id,
            "project_id": i.project_id,
            "project_type": p.project_type,
            "district": p.district,
            "officer": i.officer,
            "status": i.status,
            "remarks": i.remarks,
            "updated_at": i.updated_at,
            "data_source": p.data_source,
        }
        for i, p in rows
    ]


@app.patch("/api/investigations/{investigation_id}")
def update_investigation(investigation_id: int, body: InvestigationUpdate, db: Db) -> dict:
    item = db.query(Investigation).filter(Investigation.investigation_id == investigation_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Investigation not found")
    before = item.status
    if body.status is not None:
        item.status = body.status
    if body.remarks is not None:
        item.remarks = body.remarks
    db.add(AuditLog(action="investigation_updated", entity_type="investigation", entity_id=str(item.investigation_id), details={"from_status": before, "to_status": item.status}))
    db.commit()
    return {"investigation_id": item.investigation_id, "status": item.status, "remarks": item.remarks}


@app.get("/api/map/projects")
def map_projects(
    db: Db,
    data_source: str | None = None,
    state: str | None = None,
    risk_level: str | None = None,
    limit: int = Query(900, ge=1, le=1500),
) -> list[dict]:
    q = db.query(Project).options(joinedload(Project.risk_score), joinedload(Project.contractor)).filter(Project.latitude.is_not(None), Project.longitude.is_not(None))
    if data_source and data_source != "all":
        q = q.filter(Project.data_source == data_source)
    if state:
        q = q.filter(Project.state == state)
    items = q.all()
    if risk_level:
        items = [p for p in items if p.risk_score and p.risk_score.risk_level == risk_level]
    return [_project_json(p) for p in sorted(items, key=lambda x: x.risk_score.final_risk_score if x.risk_score else 0, reverse=True)[:limit]]


@app.get("/api/reports/{project_id}")
def project_report(project_id: str, db: Db) -> dict:
    p = _get_project_or_404(db, project_id)
    anomalies = db.query(AnomalyDetail).filter(AnomalyDetail.project_id == project_id).all()
    contractor_projects = db.query(Project).options(joinedload(Project.risk_score)).filter(Project.contractor_id == p.contractor_id).all() if p.contractor_id else []
    return {
        "report_title": "MPLAD Project Investigation Summary",
        "generated_at": datetime.now(timezone.utc),
        "disclaimer": "Decision-support summary. This system identifies anomalous patterns and prioritises projects for administrative verification; it does not establish fraud or wrongdoing.",
        "project": _project_json(p, include_financials=True),
        "risk": {
            "score": p.risk_score.final_risk_score if p.risk_score else 0,
            "level": p.risk_score.risk_level if p.risk_score else "Low",
            "method": "Adaptive multi-engine: Rules (30-40%), Unsupervised ML (30-35%), Statistics (20-25%), Network (0-20%).",
        },
        "anomalies": [{"type": x.anomaly_type, "severity": x.severity, "measured": x.measured_value, "expected": x.expected_value, "explanation": x.explanation} for x in anomalies],
        "contractor": {
            "id": p.contractor_id or "Unassigned",
            "name": p.contractor.name if p.contractor else "Unassigned / Departmental Execution",
            "total_projects": len(contractor_projects),
            "total_value": sum(x.sanctioned_amount or 0.0 for x in contractor_projects),
            "high_risk_projects": sum(1 for x in contractor_projects if x.risk_score and x.risk_score.final_risk_score > 60),
        },
        "investigations": [{"officer": x.officer, "status": x.status, "remarks": x.remarks, "updated_at": x.updated_at} for x in db.query(Investigation).filter(Investigation.project_id == project_id)],
    }


@app.post("/api/anomaly/run")
def rerun_analysis(db: Db, data_source: str | None = None) -> dict:
    try:
        return run_anomaly_analysis(db, data_source=data_source)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Analysis could not be saved. Check database connectivity.") from exc


# -----------------------------------------------------------------------------
# Data Import, Quality Auditing & Batch Management Endpoints
# -----------------------------------------------------------------------------

@app.post("/api/data/import")
async def import_data(
    db: Db,
    file: UploadFile | None = File(None),
    body: dict | None = Body(None),
    data_source: str = Query("official"),
    source_name: str = Query("Official data import pipeline — awaiting authorized source data"),
) -> dict:
    """Import official or external MPLADS datasets in CSV or JSON format."""
    records: list[dict[str, Any]] = []
    file_name = "api_import.json"

    if file:
        file_name = file.filename or "uploaded_data"
        content = await file.read()
        if file_name.endswith(".json"):
            records = parse_json_content(content)
        else:
            records = parse_csv_content(content)
    elif body:
        if "records" in body and isinstance(body["records"], list):
            records = body["records"]
        elif "items" in body and isinstance(body["items"], list):
            records = body["items"]
        elif "data" in body and isinstance(body["data"], list):
            records = body["data"]
        else:
            records = [body]
        source_name = body.get("source_name", source_name)
        data_source = body.get("data_source", data_source)
        file_name = body.get("file_name", file_name)

    if not records:
        raise HTTPException(status_code=400, detail="No records found in upload or payload.")

    result = ingest_records(
        db=db,
        records=records,
        source_name=source_name,
        file_name=file_name,
        data_source=data_source,
    )

    # Run dynamic anomaly analysis on the ingested dataset
    analysis = run_anomaly_analysis(db, data_source=data_source)
    result["anomaly_analysis"] = analysis
    return result


@app.get("/api/data/batches")
def list_import_batches(db: Db) -> list[dict]:
    """Retrieve history of dataset imports and quality logs."""
    batches = db.query(ImportBatch).order_by(ImportBatch.created_at.desc()).limit(50).all()
    return [
        {
            "batch_id": b.batch_id,
            "source_name": b.source_name,
            "file_name": b.file_name,
            "total_records": b.total_records,
            "valid_records": b.valid_records,
            "error_records": b.error_records,
            "missing_coords_count": b.missing_coords_count,
            "missing_contractors_count": b.missing_contractors_count,
            "data_quality_score": b.data_quality_score,
            "created_at": b.created_at,
            "metadata_json": b.metadata_json or {},
        }
        for b in batches
    ]


@app.get("/api/data/quality")
def data_quality_summary(db: Db, data_source: str | None = None) -> dict:
    """Comprehensive data quality audit metrics calculated from the active dataset."""
    query = db.query(Project)
    if data_source and data_source != "all":
        query = query.filter(Project.data_source == data_source)

    total = query.count()
    official_count = db.query(Project).filter(Project.data_source == "official").count()
    synthetic_count = db.query(Project).filter(Project.data_source == "synthetic").count()

    # Valid geocoded records have BOTH valid latitude and longitude
    valid_coords = query.filter(Project.latitude.is_not(None), Project.longitude.is_not(None)).count()
    missing_coords = total - valid_coords
    missing_coords_pct = round((missing_coords / max(total, 1)) * 100, 1)
    coordinate_completeness_pct = round((valid_coords / max(total, 1)) * 100, 1)

    missing_contractors = query.filter(
        (Project.contractor_id.is_(None)) | (Project.contractor_id == "CTR-OFFICIAL-UNASSIGNED")
    ).count()
    missing_contractors_pct = round((missing_contractors / max(total, 1)) * 100, 1)

    exp_variance = query.filter(Project.expenditure > Project.sanctioned_amount * 1.15).count()
    timeline_flags = query.filter(
        Project.sanction_date.is_not(None),
        Project.recommendation_date.is_not(None),
        Project.sanction_date < Project.recommendation_date,
    ).count()
    negative_amounts = query.filter(
        (Project.sanctioned_amount < 0) | (Project.released_amount < 0) | (Project.expenditure < 0)
    ).count()
    released_exceeds_sanction = query.filter(
        Project.sanctioned_amount > 0, Project.released_amount > Project.sanctioned_amount * 1.05
    ).count()

    batches = db.query(ImportBatch).order_by(ImportBatch.created_at.desc()).limit(10).all()
    batch_scores = [b.data_quality_score for b in batches]
    official_score = round(sum(batch_scores) / max(len(batch_scores), 1), 1) if batch_scores else 92.0

    # Overall quality score: starts at 100, deducts for actual data flaws
    quality_score = 100.0
    if total > 0:
        coord_penalty = (missing_coords / total) * 20.0 if data_source != "official" else 0.0
        contractor_penalty = (missing_contractors / total) * 15.0 if data_source != "official" else 5.0
        finance_penalty = (exp_variance / total) * 25.0
        timeline_penalty = (timeline_flags / total) * 20.0
        quality_score = max(10.0, round(100.0 - (coord_penalty + contractor_penalty + finance_penalty + timeline_penalty), 1))

    sources = [
        {
            "name": "Official Data Pipeline — Schema Validation Dataset (180 records)",
            "source": "official",
            "count": official_count,
            "pct": round(official_count / max(db.query(Project).count(), 1) * 100, 1),
        },
        {
            "name": "Synthetic Demonstration Showcase (1,202 records)",
            "source": "synthetic",
            "count": synthetic_count,
            "pct": round(synthetic_count / max(db.query(Project).count(), 1) * 100, 1),
        },
    ]

    return {
        "active_data_source": data_source or "all",
        "total_projects": total,
        "valid_coordinates_count": valid_coords,
        "missing_coordinates_count": missing_coords,
        "missing_coordinates_pct": missing_coords_pct,
        "coordinate_completeness_pct": coordinate_completeness_pct,
        "missing_contractor_count": missing_contractors,
        "missing_contractor_pct": missing_contractors_pct,
        "financial_inconsistencies_count": exp_variance,
        "timeline_inconsistencies_count": timeline_flags,
        "invalid_dates_count": timeline_flags,
        "negative_amounts_count": negative_amounts,
        "released_exceeds_sanction_count": released_exceeds_sanction,
        "overall_quality_score": quality_score,
        "official_quality_score": official_score,
        "official_projects": official_count,
        "synthetic_projects": synthetic_count,
        "sources_breakdown": sources,
        "latest_import_batches": [
            {
                "batch_id": b.batch_id,
                "source_name": b.source_name,
                "file_name": b.file_name,
                "total_records": b.total_records,
                "valid_records": b.valid_records,
                "error_records": b.error_records,
                "missing_coords_count": b.missing_coords_count,
                "missing_contractors_count": b.missing_contractors_count,
                "data_quality_score": b.data_quality_score,
                "created_at": b.created_at,
                "metadata_json": b.metadata_json or {},
            }
            for b in batches
        ],
    }


@app.post("/api/data/seed-official")
def seed_official_data(db: Db) -> dict:
    """Seed official dataset from local file data/official/mplads_official_sample.csv."""
    official_csv = os.path.join(os.path.dirname(__file__), "..", "..", "data", "official", "mplads_official_sample.csv")
    if not os.path.exists(official_csv):
        raise HTTPException(status_code=404, detail="Official sample dataset not found on disk")
    with open(official_csv, "rb") as f:
        records = parse_csv_content(f.read())
    result = ingest_records(
        db=db,
        records=records,
        source_name="Official Data Pipeline — Schema Validation Dataset",
        file_name="mplads_official_sample.csv",
        data_source="official",
    )
    analysis = run_anomaly_analysis(db, data_source="official")
    result["anomaly_analysis"] = analysis
    return result


@app.exception_handler(SQLAlchemyError)
async def database_error_handler(_, exc: SQLAlchemyError):
    return __import__("fastapi").responses.JSONResponse(status_code=503, content={"detail": "Database service is temporarily unavailable."})
