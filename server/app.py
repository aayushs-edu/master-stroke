"""FastAPI server for MASTER-STROKE capture endpoint."""

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import cv2
import numpy as np
import base64
import json
from typing import Optional
import logging

# Import capture module
from backend.capture.pipeline import run_capture, validate_capture_quality
from backend.capture.models import CaptureResult

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="MASTER-STROKE Capture API",
    description="Paper detection and capture processing for mobile drawing app",
    version="1.0.0"
)

# Configure CORS for mobile app access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "MASTER-STROKE Capture API"}


@app.post("/capture")
async def capture(
    file: UploadFile = File(...),
    step_svg: Optional[str] = Form(None)
):
    """Process captured image with paper detection and optional overlay.
    
    Args:
        file: Uploaded image file (JPEG/PNG)
        step_svg: Optional SVG file path for ghost overlay
        
    Returns:
        JSON response with:
            - alignment_score: Paper detection quality (0-1)
            - preview_png: Base64 encoded preview image
            - warp_matrix: 3x3 homography matrix as list
            - quality_feedback: Human-readable quality assessment
    """
    try:
        # Validate file type
        if file.content_type not in ["image/jpeg", "image/png"]:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file.content_type}"
            )
        
        # Read and decode image
        raw = await file.read()
        if len(raw) == 0:
            raise HTTPException(status_code=400, detail="Empty file")
        
        # Decode image
        img_array = np.frombuffer(raw, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Failed to decode image")
        
        logger.info(f"Processing image: {img.shape}, SVG: {step_svg}")
        
        # Run capture pipeline
        try:
            result: CaptureResult = run_capture(img, ghost_svg=step_svg)
        except ValueError as e:
            # Handle paper detection failure gracefully
            logger.warning(f"Capture failed: {str(e)}")
            raise HTTPException(status_code=422, detail=str(e))
        
        # Validate quality
        is_valid, feedback = validate_capture_quality(result)
        
        # Prepare response
        response = {
            "alignment_score": result.alignment_score,
            "preview_png": base64.b64encode(result.preview_png).decode('utf-8'),
            "warp_matrix": result.warp_matrix.tolist(),
            "quality_feedback": feedback,
            "quality_valid": is_valid
        }
        
        logger.info(f"Capture successful: score={result.alignment_score:.2f}")
        
        return JSONResponse(content=response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/capture/validate")
async def validate_capture(
    alignment_score: float = Form(...),
):
    """Validate capture quality based on alignment score.
    
    Args:
        alignment_score: Paper alignment score from previous capture
        
    Returns:
        JSON with validation result and feedback
    """
    # Create mock result for validation
    from backend.capture.models import CaptureResult
    mock_result = CaptureResult(
        flat=np.zeros((1080, 1080, 3), dtype=np.uint8),
        warp_matrix=np.eye(3, dtype=np.float32),
        alignment_score=alignment_score,
        preview_png=b""
    )
    
    is_valid, feedback = validate_capture_quality(mock_result)
    
    return {
        "valid": is_valid,
        "feedback": feedback,
        "score": alignment_score
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)