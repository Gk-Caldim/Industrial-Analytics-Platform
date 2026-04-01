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
from app.models.user import User # Re-add User import for fallback

router = APIRouter(prefix="/auth", tags=["Auth"])
#login
@router.post("/login")
def login(data: dict, db: Session = Depends(get_db)):
    # 1. Check Employees table first
    employee = (
        db.query(Employee)
        .filter(Employee.email == data["email"])
        .first()
    )

    if employee:
        # Check if password is set for this employee
        if not employee.hashed_password:
            # Fallback to User table if no password set in Employee
            user = db.query(User).filter(User.email == data["email"]).first()
            if user and verify_password(data["password"], user.hashed_password):
                 access_token = create_access_token({
                    "sub": str(user.id),
                    "email": user.email,
                    "full_name": employee.name,
                    "role": employee.role or "User"
                 })
                 refresh_token = create_refresh_token(str(user.id))
                 return {
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "user": {
                        "id": user.id,
                        "email": user.email,
                        "employee_id": user.employee_id,
                        "full_name": employee.name,
                        "role": employee.role or "User",
                        "permissions": employee.modules or []
                    },
                 }
            raise HTTPException(status_code=401, detail="Access not granted or password not set")

        # Verify password against Employee table
        if not verify_password(data["password"], employee.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        access_token = create_access_token({
            "sub": str(employee.id),
            "email": employee.email,
            "full_name": employee.name,
            "role": employee.role
        })

        refresh_token = create_refresh_token(str(employee.id))

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": employee.id,
                "email": employee.email,
                "full_name": employee.name,
                "employee_id": employee.employee_id,
                "role": employee.role,
                "permissions": employee.modules or []
            },
        }

    # 2. Fallback to User table if not found in Employees
    user = db.query(User).filter(User.email == data["email"]).first()
    if not user:
         raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(data["password"], user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "full_name": "User",
    })
    refresh_token = create_refresh_token(str(user.id))
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": "User",
            "employee_id": user.employee_id,
        },
    }



# ---------- ME ----------
@router.get("/me")
def me(user=Depends(get_current_user)):
    return user
