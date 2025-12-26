"""
Tasks API - Task Status and Results
"""
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from celery.result import AsyncResult

from workers.celery_app import celery_app

router = APIRouter()

OUTPUT_DIR = Path("outputs")


class TaskStatus(BaseModel):
    task_id: str
    status: str  # pending, processing, completed, failed
    progress: int  # 0-100
    message: Optional[str] = None
    result: Optional[dict] = None


class TaskResult(BaseModel):
    original_url: str
    ghost_url: str  # Separated target
    clean_url: str  # Residual


@router.get("/{task_id}", response_model=TaskStatus)
async def get_task_status(task_id: str):
    """Get the status of a separation task"""
    
    result = AsyncResult(task_id, app=celery_app)
    
    if result.state == "PENDING":
        return TaskStatus(
            task_id=task_id,
            status="pending",
            progress=0,
            message="Task is waiting to be processed"
        )
    
    elif result.state == "PROGRESS":
        info = result.info or {}
        return TaskStatus(
            task_id=task_id,
            status="processing",
            progress=info.get("progress", 0),
            message=info.get("message", "Processing...")
        )
    
    elif result.state == "SUCCESS":
        return TaskStatus(
            task_id=task_id,
            status="completed",
            progress=100,
            message="Task completed successfully",
            result=result.result
        )
    
    elif result.state == "FAILURE":
        return TaskStatus(
            task_id=task_id,
            status="failed",
            progress=0,
            message=str(result.info)
        )
    
    else:
        return TaskStatus(
            task_id=task_id,
            status=result.state.lower(),
            progress=0,
            message=f"Task state: {result.state}"
        )


@router.get("/{task_id}/download/{file_type}")
async def download_result(task_id: str, file_type: str):
    """
    Download processed audio or video file
    
    - **file_type**: "original", "ghost", "clean", or "video"
    """
    
    if file_type not in ["original", "ghost", "clean", "video"]:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    result = AsyncResult(task_id, app=celery_app)
    
    if result.state != "SUCCESS":
        raise HTTPException(status_code=404, detail="Task not completed")
    
    # Handle video file separately
    if file_type == "video":
        video_path = result.result.get("video_path")
        if not video_path:
            raise HTTPException(status_code=404, detail="No video file for this task")
        
        file_path = Path(video_path)
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Video file not found")
        
        # Determine media type based on extension
        extension = file_path.suffix.lower()
        media_types = {
            ".mp4": "video/mp4",
            ".webm": "video/webm",
            ".mov": "video/quicktime",
            ".avi": "video/x-msvideo",
            ".mkv": "video/x-matroska"
        }
        media_type = media_types.get(extension, "video/mp4")
        
        return FileResponse(
            path=file_path,
            filename=f"{task_id}_video{extension}",
            media_type=media_type
        )
    
    # Handle audio files
    file_path = Path(result.result.get(f"{file_type}_path", ""))
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        filename=f"{task_id}_{file_type}.wav",
        media_type="audio/wav"
    )


@router.delete("/{task_id}")
async def cancel_task(task_id: str):
    """Cancel a pending or running task"""
    
    result = AsyncResult(task_id, app=celery_app)
    result.revoke(terminate=True)
    
    return {"success": True, "message": "Task cancelled"}


@router.get("/", response_model=List[TaskStatus])
async def list_recent_tasks(limit: int = 10):
    """List recent tasks (simplified - in production would use database)"""
    # Note: This is a simplified implementation
    # In production, you would store task metadata in a database
    
    return []
