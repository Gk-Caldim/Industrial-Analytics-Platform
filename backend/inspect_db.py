from app.core.database import SessionLocal
from app.models.employee_access import EmployeeAccess

def inspect_db():
    db = SessionLocal()
    try:
        rules = db.query(EmployeeAccess).all()
        for r in rules:
            print(f"ID: {r.id}, Email: {r.employee_email}, Role: {r.access_level}, Modules: {r.modules}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_db()
