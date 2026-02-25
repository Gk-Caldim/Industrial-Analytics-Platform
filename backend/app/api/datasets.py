# backend/app/api/datasets.py

from fastapi import APIRouter, UploadFile, Form, HTTPException, File, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List, Any
import pandas as pd
from io import BytesIO
from pydantic import BaseModel
import re

from app.core.database import get_db, engine
from app.models.dataset import Dataset
from app.models.dataset_column import DatasetColumn
from app.models.dataset_row import DatasetRow
from app.utils.type_inference import infer_column_type
from fastapi.responses import StreamingResponse
from fastapi import Query
import json

router = APIRouter(prefix="/datasets", tags=["Datasets"])

def get_dataset_df(dataset: Dataset, db: Session) -> pd.DataFrame:
    """Helper to get DataFrame from either dynamic table or legacy DatasetRow"""
    if dataset.table_name:
        try:
            with engine.begin() as conn:
                return pd.read_sql_table(dataset.table_name, conn)
        except Exception as e:
            print(f"Error reading table {dataset.table_name}: {e}")
            return pd.DataFrame()
    else:
        rows = db.query(DatasetRow).filter_by(dataset_id=dataset.id).all()
        return pd.DataFrame([r.row_data for r in rows])

@router.get("/")
def list_datasets(db: Session = Depends(get_db)):
    datasets = db.query(Dataset).order_by(Dataset.id.desc()).all()
    return [
        {
            "id": d.id,
            "project": d.project,
            "department": d.department,
            "employeeName": d.uploaded_by,
            "fileName": d.name,
            "uploadedBy": d.uploaded_by,
            "uploadDate": d.created_at.strftime("%Y-%m-%d") if d.created_at else None,
            "fileType": d.file_type,
            "records": d.row_count,
            "status": "Completed",
            "uploadDateISO": d.created_at.isoformat() if d.created_at else None
        }
        for d in datasets
    ]

# 🔹 PREVIEW DATA (EYE BUTTON)
@router.get("/{dataset_id}/excel-view")
def get_excel_view(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    columns = (
        db.query(DatasetColumn)
        .filter(DatasetColumn.dataset_id == dataset_id)
        .order_by(DatasetColumn.id)
        .all()
    )

    headers = [c.column_name for c in columns]
    if dataset.table_name:
        try:
            with engine.begin() as conn:
                df = pd.read_sql_query(text(f'SELECT * FROM "{dataset.table_name}" LIMIT 1000'), conn)
        except Exception as e:
            print(f"Error reading table {dataset.table_name}: {e}")
            df = pd.DataFrame()
    else:
        rows = db.query(DatasetRow).filter_by(dataset_id=dataset_id).limit(1000).all()
        if rows:
            df = pd.DataFrame([r.row_data for r in rows])
        else:
            df = pd.DataFrame()
    
    if not df.empty:
        # If headers logic is out of sync, trust the DF
        if not headers:
            headers = df.columns.tolist()
        
        # Ensure we only try to get columns that exist in DF
        valid_headers = [h for h in headers if h in df.columns]
        # Add any new columns in DF not in headers
        extra_cols = [c for c in df.columns if c not in valid_headers]
        final_headers = valid_headers + extra_cols
        
        df = df.fillna("")
        data = df[final_headers].values.tolist()
        headers = final_headers
    else:
        data = []

    return {
        "id": dataset.id,
        "name": dataset.name,
        "type": dataset.file_type,
        "size": dataset.row_count,
        "date": dataset.created_at.strftime("%Y-%m-%d"),
        "uploadedBy": dataset.uploaded_by or "System",
        "fileData": {
            "sheets": [
                {
                    "name": "Sheet1",
                    "headers": headers,
                    "data": data
                }
            ]
        }
    }


# 🔹 DOWNLOAD DATA AGAIN
@router.get("/{dataset_id}/download")
def download_dataset(
    dataset_id: int, 
    format: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter_by(id=dataset_id).first()
    if not dataset:
        return {"error": "Not found"}

    df = get_dataset_df(dataset, db)

    # Determine export format: use query param if provided, else use original file type
    export_format = format.lower() if format else dataset.file_type.lower()
    
    stream = BytesIO()
    
    if export_format == "csv":
        df.to_csv(stream, index=False)
        media_type = "text/csv"
        filename = f"{dataset.name.rsplit('.', 1)[0]}.csv"
    else:
        # Default to Excel for xlsx, xls, or any other format
        df.to_excel(stream, index=False)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"{dataset.name.rsplit('.', 1)[0]}.xlsx"

    stream.seek(0)

    return StreamingResponse(
        stream,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# 🔹 CHART DATA API
@router.get("/{dataset_id}/chart")
def get_chart_data(
    dataset_id: int,
    x: str = Query(...),
    y: str = Query(...),
    db: Session = Depends(get_db),
):
    dataset = db.query(Dataset).filter_by(id=dataset_id).first()
    if not dataset:
        return {"x": [], "y": [], "count": 0}

    x_vals = []
    y_vals = []
    
    if dataset.table_name:
        try:
            with engine.begin() as conn:
                # Need to quote the column names in case they have spaces
                query = text(f'SELECT "{x}", "{y}" FROM "{dataset.table_name}"')
                df = pd.read_sql_query(query, conn)
        except Exception as e:
            print(f"Error fetching chart data: {e}")
            df = pd.DataFrame()
    else:
        df = get_dataset_df(dataset, db)

    if not df.empty and x in df.columns and y in df.columns:
        # Filter for valid numeric Y values
        df_valid = df[pd.to_numeric(df[y], errors='coerce').notna()]
        x_vals = df_valid[x].tolist()
        y_vals = df_valid[y].astype(float).tolist()

    return {
        "x": x_vals,
        "y": y_vals,
        "count": len(x_vals)
    }

class UpdateDatasetRequest(BaseModel):
    headers: List[str]
    data: List[List[Any]]

@router.put("/{dataset_id}/data")
def update_dataset_data(
    dataset_id: int,
    payload: UpdateDatasetRequest,
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Update columns
    # First, delete existing columns metadata
    db.query(DatasetColumn).filter(DatasetColumn.dataset_id == dataset_id).delete()
    
    # Add new columns metadata
    for col_name in payload.headers:
        db.add(DatasetColumn(
            dataset_id=dataset_id,
            column_name=col_name,
            data_type="string" 
        ))

    # Update rows
    if dataset.table_name:
        # Update dynamic table
        try:
            new_df = pd.DataFrame(payload.data, columns=payload.headers)
            new_df.to_sql(dataset.table_name, engine, if_exists='replace', index=False)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to update table: {e}")
    else:
        # Legacy update
        db.query(DatasetRow).filter(DatasetRow.dataset_id == dataset_id).delete()
        new_rows = []
        for row_data in payload.data:
            row_dict = {}
            for i, val in enumerate(row_data):
                if i < len(payload.headers):
                    row_dict[payload.headers[i]] = val
            
            new_rows.append(DatasetRow(
                dataset_id=dataset_id,
                row_data=row_dict
            ))
        db.bulk_save_objects(new_rows)
    
    # Update row count
    dataset.row_count = len(payload.data)
    
    db.commit()
    
    return {"message": "Dataset updated successfully"}


@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    industry: Optional[str] = Form(None),
    project: Optional[str] = Form(None),
    department: Optional[str] = Form(None),
    employeeName: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Accepts CSV or Excel file and stores dataset, columns, and rows in DB.
    Returns dataset metadata compatible with frontend.
    """

    # 0️⃣ Check for duplicates
    # "one department cannot upload duplicate tracker(excel)"
    if department:
        existing = db.query(Dataset).filter(
            Dataset.department == department, 
            Dataset.name == file.filename
        ).first()
        if existing:
            raise HTTPException(
                status_code=400, 
                detail=f"Dataset '{file.filename}' already uploaded for department '{department}'."
            )

    # 1️⃣ Read file into DataFrame
    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(file.file)
        else:
            df = pd.read_excel(file.file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {e}")

    df = df.fillna("")  # replace NaN with empty string

    # 2️⃣ Store dataset metadata
    dataset = Dataset(
        name=file.filename,
        industry=industry,
        project=project,
        department=department,
        uploaded_by=employeeName,
        file_type=file.filename.split(".")[-1].upper(),
        row_count=len(df)
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    # 3️⃣ Create Dynamic Table and Insert Data
    sanitized_name = re.sub(r'[^a-zA-Z0-9_]', '_', file.filename.split('.')[0]).lower()
    table_name = f"tracker_{dataset.id}_{sanitized_name}"[:63] # Postgres limit 63 chars

    try:
        # Create table and insert data
        df.to_sql(table_name, engine, if_exists='fail', index=False)
        
        # Update dataset with table_name
        dataset.table_name = table_name
        db.commit()
    except Exception as e:
        # Rollback metadata if table creation fails
        db.delete(dataset)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to create table: {e}")

    # 4️⃣ Store column metadata (Keeping for consistency/schema endpoint)
    for col in df.columns:
        db.add(DatasetColumn(
            dataset_id=dataset.id,
            column_name=col,
            data_type=infer_column_type(df[col])
        ))
    db.commit()

    # 5️⃣ Return metadata for frontend tracker
    return {
        "id": dataset.id,
        "project": dataset.project,
        "department": dataset.department,
        "employeeName": dataset.uploaded_by,
        "fileName": dataset.name,
        "uploadedBy": dataset.uploaded_by,
        "uploadDate": dataset.created_at.strftime("%Y-%m-%d"),
        "fileType": dataset.file_type,
        "records": dataset.row_count,
        "status": "Completed",
        "uploadDateISO": dataset.created_at.isoformat()
    }

# ✅ THIS IS WHERE YOUR QUESTIONED CODE GOES
@router.get("/{dataset_id}/schema")
def get_schema(dataset_id: int, db: Session = Depends(get_db)):
    return db.query(DatasetColumn).filter_by(dataset_id=dataset_id).all()


@router.get("/{dataset_id}/data")
def get_data(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        return []
    
    # For dynamic tables, query only the first 1000 rows from the database directly
    if dataset.table_name:
        try:
            with engine.begin() as conn:
                query = text(f'SELECT * FROM "{dataset.table_name}" LIMIT 1000')
                df = pd.read_sql_query(query, conn)
                return df.fillna("").to_dict(orient='records')
        except Exception as e:
            print(f"Error fetching data: {e}")
            return []

    # Fallback for legacy datasets
    rows = db.query(DatasetRow).filter_by(dataset_id=dataset_id).limit(1000).all()
    if rows:
        df = pd.DataFrame([r.row_data for r in rows])
        return df.fillna("").to_dict(orient='records')
    return []

class UpdateDatasetMetadataRequest(BaseModel):
    project: Optional[str] = None
    department: Optional[str] = None
    employeeName: Optional[str] = None

@router.put("/{dataset_id}")
def update_dataset_metadata(
    dataset_id: int,
    payload: UpdateDatasetMetadataRequest,
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if payload.project is not None:
        dataset.project = payload.project
    if payload.department is not None:
        dataset.department = payload.department
    if payload.employeeName is not None:
        dataset.uploaded_by = payload.employeeName
    
    db.commit()
    db.refresh(dataset)
    
    return {"message": "Dataset metadata updated successfully"}

@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()

    if not dataset:
        return {"error": "Dataset not found"}

    # Drop dynamic table if exists
    if dataset.table_name:
        try:
            # Use text() for raw SQL to drop table
            # Sanitize or trust table_name since we generated it?
            # We generated it, so it should be safe, but still good to be careful.
            # However, table_name cannot be parameterized in DROP TABLE.
            db.execute(text(f'DROP TABLE IF EXISTS "{dataset.table_name}"'))
        except Exception as e:
            print(f"Error dropping table {dataset.table_name}: {e}")

    # Delete child rows first (FK safety) - for legacy data
    db.query(DatasetRow).filter(DatasetRow.dataset_id == dataset_id).delete()
    db.query(DatasetColumn).filter(DatasetColumn.dataset_id == dataset_id).delete()

    db.delete(dataset)
    db.commit()

    return {"message": "Dataset deleted successfully"}

