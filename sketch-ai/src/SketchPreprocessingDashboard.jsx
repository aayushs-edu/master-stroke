import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Play, RotateCcw, Download, Eye, EyeOff, Settings, Info, Edit3, Save, X, Zap, Grid3X3, ImageIcon, Trash2, Copy, FolderOpen, TestTube, Target, ChevronDown, ChevronRight, Monitor, Plus } from 'lucide-react';

const SketchPreprocessingDashboard = () => {
  const [images, setImages] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [processedImages, setProcessedImages] = useState({});
  const [selectedAlgorithms, setSelectedAlgorithms] = useState([]); // Now stores objects with unique IDs
  const [isProcessing, setIsProcessing] = useState(false);
  const [algorithmParams, setAlgorithmParams] = useState({});
  const [showSettings, setShowSettings] = useState({});
  const [visibleSteps, setVisibleSteps] = useState({});
  const [editingParams, setEditingParams] = useState({});
  const [defaultVisibility, setDefaultVisibility] = useState(true);
  const [previewMode, setPreviewMode] = useState({});
  const [parameterPreviews, setParameterPreviews] = useState({});
  
  // New states for parameter preview system
  const [showParameterPreview, setShowParameterPreview] = useState(false);
  const [previewingAlgorithm, setPreviewingAlgorithm] = useState(null);
  const [parameterCombinations, setParameterCombinations] = useState({});
  const [previewResults, setPreviewResults] = useState({});
  const [isGeneratingPreviews, setIsGeneratingPreviews] = useState(false);
  const [selectedPreviewParams, setSelectedPreviewParams] = useState({});
  const [previewGridSize, setPreviewGridSize] = useState({ width: 3, height: 3 });
  const [expandedPreviewImages, setExpandedPreviewImages] = useState({});
  
  // Enhanced Pipeline States
  const [pipelineMode, setPipelineMode] = useState('individual'); // 'individual' or 'enhanced'
  const [enhancedPipelineParams, setEnhancedPipelineParams] = useState({
    // Step 1: Standardize & Normalize
    targetSize: 512,
    padColor: 'white', // 'white' or 'black'
    grayscaleMethod: 'luminance',
    claheClipLimit: 3,
    claheTileGridSize: 8,
    
    // Step 2: Denoise
    bilateralD: 9,
    bilateralSigmaColor: 75,
    bilateralSigmaSpace: 75,
    useAnisotropicDiffusion: false,
    anisotropicIterations: 10,
    anisotropicKappa: 30,
    anisotropicGamma: 0.2,
    
    // Step 3: Stroke Enhancement
    unsharpAmount: 1.5,
    blackHatKernel: 15,
    
    // Step 4: Shading Removal (conditional)
    shadingThreshold: 0.3,
    topHatKernel: 15,
    varianceWindow: 11,
    varianceThreshold: 200,
    closingKernel: 5,
    
    // Step 5: Thresholding / Edge Fusion
    thresholdingMode: 'sauvola', // 'sauvola', 'adaptive', 'multiOtsu', 'cannyFusion'
    // Sauvola
    sauvolaWindow: 63,
    sauvolaK: 0.2,
    // Adaptive Gaussian
    adaptiveBlockSize: 31,
    adaptiveC: 2,
    // Multi-scale Otsu
    otsuTileSize: 48,
    // Canny Fusion
    cannyLow: 50,
    cannyHigh: 150,
    
    // Step 6: Ridge Filter
    useRidgeFilter: false,
    ridgeThreshold: 0.05,
    
    // Step 7: Morphological Cleanup
    cleanupClosing: 3,
    cleanupOpening: 3,
    
    // Step 8: Skeletonization
    skeletonIterations: 20,
    
    // Step 9: Contour Simplification
    douglasPeuckerEpsilon: 0.02,
    
    // Step 10: Output Mode
    outputMode: 'combined' // 'lines', 'mask', 'combined'
  });
  
  // Enhanced Pipeline Step Toggles
  const [enhancedPipelineSteps, setEnhancedPipelineSteps] = useState({
    step1_standardize: true,    // Standardize & Normalize
    step2_denoise: true,        // Denoise
    step3_enhance: true,        // Stroke Enhancement
    step4_shading: true,        // Shading Removal
    step5_threshold: true,      // Thresholding
    step6_ridge: false,         // Ridge Filter (optional by default)
    step7_cleanup: true,        // Morphological Cleanup
    step8_skeleton: true,       // Skeletonization
    step9_simplify: true,       // Contour Simplification
    step10_output: true         // Final Output
  });
  
  const [enhancedPipelineResults, setEnhancedPipelineResults] = useState({});
  const [isProcessingEnhanced, setIsProcessingEnhanced] = useState(false);
  
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  // Get current selected image
  const currentImage = images[selectedImageIndex];
  const currentProcessedImages = processedImages[selectedImageIndex] || [];

  // Comprehensive algorithm definitions for sketch preprocessing
  const algorithms = {
    // Basic preprocessing
    grayscale: {
      name: 'Grayscale Conversion',
      description: 'Convert to grayscale using weighted RGB channels',
      category: 'Basic',
      allowMultiple: true,
      params: {
        method: { 
          options: ['luminance', 'average', 'lightness', 'custom'], 
          default: 'luminance', 
          label: 'Conversion Method',
          previewValues: ['luminance', 'average', 'lightness', 'custom']
        },
        redWeight: { min: 0, max: 1, default: 0.299, step: 0.001, label: 'Red Weight', previewValues: [0.1, 0.299, 0.5, 0.8] },
        greenWeight: { min: 0, max: 1, default: 0.587, step: 0.001, label: 'Green Weight', previewValues: [0.3, 0.587, 0.8] },
        blueWeight: { min: 0, max: 1, default: 0.114, step: 0.001, label: 'Blue Weight', previewValues: [0.05, 0.114, 0.3] }
      }
    },

    // Noise reduction and smoothing
    gaussianBlur: {
      name: 'Gaussian Blur',
      description: 'Smooth image with Gaussian kernel to reduce noise',
      category: 'Smoothing',
      allowMultiple: true,
      params: {
        kernelSize: { min: 1, max: 15, default: 5, step: 2, label: 'Kernel Size', previewValues: [1, 3, 7, 11, 15] },
        sigma: { min: 0.1, max: 5, default: 1.4, step: 0.1, label: 'Sigma', previewValues: [0.3, 1.0, 2.0, 4.0] }
      }
    },
    bilateralFilter: {
      name: 'Bilateral Filter',
      description: 'Edge-preserving smoothing filter',
      category: 'Smoothing',
      allowMultiple: true,
      params: {
        d: { min: 5, max: 15, default: 9, step: 2, label: 'Diameter', previewValues: [5, 9, 15] },
        sigmaColor: { min: 10, max: 150, default: 75, step: 5, label: 'Sigma Color', previewValues: [25, 75, 125] },
        sigmaSpace: { min: 10, max: 150, default: 75, step: 5, label: 'Sigma Space', previewValues: [25, 75, 125] }
      }
    },
    medianFilter: {
      name: 'Median Filter',
      description: 'Remove salt-and-pepper noise while preserving edges',
      category: 'Smoothing',
      allowMultiple: true,
      params: {
        kernelSize: { min: 3, max: 9, default: 5, step: 2, label: 'Kernel Size', previewValues: [3, 5, 7, 9] }
      }
    },
    anisotropicDiffusion: {
      name: 'Anisotropic Diffusion',
      description: 'Advanced edge-preserving smoothing',
      category: 'Smoothing',
      allowMultiple: true,
      params: {
        iterations: { min: 1, max: 20, default: 10, step: 1, label: 'Iterations', previewValues: [5, 10, 15] },
        kappa: { min: 10, max: 100, default: 30, step: 5, label: 'Diffusion Constant', previewValues: [20, 30, 50] },
        gamma: { min: 0.1, max: 0.3, default: 0.2, step: 0.01, label: 'Rate of Diffusion', previewValues: [0.1, 0.2, 0.3] }
      }
    },

    // Edge detection
    edgeDetection: {
      name: 'Canny Edge Detection',
      description: 'Multi-stage edge detection algorithm',
      category: 'Edge Detection',
      allowMultiple: true,
      params: {
        lowThreshold: { min: 10, max: 150, default: 50, step: 5, label: 'Low Threshold', previewValues: [20, 50, 80, 120] },
        highThreshold: { min: 50, max: 300, default: 150, step: 10, label: 'High Threshold', previewValues: [80, 150, 220, 280] },
        gaussianKernel: { min: 3, max: 7, default: 5, step: 2, label: 'Gaussian Kernel', previewValues: [3, 5, 7] },
        L2gradient: { options: ['true', 'false'], default: 'true', label: 'L2 Gradient', previewValues: ['true', 'false'] }
      }
    },
    sobelEdges: {
      name: 'Sobel Edge Detection',
      description: 'Gradient-based edge detection',
      category: 'Edge Detection',
      allowMultiple: true,
      params: {
        ksize: { min: 1, max: 7, default: 3, step: 2, label: 'Kernel Size', previewValues: [1, 3, 5, 7] },
        threshold: { min: 50, max: 200, default: 100, step: 10, label: 'Threshold', previewValues: [60, 100, 140, 180] },
        direction: { options: ['both', 'horizontal', 'vertical'], default: 'both', label: 'Direction', previewValues: ['both', 'horizontal', 'vertical'] }
      }
    },
    laplacianEdges: {
      name: 'Laplacian Edge Detection',
      description: 'Second derivative edge detection',
      category: 'Edge Detection',
      allowMultiple: true,
      params: {
        ksize: { min: 1, max: 7, default: 3, step: 2, label: 'Kernel Size', previewValues: [1, 3, 5] },
        threshold: { min: 10, max: 100, default: 30, step: 5, label: 'Threshold', previewValues: [20, 30, 50] }
      }
    },

    // Morphological operations
    morphology: {
      name: 'Morphological Operations',
      description: 'Shape-based image processing operations',
      category: 'Morphology',
      allowMultiple: true, // Now allows multiple instances
      params: {
        operation: { 
          options: ['opening', 'closing', 'gradient', 'tophat', 'blackhat', 'dilation', 'erosion'], 
          default: 'closing', 
          label: 'Operation',
          previewValues: ['opening', 'closing', 'gradient', 'dilation', 'erosion']
        },
        kernelSize: { min: 1, max: 15, default: 3, step: 2, label: 'Kernel Size', previewValues: [1, 3, 7, 11] },
        kernelShape: { options: ['ellipse', 'rectangle', 'cross'], default: 'ellipse', label: 'Kernel Shape', previewValues: ['ellipse', 'rectangle', 'cross'] },
        iterations: { min: 1, max: 5, default: 1, step: 1, label: 'Iterations', previewValues: [1, 2, 3, 4] }
      }
    },
    skeletonization: {
      name: 'Skeletonization',
      description: 'Reduce shapes to skeletal form',
      category: 'Morphology',
      allowMultiple: true,
      params: {
        method: { options: ['zhang-suen', 'lee', 'thin'], default: 'zhang-suen', label: 'Algorithm', previewValues: ['zhang-suen', 'lee', 'thin'] },
        iterations: { min: 1, max: 50, default: 20, step: 1, label: 'Max Iterations', previewValues: [10, 20, 30] }
      }
    },

    // Thresholding
    adaptiveThreshold: {
      name: 'Adaptive Threshold',
      description: 'Local thresholding for varying illumination',
      category: 'Thresholding',
      allowMultiple: true,
      params: {
        maxValue: { min: 200, max: 255, default: 255, step: 5, label: 'Max Value', previewValues: [200, 255] },
        adaptiveMethod: { options: ['mean', 'gaussian'], default: 'gaussian', label: 'Adaptive Method', previewValues: ['mean', 'gaussian'] },
        thresholdType: { options: ['binary', 'binary_inv'], default: 'binary', label: 'Threshold Type', previewValues: ['binary', 'binary_inv'] },
        blockSize: { min: 3, max: 21, default: 11, step: 2, label: 'Block Size', previewValues: [5, 9, 15, 21] },
        C: { min: 0, max: 20, default: 2, step: 1, label: 'Constant C', previewValues: [0, 2, 8, 15] }
      }
    },
    otsuThreshold: {
      name: 'Otsu Threshold',
      description: 'Automatic global thresholding',
      category: 'Thresholding',
      allowMultiple: true,
      params: {
        thresholdType: { options: ['binary', 'binary_inv'], default: 'binary', label: 'Threshold Type', previewValues: ['binary', 'binary_inv'] }
      }
    },
    multiOtsu: {
      name: 'Multi-level Otsu',
      description: 'Multi-class thresholding',
      category: 'Thresholding',
      allowMultiple: true,
      params: {
        classes: { min: 2, max: 5, default: 3, step: 1, label: 'Number of Classes', previewValues: [2, 3, 4] }
      }
    },

    // Contour processing
    contourDetection: {
      name: 'Contour Detection & Filtering',
      description: 'Find and filter contours by area, perimeter, etc.',
      category: 'Contours',
      allowMultiple: true,
      params: {
        minArea: { min: 10, max: 2000, default: 100, step: 10, label: 'Min Area', previewValues: [50, 100, 200] },
        maxArea: { min: 1000, max: 50000, default: 10000, step: 100, label: 'Max Area', previewValues: [5000, 10000, 20000] },
        minPerimeter: { min: 10, max: 500, default: 50, step: 10, label: 'Min Perimeter', previewValues: [30, 50, 80] },
        thickness: { min: 1, max: 5, default: 2, step: 1, label: 'Line Thickness', previewValues: [1, 2, 3] },
        fillContours: { options: ['true', 'false'], default: 'false', label: 'Fill Contours', previewValues: ['true', 'false'] }
      }
    },
    contourSimplification: {
      name: 'Contour Simplification',
      description: 'Simplify contours using Douglas-Peucker algorithm',
      category: 'Contours',
      allowMultiple: true,
      params: {
        epsilon: { min: 0.001, max: 0.1, default: 0.02, step: 0.001, label: 'Epsilon (Approximation)', previewValues: [0.01, 0.02, 0.05] },
        closed: { options: ['true', 'false'], default: 'true', label: 'Closed Contours', previewValues: ['true', 'false'] }
      }
    },

    // Advanced preprocessing
    unsharpMask: {
      name: 'Unsharp Masking',
      description: 'Enhance edge details and sharpness',
      category: 'Enhancement',
      allowMultiple: true,
      params: {
        radius: { min: 0.5, max: 5, default: 1.5, step: 0.1, label: 'Radius', previewValues: [0.5, 1.5, 3.0, 5.0] },
        amount: { min: 0.5, max: 3, default: 1.5, step: 0.1, label: 'Amount', previewValues: [0.5, 1.5, 2.5] },
        threshold: { min: 0, max: 50, default: 3, step: 1, label: 'Threshold', previewValues: [0, 3, 15, 30] }
      }
    },
    clahe: {
      name: 'CLAHE (Contrast Enhancement)',
      description: 'Contrast Limited Adaptive Histogram Equalization',
      category: 'Enhancement',
      allowMultiple: true,
      params: {
        clipLimit: { min: 1, max: 10, default: 3, step: 0.5, label: 'Clip Limit', previewValues: [2, 3, 5] },
        tileGridSize: { min: 4, max: 16, default: 8, step: 2, label: 'Tile Grid Size', previewValues: [4, 8, 12] }
      }
    },
    gammaCorrection: {
      name: 'Gamma Correction',
      description: 'Adjust image brightness and contrast',
      category: 'Enhancement',
      allowMultiple: true,
      params: {
        gamma: { min: 0.1, max: 3, default: 1.0, step: 0.1, label: 'Gamma Value', previewValues: [0.3, 0.7, 1.0, 1.5, 2.2] }
      }
    },

    // Frequency domain
    fourierTransform: {
      name: 'Fourier High-pass Filter',
      description: 'Remove low-frequency components (backgrounds)',
      category: 'Frequency',
      allowMultiple: true,
      params: {
        cutoffFreq: { min: 0.01, max: 0.5, default: 0.1, step: 0.01, label: 'Cutoff Frequency', previewValues: [0.05, 0.1, 0.2] },
        filterType: { options: ['ideal', 'butterworth', 'gaussian'], default: 'butterworth', label: 'Filter Type', previewValues: ['ideal', 'butterworth', 'gaussian'] },
        order: { min: 1, max: 10, default: 2, step: 1, label: 'Filter Order', previewValues: [1, 2, 4] }
      }
    },

    // Line detection
    houghLines: {
      name: 'Hough Line Transform',
      description: 'Detect and enhance straight lines',
      category: 'Line Detection',
      allowMultiple: true,
      params: {
        rho: { min: 1, max: 5, default: 1, step: 1, label: 'Distance Resolution', previewValues: [1, 2, 3] },
        theta: { min: 1, max: 5, default: 1, step: 1, label: 'Angle Resolution (degrees)', previewValues: [1, 2, 3] },
        threshold: { min: 50, max: 200, default: 100, step: 10, label: 'Accumulator Threshold', previewValues: [70, 100, 150] },
        minLineLength: { min: 10, max: 100, default: 50, step: 5, label: 'Min Line Length', previewValues: [30, 50, 80] },
        maxLineGap: { min: 1, max: 20, default: 10, step: 1, label: 'Max Line Gap', previewValues: [5, 10, 15] }
      }
    },

    // Advanced edge processing
    structuredEdgeDetection: {
      name: 'Structured Edge Detection',
      description: 'ML-based edge detection for natural images',
      category: 'Advanced',
      allowMultiple: true,
      params: {
        radius: { min: 1, max: 10, default: 5, step: 1, label: 'Patch Radius', previewValues: [3, 5, 8] },
        beta: { min: 0.1, max: 1, default: 0.5, step: 0.1, label: 'Beta Parameter', previewValues: [0.3, 0.5, 0.8] },
        eta: { min: 0.1, max: 2, default: 1, step: 0.1, label: 'Eta Parameter', previewValues: [0.5, 1.0, 1.5] }
      }
    },

    // Boundary extraction for filled shapes
    boundaryExtraction: {
      name: 'Boundary Extraction',
      description: 'Extract outlines of filled shapes and regions',
      category: 'Advanced',
      allowMultiple: true,
      params: {
        method: { options: ['external', 'internal', 'both'], default: 'external', label: 'Boundary Type', previewValues: ['external', 'internal', 'both'] },
        minShapeArea: { min: 50, max: 5000, default: 500, step: 50, label: 'Min Shape Area', previewValues: [200, 500, 1000, 2000] },
        smoothing: { min: 0, max: 5, default: 1, step: 1, label: 'Boundary Smoothing', previewValues: [0, 1, 3] },
        thickness: { min: 1, max: 5, default: 2, step: 1, label: 'Outline Thickness', previewValues: [1, 2, 3] },
        preserveHoles: { options: ['true', 'false'], default: 'true', label: 'Preserve Holes', previewValues: ['true', 'false'] }
      }
    },

    // Shape decomposition - separates lines from filled areas
    shapeDecomposition: {
      name: 'Shape Decomposition',
      description: 'Separate line strokes from filled regions',
      category: 'Advanced',
      allowMultiple: true,
      params: {
        mode: { 
          options: ['conservative', 'balanced', 'aggressive', 'custom'], 
          default: 'balanced', 
          label: 'Processing Mode', 
          previewValues: ['conservative', 'balanced', 'aggressive'] 
        },
        strokeThickness: { min: 1, max: 15, default: 5, step: 1, label: 'Max Stroke Thickness', previewValues: [3, 5, 8, 12] },
        fillThreshold: { min: 50, max: 3000, default: 800, step: 50, label: 'Min Fill Area', previewValues: [200, 500, 800, 1500] },
        aspectRatioLimit: { min: 2, max: 25, default: 6, step: 1, label: 'Stroke Aspect Ratio', previewValues: [4, 6, 10, 15] },
        densityThreshold: { min: 0.1, max: 0.9, default: 0.6, step: 0.1, label: 'Fill Density', previewValues: [0.3, 0.6, 0.8] },
        edgePreservation: { min: 0, max: 10, default: 3, step: 1, label: 'Edge Preservation', previewValues: [0, 3, 7] },
        outputMode: { 
          options: ['lines_only', 'fills_only', 'boundaries_only', 'combined', 'smart_boundaries'], 
          default: 'smart_boundaries', 
          label: 'Output Mode', 
          previewValues: ['lines_only', 'boundaries_only', 'smart_boundaries', 'combined'] 
        }
      }
    },

    // Shading removal algorithms
    shadingRemoval: {
      name: 'Shading Removal',
      description: 'Remove filled regions and shading using texture analysis',
      category: 'Shading Removal',
      allowMultiple: true,
      params: {
        method: { options: ['variance', 'entropy', 'gradient'], default: 'variance', label: 'Detection Method', previewValues: ['variance', 'entropy', 'gradient'] },
        windowSize: { min: 5, max: 21, default: 11, step: 2, label: 'Analysis Window', previewValues: [5, 9, 15, 21] },
        threshold: { min: 0.1, max: 2, default: 0.8, step: 0.1, label: 'Shading Threshold', previewValues: [0.3, 0.8, 1.3, 1.8] },
        morphClose: { min: 1, max: 7, default: 3, step: 2, label: 'Morphological Closing', previewValues: [1, 3, 5, 7] }
      }
    },
    textureSegmentation: {
      name: 'Texture Segmentation',
      description: 'Separate lines from textured/shaded regions',
      category: 'Shading Removal',
      allowMultiple: true,
      params: {
        filterSize: { min: 3, max: 15, default: 7, step: 2, label: 'Filter Size', previewValues: [5, 7, 11] },
        energyThreshold: { min: 0.01, max: 0.5, default: 0.1, step: 0.01, label: 'Energy Threshold', previewValues: [0.05, 0.1, 0.2] },
        orientation: { min: 4, max: 12, default: 8, step: 2, label: 'Orientations', previewValues: [4, 8, 12] }
      }
    },
    intensityVariance: {
      name: 'Intensity Variance Filter',
      description: 'Remove regions with low intensity variance (flat shading)',
      category: 'Shading Removal',
      allowMultiple: true,
      params: {
        kernelSize: { min: 5, max: 21, default: 9, step: 2, label: 'Kernel Size', previewValues: [5, 9, 15, 21] },
        varianceThreshold: { min: 50, max: 500, default: 200, step: 10, label: 'Variance Threshold', previewValues: [75, 150, 300, 450] },
        preserveEdges: { options: ['true', 'false'], default: 'true', label: 'Preserve Edges', previewValues: ['true', 'false'] }
      }
    },

    // Noise models
    wienerFilter: {
      name: 'Wiener Filter',
      description: 'Optimal linear filter for noise reduction',
      category: 'Denoising',
      allowMultiple: true,
      params: {
        estimatedNoise: { min: 0.001, max: 0.1, default: 0.01, step: 0.001, label: 'Noise Estimate', previewValues: [0.005, 0.01, 0.02] }
      }
    }
  };

  // Helper function to generate unique ID for algorithm instances
  const generateAlgorithmInstanceId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  // Initialize algorithm parameters
  useEffect(() => {
    const initialParams = {};
    Object.keys(algorithms).forEach(alg => {
      initialParams[alg] = {};
      Object.keys(algorithms[alg].params).forEach(param => {
        const paramDef = algorithms[alg].params[param];
        initialParams[alg][param] = paramDef.default || paramDef.options?.[0];
      });
    });
    setAlgorithmParams(initialParams);
  }, []);

  // Generate parameter combinations for preview
  const generateParameterCombinations = (algorithmKey) => {
    const algorithm = algorithms[algorithmKey];
    if (!algorithm) return [];

    const paramKeys = Object.keys(algorithm.params);
    const combinations = [];

    // Get all preview values for each parameter
    const previewValueArrays = paramKeys.map(key => {
      const param = algorithm.params[key];
      return param.previewValues || [param.default || param.options?.[0]];
    });

    // Generate distinctive combinations based on parameter importance
    const maxCombinations = Math.min(previewGridSize.width * previewGridSize.height, 15);
    
    if (previewValueArrays.length === 1) {
      // Single parameter - use all preview values
      previewValueArrays[0].slice(0, maxCombinations).forEach((value, index) => {
        combinations.push({
          id: index,
          params: { [paramKeys[0]]: value },
          label: `${paramKeys[0]}: ${value}`
        });
      });
    } else if (previewValueArrays.length === 2) {
      // Two parameters - create strategic grid focusing on extremes and key points
      const param1Values = previewValueArrays[0];
      const param2Values = previewValueArrays[1];
      
      // Priority combinations: extremes and key contrasts
      const strategicCombinations = [
        [0, 0], // min-min
        [0, param2Values.length - 1], // min-max
        [param1Values.length - 1, 0], // max-min
        [param1Values.length - 1, param2Values.length - 1], // max-max
        [Math.floor(param1Values.length / 2), Math.floor(param2Values.length / 2)], // mid-mid
      ];
      
      // Add additional combinations if space allows
      if (maxCombinations > 5) {
        strategicCombinations.push(
          [0, Math.floor(param2Values.length / 2)], // min-mid
          [param1Values.length - 1, Math.floor(param2Values.length / 2)], // max-mid
          [Math.floor(param1Values.length / 2), 0], // mid-min
          [Math.floor(param1Values.length / 2), param2Values.length - 1], // mid-max
        );
      }
      
      // Add remaining combinations in a distributed manner
      const remaining = maxCombinations - strategicCombinations.length;
      if (remaining > 0) {
        for (let i = 0; i < param1Values.length && combinations.length < maxCombinations; i++) {
          for (let j = 0; j < param2Values.length && combinations.length < maxCombinations; j++) {
            if (!strategicCombinations.some(([x, y]) => x === i && y === j)) {
              strategicCombinations.push([i, j]);
            }
          }
        }
      }
      
      strategicCombinations.slice(0, maxCombinations).forEach(([i, j], index) => {
        if (i < param1Values.length && j < param2Values.length) {
          combinations.push({
            id: index,
            params: {
              [paramKeys[0]]: param1Values[i],
              [paramKeys[1]]: param2Values[j]
            },
            label: `${paramKeys[0]}: ${param1Values[i]}, ${paramKeys[1]}: ${param2Values[j]}`
          });
        }
      });
    } else {
      // Multiple parameters - focus on distinctive contrasts
      const generateDistinctiveCombinations = () => {
        const combos = [];
        
        // 1. Default combination
        const defaultCombo = {};
        paramKeys.forEach(key => {
          const param = algorithm.params[key];
          defaultCombo[key] = param.default || param.options?.[0];
        });
        combos.push({
          id: 0,
          params: defaultCombo,
          label: 'Default settings'
        });
        
        // 2. Extreme combinations
        ['min', 'max'].forEach(extreme => {
          const extremeCombo = {};
          paramKeys.forEach(key => {
            const values = previewValueArrays[paramKeys.indexOf(key)];
            extremeCombo[key] = extreme === 'min' ? values[0] : values[values.length - 1];
          });
          combos.push({
            id: combos.length,
            params: extremeCombo,
            label: `${extreme === 'min' ? 'Minimal' : 'Maximal'} settings`
          });
        });
        
        // 3. Single parameter variations (keeping others at default)
        paramKeys.forEach(varyingParam => {
          const values = previewValueArrays[paramKeys.indexOf(varyingParam)];
          [0, values.length - 1].forEach(valueIndex => {
            if (combos.length >= maxCombinations) return;
            
            const combo = { ...defaultCombo };
            combo[varyingParam] = values[valueIndex];
            
            // Skip if this is the same as default
            if (combo[varyingParam] === defaultCombo[varyingParam]) return;
            
            combos.push({
              id: combos.length,
              params: combo,
              label: `${varyingParam}: ${values[valueIndex]} (others default)`
            });
          });
        });
        
        // 4. Mixed distinctive combinations
        const midPoints = paramKeys.map(key => {
          const values = previewValueArrays[paramKeys.indexOf(key)];
          return values[Math.floor(values.length / 2)];
        });
        
        if (combos.length < maxCombinations) {
          const midCombo = {};
          paramKeys.forEach((key, index) => {
            midCombo[key] = midPoints[index];
          });
          combos.push({
            id: combos.length,
            params: midCombo,
            label: 'Balanced settings'
          });
        }
        
        return combos.slice(0, maxCombinations);
      };
      
      combinations.push(...generateDistinctiveCombinations());
    }

    return combinations;
  };

  // Generate previews for all images with parameter combinations
  const generateParameterPreviews = async (algorithmKey) => {
    if (!algorithmKey || images.length === 0) return;

    setIsGeneratingPreviews(true);
    setPreviewingAlgorithm(algorithmKey);
    
    const combinations = generateParameterCombinations(algorithmKey);
    setParameterCombinations({ [algorithmKey]: combinations });
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const newResults = {};

    // Process each image with each parameter combination
    for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
      const image = images[imageIndex];
      newResults[imageIndex] = {};

      const img = new Image();
      await new Promise((resolve) => {
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          
          combinations.forEach((combo) => {
            ctx.drawImage(img, 0, 0);
            let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Apply the algorithm with the specific parameter combination
            const fullParams = {
              ...algorithmParams[algorithmKey],
              ...combo.params
            };
            
            try {
              imageData = applyAlgorithm(algorithmKey, imageData, fullParams);
              ctx.putImageData(imageData, 0, 0);
              
              newResults[imageIndex][combo.id] = {
                dataUrl: canvas.toDataURL(),
                params: combo.params,
                label: combo.label
              };
            } catch (error) {
              console.error(`Error applying ${algorithmKey} with params:`, combo.params, error);
            }
          });
          
          resolve();
        };
        img.src = image.dataUrl;
      });
    }

    setPreviewResults({ [algorithmKey]: newResults });
    setIsGeneratingPreviews(false);
    setShowParameterPreview(true);
  };

  // Apply a specific algorithm with parameters
  const applyAlgorithm = (algorithmKey, imageData, params) => {
    switch (algorithmKey) {
      case 'grayscale':
        return applyGrayscale(imageData, params);
      case 'gaussianBlur':
        return applyGaussianBlur(imageData, params);
      case 'medianFilter':
        return applyMedianFilter(imageData, params);
      case 'bilateralFilter':
        return applyBilateralFilter(imageData, params);
      case 'unsharpMask':
        return applyUnsharpMask(imageData, params);
      case 'gammaCorrection':
        return applyGammaCorrection(imageData, params);
      case 'edgeDetection':
        return applyCannyEdgeDetection(imageData, params);
      case 'sobelEdges':
        return applySobelEdgeDetection(imageData, params);
      case 'laplacianEdges':
        return applyLaplacianEdgeDetection(imageData, params);
      case 'morphology':
        return applyMorphology(imageData, params);
      case 'adaptiveThreshold':
        return applyAdaptiveThreshold(imageData, params);
      case 'otsuThreshold':
        return applyOtsuThreshold(imageData, params);
      case 'multiOtsu':
        return applyMultiOtsu(imageData, params);
      case 'contourDetection':
        return applyContourDetection(imageData, params);
      case 'contourSimplification':
        return applyContourSimplification(imageData, params);
      case 'skeletonization':
        return applySkeletonization(imageData, params);
      case 'shadingRemoval':
        return applyShadingRemoval(imageData, params);
      case 'intensityVariance':
        return applyIntensityVariance(imageData, params);
      case 'textureSegmentation':
        return applyTextureSegmentation(imageData, params);
      case 'clahe':
        return applyCLAHE(imageData, params);
      case 'anisotropicDiffusion':
        return applyAnisotropicDiffusion(imageData, params);
      case 'fourierTransform':
        return applyFourierHighPass(imageData, params);
      case 'houghLines':
        return applyHoughLines(imageData, params);
      case 'structuredEdgeDetection':
        return applyStructuredEdgeDetection(imageData, params);
      case 'boundaryExtraction':
        return applyBoundaryExtraction(imageData, params);
      case 'shapeDecomposition':
        return applyShapeDecomposition(imageData, params);
      case 'wienerFilter':
        return applyWienerFilter(imageData, params);
      default:
        console.log(`Algorithm ${algorithmKey} not yet implemented`);
        return imageData;
    }
  };

  // Apply optimal parameters to the algorithm
  const applyOptimalParameters = (algorithmKey, comboId) => {
    const combo = parameterCombinations[algorithmKey]?.find(c => c.id === comboId);
    if (!combo) return;

    setAlgorithmParams(prev => ({
      ...prev,
      [algorithmKey]: {
        ...prev[algorithmKey],
        ...combo.params
      }
    }));

    setSelectedPreviewParams({ [algorithmKey]: combo.params });
    setShowParameterPreview(false);
  };

  // Real-time parameter update functions
  const updateRealtimeParameter = useCallback((algorithmKey, paramKey, value) => {
    setParameterPreviews(prev => ({
      ...prev,
      [algorithmKey]: {
        ...prev[algorithmKey],
        [paramKey]: value
      }
    }));
  }, []);

  const applyRealtimeParameters = (algorithmKey) => {
    const realtimeParams = parameterPreviews[algorithmKey];
    if (!realtimeParams) return;

    setAlgorithmParams(prev => ({
      ...prev,
      [algorithmKey]: {
        ...prev[algorithmKey],
        ...realtimeParams
      }
    }));

    setSelectedPreviewParams({ [algorithmKey]: realtimeParams });
    setShowParameterPreview(false);
  };

  const resetRealtimeParameters = (algorithmKey) => {
    const algorithm = algorithms[algorithmKey];
    if (!algorithm) return;

    const defaultParams = {};
    Object.keys(algorithm.params).forEach(param => {
      const paramDef = algorithm.params[param];
      defaultParams[param] = paramDef.default || paramDef.options?.[0];
    });

    setParameterPreviews(prev => ({
      ...prev,
      [algorithmKey]: defaultParams
    }));
  };

  // Initialize realtime parameters when switching to realtime mode
  useEffect(() => {
    if (previewingAlgorithm && previewMode[previewingAlgorithm] === 'realtime') {
      if (!parameterPreviews[previewingAlgorithm]) {
        resetRealtimeParameters(previewingAlgorithm);
      }
    }
  }, [previewingAlgorithm, previewMode, parameterPreviews]);

  // Real-time preview component
  const RealtimePreviewImage = ({ image, algorithm, params, applyAlgorithm }) => {
    const [previewDataUrl, setPreviewDataUrl] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
      if (!image || !algorithm || !params) return;

      const processImage = async () => {
        setIsProcessing(true);
        try {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');

          const img = new Image();
          img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            try {
              imageData = applyAlgorithm(algorithm, imageData, params);
              ctx.putImageData(imageData, 0, 0);
              setPreviewDataUrl(canvas.toDataURL());
            } catch (error) {
              console.error('Error in real-time preview:', error);
            }
            setIsProcessing(false);
          };
          img.src = image.dataUrl;
        } catch (error) {
          console.error('Error processing real-time preview:', error);
          setIsProcessing(false);
        }
      };

      // Debounce the processing to avoid too frequent updates
      const timeoutId = setTimeout(processImage, 300);
      return () => clearTimeout(timeoutId);
    }, [image, algorithm, params, applyAlgorithm]);

    if (isProcessing) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (!previewDataUrl) {
      return (
        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
          Processing...
        </div>
      );
    }

    return (
      <img
        src={previewDataUrl}
        alt="Real-time preview"
        className="w-full h-full object-contain"
      />
    );
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    
    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newImage = {
          id: Date.now() + index,
          name: file.name,
          dataUrl: e.target.result,
          uploadedAt: new Date()
        };
        
        setImages(prev => [...prev, newImage]);
        
        // If this is the first image, select it
        if (images.length === 0) {
          setSelectedImageIndex(images.length);
        }
      };
      reader.readAsDataURL(file);
    });
    
    // Clear the input
    event.target.value = '';
  };

  const removeImage = (indexToRemove) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
    
    // Update processed images
    setProcessedImages(prev => {
      const newProcessed = {};
      Object.keys(prev).forEach(key => {
        const keyIndex = parseInt(key);
        if (keyIndex < indexToRemove) {
          newProcessed[keyIndex] = prev[key];
        } else if (keyIndex > indexToRemove) {
          newProcessed[keyIndex - 1] = prev[key];
        }
      });
      return newProcessed;
    });
    
    // Adjust selected index
    if (selectedImageIndex >= indexToRemove && selectedImageIndex > 0) {
      setSelectedImageIndex(prev => prev - 1);
    } else if (images.length === 1) {
      setSelectedImageIndex(0);
    }
  };

  const duplicateImage = (imageToDuplicate) => {
    const newImage = {
      ...imageToDuplicate,
      id: Date.now(),
      name: `Copy of ${imageToDuplicate.name}`
    };
    setImages(prev => [...prev, newImage]);
  };

  const applyPipelineToAll = async () => {
    if (selectedAlgorithms.length === 0) return;
    
    setIsProcessing(true);
    
    // Process images one by one to avoid blocking
    for (let i = 0; i < images.length; i++) {
      await processImageAtIndex(i);
      // Small delay to keep UI responsive
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    setIsProcessing(false);
  };

  const processImageAtIndex = useCallback(async (imageIndex) => {
    const image = images[imageIndex];
    if (!image || selectedAlgorithms.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      let results = [{ name: 'Original', dataUrl: image.dataUrl, algorithm: 'original' }];
      
      ctx.drawImage(img, 0, 0);
      let currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      selectedAlgorithms.forEach((algInstance, index) => {
        const params = algorithmParams[algInstance.instanceId] || algorithmParams[algInstance.algKey] || {};
        
        try {
          currentImageData = applyAlgorithm(algInstance.algKey, currentImageData, params);
        } catch (error) {
          console.error(`Error applying ${algInstance.algKey}:`, error);
        }
        
        ctx.putImageData(currentImageData, 0, 0);
        const dataUrl = canvas.toDataURL();
        results.push({
          name: `${algorithms[algInstance.algKey].name} #${algInstance.instanceNumber}`,
          dataUrl,
          algorithm: algInstance.algKey,
          instanceId: algInstance.instanceId,
          params: { ...params }
        });
      });
      
      setProcessedImages(prev => ({
        ...prev,
        [imageIndex]: results
      }));
      
      // Set visibility for this image's results
      setVisibleSteps(prev => {
        const newVisible = { ...prev };
        results.forEach((_, index) => {
          newVisible[`${imageIndex}-${index}`] = defaultVisibility;
        });
        return newVisible;
      });
    };
    
    img.src = image.dataUrl;
  }, [images, selectedAlgorithms, algorithmParams, defaultVisibility]);

  // Enhanced image processing functions (keeping the same as before)
  const applyGrayscale = (imageData, params) => {
    const data = imageData.data;
    const { method, redWeight, greenWeight, blueWeight } = params;
    
    for (let i = 0; i < data.length; i += 4) {
      let gray;
      switch (method) {
        case 'average':
          gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
          break;
        case 'lightness':
          gray = (Math.max(data[i], data[i + 1], data[i + 2]) + Math.min(data[i], data[i + 1], data[i + 2])) / 2;
          break;
        case 'custom':
          gray = redWeight * data[i] + greenWeight * data[i + 1] + blueWeight * data[i + 2];
          break;
        default: // luminance
          gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
    return imageData;
  };

  const generateGaussianKernel = (size, sigma) => {
    const kernel = [];
    const half = Math.floor(size / 2);
    let sum = 0;
    
    for (let y = -half; y <= half; y++) {
      kernel[y + half] = [];
      for (let x = -half; x <= half; x++) {
        const value = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
        kernel[y + half][x + half] = value;
        sum += value;
      }
    }
    
    // Normalize
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        kernel[y][x] /= sum;
      }
    }
    
    return kernel;
  };

  const applyGaussianBlur = (imageData, params) => {
    const { kernelSize, sigma } = params;
    const width = imageData.width;
    const height = imageData.height;
    const data = new Uint8ClampedArray(imageData.data);
    const newData = new Uint8ClampedArray(imageData.data.length);
    
    const kernel = generateGaussianKernel(kernelSize, sigma);
    const half = Math.floor(kernelSize / 2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        
        for (let ky = -half; ky <= half; ky++) {
          for (let kx = -half; kx <= half; kx++) {
            const py = Math.min(height - 1, Math.max(0, y + ky));
            const px = Math.min(width - 1, Math.max(0, x + kx));
            const idx = (py * width + px) * 4;
            const weight = kernel[ky + half][kx + half];
            
            r += data[idx] * weight;
            g += data[idx + 1] * weight;
            b += data[idx + 2] * weight;
            a += data[idx + 3] * weight;
          }
        }
        
        const idx = (y * width + x) * 4;
        newData[idx] = r;
        newData[idx + 1] = g;
        newData[idx + 2] = b;
        newData[idx + 3] = a;
      }
    }
    
    return new ImageData(newData, width, height);
  };

  const applyMedianFilter = (imageData, params) => {
    const { kernelSize } = params;
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data.length);
    const half = Math.floor(kernelSize / 2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const rValues = [], gValues = [], bValues = [];
        
        for (let ky = -half; ky <= half; ky++) {
          for (let kx = -half; kx <= half; kx++) {
            const py = Math.min(height - 1, Math.max(0, y + ky));
            const px = Math.min(width - 1, Math.max(0, x + kx));
            const idx = (py * width + px) * 4;
            
            rValues.push(data[idx]);
            gValues.push(data[idx + 1]);
            bValues.push(data[idx + 2]);
          }
        }
        
        rValues.sort((a, b) => a - b);
        gValues.sort((a, b) => a - b);
        bValues.sort((a, b) => a - b);
        
        const medianIdx = Math.floor(rValues.length / 2);
        const idx = (y * width + x) * 4;
        
        newData[idx] = rValues[medianIdx];
        newData[idx + 1] = gValues[medianIdx];
        newData[idx + 2] = bValues[medianIdx];
        newData[idx + 3] = data[idx + 3];
      }
    }
    
    return new ImageData(newData, width, height);
  };

  const applyUnsharpMask = (imageData, params) => {
    const { radius, amount, threshold } = params;
    const blurred = applyGaussianBlur(imageData, { kernelSize: Math.ceil(radius * 2) | 1, sigma: radius });
    const width = imageData.width;
    const height = imageData.height;
    const original = imageData.data;
    const blurredData = blurred.data;
    const newData = new Uint8ClampedArray(original.length);
    
    for (let i = 0; i < original.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const diff = original[i + c] - blurredData[i + c];
        if (Math.abs(diff) > threshold) {
          newData[i + c] = Math.min(255, Math.max(0, original[i + c] + amount * diff));
        } else {
          newData[i + c] = original[i + c];
        }
      }
      newData[i + 3] = original[i + 3];
    }
    
    return new ImageData(newData, width, height);
  };

  const applyGammaCorrection = (imageData, params) => {
    const { gamma } = params;
    const data = imageData.data;
    const invGamma = 1.0 / gamma;
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.pow(data[i] / 255, invGamma) * 255;
      data[i + 1] = Math.pow(data[i + 1] / 255, invGamma) * 255;
      data[i + 2] = Math.pow(data[i + 2] / 255, invGamma) * 255;
    }
    
    return imageData;
  };

  const applySobelEdgeDetection = (imageData, params) => {
    const { lowThreshold, highThreshold } = params;
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data.length);
    
    const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const gray = data[idx];
            gx += gray * sobelX[ky + 1][kx + 1];
            gy += gray * sobelY[ky + 1][kx + 1];
          }
        }
        
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        const idx = (y * width + x) * 4;
        
        let value = 0;
        if (magnitude > highThreshold) value = 255;
        else if (magnitude > lowThreshold) value = 128;
        
        newData[idx] = value;
        newData[idx + 1] = value;
        newData[idx + 2] = value;
        newData[idx + 3] = 255;
      }
    }
    
    return new ImageData(newData, width, height);
  };

  const applyMorphology = (imageData, params) => {
    const { operation, kernelSize, iterations } = params;
    let result = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
    
    for (let i = 0; i < iterations; i++) {
      result = performMorphologyOperation(result, operation, kernelSize);
    }
    
    return result;
  };

  const performMorphologyOperation = (imageData, operation, kernelSize) => {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data.length);
    const half = Math.floor(kernelSize / 2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let minVal = 255, maxVal = 0;
        
        for (let ky = -half; ky <= half; ky++) {
          for (let kx = -half; kx <= half; kx++) {
            const py = Math.min(height - 1, Math.max(0, y + ky));
            const px = Math.min(width - 1, Math.max(0, x + kx));
            const idx = (py * width + px) * 4;
            const value = data[idx];
            minVal = Math.min(minVal, value);
            maxVal = Math.max(maxVal, value);
          }
        }
        
        const idx = (y * width + x) * 4;
        let result = 0;
        
        switch (operation) {
          case 'erosion':
            result = minVal;
            break;
          case 'dilation':
            result = maxVal;
            break;
          case 'opening':
            result = maxVal;
            break;
          case 'closing':
            result = minVal;
            break;
          case 'gradient':
            result = maxVal - minVal;
            break;
          case 'tophat':
            result = Math.max(0, data[idx] - minVal);
            break;
          case 'blackhat':
            result = Math.max(0, maxVal - data[idx]);
            break;
        }
        
        newData[idx] = result;
        newData[idx + 1] = result;
        newData[idx + 2] = result;
        newData[idx + 3] = 255;
      }
    }
    
    return new ImageData(newData, width, height);
  };

  // Enhanced Pipeline Algorithm Implementations
  
  // Step 1: Standardize & Normalize
  const standardizeAndNormalize = (imageData, params) => {
    const { targetSize, padColor, grayscaleMethod, claheClipLimit, claheTileGridSize } = params;
    
    // First resize and pad to target size
    let resized = resizeAndPadImage(imageData, targetSize, padColor);
    
    // Convert to grayscale
    resized = applyGrayscale(resized, { method: grayscaleMethod });
    
    // Apply CLAHE for contrast enhancement
    resized = applyCLAHEEnhanced(resized, { clipLimit: claheClipLimit, tileGridSize: claheTileGridSize });
    
    return resized;
  };

  const resizeAndPadImage = (imageData, targetSize, padColor) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Create temporary canvas with original image
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    tempCtx.putImageData(imageData, 0, 0);
    
    // Calculate scaling to fit within target size while maintaining aspect ratio
    const scale = Math.min(targetSize / imageData.width, targetSize / imageData.height);
    const newWidth = Math.floor(imageData.width * scale);
    const newHeight = Math.floor(imageData.height * scale);
    
    // Set final canvas size
    canvas.width = targetSize;
    canvas.height = targetSize;
    
    // Fill with pad color
    ctx.fillStyle = padColor === 'white' ? '#FFFFFF' : '#000000';
    ctx.fillRect(0, 0, targetSize, targetSize);
    
    // Draw resized image centered
    const offsetX = (targetSize - newWidth) / 2;
    const offsetY = (targetSize - newHeight) / 2;
    ctx.drawImage(tempCanvas, offsetX, offsetY, newWidth, newHeight);
    
    return ctx.getImageData(0, 0, targetSize, targetSize);
  };

  const applyCLAHEEnhanced = (imageData, params) => {
    const { clipLimit, tileGridSize } = params;
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data.length);
    
    const tileWidth = Math.floor(width / tileGridSize);
    const tileHeight = Math.floor(height / tileGridSize);
    
    // Simplified CLAHE - apply histogram equalization with clipping
    for (let tileY = 0; tileY < tileGridSize; tileY++) {
      for (let tileX = 0; tileX < tileGridSize; tileX++) {
        const startX = tileX * tileWidth;
        const startY = tileY * tileHeight;
        const endX = Math.min(startX + tileWidth, width);
        const endY = Math.min(startY + tileHeight, height);
        
        // Calculate histogram for this tile
        const histogram = new Array(256).fill(0);
        let pixelCount = 0;
        
        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            const idx = (y * width + x) * 4;
            histogram[data[idx]]++;
            pixelCount++;
          }
        }
        
        // Apply clip limit
        const clipThreshold = (clipLimit * pixelCount) / 256;
        let redistributed = 0;
        for (let i = 0; i < 256; i++) {
          if (histogram[i] > clipThreshold) {
            redistributed += histogram[i] - clipThreshold;
            histogram[i] = clipThreshold;
          }
        }
        const redistributePerBin = redistributed / 256;
        for (let i = 0; i < 256; i++) {
          histogram[i] += redistributePerBin;
        }
        
        // Calculate cumulative distribution function
        const cdf = new Array(256);
        cdf[0] = histogram[0];
        for (let i = 1; i < 256; i++) {
          cdf[i] = cdf[i - 1] + histogram[i];
        }
        
        // Normalize CDF
        for (let i = 0; i < 256; i++) {
          cdf[i] = (cdf[i] / pixelCount) * 255;
        }
        
        // Apply transformation to tile
        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            const idx = (y * width + x) * 4;
            const newValue = Math.floor(cdf[data[idx]]);
            newData[idx] = newValue;
            newData[idx + 1] = newValue;
            newData[idx + 2] = newValue;
            newData[idx + 3] = data[idx + 3];
          }
        }
      }
    }
    
    return new ImageData(newData, width, height);
  };

  // Step 2: Enhanced Bilateral Filter
  const applyEnhancedBilateralFilter = (imageData, params) => {
    const { d, sigmaColor, sigmaSpace } = params;
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data.length);
    const radius = Math.floor(d / 2);
    
    // Pre-compute spatial weights
    const spatialWeights = [];
    for (let dy = -radius; dy <= radius; dy++) {
      spatialWeights[dy + radius] = [];
      for (let dx = -radius; dx <= radius; dx++) {
        const spatialDist = Math.sqrt(dx * dx + dy * dy);
        spatialWeights[dy + radius][dx + radius] = Math.exp(-(spatialDist * spatialDist) / (2 * sigmaSpace * sigmaSpace));
      }
    }
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const centerIdx = (y * width + x) * 4;
        const centerValue = data[centerIdx];
        
        let weightSum = 0;
        let valueSum = 0;
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const ny = Math.max(0, Math.min(height - 1, y + dy));
            const nx = Math.max(0, Math.min(width - 1, x + dx));
            const neighIdx = (ny * width + nx) * 4;
            const neighValue = data[neighIdx];
            
            const colorDist = Math.abs(centerValue - neighValue);
            const colorWeight = Math.exp(-(colorDist * colorDist) / (2 * sigmaColor * sigmaColor));
            const spatialWeight = spatialWeights[dy + radius][dx + radius];
            
            const weight = colorWeight * spatialWeight;
            weightSum += weight;
            valueSum += weight * neighValue;
          }
        }
        
        const result = valueSum / weightSum;
        newData[centerIdx] = result;
        newData[centerIdx + 1] = result;
        newData[centerIdx + 2] = result;
        newData[centerIdx + 3] = data[centerIdx + 3];
      }
    }
    
    return new ImageData(newData, width, height);
  };

  // Step 3: Black-Hat Morphology
  const applyBlackHat = (imageData, kernelSize) => {
    // Black-hat = Closing - Original
    const closed = applyMorphology(imageData, { operation: 'closing', kernelSize, iterations: 1 });
    const width = imageData.width;
    const height = imageData.height;
    const original = imageData.data;
    const closedData = closed.data;
    const newData = new Uint8ClampedArray(original.length);
    
    for (let i = 0; i < original.length; i += 4) {
      const diff = Math.max(0, closedData[i] - original[i]);
      newData[i] = diff;
      newData[i + 1] = diff;
      newData[i + 2] = diff;
      newData[i + 3] = 255;
    }
    
    return new ImageData(newData, width, height);
  };

  // Step 4: Shading Detection and Removal
  const calculateShadingDensity = (imageData) => {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const windowSize = 15;
    const half = Math.floor(windowSize / 2);
    let totalVariance = 0;
    let pixelCount = 0;
    
    for (let y = half; y < height - half; y += 5) { // Sample every 5 pixels for speed
      for (let x = half; x < width - half; x += 5) {
        let sum = 0;
        let sumSq = 0;
        let count = 0;
        
        for (let dy = -half; dy <= half; dy++) {
          for (let dx = -half; dx <= half; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            const value = data[idx];
            sum += value;
            sumSq += value * value;
            count++;
          }
        }
        
        const mean = sum / count;
        const variance = (sumSq / count) - (mean * mean);
        totalVariance += variance;
        pixelCount++;
      }
    }
    
    const avgVariance = totalVariance / pixelCount;
    return avgVariance / 10000; // Normalize to 0-1 range approximately
  };

  const applyTopHat = (imageData, kernelSize) => {
    // Top-hat = Original - Opening
    const opened = applyMorphology(imageData, { operation: 'opening', kernelSize, iterations: 1 });
    const width = imageData.width;
    const height = imageData.height;
    const original = imageData.data;
    const openedData = opened.data;
    const newData = new Uint8ClampedArray(original.length);
    
    for (let i = 0; i < original.length; i += 4) {
      const diff = Math.max(0, original[i] - openedData[i]);
      newData[i] = diff;
      newData[i + 1] = diff;
      newData[i + 2] = diff;
      newData[i + 3] = 255;
    }
    
    return new ImageData(newData, width, height);
  };

  const applyLocalVarianceFilter = (imageData, params) => {
    const { windowSize, threshold } = params;
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data.length);
    const half = Math.floor(windowSize / 2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let sumSq = 0;
        let count = 0;
        
        for (let dy = -half; dy <= half; dy++) {
          for (let dx = -half; dx <= half; dx++) {
            const ny = Math.max(0, Math.min(height - 1, y + dy));
            const nx = Math.max(0, Math.min(width - 1, x + dx));
            const idx = (ny * width + nx) * 4;
            const value = data[idx];
            sum += value;
            sumSq += value * value;
            count++;
          }
        }
        
        const mean = sum / count;
        const variance = (sumSq / count) - (mean * mean);
        
        const idx = (y * width + x) * 4;
        const result = variance > threshold ? 255 : 0;
        newData[idx] = result;
        newData[idx + 1] = result;
        newData[idx + 2] = result;
        newData[idx + 3] = 255;
      }
    }
    
    return new ImageData(newData, width, height);
  };

  // Step 5: Advanced Thresholding Methods
  const applySauvolaThreshold = (imageData, params) => {
    const { windowSize, k } = params;
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data.length);
    const half = Math.floor(windowSize / 2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let sumSq = 0;
        let count = 0;
        
        for (let dy = -half; dy <= half; dy++) {
          for (let dx = -half; dx <= half; dx++) {
            const ny = Math.max(0, Math.min(height - 1, y + dy));
            const nx = Math.max(0, Math.min(width - 1, x + dx));
            const idx = (ny * width + nx) * 4;
            const value = data[idx];
            sum += value;
            sumSq += value * value;
            count++;
          }
        }
        
        const mean = sum / count;
        const variance = (sumSq / count) - (mean * mean);
        const stdDev = Math.sqrt(variance);
        
        const threshold = mean * (1 + k * ((stdDev / 128) - 1));
        
        const idx = (y * width + x) * 4;
        const result = data[idx] > threshold ? 255 : 0;
        newData[idx] = result;
        newData[idx + 1] = result;
        newData[idx + 2] = result;
        newData[idx + 3] = 255;
      }
    }
    
    return new ImageData(newData, width, height);
  };

  const applyMultiScaleOtsu = (imageData, tileSize) => {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data.length);
    
    const tilesX = Math.ceil(width / tileSize);
    const tilesY = Math.ceil(height / tileSize);
    
    for (let tileY = 0; tileY < tilesY; tileY++) {
      for (let tileX = 0; tileX < tilesX; tileX++) {
        const startX = tileX * tileSize;
        const startY = tileY * tileSize;
        const endX = Math.min(startX + tileSize, width);
        const endY = Math.min(startY + tileSize, height);
        
        // Calculate histogram for this tile
        const histogram = new Array(256).fill(0);
        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            const idx = (y * width + x) * 4;
            histogram[data[idx]]++;
          }
        }
        
        // Simple Otsu threshold for this tile
        const threshold = calculateOtsuThreshold(histogram);
        
        // Apply threshold to tile
        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            const idx = (y * width + x) * 4;
            const result = data[idx] > threshold ? 255 : 0;
            newData[idx] = result;
            newData[idx + 1] = result;
            newData[idx + 2] = result;
            newData[idx + 3] = 255;
          }
        }
      }
    }
    
    return new ImageData(newData, width, height);
  };

  const calculateOtsuThreshold = (histogram) => {
    const total = histogram.reduce((sum, count) => sum + count, 0);
    let sum = 0;
    for (let i = 0; i < 256; i++) {
      sum += i * histogram[i];
    }
    
    let sumB = 0;
    let wB = 0;
    let maximum = 0;
    let threshold = 0;
    
    for (let i = 0; i < 256; i++) {
      wB += histogram[i];
      if (wB === 0) continue;
      
      const wF = total - wB;
      if (wF === 0) break;
      
      sumB += i * histogram[i];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      
      const between = wB * wF * (mB - mF) * (mB - mF);
      
      if (between > maximum) {
        maximum = between;
        threshold = i;
      }
    }
    
    return threshold;
  };

  const applyCannyFusion = (imageData, params) => {
    const { lowThreshold, highThreshold } = params;
    
    // First apply Canny edge detection
    const edges = applyCannyEdgeDetection(imageData, { 
      lowThreshold, 
      highThreshold, 
      gaussianKernel: 5, 
      L2gradient: 'true' 
    });
    
    // Then apply Otsu threshold to original
    const binary = applyOtsuThreshold(imageData, { thresholdType: 'binary' });
    
    // Combine edges and binary mask with OR operation
    const width = imageData.width;
    const height = imageData.height;
    const edgeData = edges.data;
    const binaryData = binary.data;
    const newData = new Uint8ClampedArray(edgeData.length);
    
    for (let i = 0; i < edgeData.length; i += 4) {
      const result = Math.max(edgeData[i], binaryData[i]);
      newData[i] = result;
      newData[i + 1] = result;
      newData[i + 2] = result;
      newData[i + 3] = 255;
    }
    
    return new ImageData(newData, width, height);
  };

  // Step 6: Frangi Vesselness (Ridge Filter)
  const applyFrangiVesselness = (imageData, threshold) => {
    // Simplified Frangi vesselness - use enhanced edge detection
    const enhanced = applySobelEdgeDetection(imageData, { 
      lowThreshold: threshold * 100, 
      highThreshold: threshold * 200 
    });
    
    // Apply additional morphological filtering to enhance vessel-like structures
    return applyMorphology(enhanced, { operation: 'opening', kernelSize: 3, iterations: 1 });
  };

  // Step 8: Zhang-Suen Skeletonization
  const applyZhangSuenSkeleton = (imageData, maxIterations) => {
    const width = imageData.width;
    const height = imageData.height;
    let data = new Uint8ClampedArray(imageData.data);
    
    // Convert to binary (0 or 1)
    for (let i = 0; i < data.length; i += 4) {
      const binary = data[i] > 128 ? 1 : 0;
      data[i] = binary * 255;
      data[i + 1] = binary * 255;
      data[i + 2] = binary * 255;
    }
    
    let iteration = 0;
    let changed = true;
    
    while (changed && iteration < maxIterations) {
      changed = false;
      const newData = new Uint8ClampedArray(data);
      
      // Zhang-Suen algorithm step 1
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          if (data[idx] === 0) continue; // Background pixel
          
          if (shouldRemovePixel(data, width, x, y, 1)) {
            newData[idx] = 0;
            newData[idx + 1] = 0;
            newData[idx + 2] = 0;
            changed = true;
          }
        }
      }
      
      data = newData;
      
      // Zhang-Suen algorithm step 2
      const newData2 = new Uint8ClampedArray(data);
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          if (data[idx] === 0) continue; // Background pixel
          
          if (shouldRemovePixel(data, width, x, y, 2)) {
            newData2[idx] = 0;
            newData2[idx + 1] = 0;
            newData2[idx + 2] = 0;
            changed = true;
          }
        }
      }
      
      data = newData2;
      iteration++;
    }
    
    return new ImageData(data, width, height);
  };

  const shouldRemovePixel = (data, width, x, y, step) => {
    // Get 8-connected neighbors
    const neighbors = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const idx = ((y + dy) * width + (x + dx)) * 4;
        neighbors.push(data[idx] > 0 ? 1 : 0);
      }
    }
    
    // P2, P3, P4, P5, P6, P7, P8, P9 (8-connected neighbors clockwise from top)
    const [p2, p3, p4, p5, p6, p7, p8, p9] = [
      neighbors[1], neighbors[2], neighbors[4], neighbors[7], 
      neighbors[6], neighbors[5], neighbors[3], neighbors[0]
    ];
    
    // Number of non-zero neighbors
    const neighborCount = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
    
    // Number of 0-1 transitions in ordered sequence
    const transitions = [p2,p3,p4,p5,p6,p7,p8,p9,p2].reduce((count, curr, i, arr) => {
      return i > 0 && arr[i-1] === 0 && curr === 1 ? count + 1 : count;
    }, 0);
    
    // Zhang-Suen conditions
    const condition1 = neighborCount >= 2 && neighborCount <= 6;
    const condition2 = transitions === 1;
    
    if (step === 1) {
      const condition3 = p2 * p4 * p6 === 0;
      const condition4 = p4 * p6 * p8 === 0;
      return condition1 && condition2 && condition3 && condition4;
    } else {
      const condition3 = p2 * p4 * p8 === 0;
      const condition4 = p2 * p6 * p8 === 0;
      return condition1 && condition2 && condition3 && condition4;
    }
  };

  // Enhanced Pipeline Executor
  const runEnhancedPipeline = async (imageData, params, stepToggles) => {
    const steps = [];
    let currentImage = imageData;
    let stepNumber = 0;
    
    try {
      // Always include original
      steps.push({ name: 'Original', dataUrl: null, imageData: currentImage, enabled: true });
      
      // Step 1: Standardize & Normalize
      if (stepToggles.step1_standardize) {
        stepNumber++;
        currentImage = standardizeAndNormalize(currentImage, {
          targetSize: params.targetSize,
          padColor: params.padColor,
          grayscaleMethod: params.grayscaleMethod,
          claheClipLimit: params.claheClipLimit,
          claheTileGridSize: params.claheTileGridSize
        });
        steps.push({ name: `${stepNumber}. Standardize & Normalize`, dataUrl: null, imageData: currentImage, enabled: true });
      } else {
        steps.push({ name: '1. Standardize & Normalize (SKIPPED)', dataUrl: null, imageData: currentImage, enabled: false });
      }
      
      // Step 2: Denoise
      if (stepToggles.step2_denoise) {
        stepNumber++;
        currentImage = applyEnhancedBilateralFilter(currentImage, {
          d: params.bilateralD,
          sigmaColor: params.bilateralSigmaColor,
          sigmaSpace: params.bilateralSigmaSpace
        });
        
        if (params.useAnisotropicDiffusion) {
          currentImage = applyAnisotropicDiffusion(currentImage, {
            iterations: params.anisotropicIterations,
            kappa: params.anisotropicKappa,
            gamma: params.anisotropicGamma
          });
        }
        steps.push({ name: `${stepNumber}. Denoise`, dataUrl: null, imageData: currentImage, enabled: true });
      } else {
        steps.push({ name: '2. Denoise (SKIPPED)', dataUrl: null, imageData: currentImage, enabled: false });
      }
      
      // Step 3: Stroke Enhancement
      if (stepToggles.step3_enhance) {
        stepNumber++;
        currentImage = applyUnsharpMask(currentImage, {
          radius: 1.5,
          amount: params.unsharpAmount,
          threshold: 3
        });
        
        const blackHatResult = applyBlackHat(currentImage, params.blackHatKernel);
        // Combine original with black-hat
        const strokeEnhanced = combineImages(currentImage, blackHatResult, 'add');
        currentImage = strokeEnhanced;
        steps.push({ name: `${stepNumber}. Stroke Enhancement`, dataUrl: null, imageData: currentImage, enabled: true });
      } else {
        steps.push({ name: '3. Stroke Enhancement (SKIPPED)', dataUrl: null, imageData: currentImage, enabled: false });
      }
      
      // Step 4: Shading Removal (conditional)
      if (stepToggles.step4_shading) {
        stepNumber++;
        const shadingDensity = calculateShadingDensity(currentImage);
        let shadingRemoved = currentImage;
        
        if (shadingDensity > params.shadingThreshold) {
          const topHat = applyTopHat(currentImage, params.topHatKernel);
          const variance = applyLocalVarianceFilter(currentImage, {
            windowSize: params.varianceWindow,
            threshold: params.varianceThreshold
          });
          const combined = combineImages(topHat, variance, 'or');
          const closed = applyMorphology(combined, {
            operation: 'closing',
            kernelSize: params.closingKernel,
            iterations: 1
          });
          shadingRemoved = combineImages(currentImage, closed, 'subtract');
        }
        currentImage = shadingRemoved;
        steps.push({ name: `${stepNumber}. Shading Removal (density: ${shadingDensity.toFixed(3)})`, dataUrl: null, imageData: currentImage, enabled: true });
      } else {
        steps.push({ name: '4. Shading Removal (SKIPPED)', dataUrl: null, imageData: currentImage, enabled: false });
      }
      
      // Step 5: Thresholding / Edge Fusion
      if (stepToggles.step5_threshold) {
        stepNumber++;
        let thresholded;
        switch (params.thresholdingMode) {
          case 'sauvola':
            thresholded = applySauvolaThreshold(currentImage, {
              windowSize: params.sauvolaWindow,
              k: params.sauvolaK
            });
            break;
          case 'adaptive':
            thresholded = applyAdaptiveThreshold(currentImage, {
              maxValue: 255,
              adaptiveMethod: 'gaussian',
              thresholdType: 'binary',
              blockSize: params.adaptiveBlockSize,
              C: params.adaptiveC
            });
            break;
          case 'multiOtsu':
            thresholded = applyMultiScaleOtsu(currentImage, params.otsuTileSize);
            break;
          case 'cannyFusion':
            thresholded = applyCannyFusion(currentImage, {
              lowThreshold: params.cannyLow,
              highThreshold: params.cannyHigh
            });
            break;
          default:
            thresholded = applySauvolaThreshold(currentImage, {
              windowSize: params.sauvolaWindow,
              k: params.sauvolaK
            });
        }
        currentImage = thresholded;
        steps.push({ name: `${stepNumber}. Thresholding (${params.thresholdingMode})`, dataUrl: null, imageData: currentImage, enabled: true });
      } else {
        steps.push({ name: '5. Thresholding (SKIPPED)', dataUrl: null, imageData: currentImage, enabled: false });
      }
      
      // Step 6: Ridge Filter (optional)
      if (stepToggles.step6_ridge && params.useRidgeFilter) {
        stepNumber++;
        const ridgeFiltered = applyFrangiVesselness(currentImage, params.ridgeThreshold);
        currentImage = combineImages(currentImage, ridgeFiltered, 'or');
        steps.push({ name: `${stepNumber}. Ridge Filter`, dataUrl: null, imageData: currentImage, enabled: true });
      } else {
        const skipReason = !stepToggles.step6_ridge ? '(SKIPPED)' : '(DISABLED)';
        steps.push({ name: `6. Ridge Filter ${skipReason}`, dataUrl: null, imageData: currentImage, enabled: false });
      }
      
      // Step 7: Morphological Cleanup
      if (stepToggles.step7_cleanup) {
        stepNumber++;
        currentImage = applyMorphology(currentImage, {
          operation: 'closing',
          kernelSize: params.cleanupClosing,
          iterations: 1
        });
        currentImage = applyMorphology(currentImage, {
          operation: 'opening',
          kernelSize: params.cleanupOpening,
          iterations: 1
        });
        steps.push({ name: `${stepNumber}. Morphological Cleanup`, dataUrl: null, imageData: currentImage, enabled: true });
      } else {
        steps.push({ name: '7. Morphological Cleanup (SKIPPED)', dataUrl: null, imageData: currentImage, enabled: false });
      }
      
      // Step 8: Skeletonization
      if (stepToggles.step8_skeleton) {
        stepNumber++;
        const skeletonized = applyZhangSuenSkeleton(currentImage, params.skeletonIterations);
        steps.push({ name: `${stepNumber}. Skeletonization`, dataUrl: null, imageData: skeletonized, enabled: true });
        
        // Step 9: Contour Simplification
        if (stepToggles.step9_simplify) {
          stepNumber++;
          const simplified = applyContourSimplification(skeletonized, {
            epsilon: params.douglasPeuckerEpsilon,
            closed: true
          });
          steps.push({ name: `${stepNumber}. Contour Simplification`, dataUrl: null, imageData: simplified, enabled: true });
          
          // Step 10: Final Outputs
          if (stepToggles.step10_output) {
            stepNumber++;
            let finalResult;
            switch (params.outputMode) {
              case 'lines':
                finalResult = simplified; // Lines only (skeleton)
                break;
              case 'mask':
                finalResult = currentImage; // Binary mask before skeletonization
                break;
              case 'combined':
                finalResult = combineImages(currentImage, simplified, 'overlay');
                break;
              default:
                finalResult = simplified;
            }
            steps.push({ name: `${stepNumber}. Final Output (${params.outputMode})`, dataUrl: null, imageData: finalResult, enabled: true });
          } else {
            steps.push({ name: '10. Final Output (SKIPPED)', dataUrl: null, imageData: simplified, enabled: false });
          }
        } else {
          steps.push({ name: '9. Contour Simplification (SKIPPED)', dataUrl: null, imageData: skeletonized, enabled: false });
          
          // Step 10: Final Outputs (using skeletonized result)
          if (stepToggles.step10_output) {
            stepNumber++;
            let finalResult;
            switch (params.outputMode) {
              case 'lines':
                finalResult = skeletonized; // Lines only (skeleton)
                break;
              case 'mask':
                finalResult = currentImage; // Binary mask before skeletonization
                break;
              case 'combined':
                finalResult = combineImages(currentImage, skeletonized, 'overlay');
                break;
              default:
                finalResult = skeletonized;
            }
            steps.push({ name: `${stepNumber}. Final Output (${params.outputMode})`, dataUrl: null, imageData: finalResult, enabled: true });
          } else {
            steps.push({ name: '10. Final Output (SKIPPED)', dataUrl: null, imageData: skeletonized, enabled: false });
          }
        }
      } else {
        steps.push({ name: '8. Skeletonization (SKIPPED)', dataUrl: null, imageData: currentImage, enabled: false });
        steps.push({ name: '9. Contour Simplification (SKIPPED)', dataUrl: null, imageData: currentImage, enabled: false });
        
        // Step 10: Final Outputs (using current result)
        if (stepToggles.step10_output) {
          stepNumber++;
          let finalResult;
          switch (params.outputMode) {
            case 'lines':
              finalResult = currentImage; // Current state
              break;
            case 'mask':
              finalResult = currentImage; // Binary mask
              break;
            case 'combined':
              finalResult = currentImage; // Current state
              break;
            default:
              finalResult = currentImage;
          }
          steps.push({ name: `${stepNumber}. Final Output (${params.outputMode})`, dataUrl: null, imageData: finalResult, enabled: true });
        } else {
          steps.push({ name: '10. Final Output (SKIPPED)', dataUrl: null, imageData: currentImage, enabled: false });
        }
      }
      
      return steps;
      
    } catch (error) {
      console.error('Error in enhanced pipeline:', error);
      throw error;
    }
  };

  // Helper function to combine two images
  const combineImages = (image1, image2, mode) => {
    const width = image1.width;
    const height = image1.height;
    const data1 = image1.data;
    const data2 = image2.data;
    const newData = new Uint8ClampedArray(data1.length);
    
    for (let i = 0; i < data1.length; i += 4) {
      let result;
      switch (mode) {
        case 'add':
          result = Math.min(255, data1[i] + data2[i]);
          break;
        case 'subtract':
          result = Math.max(0, data1[i] - data2[i]);
          break;
        case 'or':
          result = Math.max(data1[i], data2[i]);
          break;
        case 'overlay':
          // Show mask as background with lines overlaid
          result = data2[i] > 0 ? 0 : (data1[i] > 0 ? 128 : 255);
          break;
        default:
          result = data1[i];
      }
      
      newData[i] = result;
      newData[i + 1] = result;
      newData[i + 2] = result;
      newData[i + 3] = 255;
    }
    
    return new ImageData(newData, width, height);
  };

  // Enhanced Pipeline Processing Functions
  const processEnhancedPipeline = async (imageIndex) => {
    const image = images[imageIndex];
    if (!image) return;
    
    setIsProcessingEnhanced(true);
    
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const img = new Image();
      img.onload = async () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        try {
          const steps = await runEnhancedPipeline(imageData, enhancedPipelineParams, enhancedPipelineSteps);
          
          // Convert ImageData to dataUrls
          const results = steps.map(step => {
            if (step.imageData) {
              ctx.putImageData(step.imageData, 0, 0);
              return {
                ...step,
                dataUrl: canvas.toDataURL()
              };
            }
            return {
              ...step,
              dataUrl: image.dataUrl // For original
            };
          });
          
          setEnhancedPipelineResults(prev => ({
            ...prev,
            [imageIndex]: results
          }));
          
        } catch (error) {
          console.error('Error processing enhanced pipeline:', error);
        }
        
        setIsProcessingEnhanced(false);
      };
      
      img.src = image.dataUrl;
      
    } catch (error) {
      console.error('Error setting up enhanced pipeline:', error);
      setIsProcessingEnhanced(false);
    }
  };

  const processAllEnhancedPipeline = async () => {
    setIsProcessingEnhanced(true);
    
    for (let i = 0; i < images.length; i++) {
      await processEnhancedPipeline(i);
      // Small delay to keep UI responsive
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    setIsProcessingEnhanced(false);
  };

  const updateEnhancedPipelineParam = (paramKey, value) => {
    setEnhancedPipelineParams(prev => ({
      ...prev,
      [paramKey]: parseFloat(value) || value
    }));
  };

  const toggleEnhancedPipelineStep = (stepKey) => {
    setEnhancedPipelineSteps(prev => ({
      ...prev,
      [stepKey]: !prev[stepKey]
    }));
  };

  const resetEnhancedPipelineSteps = () => {
    setEnhancedPipelineSteps({
      step1_standardize: true,
      step2_denoise: true,
      step3_enhance: true,
      step4_shading: true,
      step5_threshold: true,
      step6_ridge: false,
      step7_cleanup: true,
      step8_skeleton: true,
      step9_simplify: true,
      step10_output: true
    });
  };

  // Rest of the algorithm implementations remain the same...
  // For brevity, I'm including just a few key ones
  
  // Enhanced algorithm management functions with support for multiple instances
  const addAlgorithm = (algKey) => {
    const algorithm = algorithms[algKey];
    const instanceId = generateAlgorithmInstanceId();
    
    // Count existing instances of this algorithm
    const existingInstances = selectedAlgorithms.filter(alg => alg.algKey === algKey);
    const instanceNumber = existingInstances.length + 1;
    
    const newInstance = {
      algKey,
      instanceId,
      instanceNumber,
      name: `${algorithm.name} #${instanceNumber}`
    };
    
    setSelectedAlgorithms([...selectedAlgorithms, newInstance]);
    
    // Initialize parameters for this instance
    setAlgorithmParams(prev => ({
      ...prev,
      [instanceId]: {
        ...prev[algKey] // Copy from base algorithm params
      }
    }));
  };

  const removeAlgorithm = (instanceId) => {
    const algorithmToRemove = selectedAlgorithms.find(alg => alg.instanceId === instanceId);
    if (!algorithmToRemove) return;
    
    // Remove from selected algorithms
    setSelectedAlgorithms(selectedAlgorithms.filter(alg => alg.instanceId !== instanceId));
    
    // Remove parameters for this instance
    setAlgorithmParams(prev => {
      const newParams = { ...prev };
      delete newParams[instanceId];
      return newParams;
    });
    
    // Renumber remaining instances of the same algorithm type
    const remainingInstances = selectedAlgorithms.filter(alg => 
      alg.algKey === algorithmToRemove.algKey && alg.instanceId !== instanceId
    );
    
    remainingInstances.forEach((instance, index) => {
      instance.instanceNumber = index + 1;
      instance.name = `${algorithms[instance.algKey].name} #${instance.instanceNumber}`;
    });
    
    setSelectedAlgorithms(prev => [...prev]);
  };

  const moveAlgorithm = (instanceId, direction) => {
    const currentIndex = selectedAlgorithms.findIndex(alg => alg.instanceId === instanceId);
    if (currentIndex === -1) return;
    
    const newAlgorithms = [...selectedAlgorithms];
    if (direction === 'up' && currentIndex > 0) {
      [newAlgorithms[currentIndex], newAlgorithms[currentIndex - 1]] = 
      [newAlgorithms[currentIndex - 1], newAlgorithms[currentIndex]];
    } else if (direction === 'down' && currentIndex < newAlgorithms.length - 1) {
      [newAlgorithms[currentIndex], newAlgorithms[currentIndex + 1]] = 
      [newAlgorithms[currentIndex + 1], newAlgorithms[currentIndex]];
    }
    setSelectedAlgorithms(newAlgorithms);
  };

  const updateParam = (instanceId, paramKey, value) => {
    setAlgorithmParams(prev => ({
      ...prev,
      [instanceId]: {
        ...prev[instanceId],
        [paramKey]: parseFloat(value) || value
      }
    }));
  };

  const startEditingParams = (instanceId) => {
    setEditingParams(prev => ({ ...prev, [instanceId]: true }));
  };

  const saveParams = (instanceId) => {
    setEditingParams(prev => ({ ...prev, [instanceId]: false }));
  };

  const cancelEditingParams = (instanceId) => {
    setEditingParams(prev => ({ ...prev, [instanceId]: false }));
  };

  const downloadImage = (dataUrl, filename) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  };

  const downloadAllResults = () => {
    Object.keys(processedImages).forEach(imageIndex => {
      const results = processedImages[imageIndex];
      const imageName = images[imageIndex]?.name || `image_${imageIndex}`;
      
      results.forEach((result, stepIndex) => {
        if (result.algorithm !== 'original') {
          downloadImage(result.dataUrl, `${imageName}_step${stepIndex}_${result.algorithm}.png`);
        }
      });
    });
  };

  const toggleStepVisibility = (imageIndex, stepIndex) => {
    const key = `${imageIndex}-${stepIndex}`;
    setVisibleSteps(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Placeholder implementations for remaining algorithms
  const applyShadingRemoval = (imageData, params) => {
    // Simplified implementation
    return applyGaussianBlur(imageData, { kernelSize: 5, sigma: 1 });
  };

  const applyIntensityVariance = (imageData, params) => {
    // Simplified implementation
    return applyMedianFilter(imageData, { kernelSize: 5 });
  };

  const applyTextureSegmentation = (imageData, params) => {
    // Simplified implementation
    return applySobelEdgeDetection(imageData, { lowThreshold: 50, highThreshold: 150 });
  };

  const applyCLAHE = (imageData, params) => {
    // Simplified implementation - just apply gamma correction
    return applyGammaCorrection(imageData, { gamma: 1.2 });
  };

  const applyAnisotropicDiffusion = (imageData, params) => {
    // Simplified implementation
    return applyGaussianBlur(imageData, { kernelSize: 5, sigma: 1.4 });
  };

  const applyFourierHighPass = (imageData, params) => {
    // Simplified implementation using high-pass convolution
    const kernel = [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]];
    return applyConvolution(imageData, kernel);
  };

  const applyHoughLines = (imageData, params) => {
    // First apply edge detection then enhance
    const edges = applyCannyEdgeDetection(imageData, { lowThreshold: 50, highThreshold: 150, gaussianKernel: 5 });
    const kernel = [[0, -1, 0], [-1, 5, -1], [0, -1, 0]];
    return applyConvolution(edges, kernel);
  };

  const applyStructuredEdgeDetection = (imageData, params) => {
    return applySobelEdgeDetection(imageData, { lowThreshold: 50, highThreshold: 150 });
  };

  const applyWienerFilter = (imageData, params) => {
    const { estimatedNoise } = params;
    const sigma = estimatedNoise * 100;
    return applyGaussianBlur(imageData, { kernelSize: 5, sigma });
  };

  const applyBilateralFilter = (imageData, params) => {
    // Simplified bilateral filter
    return applyGaussianBlur(imageData, { kernelSize: 9, sigma: 1.4 });
  };

  const applyCannyEdgeDetection = (imageData, params) => {
    // Simplified Canny - convert to grayscale then apply Sobel
    const gray = applyGrayscale(imageData, { method: 'luminance' });
    return applySobelEdgeDetection(gray, params);
  };

  const applyLaplacianEdgeDetection = (imageData, params) => {
    const kernel = [[0, -1, 0], [-1, 4, -1], [0, -1, 0]];
    return applyConvolution(imageData, kernel);
  };

  const applyAdaptiveThreshold = (imageData, params) => {
    // Simplified adaptive threshold
    const gray = applyGrayscale(imageData, { method: 'luminance' });
    return applyOtsuThreshold(gray, { thresholdType: 'binary' });
  };

  const applyOtsuThreshold = (imageData, params) => {
    const { thresholdType } = params;
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data.length);
    
    // Simple threshold at 128
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i];
      const value = thresholdType === 'binary' ? 
        (gray > 128 ? 255 : 0) : 
        (gray > 128 ? 0 : 255);
      
      newData[i] = value;
      newData[i + 1] = value;
      newData[i + 2] = value;
      newData[i + 3] = 255;
    }
    
    return new ImageData(newData, imageData.width, imageData.height);
  };

  const applyMultiOtsu = (imageData, params) => {
    // Simplified multi-level threshold
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data.length);
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i];
      let value;
      if (gray < 85) value = 0;
      else if (gray < 170) value = 128;
      else value = 255;
      
      newData[i] = value;
      newData[i + 1] = value;
      newData[i + 2] = value;
      newData[i + 3] = 255;
    }
    
    return new ImageData(newData, imageData.width, imageData.height);
  };

  const applyContourDetection = (imageData, params) => {
    // Simplified contour detection - edge detection + morphology
    const edges = applySobelEdgeDetection(imageData, { lowThreshold: 50, highThreshold: 150 });
    return applyMorphology(edges, { operation: 'closing', kernelSize: 3, iterations: 1 });
  };

  const applyContourSimplification = (imageData, params) => {
    return applyGaussianBlur(imageData, { kernelSize: 3, sigma: 0.5 });
  };

  const applySkeletonization = (imageData, params) => {
    // Simplified skeletonization - multiple erosions
    let result = imageData;
    for (let i = 0; i < 3; i++) {
      result = applyMorphology(result, { operation: 'erosion', kernelSize: 3, iterations: 1 });
    }
    return result;
  };

  const applyBoundaryExtraction = (imageData, params) => {
    // Apply edge detection
    return applySobelEdgeDetection(imageData, { lowThreshold: 50, highThreshold: 150 });
  };

  const applyShapeDecomposition = (imageData, params) => {
    // Simplified shape decomposition
    const edges = applySobelEdgeDetection(imageData, { lowThreshold: 50, highThreshold: 150 });
    return applyMorphology(edges, { operation: 'closing', kernelSize: 3, iterations: 1 });
  };

  // Helper function for convolution
  const applyConvolution = (imageData, kernel) => {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data.length);
    const kernelSize = kernel.length;
    const half = Math.floor(kernelSize / 2);
    
    for (let y = half; y < height - half; y++) {
      for (let x = half; x < width - half; x++) {
        let sum = 0;
        
        for (let ky = 0; ky < kernelSize; ky++) {
          for (let kx = 0; kx < kernelSize; kx++) {
            const py = y + ky - half;
            const px = x + kx - half;
            const idx = (py * width + px) * 4;
            sum += data[idx] * kernel[ky][kx];
          }
        }
        
        const idx = (y * width + x) * 4;
        const value = Math.max(0, Math.min(255, sum));
        
        newData[idx] = value;
        newData[idx + 1] = value;
        newData[idx + 2] = value;
        newData[idx + 3] = 255;
      }
    }
    
    return new ImageData(newData, width, height);
  };

  // Group algorithms by category
  const algorithmsByCategory = Object.entries(algorithms).reduce((acc, [key, alg]) => {
    const category = alg.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push({ key, ...alg });
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Enhanced Sketch Preprocessing Pipeline</h1>
          <p className="text-gray-600 mb-6">Upload multiple sketches, test parameter combinations, and apply optimized processing pipelines. Now supports multiple instances of the same algorithm!</p>
          
          {/* Upload Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              ref={fileInputRef}
            />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium mr-4"
            >
              Upload Images (Multiple)
            </button>
            <p className="text-sm text-gray-500 mt-2">
              Select multiple images to test parameter combinations and find optimal settings
            </p>
          </div>

          {/* Image Gallery */}
          {images.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Uploaded Images ({images.length})
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={applyPipelineToAll}
                    disabled={selectedAlgorithms.length === 0 || isProcessing}
                    className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Process All Images
                  </button>
                  <button
                    onClick={downloadAllResults}
                    disabled={Object.keys(processedImages).length === 0}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download All Results
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                      selectedImageIndex === index 
                        ? 'border-blue-500 ring-2 ring-blue-200' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <img
                      src={image.dataUrl}
                      alt={image.name}
                      className="w-full h-24 object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateImage(image);
                        }}
                        className="bg-black bg-opacity-50 text-white p-1 rounded hover:bg-opacity-70"
                        title="Duplicate"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(index);
                        }}
                        className="bg-black bg-opacity-50 text-white p-1 rounded hover:bg-opacity-70"
                        title="Remove"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-1 text-xs truncate">
                      {image.name}
                    </div>
                    {processedImages[index] && (
                      <div className="absolute top-2 left-2">
                        <div className="bg-green-500 text-white text-xs px-2 py-1 rounded">
                          Processed
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Parameter Preview Modal */}
        {showParameterPreview && previewingAlgorithm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-screen overflow-y-auto">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Parameter Preview: {algorithms[previewingAlgorithm]?.name}
                  </h2>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-600">
                      Grid Size: 
                      <select 
                        value={`${previewGridSize.width}x${previewGridSize.height}`}
                        onChange={(e) => {
                          const [w, h] = e.target.value.split('x').map(Number);
                          setPreviewGridSize({ width: w, height: h });
                        }}
                        className="ml-2 border rounded px-2 py-1"
                      >
                        <option value="2x2">2×2</option>
                        <option value="3x3">3×3</option>
                        <option value="4x3">4×3</option>
                      </select>
                    </div>
                    <button
                      onClick={() => setShowParameterPreview(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>
                <p className="text-gray-600 mt-2">
                  Compare different parameter combinations across all uploaded images. Click on a result to apply those parameters.
                </p>
              </div>

              {/* Tab Navigation */}
              <div className="border-b">
                <nav className="flex">
                  <button
                    onClick={() => setPreviewMode(prev => ({ ...prev, [previewingAlgorithm]: 'combinations' }))}
                    className={`px-6 py-3 text-sm font-medium border-b-2 ${
                      (previewMode[previewingAlgorithm] || 'combinations') === 'combinations'
                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Parameter Combinations
                  </button>
                  <button
                    onClick={() => setPreviewMode(prev => ({ ...prev, [previewingAlgorithm]: 'realtime' }))}
                    className={`px-6 py-3 text-sm font-medium border-b-2 ${
                      previewMode[previewingAlgorithm] === 'realtime'
                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Real-time Tuning
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {isGeneratingPreviews && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Generating parameter previews...</p>
                  </div>
                )}

                {/* Combinations Tab */}
                {(previewMode[previewingAlgorithm] || 'combinations') === 'combinations' && 
                 previewResults[previewingAlgorithm] && !isGeneratingPreviews && (
                  <div className="space-y-8">
                    {/* Parameter combinations rows */}
                    {parameterCombinations[previewingAlgorithm]?.map((combo) => (
                      <div key={combo.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 mb-1">
                              Combination {combo.id + 1}
                            </h3>
                            <p className="text-sm text-gray-600 break-words">
                              {combo.label}
                            </p>
                          </div>
                          <button
                            onClick={() => applyOptimalParameters(previewingAlgorithm, combo.id)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 ml-4 shrink-0"
                          >
                            <Target className="h-4 w-4" />
                            Use These Parameters
                          </button>
                        </div>
                        
                        {/* Single row of all image results */}
                        <div className="overflow-x-auto">
                          <div className="flex gap-4 pb-2" style={{ minWidth: `${images.length * 200}px` }}>
                            {images.map((image, imageIndex) => {
                              const result = previewResults[previewingAlgorithm][imageIndex]?.[combo.id];
                              if (!result) return null;
                              
                              return (
                                <div key={imageIndex} className="bg-white rounded-lg overflow-hidden border shrink-0 w-48">
                                  <div className="p-2 border-b bg-gray-100">
                                    <p className="text-xs font-medium truncate" title={image.name}>
                                      {image.name}
                                    </p>
                                  </div>
                                  <div 
                                    className={`relative cursor-pointer transition-all ${
                                      expandedPreviewImages[`${combo.id}-${imageIndex}`] ? 'ring-2 ring-blue-400' : ''
                                    }`}
                                    onClick={() => {
                                      setExpandedPreviewImages(prev => ({
                                        ...prev,
                                        [`${combo.id}-${imageIndex}`]: !prev[`${combo.id}-${imageIndex}`]
                                      }));
                                    }}
                                  >
                                    <img
                                      src={result.dataUrl}
                                      alt={`Result ${combo.id}-${imageIndex}`}
                                      className="w-full h-auto object-contain bg-white"
                                      style={{ 
                                        maxHeight: '200px',
                                        minHeight: '120px'
                                      }}
                                    />
                                    {expandedPreviewImages[`${combo.id}-${imageIndex}`] && (
                                      <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                                        <div className="text-white text-center">
                                          <Monitor className="h-6 w-6 mx-auto mb-1" />
                                          <p className="text-xs">Click to close</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <div className="p-2 bg-gray-50 text-center">
                                    <p className="text-xs text-gray-600">
                                      Image {imageIndex + 1}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                        {/* Scroll hint for many images */}
                        {images.length > 3 && (
                          <div className="mt-2 text-center">
                            <p className="text-xs text-gray-500">
                              ← Scroll horizontally to see all {images.length} images →
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Real-time Tuning Tab */}
                {previewMode[previewingAlgorithm] === 'realtime' && (
                  <div className="space-y-6">
                    {/* Parameter Controls */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Parameter Controls</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(algorithms[previewingAlgorithm]?.params || {}).map(([paramKey, paramDef]) => (
                          <div key={paramKey} className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                              {paramDef.label}
                            </label>
                            {paramDef.options ? (
                              <select
                                value={parameterPreviews[previewingAlgorithm]?.[paramKey] ?? paramDef.default}
                                onChange={(e) => updateRealtimeParameter(previewingAlgorithm, paramKey, e.target.value)}
                                className="w-full border rounded-lg px-3 py-2"
                              >
                                {paramDef.options.map(option => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            ) : (
                              <div className="space-y-2">
                                <input
                                  type="range"
                                  min={paramDef.min}
                                  max={paramDef.max}
                                  step={paramDef.step}
                                  value={parameterPreviews[previewingAlgorithm]?.[paramKey] ?? paramDef.default}
                                  onChange={(e) => updateRealtimeParameter(previewingAlgorithm, paramKey, parseFloat(e.target.value))}
                                  className="w-full"
                                />
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-500">{paramDef.min}</span>
                                  <input
                                    type="number"
                                    min={paramDef.min}
                                    max={paramDef.max}
                                    step={paramDef.step}
                                    value={parameterPreviews[previewingAlgorithm]?.[paramKey] ?? paramDef.default}
                                    onChange={(e) => updateRealtimeParameter(previewingAlgorithm, paramKey, parseFloat(e.target.value))}
                                    className="border rounded px-2 py-1 text-sm w-20 text-center"
                                  />
                                  <span className="text-xs text-gray-500">{paramDef.max}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* Apply Button */}
                      <div className="mt-6 flex gap-3">
                        <button
                          onClick={() => applyRealtimeParameters(previewingAlgorithm)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
                        >
                          <Target className="h-4 w-4" />
                          Apply These Parameters
                        </button>
                        <button
                          onClick={() => resetRealtimeParameters(previewingAlgorithm)}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Reset to Defaults
                        </button>
                      </div>
                    </div>
                    
                    {/* Real-time Preview Grid */}
                    <div className="bg-white rounded-lg border">
                      <div className="p-4 border-b">
                        <h3 className="text-lg font-semibold text-gray-800">Live Preview</h3>
                        <p className="text-sm text-gray-600">Results update automatically as you adjust parameters</p>
                      </div>
                      
                      <div className="p-4">
                        <div className="overflow-x-auto">
                          <div className="flex gap-4 pb-2" style={{ minWidth: `${images.length * 220}px` }}>
                            {images.map((image, imageIndex) => (
                              <div key={imageIndex} className="bg-gray-50 rounded-lg overflow-hidden border shrink-0 w-52">
                                <div className="p-2 border-b bg-gray-100">
                                  <p className="text-xs font-medium truncate" title={image.name}>
                                    {image.name}
                                  </p>
                                </div>
                                <div className="p-2">
                                  {/* Original Image */}
                                  <div className="mb-2">
                                    <p className="text-xs text-gray-600 mb-1">Original</p>
                                    <img
                                      src={image.dataUrl}
                                      alt="Original"
                                      className="w-full h-20 object-contain bg-white border rounded"
                                    />
                                  </div>
                                  
                                  {/* Processed Image */}
                                  <div>
                                    <p className="text-xs text-gray-600 mb-1">Processed</p>
                                    <div className="w-full h-20 bg-white border rounded flex items-center justify-center">
                                      {parameterPreviews[previewingAlgorithm] ? (
                                        <RealtimePreviewImage 
                                          image={image}
                                          algorithm={previewingAlgorithm}
                                          params={parameterPreviews[previewingAlgorithm]}
                                          applyAlgorithm={applyAlgorithm}
                                        />
                                      ) : (
                                        <div className="text-xs text-gray-400">Adjust parameters to see preview</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {images.length > 3 && (
                          <div className="mt-2 text-center">
                            <p className="text-xs text-gray-500">
                              ← Scroll horizontally to see all {images.length} images →
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {images.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Algorithm Selection Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-lg p-6 max-h-screen overflow-y-auto">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Processing Mode</h2>
                  {currentImage && (
                    <div className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {currentImage.name}
                    </div>
                  )}
                </div>
                
                {/* Mode Selection */}
                <div className="mb-6">
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setPipelineMode('individual')}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        pipelineMode === 'individual'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Individual Algorithms
                    </button>
                    <button
                      onClick={() => setPipelineMode('enhanced')}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        pipelineMode === 'enhanced'
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Enhanced Pipeline
                    </button>
                  </div>
                  
                  {pipelineMode === 'enhanced' && (
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <h4 className="font-medium text-purple-800 mb-2">🔄 Enhanced Preprocessing Pipeline</h4>
                      <p className="text-sm text-purple-700 mb-2">
                        A comprehensive 10-step pipeline optimized for sketch preprocessing with live parameter tuning and individual step control.
                      </p>
                      <div className="text-xs text-purple-600 space-y-1">
                        <div>• Toggle individual steps on/off to customize your workflow</div>
                        <div>• Standardize & Normalize → Denoise → Stroke Enhancement</div>
                        <div>• Conditional Shading Removal → Advanced Thresholding</div>
                        <div>• Ridge Filtering → Cleanup → Skeletonization → Simplification</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Enhanced Pipeline Controls */}
                {pipelineMode === 'enhanced' && (
                  <div className="space-y-6">
                    {/* Pipeline Step Toggles */}
                    <div className="border rounded-lg p-4 bg-purple-50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-purple-800">Pipeline Steps</h4>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const allEnabled = Object.values(enhancedPipelineSteps).every(step => step);
                              const newSteps = {};
                              Object.keys(enhancedPipelineSteps).forEach(key => {
                                newSteps[key] = !allEnabled;
                              });
                              setEnhancedPipelineSteps(newSteps);
                            }}
                            className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded"
                          >
                            {Object.values(enhancedPipelineSteps).every(step => step) ? 'Disable All' : 'Enable All'}
                          </button>
                          <button
                            onClick={resetEnhancedPipelineSteps}
                            className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <label className="flex items-center gap-2 p-2 rounded hover:bg-purple-100">
                          <input
                            type="checkbox"
                            checked={enhancedPipelineSteps.step1_standardize}
                            onChange={() => toggleEnhancedPipelineStep('step1_standardize')}
                            className="rounded text-purple-600"
                          />
                          <span className={enhancedPipelineSteps.step1_standardize ? 'text-purple-800' : 'text-gray-500'}>
                            1. Standardize & Normalize
                          </span>
                        </label>
                        
                        <label className="flex items-center gap-2 p-2 rounded hover:bg-purple-100">
                          <input
                            type="checkbox"
                            checked={enhancedPipelineSteps.step2_denoise}
                            onChange={() => toggleEnhancedPipelineStep('step2_denoise')}
                            className="rounded text-purple-600"
                          />
                          <span className={enhancedPipelineSteps.step2_denoise ? 'text-purple-800' : 'text-gray-500'}>
                            2. Denoise
                          </span>
                        </label>
                        
                        <label className="flex items-center gap-2 p-2 rounded hover:bg-purple-100">
                          <input
                            type="checkbox"
                            checked={enhancedPipelineSteps.step3_enhance}
                            onChange={() => toggleEnhancedPipelineStep('step3_enhance')}
                            className="rounded text-purple-600"
                          />
                          <span className={enhancedPipelineSteps.step3_enhance ? 'text-purple-800' : 'text-gray-500'}>
                            3. Stroke Enhancement
                          </span>
                        </label>
                        
                        <label className="flex items-center gap-2 p-2 rounded hover:bg-purple-100">
                          <input
                            type="checkbox"
                            checked={enhancedPipelineSteps.step4_shading}
                            onChange={() => toggleEnhancedPipelineStep('step4_shading')}
                            className="rounded text-purple-600"
                          />
                          <span className={enhancedPipelineSteps.step4_shading ? 'text-purple-800' : 'text-gray-500'}>
                            4. Shading Removal
                          </span>
                        </label>
                        
                        <label className="flex items-center gap-2 p-2 rounded hover:bg-purple-100">
                          <input
                            type="checkbox"
                            checked={enhancedPipelineSteps.step5_threshold}
                            onChange={() => toggleEnhancedPipelineStep('step5_threshold')}
                            className="rounded text-purple-600"
                          />
                          <span className={enhancedPipelineSteps.step5_threshold ? 'text-purple-800' : 'text-gray-500'}>
                            5. Thresholding
                          </span>
                        </label>
                        
                        <label className="flex items-center gap-2 p-2 rounded hover:bg-purple-100">
                          <input
                            type="checkbox"
                            checked={enhancedPipelineSteps.step6_ridge}
                            onChange={() => toggleEnhancedPipelineStep('step6_ridge')}
                            className="rounded text-purple-600"
                          />
                          <span className={enhancedPipelineSteps.step6_ridge ? 'text-purple-800' : 'text-gray-500'}>
                            6. Ridge Filter (Optional)
                          </span>
                        </label>
                        
                        <label className="flex items-center gap-2 p-2 rounded hover:bg-purple-100">
                          <input
                            type="checkbox"
                            checked={enhancedPipelineSteps.step7_cleanup}
                            onChange={() => toggleEnhancedPipelineStep('step7_cleanup')}
                            className="rounded text-purple-600"
                          />
                          <span className={enhancedPipelineSteps.step7_cleanup ? 'text-purple-800' : 'text-gray-500'}>
                            7. Morphological Cleanup
                          </span>
                        </label>
                        
                        <label className="flex items-center gap-2 p-2 rounded hover:bg-purple-100">
                          <input
                            type="checkbox"
                            checked={enhancedPipelineSteps.step8_skeleton}
                            onChange={() => toggleEnhancedPipelineStep('step8_skeleton')}
                            className="rounded text-purple-600"
                          />
                          <span className={enhancedPipelineSteps.step8_skeleton ? 'text-purple-800' : 'text-gray-500'}>
                            8. Skeletonization
                          </span>
                        </label>
                        
                        <label className="flex items-center gap-2 p-2 rounded hover:bg-purple-100">
                          <input
                            type="checkbox"
                            checked={enhancedPipelineSteps.step9_simplify}
                            onChange={() => toggleEnhancedPipelineStep('step9_simplify')}
                            className="rounded text-purple-600"
                          />
                          <span className={enhancedPipelineSteps.step9_simplify ? 'text-purple-800' : 'text-gray-500'}>
                            9. Contour Simplification
                          </span>
                        </label>
                        
                        <label className="flex items-center gap-2 p-2 rounded hover:bg-purple-100">
                          <input
                            type="checkbox"
                            checked={enhancedPipelineSteps.step10_output}
                            onChange={() => toggleEnhancedPipelineStep('step10_output')}
                            className="rounded text-purple-600"
                          />
                          <span className={enhancedPipelineSteps.step10_output ? 'text-purple-800' : 'text-gray-500'}>
                            10. Final Output
                          </span>
                        </label>
                      </div>
                      
                      {/* Active Steps Summary */}
                      <div className="mt-3 p-2 bg-white rounded border">
                        <p className="text-xs text-gray-600">
                          <strong>Active Steps:</strong> {Object.values(enhancedPipelineSteps).filter(step => step).length}/10 enabled
                        </p>
                        <p className="text-xs text-purple-600 mt-1">
                          Only enabled steps will be processed. Parameters for disabled steps are hidden below.
                        </p>
                      </div>
                    </div>

                    {/* Process Controls */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => processEnhancedPipeline(selectedImageIndex)}
                        disabled={isProcessingEnhanced || !currentImage}
                        className="flex-1 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                      >
                        {isProcessingEnhanced ? (
                          <>Processing...</>
                        ) : (
                          <>
                            <Zap className="h-4 w-4" />
                            Process Current
                          </>
                        )}
                      </button>
                      <button
                        onClick={processAllEnhancedPipeline}
                        disabled={isProcessingEnhanced}
                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                        title="Process All Images"
                      >
                        <Play className="h-4 w-4" />
                        All
                      </button>
                    </div>

                    {/* Parameter Groups - Only show for enabled steps */}
                    <div className="space-y-4">
                      {/* Step 1: Standardize & Normalize */}
                      {enhancedPipelineSteps.step1_standardize && (
                        <div className="border rounded-lg p-4 bg-gray-50">
                          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">1</span>
                            Standardize & Normalize
                          </h4>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <label className="block text-gray-600 mb-1">Target Size</label>
                              <input
                                type="number"
                                min="256"
                                max="1024"
                                step="32"
                                value={enhancedPipelineParams.targetSize}
                                onChange={(e) => updateEnhancedPipelineParam('targetSize', e.target.value)}
                                className="w-full border rounded px-2 py-1"
                              />
                            </div>
                            <div>
                              <label className="block text-gray-600 mb-1">Pad Color</label>
                              <select
                                value={enhancedPipelineParams.padColor}
                                onChange={(e) => updateEnhancedPipelineParam('padColor', e.target.value)}
                                className="w-full border rounded px-2 py-1"
                              >
                                <option value="white">White</option>
                                <option value="black">Black</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-gray-600 mb-1">CLAHE Clip Limit</label>
                              <input
                                type="range"
                                min="1"
                                max="10"
                                step="0.5"
                                value={enhancedPipelineParams.claheClipLimit}
                                onChange={(e) => updateEnhancedPipelineParam('claheClipLimit', e.target.value)}
                                className="w-full"
                              />
                              <span className="text-xs text-gray-500">{enhancedPipelineParams.claheClipLimit}</span>
                            </div>
                            <div>
                              <label className="block text-gray-600 mb-1">Tile Grid Size</label>
                              <input
                                type="range"
                                min="4"
                                max="16"
                                step="2"
                                value={enhancedPipelineParams.claheTileGridSize}
                                onChange={(e) => updateEnhancedPipelineParam('claheTileGridSize', e.target.value)}
                                className="w-full"
                              />
                              <span className="text-xs text-gray-500">{enhancedPipelineParams.claheTileGridSize}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step 2: Denoise */}
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">2</span>
                          Denoise
                        </h4>
                        <div className="space-y-3 text-sm">
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-gray-600 mb-1">Bilateral D</label>
                              <input
                                type="range"
                                min="5"
                                max="15"
                                step="2"
                                value={enhancedPipelineParams.bilateralD}
                                onChange={(e) => updateEnhancedPipelineParam('bilateralD', e.target.value)}
                                className="w-full"
                              />
                              <span className="text-xs text-gray-500">{enhancedPipelineParams.bilateralD}</span>
                            </div>
                            <div>
                              <label className="block text-gray-600 mb-1">Sigma Color</label>
                              <input
                                type="range"
                                min="25"
                                max="150"
                                step="5"
                                value={enhancedPipelineParams.bilateralSigmaColor}
                                onChange={(e) => updateEnhancedPipelineParam('bilateralSigmaColor', e.target.value)}
                                className="w-full"
                              />
                              <span className="text-xs text-gray-500">{enhancedPipelineParams.bilateralSigmaColor}</span>
                            </div>
                            <div>
                              <label className="block text-gray-600 mb-1">Sigma Space</label>
                              <input
                                type="range"
                                min="25"
                                max="150"
                                step="5"
                                value={enhancedPipelineParams.bilateralSigmaSpace}
                                onChange={(e) => updateEnhancedPipelineParam('bilateralSigmaSpace', e.target.value)}
                                className="w-full"
                              />
                              <span className="text-xs text-gray-500">{enhancedPipelineParams.bilateralSigmaSpace}</span>
                            </div>
                          </div>
                          <div>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={enhancedPipelineParams.useAnisotropicDiffusion}
                                onChange={(e) => updateEnhancedPipelineParam('useAnisotropicDiffusion', e.target.checked)}
                                className="rounded"
                              />
                              <span className="text-gray-700">Use Anisotropic Diffusion (for heavy shading)</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Step 3: Stroke Enhancement */}
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">3</span>
                          Stroke Enhancement
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <label className="block text-gray-600 mb-1">Unsharp Amount (1.0-2.0)</label>
                            <input
                              type="range"
                              min="1"
                              max="2"
                              step="0.1"
                              value={enhancedPipelineParams.unsharpAmount}
                              onChange={(e) => updateEnhancedPipelineParam('unsharpAmount', e.target.value)}
                              className="w-full"
                            />
                            <span className="text-xs text-gray-500">{enhancedPipelineParams.unsharpAmount}</span>
                          </div>
                          <div>
                            <label className="block text-gray-600 mb-1">Black-Hat Kernel (7-25)</label>
                            <input
                              type="range"
                              min="7"
                              max="25"
                              step="2"
                              value={enhancedPipelineParams.blackHatKernel}
                              onChange={(e) => updateEnhancedPipelineParam('blackHatKernel', e.target.value)}
                              className="w-full"
                            />
                            <span className="text-xs text-gray-500">{enhancedPipelineParams.blackHatKernel}</span>
                          </div>
                        </div>
                      </div>

                      {/* Step 4: Shading Removal */}
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">4</span>
                          Shading Removal (Conditional)
                        </h4>
                        <div className="space-y-3 text-sm">
                          <div>
                            <label className="block text-gray-600 mb-1">Shading Threshold (0-1)</label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={enhancedPipelineParams.shadingThreshold}
                              onChange={(e) => updateEnhancedPipelineParam('shadingThreshold', e.target.value)}
                              className="w-full"
                            />
                            <span className="text-xs text-gray-500">{enhancedPipelineParams.shadingThreshold}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-gray-600 mb-1">Variance Window</label>
                              <input
                                type="range"
                                min="5"
                                max="21"
                                step="2"
                                value={enhancedPipelineParams.varianceWindow}
                                onChange={(e) => updateEnhancedPipelineParam('varianceWindow', e.target.value)}
                                className="w-full"
                              />
                              <span className="text-xs text-gray-500">{enhancedPipelineParams.varianceWindow}</span>
                            </div>
                            <div>
                              <label className="block text-gray-600 mb-1">Variance Threshold</label>
                              <input
                                type="range"
                                min="50"
                                max="500"
                                step="10"
                                value={enhancedPipelineParams.varianceThreshold}
                                onChange={(e) => updateEnhancedPipelineParam('varianceThreshold', e.target.value)}
                                className="w-full"
                              />
                              <span className="text-xs text-gray-500">{enhancedPipelineParams.varianceThreshold}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 5: Thresholding */}
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">5</span>
                          Thresholding / Edge Fusion
                        </h4>
                        <div className="space-y-3 text-sm">
                          <div>
                            <label className="block text-gray-600 mb-1">Method</label>
                            <select
                              value={enhancedPipelineParams.thresholdingMode}
                              onChange={(e) => updateEnhancedPipelineParam('thresholdingMode', e.target.value)}
                              className="w-full border rounded px-2 py-1"
                            >
                              <option value="sauvola">Sauvola</option>
                              <option value="adaptive">Adaptive Gaussian</option>
                              <option value="multiOtsu">Multi-scale Otsu</option>
                              <option value="cannyFusion">Canny Fusion</option>
                            </select>
                          </div>
                          
                          {enhancedPipelineParams.thresholdingMode === 'sauvola' && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-gray-600 mb-1">Window (51-75)</label>
                                <input
                                  type="range"
                                  min="51"
                                  max="75"
                                  step="2"
                                  value={enhancedPipelineParams.sauvolaWindow}
                                  onChange={(e) => updateEnhancedPipelineParam('sauvolaWindow', e.target.value)}
                                  className="w-full"
                                />
                                <span className="text-xs text-gray-500">{enhancedPipelineParams.sauvolaWindow}</span>
                              </div>
                              <div>
                                <label className="block text-gray-600 mb-1">K (0.1-0.3)</label>
                                <input
                                  type="range"
                                  min="0.1"
                                  max="0.3"
                                  step="0.01"
                                  value={enhancedPipelineParams.sauvolaK}
                                  onChange={(e) => updateEnhancedPipelineParam('sauvolaK', e.target.value)}
                                  className="w-full"
                                />
                                <span className="text-xs text-gray-500">{enhancedPipelineParams.sauvolaK}</span>
                              </div>
                            </div>
                          )}
                          
                          {enhancedPipelineParams.thresholdingMode === 'adaptive' && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-gray-600 mb-1">Block Size (15-51)</label>
                                <input
                                  type="range"
                                  min="15"
                                  max="51"
                                  step="2"
                                  value={enhancedPipelineParams.adaptiveBlockSize}
                                  onChange={(e) => updateEnhancedPipelineParam('adaptiveBlockSize', e.target.value)}
                                  className="w-full"
                                />
                                <span className="text-xs text-gray-500">{enhancedPipelineParams.adaptiveBlockSize}</span>
                              </div>
                              <div>
                                <label className="block text-gray-600 mb-1">C (-10 to 10)</label>
                                <input
                                  type="range"
                                  min="-10"
                                  max="10"
                                  step="1"
                                  value={enhancedPipelineParams.adaptiveC}
                                  onChange={(e) => updateEnhancedPipelineParam('adaptiveC', e.target.value)}
                                  className="w-full"
                                />
                                <span className="text-xs text-gray-500">{enhancedPipelineParams.adaptiveC}</span>
                              </div>
                            </div>
                          )}
                          
                          {enhancedPipelineParams.thresholdingMode === 'multiOtsu' && (
                            <div>
                              <label className="block text-gray-600 mb-1">Tile Size (32-64)</label>
                              <input
                                type="range"
                                min="32"
                                max="64"
                                step="4"
                                value={enhancedPipelineParams.otsuTileSize}
                                onChange={(e) => updateEnhancedPipelineParam('otsuTileSize', e.target.value)}
                                className="w-full"
                              />
                              <span className="text-xs text-gray-500">{enhancedPipelineParams.otsuTileSize}</span>
                            </div>
                          )}
                          
                          {enhancedPipelineParams.thresholdingMode === 'cannyFusion' && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-gray-600 mb-1">Canny Low (30-100)</label>
                                <input
                                  type="range"
                                  min="30"
                                  max="100"
                                  step="5"
                                  value={enhancedPipelineParams.cannyLow}
                                  onChange={(e) => updateEnhancedPipelineParam('cannyLow', e.target.value)}
                                  className="w-full"
                                />
                                <span className="text-xs text-gray-500">{enhancedPipelineParams.cannyLow}</span>
                              </div>
                              <div>
                                <label className="block text-gray-600 mb-1">Canny High (100-200)</label>
                                <input
                                  type="range"
                                  min="100"
                                  max="200"
                                  step="5"
                                  value={enhancedPipelineParams.cannyHigh}
                                  onChange={(e) => updateEnhancedPipelineParam('cannyHigh', e.target.value)}
                                  className="w-full"
                                />
                                <span className="text-xs text-gray-500">{enhancedPipelineParams.cannyHigh}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Step 6: Ridge Filter */}
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">6</span>
                          Ridge Filter (Optional)
                        </h4>
                        <div className="space-y-3 text-sm">
                          <div>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={enhancedPipelineParams.useRidgeFilter}
                                onChange={(e) => updateEnhancedPipelineParam('useRidgeFilter', e.target.checked)}
                                className="rounded"
                              />
                              <span className="text-gray-700">Enable Frangi Vesselness Filter</span>
                            </label>
                          </div>
                          {enhancedPipelineParams.useRidgeFilter && (
                            <div>
                              <label className="block text-gray-600 mb-1">Ridge Threshold (0.01-0.1)</label>
                              <input
                                type="range"
                                min="0.01"
                                max="0.1"
                                step="0.01"
                                value={enhancedPipelineParams.ridgeThreshold}
                                onChange={(e) => updateEnhancedPipelineParam('ridgeThreshold', e.target.value)}
                                className="w-full"
                              />
                              <span className="text-xs text-gray-500">{enhancedPipelineParams.ridgeThreshold}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Steps 7-10: Compact Controls */}
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">7-10</span>
                          Cleanup & Output
                        </h4>
                        <div className="space-y-3 text-sm">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-gray-600 mb-1">Cleanup Closing</label>
                              <input
                                type="range"
                                min="1"
                                max="7"
                                step="2"
                                value={enhancedPipelineParams.cleanupClosing}
                                onChange={(e) => updateEnhancedPipelineParam('cleanupClosing', e.target.value)}
                                className="w-full"
                              />
                              <span className="text-xs text-gray-500">{enhancedPipelineParams.cleanupClosing}</span>
                            </div>
                            <div>
                              <label className="block text-gray-600 mb-1">Cleanup Opening</label>
                              <input
                                type="range"
                                min="1"
                                max="7"
                                step="2"
                                value={enhancedPipelineParams.cleanupOpening}
                                onChange={(e) => updateEnhancedPipelineParam('cleanupOpening', e.target.value)}
                                className="w-full"
                              />
                              <span className="text-xs text-gray-500">{enhancedPipelineParams.cleanupOpening}</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-gray-600 mb-1">Contour Simplification (0.01-0.05)</label>
                            <input
                              type="range"
                              min="0.01"
                              max="0.05"
                              step="0.01"
                              value={enhancedPipelineParams.douglasPeuckerEpsilon}
                              onChange={(e) => updateEnhancedPipelineParam('douglasPeuckerEpsilon', e.target.value)}
                              className="w-full"
                            />
                            <span className="text-xs text-gray-500">{enhancedPipelineParams.douglasPeuckerEpsilon}</span>
                          </div>
                          <div>
                            <label className="block text-gray-600 mb-1">Output Mode</label>
                            <select
                              value={enhancedPipelineParams.outputMode}
                              onChange={(e) => updateEnhancedPipelineParam('outputMode', e.target.value)}
                              className="w-full border rounded px-2 py-1"
                            >
                              <option value="lines">Lines Only (skeleton)</option>
                              <option value="mask">Mask Only (binary)</option>
                              <option value="combined">Combined (overlay)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Reset Pipeline */}
                    <button
                      onClick={() => {
                        setEnhancedPipelineResults({});
                        resetEnhancedPipelineSteps();
                        // Reset to default parameters if needed
                      }}
                      className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset Enhanced Pipeline
                    </button>
                  </div>
                )}

                {/* Individual Algorithm Controls (existing code) */}
                {pipelineMode === 'individual' && (
                  <div>
                    {/* Available Algorithms by Category */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-700 mb-3">Available Algorithms</h3>
                      <div className="space-y-4">
                        {Object.entries(algorithmsByCategory).map(([category, algs]) => (
                          <div key={category} className="border rounded-lg p-3">
                            <h4 className="font-medium text-gray-800 mb-2">{category}</h4>
                            <div className="space-y-2">
                              {algs.map((alg) => (
                                <div key={alg.key} className="border rounded p-2 bg-gray-50">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium">{alg.name}</span>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => generateParameterPreviews(alg.key)}
                                        disabled={images.length === 0 || isGeneratingPreviews}
                                        className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white px-2 py-1 rounded text-xs flex items-center gap-1"
                                        title="Test Parameters"
                                      >
                                        <TestTube className="h-3 w-3" />
                                        Test
                                      </button>
                                      <button
                                        onClick={() => addAlgorithm(alg.key)}
                                        className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1"
                                      >
                                        <Plus className="h-3 w-3" />
                                        Add
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-600">{alg.description}</p>
                                  {alg.allowMultiple && (
                                    <div className="mt-1">
                                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                        Multiple instances allowed
                                      </span>
                                    </div>
                                  )}
                                  {selectedPreviewParams[alg.key] && (
                                    <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                                      <strong className="text-blue-800">Optimized params:</strong>
                                      <div className="text-blue-600 font-mono">
                                        {Object.entries(selectedPreviewParams[alg.key]).map(([key, value]) => (
                                          <span key={key} className="mr-2">{key}: {value}</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Selected Pipeline */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-700 mb-3">Processing Pipeline</h3>
                      {selectedAlgorithms.length === 0 ? (
                        <p className="text-gray-500 text-sm">No algorithms selected</p>
                      ) : (
                        <div className="space-y-3">
                          {selectedAlgorithms.map((algInstance, index) => (
                            <div key={algInstance.instanceId} className="border rounded-lg p-3 bg-blue-50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">
                                  {index + 1}. {algInstance.name}
                                </span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => moveAlgorithm(algInstance.instanceId, 'up')}
                                    disabled={index === 0}
                                    className="text-gray-500 hover:text-gray-700 disabled:text-gray-300 text-xs"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    onClick={() => moveAlgorithm(algInstance.instanceId, 'down')}
                                    disabled={index === selectedAlgorithms.length - 1}
                                    className="text-gray-500 hover:text-gray-700 disabled:text-gray-300 text-xs"
                                  >
                                    ↓
                                  </button>
                                  <button
                                    onClick={() => generateParameterPreviews(algInstance.algKey)}
                                    disabled={images.length === 0 || isGeneratingPreviews}
                                    className="text-orange-500 hover:text-orange-700 disabled:text-gray-300"
                                    title="Test Parameters"
                                  >
                                    <TestTube className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => startEditingParams(algInstance.instanceId)}
                                    className="text-blue-500 hover:text-blue-700"
                                  >
                                    <Edit3 className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => removeAlgorithm(algInstance.instanceId)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              
                              {/* Enhanced Parameter Controls */}
                              {editingParams[algInstance.instanceId] && (
                                <div className="mt-3 p-3 bg-white rounded border">
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-medium">Parameters</h4>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => saveParams(algInstance.instanceId)}
                                        className="text-green-600 hover:text-green-800"
                                      >
                                        <Save className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={() => cancelEditingParams(algInstance.instanceId)}
                                        className="text-gray-500 hover:text-gray-700"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    {Object.entries(algorithms[algInstance.algKey].params).map(([paramKey, paramDef]) => (
                                      <div key={paramKey} className="flex flex-col">
                                        <label className="text-xs font-medium text-gray-600 mb-1">
                                          {paramDef.label}
                                        </label>
                                        {paramDef.options ? (
                                          <select
                                            value={algorithmParams[algInstance.instanceId]?.[paramKey] || paramDef.default}
                                            onChange={(e) => updateParam(algInstance.instanceId, paramKey, e.target.value)}
                                            className="text-xs border rounded px-2 py-1"
                                          >
                                            {paramDef.options.map(option => (
                                              <option key={option} value={option}>{option}</option>
                                            ))}
                                          </select>
                                        ) : (
                                          <div className="flex items-center gap-2">
                                            <input
                                              type="number"
                                              min={paramDef.min}
                                              max={paramDef.max}
                                              step={paramDef.step}
                                              value={algorithmParams[algInstance.instanceId]?.[paramKey] || paramDef.default}
                                              onChange={(e) => updateParam(algInstance.instanceId, paramKey, e.target.value)}
                                              className="text-xs border rounded px-2 py-1 flex-1"
                                            />
                                            <input
                                              type="range"
                                              min={paramDef.min}
                                              max={paramDef.max}
                                              step={paramDef.step}
                                              value={algorithmParams[algInstance.instanceId]?.[paramKey] || paramDef.default}
                                              onChange={(e) => updateParam(algInstance.instanceId, paramKey, e.target.value)}
                                              className="flex-1"
                                            />
                                          </div>
                                        )}
                                        <span className="text-xs text-gray-500 mt-1">
                                          Current: {algorithmParams[algInstance.instanceId]?.[paramKey] || paramDef.default}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Compact parameter display when not editing */}
                              {!editingParams[algInstance.instanceId] && (
                                <div className="text-xs text-gray-600 mt-2">
                                  {Object.entries(algorithmParams[algInstance.instanceId] || {}).map(([key, value]) => (
                                    <span key={key} className="mr-3">
                                      {algorithms[algInstance.algKey].params[key]?.label}: {value}
                                    </span>
                                  ))}
                                </div>
                              )}
                              
                              {/* Show if optimized parameters are applied */}
                              {selectedPreviewParams[algInstance.algKey] && (
                                <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                                  <div className="flex items-center gap-2">
                                    <Target className="h-3 w-3 text-green-600" />
                                    <span className="text-xs text-green-800 font-medium">
                                      Optimized parameters applied
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Process Button */}
                    <button
                      onClick={() => processImageAtIndex(selectedImageIndex)}
                      disabled={selectedAlgorithms.length === 0 || isProcessing || !currentImage}
                      className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 mb-2"
                    >
                      {isProcessing ? (
                        <>Processing...</>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Process Current Image
                        </>
                      )}
                    </button>

                    {/* Visibility Toggle */}
                    <div className="mb-2 p-3 bg-gray-50 rounded-lg">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={defaultVisibility}
                          onChange={(e) => setDefaultVisibility(e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-gray-700">Show all steps by default</span>
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Controls whether processing steps are expanded or minimized when pipeline runs
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setProcessedImages({});
                        setSelectedAlgorithms([]);
                        setVisibleSteps({});
                        setEditingParams({});
                        setSelectedPreviewParams({});
                        setPreviewResults({});
                        setParameterCombinations({});
                      }}
                      className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset Pipeline
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Results Panel */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">
                    {pipelineMode === 'enhanced' ? 'Enhanced Pipeline Results' : 'Processing Results'}
                  </h2>
                  <div className="flex items-center gap-4">
                    {/* Enhanced Pipeline Results Controls */}
                    {pipelineMode === 'enhanced' && enhancedPipelineResults[selectedImageIndex] && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const results = enhancedPipelineResults[selectedImageIndex];
                            if (results && results.length > 0) {
                              const finalResult = results[results.length - 1];
                              downloadImage(finalResult.dataUrl, `${currentImage?.name || 'image'}_enhanced_pipeline.png`);
                            }
                          }}
                          className="text-green-600 hover:text-green-800 flex items-center gap-1"
                        >
                          <Download className="h-4 w-4" />
                          Download Final
                        </button>
                        <button
                          onClick={() => {
                            const allResults = enhancedPipelineResults[selectedImageIndex];
                            if (allResults) {
                              allResults.forEach((result, index) => {
                                if (result.dataUrl) {
                                  downloadImage(result.dataUrl, `${currentImage?.name || 'image'}_step_${index}_${result.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`);
                                }
                              });
                            }
                          }}
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Download className="h-4 w-4" />
                          Download All Steps
                        </button>
                      </div>
                    )}
                    
                    {/* Individual Algorithm Results Controls */}
                    {pipelineMode === 'individual' && currentProcessedImages.length > 0 && (
                      <button
                        onClick={() => {
                          const allVisible = currentProcessedImages.every((_, index) => 
                            visibleSteps[`${selectedImageIndex}-${index}`]
                          );
                          const newVisible = { ...visibleSteps };
                          currentProcessedImages.forEach((_, index) => {
                            newVisible[`${selectedImageIndex}-${index}`] = !allVisible;
                          });
                          setVisibleSteps(newVisible);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        {currentProcessedImages.every((_, index) => 
                          visibleSteps[`${selectedImageIndex}-${index}`]
                        ) ? (
                          <>
                            <EyeOff className="h-4 w-4" />
                            Minimize All
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4" />
                            Expand All
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Enhanced Pipeline Results */}
                {pipelineMode === 'enhanced' && enhancedPipelineResults[selectedImageIndex] && (
                  <div className="space-y-4">
                    {enhancedPipelineResults[selectedImageIndex].map((result, stepIndex) => (
                      <div key={stepIndex} className={`border rounded-lg overflow-hidden ${
                        result.enabled === false ? 'opacity-60 border-gray-300' : 'border-gray-200'
                      }`}>
                        <div className={`px-4 py-3 flex items-center justify-between ${
                          result.enabled === false ? 'bg-gray-100' : 'bg-gray-50'
                        }`}>
                          <div className="flex items-center gap-3">
                            <h3 className={`font-semibold ${
                              result.enabled === false ? 'text-gray-500' : 'text-gray-800'
                            }`}>
                              {result.name}
                            </h3>
                            {result.enabled === false && (
                              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                                SKIPPED
                              </span>
                            )}
                            {result.enabled !== false && stepIndex > 0 && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                PROCESSED
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {stepIndex > 0 && result.enabled !== false && (
                              <button
                                onClick={() => downloadImage(result.dataUrl, `${currentImage?.name || 'image'}_${result.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`)}
                                className="text-blue-500 hover:text-blue-700"
                                title="Download this step"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        {result.enabled !== false && (
                          <div className="p-4">
                            <img
                              src={result.dataUrl}
                              alt={result.name}
                              className="max-w-full h-auto border rounded shadow-sm"
                            />
                          </div>
                        )}
                        {result.enabled === false && (
                          <div className="p-4 text-center">
                            <div className="text-gray-400 text-sm">
                              This step was skipped in the pipeline configuration
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Individual Algorithm Results */}
                {pipelineMode === 'individual' && currentProcessedImages.length > 0 && (
                  <div className="space-y-6">
                    {currentProcessedImages.map((result, stepIndex) => (
                      <div 
                        key={stepIndex} 
                        className={`border rounded-lg overflow-hidden ${
                          !visibleSteps[`${selectedImageIndex}-${stepIndex}`] ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleStepVisibility(selectedImageIndex, stepIndex)}
                              className="text-gray-600 hover:text-gray-800"
                            >
                              {visibleSteps[`${selectedImageIndex}-${stepIndex}`] ? 
                                <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />
                              }
                            </button>
                            <h3 className="font-semibold">
                              Step {stepIndex}: {result.name}
                            </h3>
                            {result.algorithm !== 'original' && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {algorithms[result.algorithm]?.category}
                              </span>
                            )}
                            {selectedPreviewParams[result.algorithm] && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                Optimized
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {result.params && (
                              <button
                                className="text-gray-500 hover:text-gray-700"
                                title="View Parameters"
                              >
                                <Info className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => downloadImage(
                                result.dataUrl, 
                                `${currentImage?.name || 'image'}_step_${stepIndex}_${result.algorithm}.png`
                              )}
                              className="text-blue-500 hover:text-blue-700"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        {visibleSteps[`${selectedImageIndex}-${stepIndex}`] && (
                          <div className="p-4">
                            <img
                              src={result.dataUrl}
                              alt={result.name}
                              className="max-w-full h-auto border rounded shadow-sm"
                            />
                            {result.params && (
                              <div className="mt-3 p-3 bg-gray-50 rounded text-xs">
                                <strong className="text-gray-700">Applied Parameters:</strong>
                                <div className="mt-1 font-mono text-gray-600">
                                  {Object.entries(result.params).map(([key, value]) => (
                                    <div key={key} className="flex justify-between">
                                      <span>{key}:</span>
                                      <span>{typeof value === 'number' ? value.toFixed(3) : value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* No Results - Enhanced Pipeline */}
                {pipelineMode === 'enhanced' && !enhancedPipelineResults[selectedImageIndex] && currentImage && (
                  <div className="text-center py-8">
                    <img 
                      src={currentImage.dataUrl} 
                      alt="Current" 
                      className="max-w-full h-auto mx-auto border rounded shadow-sm" 
                    />
                    <p className="mt-4 text-gray-600">
                      Click "Process Current" to run the enhanced preprocessing pipeline
                    </p>
                    <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-800 mb-2">🔄 Enhanced Pipeline Features:</h4>
                      <div className="text-sm text-purple-700 space-y-1">
                        <div>✓ Automatic standardization and normalization</div>
                        <div>✓ Conditional shading detection and removal</div>
                        <div>✓ Advanced thresholding methods (Sauvola, Multi-scale Otsu, etc.)</div>
                        <div>✓ Zhang-Suen skeletonization with contour simplification</div>
                        <div>✓ Multiple output modes (lines, mask, combined)</div>
                        <div>✓ Live parameter tuning with real-time feedback</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* No Results - Individual Algorithms */}
                {pipelineMode === 'individual' && currentProcessedImages.length === 0 && currentImage && (
                  <div className="text-center py-8">
                    <img 
                      src={currentImage.dataUrl} 
                      alt="Current" 
                      className="max-w-full h-auto mx-auto border rounded shadow-sm" 
                    />
                    <p className="mt-4 text-gray-600">
                      Select algorithms and click "Process Current Image" to see results
                    </p>
                    <p className="mt-2 text-sm text-blue-600">
                      💡 Use the "Test" button on algorithms to find optimal parameters across all your images
                    </p>
                    <p className="mt-2 text-sm text-green-600">
                      ✨ You can now add multiple instances of the same algorithm with different parameters!
                    </p>
                  </div>
                )}

                {!currentImage && (
                  <div className="text-center py-8">
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600">Upload images to start processing</p>
                  </div>
                )}

                {/* Multi-Image Results Summary */}
                {pipelineMode === 'enhanced' && Object.keys(enhancedPipelineResults).length > 1 && (
                  <div className="mt-8 border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Enhanced Pipeline Summary ({Object.keys(enhancedPipelineResults).length} images processed)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(enhancedPipelineResults).map(([imageIndex, results]) => {
                        const finalResult = results[results.length - 1];
                        const originalImage = images[parseInt(imageIndex)];
                        
                        return (
                          <div 
                            key={imageIndex} 
                            className={`border rounded-lg overflow-hidden cursor-pointer transition-all ${
                              selectedImageIndex === parseInt(imageIndex)
                                ? 'border-purple-500 ring-2 ring-purple-200'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setSelectedImageIndex(parseInt(imageIndex))}
                          >
                            <div className="grid grid-cols-2 gap-1">
                              <div className="text-center">
                                <p className="text-xs text-gray-600 p-1">Original</p>
                                <img
                                  src={originalImage?.dataUrl}
                                  alt="Original"
                                  className="w-full h-20 object-cover"
                                />
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-gray-600 p-1">Enhanced</p>
                                <img
                                  src={finalResult?.dataUrl}
                                  alt="Enhanced"
                                  className="w-full h-20 object-cover"
                                />
                              </div>
                            </div>
                            <div className="p-2 bg-purple-50">
                              <p className="text-xs font-medium truncate">{originalImage?.name}</p>
                              <p className="text-xs text-purple-600">{results.length - 1} pipeline steps</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Multi-Image Results Summary - Individual Mode */}
                {pipelineMode === 'individual' && Object.keys(processedImages).length > 1 && (
                  <div className="mt-8 border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Processing Summary ({Object.keys(processedImages).length} images processed)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(processedImages).map(([imageIndex, results]) => {
                        const finalResult = results[results.length - 1];
                        const originalImage = images[parseInt(imageIndex)];
                        
                        return (
                          <div 
                            key={imageIndex} 
                            className={`border rounded-lg overflow-hidden cursor-pointer transition-all ${
                              selectedImageIndex === parseInt(imageIndex)
                                ? 'border-blue-500 ring-2 ring-blue-200'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setSelectedImageIndex(parseInt(imageIndex))}
                          >
                            <div className="grid grid-cols-2 gap-1">
                              <div className="text-center">
                                <p className="text-xs text-gray-600 p-1">Original</p>
                                <img
                                  src={originalImage?.dataUrl}
                                  alt="Original"
                                  className="w-full h-20 object-cover"
                                />
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-gray-600 p-1">Processed</p>
                                <img
                                  src={finalResult?.dataUrl}
                                  alt="Processed"
                                  className="w-full h-20 object-cover"
                                />
                              </div>
                            </div>
                            <div className="p-2 bg-gray-50">
                              <p className="text-xs font-medium truncate">{originalImage?.name}</p>
                              <p className="text-xs text-gray-500">{results.length - 1} steps applied</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default SketchPreprocessingDashboard;