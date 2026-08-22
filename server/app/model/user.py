import uuid
from sqlalchemy import Column, String, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.model.base import Base

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "user_schema"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    username = Column(String(50), nullable=False, unique=True, index=True)
    password = Column(String(255), nullable=False)
    is_super_user = Column(Boolean, default=False, nullable=False)
