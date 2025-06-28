"""SVG rendering and overlay blending utilities."""

import cairosvg
import cv2
import numpy as np
from io import BytesIO
from typing import Tuple, Optional


def render_svg_to_png(svg_path: str, size_px: Tuple[int, int]) -> np.ndarray:
    """Render SVG file to PNG array at specified size.
    
    Args:
        svg_path: Path to SVG file
        size_px: Output size as (width, height) in pixels
        
    Returns:
        BGRA numpy array of rendered SVG
        
    Raises:
        FileNotFoundError: If SVG file not found
        ValueError: If rendering fails
    """
    try:
        # Render SVG to PNG bytes
        png_bytes = cairosvg.svg2png(
            url=svg_path,
            output_width=size_px[0],
            output_height=size_px[1]
        )
        
        # Convert bytes to numpy array
        nparr = np.frombuffer(png_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)
        
        if img is None:
            raise ValueError("Failed to decode rendered PNG")
        
        # Ensure BGRA format
        if img.shape[2] == 3:
            # Add alpha channel if missing
            alpha = np.ones((img.shape[0], img.shape[1], 1), dtype=np.uint8) * 255
            img = np.concatenate([img, alpha], axis=2)
        
        return img
        
    except FileNotFoundError:
        raise FileNotFoundError(f"SVG file not found: {svg_path}")
    except Exception as e:
        raise ValueError(f"Failed to render SVG: {str(e)}")


def blend_overlay(base_bgr: np.ndarray, overlay_bgr: np.ndarray, 
                 alpha: float = 0.3) -> np.ndarray:
    """Blend overlay image onto base with specified transparency.
    
    Args:
        base_bgr: Base image in BGR format
        overlay_bgr: Overlay image in BGR or BGRA format
        alpha: Overlay transparency (0=invisible, 1=opaque)
        
    Returns:
        Blended BGR image
        
    Raises:
        ValueError: If image dimensions don't match
    """
    if base_bgr.shape[:2] != overlay_bgr.shape[:2]:
        raise ValueError(f"Image dimensions must match: {base_bgr.shape} vs {overlay_bgr.shape}")
    
    if alpha < 0 or alpha > 1:
        raise ValueError(f"Alpha must be in range [0, 1], got {alpha}")
    
    # Handle BGRA overlay (extract alpha channel)
    if overlay_bgr.shape[2] == 4:
        overlay_alpha = overlay_bgr[:, :, 3] / 255.0
        overlay_bgr = overlay_bgr[:, :, :3]
        # Combine provided alpha with image alpha
        alpha = alpha * overlay_alpha[:, :, np.newaxis]
    
    # Ensure float32 for blending
    base_float = base_bgr.astype(np.float32)
    overlay_float = overlay_bgr.astype(np.float32)
    
    # Alpha blend
    if isinstance(alpha, float):
        blended = (1 - alpha) * base_float + alpha * overlay_float
    else:
        # Per-pixel alpha
        blended = (1 - alpha) * base_float + alpha * overlay_float
    
    return np.clip(blended, 0, 255).astype(np.uint8)


def create_ghost_overlay(base_bgr: np.ndarray, svg_path: Optional[str] = None,
                        alpha: float = 0.3) -> np.ndarray:
    """Create ghost overlay effect for guided capture.
    
    Args:
        base_bgr: Base captured image
        svg_path: Optional SVG reference path
        alpha: Ghost transparency
        
    Returns:
        Image with ghost overlay applied
    """
    if svg_path is None:
        return base_bgr.copy()
    
    # Render SVG at base image size
    h, w = base_bgr.shape[:2]
    svg_rendered = render_svg_to_png(svg_path, (w, h))
    
    # Convert BGRA to BGR if needed
    if svg_rendered.shape[2] == 4:
        svg_bgr = cv2.cvtColor(svg_rendered, cv2.COLOR_BGRA2BGR)
    else:
        svg_bgr = svg_rendered
    
    # Apply blend
    return blend_overlay(base_bgr, svg_bgr, alpha)