from app.api.alerts import router as alerts_router
from app.api.ingestion import router as ingestion_router
from app.api.lineage import router as lineage_router
from app.api.status import router as status_router

__all__ = [
    "alerts_router",
    "ingestion_router",
    "lineage_router",
    "status_router",
]
