import sys
import os

# Add the current directory to sys.path to import app
sys.path.append(os.path.join(os.getcwd(), 'app'))
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.role import Role

def reconcile():
    db = SessionLocal()
    try:
        # These are the source-of-truth permissions defined in app/crud/role.py
        # but the DB might have stale data.
        target_permissions = {
            "Super Admin": [
                "Dashboard", "MOM", "Employee Master", "Project Master", "Department Master", 
                "Upload Trackers", "Budget Upload", "Settings",
                "upload_tracker", "view_tracker", "delete_tracker",
                "upload_budget", "view_budget", "delete_budget"
            ],
            "Admin": [
                "Dashboard", "MOM", "Employee Master", "Project Master", "Department Master", 
                "Upload Trackers", "Budget Upload",
                "upload_tracker", "view_tracker", "delete_tracker",
                "upload_budget", "view_budget", "delete_budget"
            ],
            "Project Manager": [
                "Dashboard", "MOM", "Project Master", "Upload Trackers",
                "upload_tracker", "view_tracker", "view_budget"
            ]
        }
        
        print("Reconciling database role permissions with API source-of-truth...")
        
        for role_name, seed_perms in target_permissions.items():
            db_role = db.query(Role).filter(Role.name == role_name).first()
            if db_role:
                print(f"\nChecking Role: {role_name}")
                current_perms = set(db_role.permissions or [])
                needed_perms = set(seed_perms)
                missing = needed_perms - current_perms
                
                if missing:
                    print(f"  - MISSING PERMISSIONS: {missing}")
                    # Update role permissions
                    new_perms_list = list(current_perms.union(needed_perms))
                    db_role.permissions = new_perms_list
                    print(f"  - SUCCESSFULLY ADDED missing tokens to '{role_name}'.")
                else:
                    print(f"  - Role '{role_name}' is already up-to-date.")
            else:
                print(f"  - Role '{role_name}' not found. Skipping.")
                
        db.commit()
        print("\nPermission reconciliation complete.")
    finally:
        db.close()

if __name__ == "__main__":
    reconcile()
