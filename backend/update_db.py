from app.core.database import SessionLocal
from app.models.employee_access import EmployeeAccess

modules_list = [
    'Dashboard',
    'Upload Trackers',
    'MOM',
    'Employee Master',
    'Employee Access',
    'Project Master',
    'Part Master',
    'Department Master',
    'Settings'
]

def update_existing_permissions():
    db = SessionLocal()
    try:
        rules = db.query(EmployeeAccess).all()
        updated_count = 0
        for rule in rules:
            # Always overwrite to ensure full access
            rule.modules = modules_list
            updated_count += 1
        db.commit()
        print(f"Successfully updated {updated_count} employee access rules to have all modules.")
    except Exception as e:
        print(f"Error updating database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_existing_permissions()
