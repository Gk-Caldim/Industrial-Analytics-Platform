import sys
import os

# Add the current directory to sys.path to import app
sys.path.append(os.getcwd())

from sqlalchemy import text
from app.core.database import engine, Base
from app.models.application_access import ApplicationAccess
from app.models.employee import Employee
from app.models.user import User

def migrate():
    print("Connecting to database to migrate credentials to application_access table...")
    
    # Create the table if it doesn't exist
    Base.metadata.create_all(bind=engine)
    
    try:
        with engine.connect() as connection:
            # 1. Get all employees with credentials
            result = connection.execute(text("SELECT id, email, hashed_password FROM employees WHERE email IS NOT NULL AND hashed_password IS NOT NULL"))
            employees = result.fetchall()
            print(f"Found {len(employees)} employees with credentials.")

            for emp_id, email, hashed_pwd in employees:
                # Check if already exists
                check = connection.execute(text("SELECT id FROM application_access WHERE email = :email"), {"email": email}).fetchone()
                if not check:
                    print(f"Migrating employee: {email}")
                    connection.execute(
                        text("INSERT INTO application_access (employee_id, email, hashed_password, created_at, updated_at) VALUES (:emp_id, :email, :pwd, NOW(), NOW())"),
                        {"emp_id": emp_id, "email": email, "pwd": hashed_pwd}
                    )
                else:
                    print(f"Employee {email} already has application access record.")

            # 2. Get all users with credentials (fallback)
            result = connection.execute(text("SELECT email, hashed_password, employee_id FROM users WHERE email IS NOT NULL AND hashed_password IS NOT NULL"))
            users = result.fetchall()
            print(f"Found {len(users)} users in fallback table.")

            for email, hashed_pwd, emp_id_str in users:
                # Check if already exists in application_access
                check = connection.execute(text("SELECT id FROM application_access WHERE email = :email"), {"email": email}).fetchone()
                if not check:
                    print(f"Migrating user: {email}")
                    # Try to find corresponding employee id
                    emp_id = None
                    if emp_id_str:
                         emp_check = connection.execute(text("SELECT id FROM employees WHERE employee_id = :eid"), {"eid": emp_id_str}).fetchone()
                         if emp_check:
                             emp_id = emp_check[0]

                    connection.execute(
                        text("INSERT INTO application_access (employee_id, email, hashed_password, created_at, updated_at) VALUES (:emp_id, :email, :pwd, NOW(), NOW())"),
                        {"emp_id": emp_id, "email": email, "pwd": hashed_pwd}
                    )
                else:
                    print(f"User {email} already has application access record.")

            connection.commit()
            print("Migration completed successfully.")
            
    except Exception as e:
        print(f"Error during migration: {str(e)}")

if __name__ == "__main__":
    migrate()
