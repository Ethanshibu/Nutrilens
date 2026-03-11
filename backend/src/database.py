from pymongo import MongoClient
import os
from dotenv import load_dotenv
import certifi

load_dotenv()
MONGO_URL = os.getenv("MONGO_URL")

# Use certifi for SSL certificate verification
client = MongoClient(
    MONGO_URL,
    tlsCAFile=certifi.where(),
    serverSelectionTimeoutMS=5000
)

db = client["nutrilens"]
usertable = db["users"]

# Test connection
try:
    client.admin.command('ping')
    print("✓ MongoDB connection successful")
except Exception as e:
    print(f"✗ MongoDB connection failed: {e}")

# Made with Bob
