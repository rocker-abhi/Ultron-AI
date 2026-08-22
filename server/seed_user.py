import asyncio
import sys
import os
import hashlib

# Add project root directory to python path to resolve absolute imports
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)

from app.core.database import db_manager
from app.model.user import User

def hash_password(password: str) -> str:
    """Securely hash raw passwords using SHA-256."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

async def seed_user():
    print("====================================")
    print("   Friday UI - User Seeding Console ")
    print("====================================")
    
    try:
        # Prompt for parameters sequentially
        name = input("Enter Name: ").strip()
        if not name:
            print("Error: Name cannot be empty.")
            return

        username = input("Enter Username: ").strip()
        if not username:
            print("Error: Username cannot be empty.")
            return

        password = input("Enter Password: ").strip()
        if not password:
            print("Error: Password cannot be empty.")
            return

        hashed_pw = hash_password(password)

        new_user = User(
            name=name,
            username=username,
            password=hashed_pw,
            is_super_user=True
        )

        session = db_manager.get_session()
        try:
            async with session.begin():
                session.add(new_user)
            print("====================================")
            print(f"Success: User '{username}' seeded successfully with UUID primary key!")
            print("====================================")
        except Exception as e:
            print("====================================")
            print(f"Database Error: Failed to write user to database: {e}")
            print("====================================")
        finally:
            await session.close()
            
    except KeyboardInterrupt:
        print("\nOperation cancelled by user.")
    finally:
        # Ensure engine is cleanly disposed
        await db_manager.close()

if __name__ == "__main__":
    asyncio.run(seed_user())
