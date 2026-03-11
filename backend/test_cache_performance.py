import time
import sys
import os

# Add the current directory to sys.path to import app
sys.path.append(os.getcwd())

from fastapi.testclient import TestClient
from app.main import app
from app.api.datasets import global_dataset_cache
from app.core.config import API_PREFIX

client = TestClient(app)

def test_cache():
    # Attempt to find a dataset or create a dummy one
    response = client.get(f"{API_PREFIX}/datasets/")
    datasets = response.json()
    print(f"DEBUG: {API_PREFIX}/datasets/ response: {datasets}")
    
    if not isinstance(datasets, list) or len(datasets) == 0:
        print("No datasets found. Creating a dummy dataset...")
        # Create a dummy dataset
        from io import BytesIO
        import pandas as pd
        df = pd.DataFrame({"A": [1, 2, 3], "B": ["x", "y", "z"]})
        csv_file = BytesIO()
        df.to_csv(csv_file, index=False)
        csv_file.seek(0)
        
        response = client.post(
            f"{API_PREFIX}/datasets/upload",
            files={"file": ("test.csv", csv_file, "text/csv")},
            data={
                "industry": "Test",
                "project": "Test Project",
                "department": "Test Dept",
                "employeeName": "Tester"
            }
        )
        if response.status_code != 200:
            print(f"Failed to create dataset: {response.text}")
            return
        dataset_id = response.json()['id']
    else:
        dataset_id = datasets[0]['id']

    print(f"Testing with dataset_id: {dataset_id}")

    # 1. First call (Slow/Wait for DB)
    start = time.time()
    resp1 = client.get(f"{API_PREFIX}/datasets/{dataset_id}/excel-view")
    time1 = time.time() - start
    print(f"First call (uncached): {time1:.4f}s")
    if resp1.status_code != 200:
        print(f"Error in resp1: {resp1.text}")

    # 2. Second call (Fast/Cached)
    start = time.time()
    resp2 = client.get(f"{API_PREFIX}/datasets/{dataset_id}/excel-view")
    time2 = time.time() - start
    print(f"Second call (cached): {time2:.4f}s")
    
    if time2 < time1:
        print(f"✅ Performance improvement: {((time1/time2) if time2 > 0 else 0):.1f}x faster")
    else:
        print("❌ No performance improvement detected.")
        # Try once more just in case
        start = time.time()
        resp2b = client.get(f"{API_PREFIX}/datasets/{dataset_id}/excel-view")
        time2b = time.time() - start
        print(f"Second call retry (cached): {time2b:.4f}s")

    # 3. Invalidate cache (via metadata update)
    print("Invalidating cache via metadata update...")
    client.put(f"{API_PREFIX}/datasets/{dataset_id}", json={
        "project": "Updated Project",
        "department": "Updated Dept"
    })

    # 4. Third call (Slow again)
    start = time.time()
    resp3 = client.get(f"{API_PREFIX}/datasets/{dataset_id}/excel-view")
    time3 = time.time() - start
    print(f"Third call (after invalidation): {time3:.4f}s")
    
    if time3 > time2:
        print("✅ Cache invalidation verified.")
    else:
        print("❌ Cache invalidation might have failed or DB is too fast to notice.")

    # Cleanup if created
    # client.delete(f"/datasets/{dataset_id}")

if __name__ == "__main__":
    test_cache()
