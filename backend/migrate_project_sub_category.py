import sys
import os

# Add the current directory to sys.path to import app
sys.path.append(os.path.join(os.getcwd(), 'app'))
sys.path.append(os.getcwd())

from sqlalchemy import text
from app.core.database import engine

def migrate():
    print("Connecting to database to migrate project_sub_categories table...")
    try:
        with engine.connect() as connection:
            # Add department column to project_sub_categories
            col_name = "department"
            col_type = "VARCHAR(255)"
            
            # Check if column already exists
            check_query = text(f"SELECT column_name FROM information_schema.columns WHERE table_name='project_sub_categories' AND column_name='{col_name}'")
            result = connection.execute(check_query)
            if result.fetchone():
                print(f"Column '{col_name}' already exists in 'project_sub_categories'.")
            else:
                print(f"Adding '{col_name}' column to 'project_sub_categories'...")
                connection.execute(text(f"ALTER TABLE project_sub_categories ADD COLUMN {col_name} {col_type};"))
                print(f"Added '{col_name}'.")
            
            connection.commit()
            print("Migration completed successfully.")
            
    except Exception as e:
        print(f"Error during migration: {str(e)}")

if __name__ == "__main__":
    migrate()
