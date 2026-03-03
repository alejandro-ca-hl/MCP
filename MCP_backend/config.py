"""Configuration management using environment variables."""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""

    def __init__(self):
        # FastAPI Configuration
        self.api_host = os.getenv("API_HOST", "0.0.0.0")
        self.api_port = int(os.getenv("API_PORT", "8000"))
        self.cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001")

        # MCP Server Configuration
        self.mcp_server_host = os.getenv("MCP_SERVER_HOST", "127.0.0.1")
        self.mcp_server_port = int(os.getenv("MCP_SERVER_PORT", "8001"))

        # Environment
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.debug = os.getenv("DEBUG", "true").lower() == "true"

    @property
    def cors_origins_list(self):
        """Convert CORS origins string to list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


# Global settings instance
settings = Settings()
