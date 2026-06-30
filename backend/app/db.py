from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings

_is_sqlite = settings.database_url.startswith("sqlite")
_connect_args = {"check_same_thread": False} if _is_sqlite else {}
engine = create_engine(settings.database_url, connect_args=_connect_args, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


# Lightweight additive migration: ADD COLUMN for any model column missing from
# the existing table. SQLite's create_all() never alters existing tables, so we
# patch in new columns here without dropping user history.
_ADDED_COLUMNS = {
    "length": "VARCHAR(20) DEFAULT 'medium'",
    "tone": "VARCHAR(20) DEFAULT 'professional'",
    "style": "VARCHAR(20) DEFAULT 'paragraph'",
    "key_insights": "TEXT",
    "action_items": "TEXT",
}


def ensure_columns() -> None:
    inspector = inspect(engine)
    if "summarization_jobs" not in inspector.get_table_names():
        return  # create_all() will build it fresh with all columns
    existing = {col["name"] for col in inspector.get_columns("summarization_jobs")}
    with engine.begin() as conn:
        for name, ddl in _ADDED_COLUMNS.items():
            if name not in existing:
                conn.execute(text(f"ALTER TABLE summarization_jobs ADD COLUMN {name} {ddl}"))


def get_db():
    """FastAPI dependency: yields a DB session and closes it after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
