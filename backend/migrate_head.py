import sys
import os
from sqlalchemy import text

# Add the current directory to sys.path to import app
sys.path.append(os.path.join(os.getcwd(), 'app'))
sys.path.append(os.getcwd())

from app.core.database import engine

def migrate_head():
    print("Connecting to database to add 'head' column...")
    try:
        with engine.connect() as connection:
            # Check if head already exists
            check_query = text("SELECT column_name FROM information_schema.columns WHERE table_name='departments' AND column_name='head'")
            result = connection.execute(check_query)
            if result.fetchone():
                print("Column 'head' already exists.")
            else:
                print("Adding 'head' column...")
                connection.execute(text("ALTER TABLE departments ADD COLUMN head VARCHAR DEFAULT 'Unknown';"))
                # Remove the default after setting it for existing rows if needed, or just leave it.
                # Actually, the model says nullable=False, so we should provide a default for existing rows.
                print("Added 'head'.")
            
            connection.commit()
            print("Migration completed successfully.")
            
    except Exception as e:
        print(f"Error during migration: {str(e)}")

if __name__ == "__main__":
    migrate_head()
