import sys
import os

# Add the current directory to sys.path to import app
sys.path.append(os.path.join(os.getcwd(), 'app'))
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.role import Role
from app.models.employee import Employee

def simulate_check(email, permission):
    db = SessionLocal()
    try:
        # 1. Simulate get_current_user finding the user
        employee = db.query(Employee).filter(Employee.email == email).first()
        if not employee:
            print(f"FAILED: Employee with email {email} not found")
            return
        
        current_role = employee.role
        print(f"User: {email} | ID: {employee.id} | Name: {employee.name} | Role: '{current_role}'")
        
        # 2. Super Admin bypass
        if current_role == "Super Admin":
            print("SUCCESS (Super Admin Bypass)")
            return
            
        # 3. Simulate role check
        role_obj = db.query(Role).filter(Role.name == current_role).first()
        if not role_obj:
            print(f"FAILED: Role '{current_role}' not found in Roles table")
            return
            
        permissions = role_obj.permissions or []
        print(f"Role Permissions Count: {len(permissions)}")
        print(f"Checking for permission: '{permission}'")
        
        if permission in permissions:
            print(f"SUCCESS: Permission '{permission}' found in role '{current_role}'")
        else:
            print(f"FAILED: Permission '{permission}' NOT FOUND in role '{current_role}'")
            print(f"Full permissions list: {permissions}")
            
    finally:
        db.close()

if __name__ == "__main__":
    print("--- Simulating 'view_tracker' for caldim@gmail.com ---")
    simulate_check("caldim@gmail.com", "view_tracker")
    print("\n--- Simulating 'view_budget' for caldim@gmail.com ---")
    simulate_check("caldim@gmail.com", "view_budget")
