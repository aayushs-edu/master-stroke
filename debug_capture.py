# Create debug_capture.py in project root
import cv2
import numpy as np
import matplotlib.pyplot as plt
from backend.capture.geometry import detect_paper_quad

def debug_paper_detection(image_path):
    """Debug paper detection step by step."""
    # Load image
    img = cv2.imread(image_path)
    if img is None:
        print(f"Failed to load image: {image_path}")
        return
    
    print(f"Image shape: {img.shape}")
    
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Create figure for visualization
    fig, axes = plt.subplots(2, 3, figsize=(15, 10))
    axes = axes.ravel()
    
    # Original image
    axes[0].imshow(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    axes[0].set_title('Original Image')
    
    # Grayscale
    axes[1].imshow(gray, cmap='gray')
    axes[1].set_title('Grayscale')
    
    # Bilateral filter
    filtered = cv2.bilateralFilter(gray, 9, 75, 75)
    axes[2].imshow(filtered, cmap='gray')
    axes[2].set_title('Bilateral Filtered')
    
    # Adaptive threshold
    thresh = cv2.adaptiveThreshold(
        filtered, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY, 11, 2
    )
    axes[3].imshow(thresh, cmap='gray')
    axes[3].set_title('Adaptive Threshold')
    
    # Canny edges
    edges = cv2.Canny(filtered, 30, 100)
    axes[4].imshow(edges, cmap='gray')
    axes[4].set_title('Canny Edges')
    
    # Find contours on edges
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    dilated = cv2.dilate(edges, kernel, iterations=2)
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Draw all contours
    contour_img = img.copy()
    cv2.drawContours(contour_img, contours, -1, (0, 255, 0), 2)
    axes[5].imshow(cv2.cvtColor(contour_img, cv2.COLOR_BGR2RGB))
    axes[5].set_title(f'All Contours ({len(contours)})')
    
    # Find largest contours
    if contours:
        areas = [cv2.contourArea(c) for c in contours]
        sorted_indices = np.argsort(areas)[::-1]
        
        print("\nTop 5 largest contours:")
        for i in range(min(5, len(contours))):
            idx = sorted_indices[i]
            area = areas[idx]
            peri = cv2.arcLength(contours[idx], True)
            approx = cv2.approxPolyDP(contours[idx], 0.02 * peri, True)
            print(f"  {i+1}: Area={area:.0f}, Vertices={len(approx)}")
    
    plt.tight_layout()
    plt.savefig('debug_detection.png')
    plt.show()
    
    # Try detection
    quad = detect_paper_quad(img)
    if quad is not None:
        print("\n✓ Paper detected!")
        # Draw detected quad
        result = img.copy()
        cv2.drawContours(result, [quad.astype(int)], -1, (0, 255, 0), 3)
        cv2.imwrite('detected_paper.jpg', result)
    else:
        print("\n✗ No paper detected")

# Run debug on your test image
if __name__ == "__main__":
    debug_paper_detection("./backend/data/user_samples/how-to-draw-eyes-step-1.jpg")  # Replace with your image path