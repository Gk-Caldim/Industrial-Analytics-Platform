import sys
import os

# Add the current directory to sys.path to import app
sys.path.append(os.path.join(os.getcwd(), 'app'))
sys.path.append(os.getcwd())

from sqlalchemy import text
from app.core.database import engine

def migrate():
    print("Connecting to database to migrate departments table...")
    try:
        with engine.connect() as connection:
            # 1. Check if project_name already exists to avoid errors on reruns
            result = connection.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='departments' AND column_name='project_name'"))
            if result.fetchone():
                print("Column 'project_name' already exists.")
            else:
                print("Adding 'project_name' column...")
                connection.execute(text("ALTER TABLE departments ADD COLUMN project_name VARCHAR;"))
                print("Added 'project_name'.")
            
            # 2. Remove budget if it exists
            result = connection.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='departments' AND column_name='budget'"))
            if result.fetchone():
                print("Removing 'budget' column...")
                connection.execute(text("ALTER TABLE departments DROP COLUMN budget;"))
                print("Removed 'budget'.")
            else:
                print("Column 'budget' not found.")
                
            # 3. Remove email if it exists
            result = connection.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='departments' AND column_name='email'"))
            if result.fetchone():
                print("Removing 'email' column...")
                connection.execute(text("ALTER TABLE departments DROP COLUMN email;"))
                print("Removed 'email'.")
            else:
                print("Column 'email' not found.")
            
            connection.commit()
            print("Migration completed successfully.")
            
    except Exception as e:
        print(f"Error during migration: {str(e)}")

if __name__ == "__main__":
    migrate()
