from datetime import datetime
from sqlalchemy import String, Float, Date, DateTime, ForeignKey, Integer, Text, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(180), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(180))
    role: Mapped[str] = mapped_column(String(80), default="Monitoring Officer")
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Contractor(Base):
    __tablename__ = "contractors"
    contractor_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(180), index=True)
    registration_info: Mapped[str] = mapped_column(String(180))
    district: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    projects: Mapped[list["Project"]] = relationship(back_populates="contractor")


class Project(Base):
    __tablename__ = "projects"
    project_id: Mapped[str] = mapped_column(String(40), primary_key=True)
    mp_id: Mapped[str] = mapped_column(String(32))
    constituency_id: Mapped[str] = mapped_column(String(50))
    state: Mapped[str] = mapped_column(String(100), index=True)
    district: Mapped[str] = mapped_column(String(100), index=True)
    project_type: Mapped[str] = mapped_column(String(100), index=True)
    location: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    recommended_amount: Mapped[float] = mapped_column(Float)
    sanctioned_amount: Mapped[float] = mapped_column(Float, index=True)
    released_amount: Mapped[float] = mapped_column(Float)
    expenditure: Mapped[float] = mapped_column(Float)
    recommendation_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    sanction_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    start_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    completion_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(60), index=True)
    implementing_agency: Mapped[str] = mapped_column(String(180))
    contractor_id: Mapped[str | None] = mapped_column(ForeignKey("contractors.contractor_id"), nullable=True, index=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    data_source: Mapped[str] = mapped_column(String(40), default="synthetic", index=True)
    source_record_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    source_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    import_batch_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    imported_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    data_quality_status: Mapped[str] = mapped_column(String(60), default="clean")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    contractor: Mapped[Contractor | None] = relationship(back_populates="projects")
    payments: Mapped[list["Payment"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    risk_score: Mapped["RiskScore | None"] = relationship(back_populates="project", uselist=False, cascade="all, delete-orphan")
    anomalies: Mapped[list["AnomalyDetail"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class ImportBatch(Base):
    __tablename__ = "import_batches"
    batch_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    source_name: Mapped[str] = mapped_column(String(180))
    file_name: Mapped[str] = mapped_column(String(255))
    total_records: Mapped[int] = mapped_column(Integer, default=0)
    valid_records: Mapped[int] = mapped_column(Integer, default=0)
    error_records: Mapped[int] = mapped_column(Integer, default=0)
    missing_coords_count: Mapped[int] = mapped_column(Integer, default=0)
    missing_contractors_count: Mapped[int] = mapped_column(Integer, default=0)
    data_quality_score: Mapped[float] = mapped_column(Float, default=100.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)


class Payment(Base):
    __tablename__ = "payments"
    payment_id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.project_id"), index=True)
    payment_date: Mapped[datetime] = mapped_column(Date)
    amount: Mapped[float] = mapped_column(Float)
    recipient: Mapped[str] = mapped_column(String(180))
    payment_type: Mapped[str] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    project: Mapped[Project] = relationship(back_populates="payments")


class RiskScore(Base):
    __tablename__ = "risk_scores"
    risk_id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.project_id"), unique=True, index=True)
    rule_score: Mapped[float] = mapped_column(Float)
    ml_score: Mapped[float] = mapped_column(Float)
    statistical_score: Mapped[float] = mapped_column(Float)
    network_score: Mapped[float] = mapped_column(Float)
    final_risk_score: Mapped[float] = mapped_column(Float, index=True)
    risk_level: Mapped[str] = mapped_column(String(20), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    project: Mapped[Project] = relationship(back_populates="risk_score")


class AnomalyDetail(Base):
    __tablename__ = "anomaly_details"
    anomaly_id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.project_id"), index=True)
    anomaly_type: Mapped[str] = mapped_column(String(100))
    severity: Mapped[str] = mapped_column(String(20))
    measured_value: Mapped[str] = mapped_column(String(255))
    expected_value: Mapped[str] = mapped_column(String(255))
    explanation: Mapped[str] = mapped_column(Text)
    evidence: Mapped[dict] = mapped_column(JSON, default=dict)
    project: Mapped[Project] = relationship(back_populates="anomalies")


class Alert(Base):
    __tablename__ = "alerts"
    alert_id: Mapped[str] = mapped_column(String(40), primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.project_id"), index=True)
    alert_type: Mapped[str] = mapped_column(String(100))
    severity: Mapped[str] = mapped_column(String(20))
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), default="New", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Investigation(Base):
    __tablename__ = "investigations"
    investigation_id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.project_id"), index=True)
    officer: Mapped[str] = mapped_column(String(180))
    status: Mapped[str] = mapped_column(String(40), default="Open")
    remarks: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    log_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(180))
    entity_type: Mapped[str] = mapped_column(String(100))
    entity_id: Mapped[str] = mapped_column(String(100))
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    details: Mapped[dict] = mapped_column(JSON, default=dict)
