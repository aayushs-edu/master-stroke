"""Geometric operations for paper detection and perspective correction."""

import cv2
import numpy as np
from typing import Optional, Tuple


def detect_paper_quad(img: np.ndarray) -> Optional[np.ndarray]:
    """Detect the largest quadrilateral (paper) in the image.
    
    Uses multiple detection strategies to find paper in various conditions.
    """
    if img is None or len(img.shape) != 3:
        raise ValueError("Invalid input image")
    
    # Try multiple detection strategies
    strategies = [
        _detect_with_edges,
        _detect_with_threshold,
        _detect_with_color_segmentation,
        _detect_with_morphology
    ]
    
    best_quad = None
    max_score = 0
    img_area = img.shape[0] * img.shape[1]
    
    for strategy in strategies:
        try:
            quad = strategy(img)
            if quad is not None:
                area = cv2.contourArea(quad)
                score = area / img_area
                
                # Validate quad
                if score > 0.1 and score < 0.95:  # Between 10% and 95% of image
                    if score > max_score:
                        max_score = score
                        best_quad = quad
        except:
            continue
    
    return best_quad


def _detect_with_edges(img: np.ndarray) -> Optional[np.ndarray]:
    """Original edge-based detection method."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Resize for faster processing if image is large
    scale = 1.0
    if gray.shape[0] > 1500 or gray.shape[1] > 1500:
        scale = 1000.0 / max(gray.shape)
        gray = cv2.resize(gray, None, fx=scale, fy=scale)
    
    # Bilateral filter
    filtered = cv2.bilateralFilter(gray, 9, 75, 75)
    
    # Adaptive threshold
    thresh = cv2.adaptiveThreshold(
        filtered, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY, 11, 2
    )
    
    # Canny edges with auto thresholds
    median = np.median(filtered)
    lower = int(max(0, (1.0 - 0.33) * median))
    upper = int(min(255, (1.0 + 0.33) * median))
    edges = cv2.Canny(filtered, lower, upper)
    
    # Dilate edges
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    dilated = cv2.dilate(edges, kernel, iterations=2)
    
    # Find contours
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Find best quad
    best_quad = _find_best_quad(contours, gray.shape)
    
    if best_quad is not None and scale != 1.0:
        # Scale back to original size
        best_quad = best_quad / scale
    
    return best_quad


def _detect_with_threshold(img: np.ndarray) -> Optional[np.ndarray]:
    """Detection using global threshold."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Try Otsu's threshold
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Morphological operations to clean up
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel)
    
    # Find contours
    contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    return _find_best_quad(contours, gray.shape)


def _detect_with_color_segmentation(img: np.ndarray) -> Optional[np.ndarray]:
    """Detection using color segmentation for white paper."""
    # Convert to HSV
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    
    # Define range for white/light colors
    lower_white = np.array([0, 0, 180])
    upper_white = np.array([180, 30, 255])
    
    # Create mask
    mask = cv2.inRange(hsv, lower_white, upper_white)
    
    # Clean up mask
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    
    # Find contours
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    return _find_best_quad(contours, img.shape[:2])


def _detect_with_morphology(img: np.ndarray) -> Optional[np.ndarray]:
    """Detection using morphological gradient."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Morphological gradient
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    gradient = cv2.morphologyEx(gray, cv2.MORPH_GRADIENT, kernel)
    
    # Threshold
    _, thresh = cv2.threshold(gradient, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Close gaps
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (10, 10))
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    
    # Find contours
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    return _find_best_quad(contours, gray.shape)


def _find_best_quad(contours, img_shape) -> Optional[np.ndarray]:
    """Find the best quadrilateral from contours."""
    if not contours:
        return None
    
    best_quad = None
    max_area = 0
    img_area = img_shape[0] * img_shape[1]
    
    for contour in contours:
        # Get convex hull to handle concave shapes
        hull = cv2.convexHull(contour)
        
        # Approximate polygon
        peri = cv2.arcLength(hull, True)
        
        # Try different approximation levels
        for epsilon_factor in [0.01, 0.02, 0.03, 0.04, 0.05]:
            approx = cv2.approxPolyDP(hull, epsilon_factor * peri, True)
            
            if len(approx) == 4:
                area = cv2.contourArea(approx)
                
                # Check if it's a reasonable size
                if area > img_area * 0.1 and area < img_area * 0.95:
                    # Check if it's roughly rectangular
                    if _is_roughly_rectangular(approx):
                        if area > max_area:
                            max_area = area
                            best_quad = approx.reshape(4, 2)
                        break
            
            # If we get 5 or 6 points, try to reduce to 4
            elif len(approx) in [5, 6]:
                quad = _reduce_to_quad(approx)
                if quad is not None:
                    area = cv2.contourArea(quad)
                    if area > img_area * 0.1 and area > max_area:
                        max_area = area
                        best_quad = quad
    
    if best_quad is not None:
        return _order_points(best_quad)
    
    return None


def _is_roughly_rectangular(approx) -> bool:
    """Check if a quadrilateral is roughly rectangular."""
    if len(approx) != 4:
        return False
    
    # Check angles
    pts = approx.reshape(4, 2)
    angles = []
    
    for i in range(4):
        p1 = pts[i]
        p2 = pts[(i + 1) % 4]
        p3 = pts[(i + 2) % 4]
        
        v1 = p1 - p2
        v2 = p3 - p2
        
        angle = np.arccos(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6))
        angles.append(np.degrees(angle))
    
    # Check if angles are roughly 90 degrees (allow 45-135 degrees)
    for angle in angles:
        if angle < 45 or angle > 135:
            return False
    
    return True


def _reduce_to_quad(approx):
    """Try to reduce a 5 or 6 point polygon to 4 points."""
    if len(approx) < 5:
        return None
    
    # Find the point that creates the smallest area change when removed
    points = approx.reshape(-1, 2)
    min_area_change = float('inf')
    best_quad = None
    
    for i in range(len(points)):
        # Remove point i
        reduced = np.delete(points, i, axis=0)
        
        if len(reduced) == 4:
            area_change = abs(cv2.contourArea(points) - cv2.contourArea(reduced))
            if area_change < min_area_change:
                min_area_change = area_change
                best_quad = reduced
    
    return best_quad


def warp_perspective(img: np.ndarray, quad: np.ndarray, 
                    out_size: int = 1080) -> Tuple[np.ndarray, np.ndarray]:
    """Apply perspective transform to extract and flatten the paper region."""
    if quad.shape != (4, 2):
        raise ValueError(f"Expected quad shape (4, 2), got {quad.shape}")
    
    # Ensure points are ordered correctly
    quad = _order_points(quad)
    
    # Define destination points for square output
    dst_pts = np.array([
        [0, 0],
        [out_size - 1, 0],
        [out_size - 1, out_size - 1],
        [0, out_size - 1]
    ], dtype=np.float32)
    
    # Calculate homography
    M = cv2.getPerspectiveTransform(quad.astype(np.float32), dst_pts)
    
    # Apply transform
    warped = cv2.warpPerspective(img, M, (out_size, out_size))
    
    return warped, M.astype(np.float32)


def _order_points(pts: np.ndarray) -> np.ndarray:
    """Order points in clockwise manner: TL, TR, BR, BL."""
    rect = np.zeros((4, 2), dtype=pts.dtype)
    
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1)
    
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    
    return rect