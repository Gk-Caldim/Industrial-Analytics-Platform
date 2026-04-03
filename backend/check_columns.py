from sqlalchemy import text
from app.core.database import engine

def list_columns():
    with engine.connect() as connection:
        query = text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'departments'
            ORDER BY ordinal_position;
        """)
        result = connection.execute(query)
        print("Columns in 'departments' table:")
        for row in result:
            print(f" - {row[0]} ({row[1]})")

if __name__ == "__main__":
    list_columns()
