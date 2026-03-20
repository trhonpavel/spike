from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://spike:spike_secret@localhost:5432/spike"
    allowed_origins: str = ""
    app_password: str = ""
    admin_password: str = ""

    @property
    def cors_origins(self) -> list[str]:
        if not self.allowed_origins:
            return []
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    model_config = {"env_file": ".env"}


settings = Settings()
