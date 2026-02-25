import sys
from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password

def create_user(employee_id, email, password):
    db = SessionLocal()

    user = User(
        employee_id=employee_id,
        email=email,
        hashed_password=hash_password(password),
    )

    db.add(user)
    db.commit()
    db.close()

if __name__ == "__main__":
    create_user(sys.argv[1], sys.argv[2], sys.argv[3])
