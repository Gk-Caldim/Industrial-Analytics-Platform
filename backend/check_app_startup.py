import sys
import os

# Add parent directory to path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app.main import app
    print("App imported successfully.")
except Exception as e:
    print(f"Error importing app: {e}")
    import traceback
    traceback.print_exc()
