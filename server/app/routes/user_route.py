from fastapi import APIRouter
from app.schema.user_schema import LoginRequest, UserResponse, ApiResponse
from app.service.user_service import UserService

router = APIRouter()

@router.post("/login", response_model=ApiResponse[UserResponse])
async def login(payload: LoginRequest):
    """Authenticate credentials and return user profile details."""
    user_data = await UserService.login(payload.username, payload.password, payload.tab_id, payload.force)
    return ApiResponse(
        success=True,
        message="Login successful.",
        data=user_data,
        error=None
    )
