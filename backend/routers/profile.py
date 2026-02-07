from fastapi import APIRouter

from models import UserProfile
import storage

router = APIRouter(prefix="/api", tags=["profile"])


@router.get("/profile")
async def get_profile():
    return storage.user_profile.model_dump()


@router.post("/profile")
async def update_profile(profile: UserProfile):
    storage.user_profile = profile
    return {"status": "success", "profile": storage.user_profile.model_dump()}
