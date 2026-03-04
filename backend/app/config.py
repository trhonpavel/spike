from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://spike:spike_secret@localhost:5432/spike"
    allowed_origins: str = "*"
    app_password: str = ""
    webauthn_rp_id: str = "localhost"
    webauthn_rp_name: str = "Spike"
    webauthn_origin: str = "http://localhost:5173"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    model_config = {"env_file": ".env"}


settings = Settings()
