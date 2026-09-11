"""Admin product-photo uploads.

Products used to reference a hardcoded `imageKey` that the frontend bundle
resolved through a build-time map of imported assets (see
src/components/ProductArtwork.tsx). That made the storefront static: an
admin could never add a photo for a new product without a frontend code
change and redeploy. This module lets an admin upload a real file, which is
saved here and served back out at a stable URL — that URL is what gets
stored as a ProductImage.storage_key, and the frontend now renders it
directly instead of looking it up in a hardcoded map.
"""

import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings

# Content-sniffed via UploadFile.content_type (set from the multipart part's
# header, not by inspecting bytes) — good enough here since this endpoint is
# admin-only, not exposed to arbitrary public uploads.
_ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5MB — plenty for product photography, small enough to keep on disk.


def _products_dir() -> Path:
    root = Path(get_settings().uploads_dir) / "products"
    root.mkdir(parents=True, exist_ok=True)
    return root


async def save_product_image(file: UploadFile) -> str:
    """Writes an uploaded image to disk and returns its public URL path."""
    ext = _ALLOWED_CONTENT_TYPES.get((file.content_type or "").lower())
    if ext is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image type. Use JPEG, PNG, WEBP, or GIF.",
        )

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image too large (max 5MB).")

    filename = f"{uuid.uuid4().hex}{ext}"
    (_products_dir() / filename).write_bytes(contents)

    # Matches the StaticFiles mount in app/main.py.
    return f"/uploads/products/{filename}"
