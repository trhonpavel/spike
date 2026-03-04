from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://spike:spike_secret@localhost:5432/spike"

    model_config = {"env_file": ".env"}


settings = Settings()
