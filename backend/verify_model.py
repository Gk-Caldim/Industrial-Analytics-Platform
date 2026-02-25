import sys
import os

# Add the current directory to path so we can import app
sys.path.append(os.getcwd())

try:
    from app.models.employee import Employee
    print("Successfully imported Employee model.")
    
    # Check attributes
    print(f"Columns in Employee model: {Employee.__table__.columns.keys()}")
    
    if 'custom_fields' in Employee.__table__.columns.keys():
        print("\n✅ field 'custom_fields' IS present in the model class.")
    else:
        print("\n❌ field 'custom_fields' is MISSING from the model class.")
        
    try:
        e = Employee(name="test", email="test@test.com", custom_fields={})
        print("✅ Can instantiate Employee with custom_fields.")
    except Exception as e:
        print(f"❌ Cannot instantiate Employee with custom_fields: {e}")

except Exception as e:
    print(f"Error during verification: {e}")
