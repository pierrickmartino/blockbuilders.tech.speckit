from __future__ import annotations

import uvicorn

from app.core.settings import get_settings
from app.factory import create_app

app = create_app()


def main() -> None:
    """Run the FastAPI development server via uvicorn."""

    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.service_host,
        port=settings.service_port,
        reload=True,
        factory=False,
    )


if __name__ == "__main__":
    main()


__all__ = ["app", "main"]
