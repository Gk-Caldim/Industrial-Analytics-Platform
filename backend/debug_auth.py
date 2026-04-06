import sys
import os

# Add the current directory to sys.path to import app
sys.path.append(os.path.join(os.getcwd(), 'app'))
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.role import Role
from app.models.employee import Employee
from app.models.user import User
from app.models.application_access import ApplicationAccess

def debug_auth_system():
    db = SessionLocal()
    try:
        print("--- ROLES ---")
        roles = db.query(Role).all()
        for r in roles:
            print(f"ID: {r.id} | Name: '{r.name}' | Permissions: {r.permissions}")
        
        print("\n--- RECENT USERS/EMPLOYEES ---")
        # Find user by email (most likely to be the one logged in)
        # We'll check the most common emails or just top 10
        employees = db.query(Employee).order_by(Employee.id.desc()).limit(10).all()
        for e in employees:
            print(f"Emp ID: {e.id} | Emp Str ID: {e.employee_id} | Name: {e.name} | Role: '{e.role}' | Email: {e.email}")
            
        print("\n--- APPLICATION ACCESS ---")
        access_list = db.query(ApplicationAccess).limit(10).all()
        for a in access_list:
            print(f"ID: {a.id} | Email: {a.email} | Emp ID: {a.employee_id}")

    finally:
        db.close()

if __name__ == "__main__":
    debug_auth_system()
