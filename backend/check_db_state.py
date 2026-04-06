import sys
import os

# Add the current directory to sys.path to import app
sys.path.append(os.path.join(os.getcwd(), 'app'))
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.role import Role
from app.models.employee import Employee

def check_db_state():
    db = SessionLocal()
    try:
        print("Checking Roles in DB:")
        roles = db.query(Role).all()
        for r in roles:
            print(f"Role: {r.name} | Permissions: {r.permissions}")
        
        print("\nChecking Employees in DB (Top 5):")
        employees = db.query(Employee).limit(5).all()
        for e in employees:
            print(f"Employee: {e.name} | Role: {e.role} | Email: {e.email}")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_db_state()
