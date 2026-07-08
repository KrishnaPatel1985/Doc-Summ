from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./summarizer.db"
    openai_api_key: str = ""
    max_file_size_mb: int = 20
    frontend_origin: str = "http://localhost:8000"
    upload_dir: str = "uploads"
    # Development fallback only. Set AUTH_SECRET_KEY in real local/prod use.
    auth_secret_key: str = "docsumm-local-dev-secret-change-me"
    auth_token_minutes: int = 60 * 24 * 7

    model_config = {"env_file": ".env"}


settings = Settings()
