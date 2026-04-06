import sys
import os

# Add the current directory to sys.path to import app
sys.path.append(os.path.join(os.getcwd(), 'app'))
sys.path.append(os.getcwd())

from sqlalchemy import text
from app.core.database import engine

def migrate():
    print("Connecting to database to migrate departments table with budget columns...")
    try:
        with engine.connect() as connection:
            columns_to_add = [
                ("budget_allocation", "FLOAT DEFAULT 0.0"),
                ("utilized_budget", "FLOAT DEFAULT 0.0"),
                ("balance_budget", "FLOAT DEFAULT 0.0")
            ]
            
            for col_name, col_type in columns_to_add:
                # Check if column already exists
                check_query = text(f"SELECT column_name FROM information_schema.columns WHERE table_name='departments' AND column_name='{col_name}'")
                result = connection.execute(check_query)
                if result.fetchone():
                    print(f"Column '{col_name}' already exists.")
                else:
                    print(f"Adding '{col_name}' column...")
                    connection.execute(text(f"ALTER TABLE departments ADD COLUMN {col_name} {col_type};"))
                    print(f"Added '{col_name}'.")
            
            connection.commit()
            print("Migration completed successfully.")
            
    except Exception as e:
        print(f"Error during migration: {str(e)}")

if __name__ == "__main__":
    migrate()
