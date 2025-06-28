"""Lighting normalization utilities for consistent capture quality."""

import cv2
import numpy as np


def normalize_lighting(gray: np.ndarray) -> np.ndarray:
    """Normalize lighting using CLAHE and optional histogram equalization.
    
    Applies Contrast Limited Adaptive Histogram Equalization (CLAHE) to
    improve local contrast. If the image is too dark or bright overall,
    also applies global histogram equalization.
    
    Args:
        gray: Grayscale image (single channel)
        
    Returns:
        Normalized grayscale image
        
    Raises:
        ValueError: If input is not grayscale
    """
    if len(gray.shape) != 2:
        raise ValueError("Input must be grayscale (single channel)")
    
    # Calculate initial statistics
    mean_brightness = np.mean(gray)
    std_brightness = np.std(gray)
    
    # If image is already in a good range with decent contrast, apply minimal processing
    if 100 <= mean_brightness <= 180 and std_brightness > 20:
        # Just apply mild CLAHE for local contrast enhancement
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        return clahe.apply(gray)
    
    # Step 1: Apply initial CLAHE for local contrast
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    
    # Step 2: Apply brightness correction based on initial brightness
    if mean_brightness < 80:
        # Very dark image - apply aggressive brightening
        # Method 1: Gamma correction
        gamma = 2.2
        enhanced = np.power(enhanced / 255.0, 1.0 / gamma)
        enhanced = (enhanced * 255).astype(np.uint8)
        
        # Method 2: Linear scaling to target range
        current_mean = enhanced.mean()
        if current_mean < 80:
            target_mean = 120
            scale = target_mean / max(current_mean, 1)
            enhanced = np.clip(enhanced * scale, 0, 255).astype(np.uint8)
            
    elif mean_brightness > 200:  # Increased threshold from 180 to 200
        # Very bright image - apply darkening
        # Method 1: Gamma correction
        gamma = 0.4
        enhanced = np.power(enhanced / 255.0, gamma)
        enhanced = (enhanced * 255).astype(np.uint8)
        
        # Method 2: Linear scaling to target range
        current_mean = enhanced.mean()
        if current_mean > 170:
            target_mean = 130
            scale = target_mean / max(current_mean, 1)
            enhanced = np.clip(enhanced * scale, 0, 255).astype(np.uint8)
    
    # Step 3: Final adjustment using histogram stretching (only for extreme cases)
    final_mean = enhanced.mean()
    if final_mean < 80 or final_mean > 200:  # Increased upper threshold
        # Apply percentile-based stretching
        p2, p98 = np.percentile(enhanced, (2, 98))
        
        # Stretch to use more of the dynamic range
        if p98 - p2 > 10:  # Avoid division by zero
            enhanced = np.clip((enhanced - p2) * 255.0 / (p98 - p2), 0, 255).astype(np.uint8)
        
        # Apply one more scaling to get into target range
        current_mean = enhanced.mean()
        if current_mean < 80:
            target_mean = 100
            scale = target_mean / max(current_mean, 1)
            enhanced = np.clip(enhanced * scale, 0, 255).astype(np.uint8)
        elif current_mean > 170:
            target_mean = 150
            scale = target_mean / max(current_mean, 1)
            enhanced = np.clip(enhanced * scale, 0, 255).astype(np.uint8)
    
    return enhanced


def enhance_color_image(bgr: np.ndarray) -> np.ndarray:
    """Enhance color image by normalizing each channel independently.
    
    Args:
        bgr: Color image in BGR format
        
    Returns:
        Enhanced BGR image
    """
    # Convert to LAB color space for better lighting control
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    
    # Split channels
    l, a, b = cv2.split(lab)
    
    # Apply lighting normalization to L channel only
    l_normalized = normalize_lighting(l)
    
    # Merge and convert back
    lab_normalized = cv2.merge([l_normalized, a, b])
    bgr_enhanced = cv2.cvtColor(lab_normalized, cv2.COLOR_LAB2BGR)
    
    return bgr_enhanced


def adaptive_normalize(gray: np.ndarray, target_mean: int = 120, target_std: int = 40) -> np.ndarray:
    """Alternative normalization method using mean and standard deviation targets.
    
    Args:
        gray: Input grayscale image
        target_mean: Desired mean brightness (default: 120)
        target_std: Desired standard deviation (default: 40)
        
    Returns:
        Normalized grayscale image
    """
    # Current statistics
    current_mean = gray.mean()
    current_std = gray.std()
    
    # Avoid division by zero
    if current_std < 1:
        current_std = 1
    
    # Normalize to zero mean and unit variance
    normalized = (gray - current_mean) / current_std
    
    # Scale to target statistics
    result = normalized * target_std + target_mean
    
    # Clip to valid range
    return np.clip(result, 0, 255).astype(np.uint8)