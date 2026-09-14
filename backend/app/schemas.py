from datetime import date, datetime
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=4, max_length=128)


class AlertUpdate(BaseModel):
    status: str = Field(pattern="^(New|Open|Under Review|Verification Requested|Verified|False Positive|Closed)$")


class InvestigationCreate(BaseModel):
    project_id: str
    officer: str = Field(min_length=2, max_length=180)
    status: str = "Open"
    remarks: str = Field(default="", max_length=4000)


class InvestigationUpdate(BaseModel):
    status: str | None = None
    remarks: str | None = Field(default=None, max_length=4000)


class ImportBatchResponse(BaseModel):
    batch_id: str
    source_name: str
    file_name: str
    total_records: int
    valid_records: int
    error_records: int
    missing_coords_count: int
    missing_contractors_count: int
    data_quality_score: float
    created_at: datetime
    metadata_json: dict = {}


class DataQualityReport(BaseModel):
    total_projects: int
    official_projects: int
    synthetic_projects: int
    overall_quality_score: float
    official_quality_score: float
    missing_coordinates_count: int
    missing_coordinates_pct: float
    missing_contractor_count: int
    missing_contractor_pct: float
    financial_inconsistencies_count: int
    timeline_inconsistencies_count: int
    sources_breakdown: list[dict]
    latest_import_batches: list[ImportBatchResponse]
