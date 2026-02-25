from app.core.database import engine
from sqlalchemy import inspect, text

def check_schema():
    inspector = inspect(engine)
    columns = inspector.get_columns('datasets')
    print("Columns in 'datasets' table:")
    for col in columns:
        print(f"- {col['name']} ({col['type']})")

    # Try a raw SQL query to verify accessibility
    with engine.connect() as conn:
        try:
            result = conn.execute(text("SELECT id, name, project, department FROM datasets LIMIT 1"))
            print("\nQuery successful. First row:")
            row = result.fetchone()
            print(row)
        except Exception as e:
            print(f"\nQuery failed: {e}")

if __name__ == "__main__":
    check_schema()
