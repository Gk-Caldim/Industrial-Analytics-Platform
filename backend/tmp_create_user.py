from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password

def create_user():
    db = SessionLocal()
    email = "pradeep@gmail.com"
    employee_id = "dasint04"
    password = "Caldim@2026"

    # Check if user already exists
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        print(f"User {email} already exists. Updating password.")
        existing_user.hashed_password = hash_password(password)
        existing_user.employee_id = employee_id
    else:
        print(f"Creating new user: {email}")
        new_user = User(
            email=email,
            employee_id=employee_id,
            hashed_password=hash_password(password)
        )
        db.add(new_user)
    
    try:
        db.commit()
        print("User creation/update successful!")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_user()
