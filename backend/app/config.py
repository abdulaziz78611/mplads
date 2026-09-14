from functools import lru_cache
import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
IS_SERVERLESS = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME") or os.path.exists("/var/task"))

# Sanitize environment variables before Settings loads to avoid crashes on empty strings
for _k in ["DATABASE_URL", "database_url", "SECRET_KEY", "secret_key", "ACCESS_TOKEN_EXPIRE_MINUTES", "access_token_expire_minutes"]:
    _v = os.environ.get(_k)
    if _v is not None and not _v.strip():
        del os.environ[_k]

if IS_SERVERLESS:
    DEFAULT_DB_PATH = "/tmp/mplad_demo.db"
    try:
        os.makedirs(os.path.dirname(DEFAULT_DB_PATH), exist_ok=True)
        if not os.path.exists(DEFAULT_DB_PATH) or os.path.getsize(DEFAULT_DB_PATH) == 0:
            candidates = [
                BASE_DIR / "data" / "seed_mplad.db",
                BASE_DIR / "mplad_demo.db",
                Path(os.getcwd()) / "backend" / "data" / "seed_mplad.db",
                Path(os.getcwd()) / "data" / "seed_mplad.db",
                Path("/var/task/backend/data/seed_mplad.db"),
                Path("/var/task/data/seed_mplad.db"),
            ]
            for c in candidates:
                if c.exists() and c.stat().st_size > 0:
                    import shutil
                    shutil.copyfile(c, DEFAULT_DB_PATH)
                    break
    except Exception as e:
        print(f"Serverless DB seed warning: {e}")
else:
    DEFAULT_DB_PATH = (BASE_DIR / "mplad_demo.db").as_posix()


class Settings(BaseSettings):
    database_url: str = f"sqlite:///{DEFAULT_DB_PATH}"
    secret_key: str = "mplad-sentinel-jwt-secret-key-2026-sih-demo"
    access_token_expire_minutes: int = 480
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    def __init__(self, **values):
        super().__init__(**values)
        if not self.database_url or "://" not in self.database_url:
            self.database_url = f"sqlite:///{DEFAULT_DB_PATH}"

        if IS_SERVERLESS and self.database_url.startswith("sqlite"):
            if "sqlite:////tmp" not in self.database_url:
                self.database_url = "sqlite:////tmp/mplad_demo.db"


@lru_cache
def get_settings() -> Settings:
    return Settings()

