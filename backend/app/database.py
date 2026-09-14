from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from .config import get_settings

settings = get_settings()
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def upgrade_database_schema(target_engine=None):
    """Ensure all required columns and tables exist in SQLite without data loss."""
    from sqlalchemy import inspect, text
    eng = target_engine or engine
    Base.metadata.create_all(bind=eng)
    inspector = inspect(eng)
    tables = inspector.get_table_names()
    if "projects" in tables:
        cols = {c["name"] for c in inspector.get_columns("projects")}
        with eng.begin() as conn:
            if "data_source" not in cols:
                conn.execute(text("ALTER TABLE projects ADD COLUMN data_source VARCHAR(40) DEFAULT 'synthetic'"))
            if "source_record_id" not in cols:
                conn.execute(text("ALTER TABLE projects ADD COLUMN source_record_id VARCHAR(100)"))
            if "source_url" not in cols:
                conn.execute(text("ALTER TABLE projects ADD COLUMN source_url VARCHAR(255)"))
            if "import_batch_id" not in cols:
                conn.execute(text("ALTER TABLE projects ADD COLUMN import_batch_id VARCHAR(64)"))
            if "imported_at" not in cols:
                conn.execute(text("ALTER TABLE projects ADD COLUMN imported_at DATETIME"))
            if "data_quality_status" not in cols:
                conn.execute(text("ALTER TABLE projects ADD COLUMN data_quality_status VARCHAR(60) DEFAULT 'clean'"))

