from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRouter
import os
import logging

from database import db, client
from auth import hash_password

# Import all routers
from routers.auth_routes import router as auth_router
from routers.users import router as users_router
from routers.masters import router as masters_router
from routers.projects import router as projects_router
from routers.financials import router as financials_router
from routers.dashboard import router as dashboard_router
from routers.notifications import router as notifications_router
from routers.files import router as files_router

app = FastAPI(title="YASH EstPro API")

# Main API router with /api prefix
api_router = APIRouter(prefix="/api")

# Include all sub-routers
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(masters_router)
api_router.include_router(projects_router)
api_router.include_router(financials_router)
api_router.include_router(dashboard_router)
api_router.include_router(notifications_router)
api_router.include_router(files_router)

app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.on_event("startup")
async def create_default_admin():
    existing = await db.users.find_one({"email": "admin@yash.com"})
    if not existing:
        from models import User
        admin = User(
            email="admin@yash.com",
            password_hash=hash_password("password"),
            name="Admin User",
            role="admin"
        )
        await db.users.insert_one(admin.model_dump())
        logger.info("Default admin user created: admin@yash.com")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
