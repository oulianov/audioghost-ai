"""
Authentication API - HuggingFace Token Management
"""
import os
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from huggingface_hub import HfApi, hf_hub_download
from huggingface_hub.utils import HfHubHTTPError

router = APIRouter()

# Token storage path (use absolute path based on this file's location)
BACKEND_DIR = Path(__file__).parent.parent
TOKEN_FILE = BACKEND_DIR / ".hf_token"
CHECKPOINTS_DIR = BACKEND_DIR / "checkpoints"


class TokenRequest(BaseModel):
    token: str

class AuthStatus(BaseModel):
    authenticated: bool
    model_downloaded: bool
    model_name: Optional[str] = None


def get_saved_token() -> Optional[str]:
    """Get saved HuggingFace token"""
    if TOKEN_FILE.exists():
        return TOKEN_FILE.read_text().strip()
    return os.environ.get("HF_TOKEN")


def save_token(token: str):
    """Save HuggingFace token"""
    TOKEN_FILE.write_text(token)


def check_model_downloaded() -> bool:
    """Check if SAM Audio model is downloaded"""
    # Check for common model files
    model_files = list(CHECKPOINTS_DIR.glob("*.safetensors")) + \
                  list(CHECKPOINTS_DIR.glob("*.bin"))
    return len(model_files) > 0


@router.get("/status", response_model=AuthStatus)
async def get_auth_status():
    """Check authentication and model status"""
    token = get_saved_token()
    authenticated = False
    
    if token:
        try:
            api = HfApi(token=token)
            api.whoami()
            authenticated = True
        except Exception:
            authenticated = False
    
    return AuthStatus(
        authenticated=authenticated,
        model_downloaded=check_model_downloaded(),
        model_name="facebook/sam-audio-large" if check_model_downloaded() else None
    )


@router.post("/login")
async def login(request: TokenRequest):
    """Validate and save HuggingFace token"""
    try:
        # Validate token
        api = HfApi(token=request.token)
        user_info = api.whoami()
        
        # Check if user has access to SAM Audio
        try:
            api.model_info("facebook/sam-audio-large", token=request.token)
        except HfHubHTTPError as e:
            if "403" in str(e) or "401" in str(e):
                raise HTTPException(
                    status_code=403,
                    detail="You need to request access to facebook/sam-audio-large on HuggingFace first"
                )
            raise
        
        # Save token
        save_token(request.token)
        
        return {
            "success": True,
            "username": user_info.get("name", "Unknown"),
            "message": "Successfully authenticated"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


@router.post("/download-model")
async def download_model():
    """Download SAM Audio model"""
    token = get_saved_token()
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        # Note: In production, this should be a background task
        # For MVP, we'll use the HuggingFace auto-download feature
        # which downloads on first use
        
        return {
            "success": True,
            "message": "Model will be downloaded automatically on first use"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")


@router.post("/logout")
async def logout():
    """Clear saved token"""
    if TOKEN_FILE.exists():
        TOKEN_FILE.unlink()
    
    return {"success": True, "message": "Logged out"}
