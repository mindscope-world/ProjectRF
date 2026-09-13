from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.system import router as system_router
from app.api.v1 import router as v1_router
from app.core.config import get_settings
from app.integrations.payments.blockonomics import BlockonomicsConfigurationError, BlockonomicsError

settings = get_settings()

app = FastAPI(
    title="Brimline Headwear Commerce API",
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

@app.exception_handler(BlockonomicsError)
@app.exception_handler(BlockonomicsConfigurationError)
async def _blockonomics_error_handler(request: Request, exc: Exception) -> JSONResponse:
    # Handled here (not left to propagate) so the response passes back through
    # CORSMiddleware and carries Access-Control-Allow-Origin — an unhandled
    # 500 is emitted above that middleware and the browser reports it only as
    # "NetworkError when attempting to fetch resource".
    return JSONResponse(status_code=502, content={"detail": str(exc)})


app.include_router(system_router)
app.include_router(v1_router)

# Serves admin-uploaded product photos back out (see app/services/uploads.py)
# so a ProductImage.storage_key can be a real URL the storefront renders
# directly — the directory is created on first upload if it doesn't exist
# yet, but StaticFiles needs it to exist at mount time too.
_uploads_dir = Path(settings.uploads_dir)
_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_uploads_dir), name="uploads")
