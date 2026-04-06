import sys
import os

# Add the current directory to sys.path to import app
sys.path.append(os.path.join(os.getcwd(), 'app'))
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.role import Role

def inspect_admin():
    db = SessionLocal()
    try:
        admin_role = db.query(Role).filter(Role.name == "Admin").first()
        if admin_role:
            print(f"Role: {admin_role.name}")
            print(f"Permissions: {list(admin_role.permissions) if admin_role.permissions else 'None'}")
            print(f"Count: {len(admin_role.permissions) if admin_role.permissions else 0}")
        else:
            print("Admin role NOT FOUND")
            
        super_admin_role = db.query(Role).filter(Role.name == "Super Admin").first()
        if super_admin_role:
            print(f"\nRole: {super_admin_role.name}")
            print(f"Permissions: {list(super_admin_role.permissions) if super_admin_role.permissions else 'None'}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_admin()
