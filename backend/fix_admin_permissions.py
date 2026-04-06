import sys
import os

# Add the current directory to sys.path to import app
sys.path.append(os.path.join(os.getcwd(), 'app'))
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.role import Role

def fix_permissions():
    db = SessionLocal()
    try:
        granular_permissions = [
            "upload_tracker", "view_tracker", "delete_tracker",
            "upload_budget", "view_budget", "delete_budget"
        ]
        
        target_roles = ["Super Admin", "Admin"]
        
        print("Starting permission fix for Admin and Super Admin roles...")
        
        for role_name in target_roles:
            role = db.query(Role).filter(Role.name == role_name).first()
            if role:
                print(f"Found role: {role_name}. Current permissions: {role.permissions}")
                
                # Merge current permissions with granular ones
                current_perms = set(role.permissions or [])
                updated_perms = current_perms.union(set(granular_permissions))
                
                if len(updated_perms) > len(current_perms):
                    role.permissions = list(updated_perms)
                    print(f"Updated {role_name} permissions: {role.permissions}")
                else:
                    print(f"{role_name} already has all granular permissions.")
            else:
                print(f"Role {role_name} not found in database.")
                
        db.commit()
        print("Permissions synchronization completed successfully.")
        
    except Exception as e:
        db.rollback()
        print(f"Error fixing permissions: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_permissions()
