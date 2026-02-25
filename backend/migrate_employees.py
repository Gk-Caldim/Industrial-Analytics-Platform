# Migration script to update employees table with new columns
# Run this once to update the database schema

from sqlalchemy import create_engine, text
from app.core.config import DATABASE_URL

def migrate_employees_table():
    """Add custom_fields, created_at, and updated_at columns to employees table"""
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Check if custom_fields column exists
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='employees' AND column_name='custom_fields'
        """)
        result = conn.execute(check_query).fetchone()
        
        if not result:
            print("Adding custom_fields column...")
            conn.execute(text("""
                ALTER TABLE employees 
                ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb
            """))
            conn.commit()
            print("✓ Added custom_fields column")
        else:
            print("✓ custom_fields column already exists")
        
        # Check if created_at column exists
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='employees' AND column_name='created_at'
        """)
        result = conn.execute(check_query).fetchone()
        
        if not result:
            print("Adding created_at column...")
            conn.execute(text("""
                ALTER TABLE employees 
                ADD COLUMN created_at TIMESTAMP DEFAULT NOW()
            """))
            conn.commit()
            print("✓ Added created_at column")
        else:
            print("✓ created_at column already exists")
        
        # Check if updated_at column exists
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='employees' AND column_name='updated_at'
        """)
        result = conn.execute(check_query).fetchone()
        
        if not result:
            print("Adding updated_at column...")
            conn.execute(text("""
                ALTER TABLE employees 
                ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()
            """))
            conn.commit()
            print("✓ Added updated_at column")
        else:
            print("✓ updated_at column already exists")
    
    print("\n✅ Migration completed successfully!")

if __name__ == "__main__":
    migrate_employees_table()
