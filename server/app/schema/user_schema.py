from pydantic import BaseModel, ConfigDict
from typing import Generic, TypeVar, Optional, Any
from uuid import UUID

T = TypeVar("T")

class ApiResponse(BaseModel, Generic[T]):
    """Standardized API envelope format for all responses."""
    success: bool
    message: str
    data: Optional[T] = None
    error: Optional[Any] = None

class LoginRequest(BaseModel):
    """Pydantic model representing incoming login credentials."""
    username: str
    password: str
    tab_id: str
    force: bool = False

class UserResponse(BaseModel):
    """Pydantic model representing output user attributes."""
    id: UUID
    name: str
    username: str
    is_super_user: bool
    session_id: str
    tab_id: str

    model_config = ConfigDict(from_attributes=True)
