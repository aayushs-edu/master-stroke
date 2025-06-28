"""High-level capture pipeline orchestration."""

import cv2
import numpy as np
import time
from typing import Optional, Tuple
from .models import CaptureResult
from .geometry import detect_paper_quad, warp_perspective
from .lighting import enhance_color_image
from .svg_overlay import create_ghost_overlay


def run_capture(
    img_bgr: np.ndarray,
    ghost_svg: Optional[str] = None,
    paper_size_mm: Tuple[int, int] = (210, 297)
) -> CaptureResult:
    """
    High-level orchestration of the guided capture pipeline.
    
    Steps:
      1. Detect paper quadrilateral and compute alignment score
      2. Apply perspective warp to extract square paper region
      3. Normalize lighting for consistent appearance
      4. Optionally blend SVG reference overlay
      5. Encode preview PNG for frontend display
    
    Args:
        img_bgr: Input image in BGR format
        ghost_svg: Optional path to SVG reference file for overlay
        paper_size_mm: Expected paper size in mm (width, height)
        
    Returns:
        CaptureResult containing processed image, warp matrix, and metrics
        
    Raises:
        ValueError: If paper detection fails or image is invalid
    """
    start_time = time.time()
    
    if img_bgr is None or len(img_bgr.shape) != 3:
        raise ValueError("Invalid input image")
    
    # Step 1: Detect paper quadrilateral
    quad = detect_paper_quad(img_bgr)
    if quad is None:
        raise ValueError("Failed to detect paper in image")
    
    # Calculate alignment score (paper area / image area)
    img_area = img_bgr.shape[0] * img_bgr.shape[1]
    paper_area = cv2.contourArea(quad)
    alignment_score = float(paper_area / img_area)
    
    # Step 2: Apply perspective warp
    warped_bgr, warp_matrix = warp_perspective(img_bgr, quad, out_size=1080)
    
    # Step 3: Normalize lighting
    enhanced_bgr = enhance_color_image(warped_bgr)
    
    # Step 4: Apply ghost overlay if SVG provided
    if ghost_svg:
        final_bgr = create_ghost_overlay(enhanced_bgr, ghost_svg, alpha=0.3)
    else:
        final_bgr = enhanced_bgr
    
    # Step 5: Encode preview PNG
    encode_params = [cv2.IMWRITE_PNG_COMPRESSION, 9]  # Max compression
    success, png_buffer = cv2.imencode('.png', final_bgr, encode_params)
    if not success:
        raise ValueError("Failed to encode preview PNG")
    
    preview_png = png_buffer.tobytes()
    
    # Log processing time
    elapsed = time.time() - start_time
    if elapsed > 0.5:
        print(f"Warning: Capture pipeline took {elapsed:.2f}s (target: <0.5s)")
    
    return CaptureResult(
        flat=enhanced_bgr,  # Return lighting-normalized version without overlay
        warp_matrix=warp_matrix,
        alignment_score=alignment_score,
        preview_png=preview_png
    )


def validate_capture_quality(result: CaptureResult) -> Tuple[bool, str]:
    """Validate capture quality and provide feedback.
    
    Args:
        result: CaptureResult to validate
        
    Returns:
        Tuple of (is_valid, feedback_message)
    """
    if result.alignment_score < 0.2:
        return False, "Paper too small or far away. Move closer to fill more of the frame."
    
    if result.alignment_score < 0.4:
        return True, "Good capture. For best results, move slightly closer."
    
    if result.alignment_score > 0.9:
        return True, "Warning: Paper very close to edges. Ensure all corners are visible."
    
    return True, "Excellent capture!"