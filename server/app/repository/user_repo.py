from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.model.user import User

class UserRepository:
    @staticmethod
    async def get_by_username(db: AsyncSession, username: str) -> User | None:
        """Fetch user model from PostgreSQL by their unique username."""
        stmt = select(User).where(User.username == username)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
