from app.core.database import engine
from sqlalchemy import text
with engine.connect() as conn:
    res = conn.execute(text('SELECT email, role FROM employees')).fetchall()
    for row in res:
        print(f"Email: {row[0]}, Role: {row[1]}")
