import hashlib
from app.repository.user_repo import UserRepository
from app.core.database import db_manager
from app.core.exceptions import AppException
from app.schema.user_schema import UserResponse

class UserService:
    @staticmethod
    def hash_password(password: str) -> str:
        """Securely hash raw passwords using SHA-256."""
        return hashlib.sha256(password.encode("utf-8")).hexdigest()

    @classmethod
    async def login(cls, username: str, password: str, tab_id: str, force: bool = False) -> UserResponse:
        """Verify user credentials and establish session context."""
        async with db_manager.session_factory() as db:
            user = await UserRepository.get_by_username(db, username)
            if not user:
                raise AppException(
                    message="Invalid username or password.",
                    status_code=401
                )

            hashed_pw = cls.hash_password(password)
            if user.password != hashed_pw:
                raise AppException(
                    message="Invalid username or password.",
                    status_code=401
                )

            # Create in-memory user session
            from app.core.session import session_manager
            session = session_manager.create_session(user.id, tab_id, force)

            return UserResponse(
                id=user.id,
                name=user.name,
                username=user.username,
                is_super_user=user.is_super_user,
                session_id=session.session_id,
                tab_id=session.tab_id
            )
