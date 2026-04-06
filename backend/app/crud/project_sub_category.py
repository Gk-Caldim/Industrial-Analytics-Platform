from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.project_sub_category import ProjectSubCategory
from app.models.project import Project
from app.schemas.project_sub_category import SubCategoryCreate, SubCategoryUpdate

def sync_project_budget(db: Session, project_id: str):
    """
    Recalculate project and department totals based on sub-categories.
    """
    from app.models.department import Department
    
    # 1. Fetch project details
    db_project = db.query(Project).filter(Project.project_id == project_id).first()
    if not db_project:
        return

    # 2. Sum up all utilized_value for this project (Global)
    total_utilized = db.query(func.sum(ProjectSubCategory.utilized_value)).filter(
        ProjectSubCategory.project_id == project_id
    ).scalar() or 0.0
    
    # 3. Update the parent Project
    db_project.utilized_budget = total_utilized
    db_project.balance_budget = (db_project.budget or 0.0) - total_utilized
    
    # 4. Update Department-specific totals for this project
    # Fetch all Department records for this project first
    project_depts = db.query(Department).filter(
        Department.project_name == db_project.name
    ).all()
    
    # Store them in a map for easy lookup
    dept_record_map = {d.name: d for d in project_depts}

    # Group sub-categories by department for this project
    dept_totals = db.query(
        ProjectSubCategory.department,
        func.sum(ProjectSubCategory.estimated_value).label("total_alloc"),
        func.sum(ProjectSubCategory.utilized_value).label("total_util")
    ).filter(
        ProjectSubCategory.project_id == project_id,
        ProjectSubCategory.department != None
    ).group_by(ProjectSubCategory.department).all()

    # Track which departments were updated
    updated_dept_names = set()

    for dept_name, roll_alloc, roll_util in dept_totals:
        if dept_name in dept_record_map:
            db_dept = dept_record_map[dept_name]
            db_dept.budget_allocation = roll_alloc
            db_dept.utilized_budget = roll_util
            db_dept.balance_budget = roll_alloc - roll_util
            updated_dept_names.add(dept_name)

    # Reset departments that are in the Master but no longer have sub-categories
    for d_name, db_dept in dept_record_map.items():
        if d_name not in updated_dept_names:
            db_dept.budget_allocation = 0.0
            db_dept.utilized_budget = 0.0
            db_dept.balance_budget = 0.0

    db.commit()

def get_sub_categories_by_project(db: Session, project_id: str):
    return db.query(ProjectSubCategory).filter(ProjectSubCategory.project_id == project_id).all()

def create_sub_category(db: Session, sub_category: SubCategoryCreate):
    db_sub_category = ProjectSubCategory(**sub_category.dict())
    db.add(db_sub_category)
    db.commit()
    db.refresh(db_sub_category)
    
    # Sync project budget after creation
    sync_project_budget(db, db_sub_category.project_id)
    
    return db_sub_category

def update_sub_category(db: Session, sub_category_id: int, sub_category_data: SubCategoryUpdate):
    db_sub_category = db.query(ProjectSubCategory).filter(ProjectSubCategory.id == sub_category_id).first()
    if db_sub_category:
        update_dict = sub_category_data.dict(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(db_sub_category, key, value)
        db.commit()
        db.refresh(db_sub_category)
        
        # Sync project budget after update
        sync_project_budget(db, db_sub_category.project_id)
        
    return db_sub_category

def delete_sub_category(db: Session, sub_category_id: int):
    try:
        db_sub_category = db.query(ProjectSubCategory).filter(ProjectSubCategory.id == sub_category_id).first()
        if db_sub_category:
            project_id = db_sub_category.project_id
            db.delete(db_sub_category)
            db.commit()
            
            # Sync project budget after deletion
            sync_project_budget(db, project_id)
            
            return True
        return False
    except Exception as e:
        db.rollback()
        raise Exception(f"Error deleting sub-category {sub_category_id}: {str(e)}") from e
