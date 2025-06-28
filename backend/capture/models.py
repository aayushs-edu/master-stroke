"""Data models for capture results."""

from dataclasses import dataclass
import numpy as np
from typing import Optional


@dataclass
class CaptureResult:
    """Result of the guided capture pipeline.
    
    Attributes:
        flat: 1080×1080 uint8 array of the deskewed, lighting-normalized image
        warp_matrix: 3×3 float32 homography matrix used for perspective transform
        alignment_score: Paper area ratio (0-1), where 1.0 means paper fills entire frame
        preview_png: Encoded PNG bytes of the final overlay image for frontend display
    """
    flat: np.ndarray          # 1080×1080 uint8 (post-warp, lighting fixed)
    warp_matrix: np.ndarray   # 3×3 float32 homography
    alignment_score: float    # paper area ÷ image area (0–1)
    preview_png: bytes        # colour PNG overlay for frontend
    
    def __post_init__(self) -> None:
        """Validate data types and shapes."""
        assert self.flat.shape == (1080, 1080, 3), f"Expected (1080, 1080, 3), got {self.flat.shape}"
        assert self.flat.dtype == np.uint8, f"Expected uint8, got {self.flat.dtype}"
        assert self.warp_matrix.shape == (3, 3), f"Expected (3, 3), got {self.warp_matrix.shape}"
        assert 0 <= self.alignment_score <= 1, f"Invalid alignment score: {self.alignment_score}"
        assert isinstance(self.preview_png, bytes), "preview_png must be bytes"