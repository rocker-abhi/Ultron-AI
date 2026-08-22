from fastapi import APIRouter
from app.routes.user_route import router as user_router

router = APIRouter(prefix="/auth/v1")
router.include_router(user_router, tags=["Authentication"])
