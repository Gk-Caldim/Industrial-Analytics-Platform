import time
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def main():
    start = time.time()
    hashed = pwd_context.hash("password123")
    print(f"Hashing took {time.time() - start:.3f} seconds")
    
    start = time.time()
    pwd_context.verify("password123", hashed)
    print(f"Verifying took {time.time() - start:.3f} seconds")

if __name__ == "__main__":
    main()
