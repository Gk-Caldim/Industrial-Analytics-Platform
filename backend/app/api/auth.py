from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    get_current_user,
)
from app.models.employee import Employee
from app.models.employee_access import EmployeeAccess
from app.models.user import User # Re-add User import for fallback

router = APIRouter(prefix="/auth", tags=["Auth"])
#login
@router.post("/login")
def login(data: dict, db: Session = Depends(get_db)):
    # 1️ Find employee by email
    employee = (
        db.query(Employee)
        .filter(Employee.email == data["email"])
        .first()
    )

    if not employee:
        # Try checking User table for backward compatibility or if using email directly
        user = db.query(User).filter(User.email == data["email"]).first()
        if not user:
             raise HTTPException(status_code=401, detail="Invalid credentials")
        # Validate against User table
        if not verify_password(data["password"], user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        access_token = create_access_token({
            "sub": str(user.id),
            "email": user.email,
        })
        refresh_token = create_refresh_token(str(user.id))
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": user.id,
                "email": user.email,
                "employee_id": user.employee_id,
            },
        }

    # 2️ Find Access Rule for this employee
    access_rule = db.query(EmployeeAccess).filter(EmployeeAccess.employee_id == employee.id).first()
    
    if not access_rule or not access_rule.hashed_password:
        # Fallback to User table if EmployeeAccess doesn't have password
        # This handles legacy users or admin created directly in User table
        user = db.query(User).filter(User.email == data["email"]).first()
        if user and verify_password(data["password"], user.hashed_password):
             access_token = create_access_token({
                "sub": str(user.id),
                "email": user.email,
             })
             refresh_token = create_refresh_token(str(user.id))
             return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "employee_id": user.employee_id,
                },
             }
        raise HTTPException(status_code=401, detail="Access not granted or password not set")

    # 3️ Verify password against EmployeeAccess
    if not verify_password(data["password"], access_rule.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # 4️ Create tokens
    # We use Employee ID or Access Rule ID as subject?
    # Usually User ID. But here we don't have User ID if we skipped User table creation.
    # We can use Employee ID as sub, but sub is usually string.
    # Let's use Employee ID.
    
    access_token = create_access_token({
        "sub": str(employee.id),
        "email": employee.email,
        "role": access_rule.access_level # Extra claim
    })

    refresh_token = create_refresh_token(str(employee.id))

    # 5️ Return response frontend expects
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": employee.id, # Using Employee ID as User ID
            "email": employee.email,
            "employee_id": employee.employee_id,
            "role": access_rule.access_level
        },
    }



# ---------- ME ----------
@router.get("/me")
def me(user=Depends(get_current_user)):
    return user
