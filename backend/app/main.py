from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.system import router as system_router
from app.api.v1 import router as v1_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="RapidFinil Pharmacy Commerce API",
    version="0.1.0",
)

# Permissive-but-scoped-to-localhost default: the Vite dev server picks
# whichever port is free (3000, 3001, 3002, ...), so a fixed origin list
# breaks on every restart. Tighten this to explicit origins before
# production (see docs/backend-spec.md security baseline).
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=settings.cors_allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(system_router)
app.include_router(v1_router)
