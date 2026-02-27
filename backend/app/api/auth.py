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
    # 1️ Check EmployeeAccess first
    access_rule = (
        db.query(EmployeeAccess)
        .outerjoin(Employee, Employee.id == EmployeeAccess.employee_id)
        .filter(
            (EmployeeAccess.employee_email == data["email"]) |
            (Employee.email == data["email"])
        )
        .first()
    )

    if access_rule:
        # User found in EmployeeAccess
        if not access_rule.hashed_password:
            # Fallback to User table if no password set in EmployeeAccess
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

        # Verify password against EmployeeAccess
        if not verify_password(data["password"], access_rule.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        email_to_use = access_rule.employee_email or (access_rule.employee.email if access_rule.employee else data["email"])
        employee_code = access_rule.employee_code or (access_rule.employee.employee_id if access_rule.employee else None)

        access_token = create_access_token({
            "sub": str(access_rule.employee_id),
            "email": email_to_use,
            "role": access_rule.access_level
        })

        refresh_token = create_refresh_token(str(access_rule.employee_id))

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": access_rule.employee_id,
                "email": email_to_use,
                "employee_id": employee_code,
                "role": access_rule.access_level,
                "permissions": access_rule.modules or []
            },
        }

    # 2️ Fallback to User table
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



# ---------- ME ----------
@router.get("/me")
def me(user=Depends(get_current_user)):
    return user
