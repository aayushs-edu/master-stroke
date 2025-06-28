"""
MASTER-STROKE Guided Capture Module

Provides paper detection, perspective correction, lighting normalization,
and ghost overlay blending for mobile drawing capture.
"""

from .pipeline import run_capture
from .models import CaptureResult
from .geometry import detect_paper_quad, warp_perspective
from .lighting import normalize_lighting
from .svg_overlay import render_svg_to_png, blend_overlay

__version__ = "1.0.0"
__all__ = [
    "run_capture",
    "CaptureResult",
    "detect_paper_quad",
    "warp_perspective",
    "normalize_lighting",
    "render_svg_to_png",
    "blend_overlay",
]