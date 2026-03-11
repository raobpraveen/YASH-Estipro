from fastapi import APIRouter, Depends
from database import db
from models import User, UserRegister, UserLogin, UserResponse, AuthResponse
from auth import hash_password, create_jwt_token, require_auth

router = APIRouter()


@router.post("/auth/register", response_model=AuthResponse)
async def register(data: UserRegister):
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        name=data.name
    )
    await db.users.insert_one(user.model_dump())

    token = create_jwt_token(user.id, user.email)
    return AuthResponse(
        token=token,
        user=UserResponse(id=user.id, email=user.email, name=user.name, role=user.role)
    )


@router.post("/auth/login", response_model=AuthResponse)
async def login(data: UserLogin):
    user_doc = await db.users.find_one({"email": data.email.lower()})
    if not user_doc:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user_doc["password_hash"] != hash_password(data.password):
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_jwt_token(user_doc["id"], user_doc["email"])
    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user_doc["id"],
            email=user_doc["email"],
            name=user_doc["name"],
            role=user_doc.get("role", "user"),
            is_active=user_doc.get("is_active", True)
        )
    )


@router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(require_auth)):
    user_doc = await db.users.find_one({"id": user["user_id"]})
    if not user_doc:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(
        id=user_doc["id"],
        email=user_doc["email"],
        name=user_doc["name"],
        role=user_doc.get("role", "user"),
        is_active=user_doc.get("is_active", True)
    )
