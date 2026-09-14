from functools import lru_cache
import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
IS_SERVERLESS = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME") or os.path.exists("/var/task"))

if IS_SERVERLESS:
    DEFAULT_DB_PATH = "/tmp/mplad_demo.db"
else:
    DEFAULT_DB_PATH = (BASE_DIR / "mplad_demo.db").as_posix()


class Settings(BaseSettings):
    database_url: str = f"sqlite:///{DEFAULT_DB_PATH}"
    secret_key: str = "mplad-sentinel-jwt-secret-key-2026-sih-demo"
    access_token_expire_minutes: int = 480
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    def __init__(self, **values):
        super().__init__(**values)
        if IS_SERVERLESS and self.database_url.startswith("sqlite"):
            if "sqlite:////tmp" not in self.database_url:
                self.database_url = "sqlite:////tmp/mplad_demo.db"


@lru_cache
def get_settings() -> Settings:
    return Settings()
