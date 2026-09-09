from fastapi import APIRouter

from app.api.v1.cart import router as cart_router
from app.api.v1.catalog import router as catalog_router
from app.api.v1.checkout import router as checkout_router
from app.api.v1.orders import router as orders_router
from app.api.v1.payments import router as payments_router

router = APIRouter(prefix="/api/v1")
router.include_router(catalog_router)
router.include_router(cart_router)
router.include_router(checkout_router)
router.include_router(orders_router)
router.include_router(payments_router)
