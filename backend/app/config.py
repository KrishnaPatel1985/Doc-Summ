import secrets

from pydantic_settings import BaseSettings

_LOCAL_AUTH_SECRET_KEY = secrets.token_urlsafe(32)


class Settings(BaseSettings):
    database_url: str = "sqlite:///./summarizer.db"
    openai_api_key: str = ""
    max_file_size_mb: int = 20
    frontend_origin: str = "http://localhost:8000"
    frontend_url: str = ""
    cors_origins: str = ""
    upload_dir: str = "uploads"
    auth_secret_key: str = ""
    auth_token_minutes: int = 60 * 24 * 7
    environment: str = "development"
    port: int = 8000

    model_config = {"env_file": ".env"}

    @property
    def allowed_origins(self) -> list[str]:
        defaults = [
            "http://localhost:8000",
            "http://127.0.0.1:8000",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
        configured = [self.frontend_origin, self.frontend_url]
        configured.extend(origin.strip() for origin in self.cors_origins.split(","))

        origins: list[str] = []
        for origin in defaults + configured:
            normalized = origin.strip().rstrip("/")
            if normalized and normalized not in origins:
                origins.append(normalized)
        return origins

    @property
    def resolved_auth_secret_key(self) -> str:
        if self.auth_secret_key:
            return self.auth_secret_key
        if self.environment.lower() in {"production", "prod"}:
            raise RuntimeError("AUTH_SECRET_KEY must be set in production.")
        return _LOCAL_AUTH_SECRET_KEY

    def validate_production_secrets(self) -> None:
        if self.environment.lower() not in {"production", "prod"}:
            return
        missing = []
        if not self.openai_api_key:
            missing.append("OPENAI_API_KEY")
        if not self.auth_secret_key:
            missing.append("AUTH_SECRET_KEY")
        if missing:
            raise RuntimeError(f"Missing required production environment variables: {', '.join(missing)}")


settings = Settings()
