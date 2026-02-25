# Script to create employee_columns table if it doesn't exist
from sqlalchemy import create_engine, text
from app.core.config import DATABASE_URL

def create_employee_columns_table():
    """Create employee_columns table"""
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Check if table exists
        check_query = text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'employee_columns'
            )
        """)
        result = conn.execute(check_query).fetchone()
        
        if not result[0]:
            print("Creating employee_columns table...")
            conn.execute(text("""
                CREATE TABLE employee_columns (
                    id SERIAL PRIMARY KEY,
                    column_name VARCHAR NOT NULL UNIQUE,
                    column_label VARCHAR NOT NULL,
                    data_type VARCHAR NOT NULL DEFAULT 'text',
                    is_required BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """))
            conn.commit()
            print("✓ Created employee_columns table")
        else:
            print("✓ employee_columns table already exists")
    
    print("\n✅ Table creation completed!")

if __name__ == "__main__":
    create_employee_columns_table()
