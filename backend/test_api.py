import asyncio
import time
import httpx

async def main():
    start = time.time()
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get("http://localhost:8000/api/healthz", timeout=10)
            print(f"Healthz: {resp.status_code} - {resp.json()} in {time.time() - start:.3f}s")
        except Exception as e:
            print(f"Healthz error: {e}")
            
    start = time.time()
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get("http://localhost:8000/test-db", timeout=10)
            print(f"Test-DB: {resp.status_code} - {resp.json()} in {time.time() - start:.3f}s")
        except Exception as e:
            print(f"Test-DB error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
