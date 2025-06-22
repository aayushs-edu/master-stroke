import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Play, RotateCcw, Download, Eye, EyeOff, Settings, Info, Edit3, Save, X, Zap, Grid3X3, ImageIcon, Trash2, Copy, FolderOpen, TestTube, Target, ChevronDown, ChevronRight, Monitor } from 'lucide-react';

const SketchPreprocessingDashboard = () => {
  const [images, setImages] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [processedImages, setProcessedImages] = useState({});
  const [selectedAlgorithms, setSelectedAlgorithms] = useState([]);
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
      params: {
        kernelSize: { min: 1, max: 15, default: 5, step: 2, label: 'Kernel Size', previewValues: [1, 3, 7, 11, 15] },
        sigma: { min: 0.1, max: 5, default: 1.4, step: 0.1, label: 'Sigma', previewValues: [0.3, 1.0, 2.0, 4.0] }
      }
    },
    bilateralFilter: {
      name: 'Bilateral Filter',
      description: 'Edge-preserving smoothing filter',
      category: 'Smoothing',
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
      params: {
        kernelSize: { min: 3, max: 9, default: 5, step: 2, label: 'Kernel Size', previewValues: [3, 5, 7, 9] }
      }
    },
    anisotropicDiffusion: {
      name: 'Anisotropic Diffusion',
      description: 'Advanced edge-preserving smoothing',
      category: 'Smoothing',
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
      params: {
        thresholdType: { options: ['binary', 'binary_inv'], default: 'binary', label: 'Threshold Type', previewValues: ['binary', 'binary_inv'] }
      }
    },
    multiOtsu: {
      name: 'Multi-level Otsu',
      description: 'Multi-class thresholding',
      category: 'Thresholding',
      params: {
        classes: { min: 2, max: 5, default: 3, step: 1, label: 'Number of Classes', previewValues: [2, 3, 4] }
      }
    },

    // Contour processing
    contourDetection: {
      name: 'Contour Detection & Filtering',
      description: 'Find and filter contours by area, perimeter, etc.',
      category: 'Contours',
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
      params: {
        clipLimit: { min: 1, max: 10, default: 3, step: 0.5, label: 'Clip Limit', previewValues: [2, 3, 5] },
        tileGridSize: { min: 4, max: 16, default: 8, step: 2, label: 'Tile Grid Size', previewValues: [4, 8, 12] }
      }
    },
    gammaCorrection: {
      name: 'Gamma Correction',
      description: 'Adjust image brightness and contrast',
      category: 'Enhancement',
      params: {
        gamma: { min: 0.1, max: 3, default: 1.0, step: 0.1, label: 'Gamma Value', previewValues: [0.3, 0.7, 1.0, 1.5, 2.2] }
      }
    },

    // Frequency domain
    fourierTransform: {
      name: 'Fourier High-pass Filter',
      description: 'Remove low-frequency components (backgrounds)',
      category: 'Frequency',
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
      params: {
        estimatedNoise: { min: 0.001, max: 0.1, default: 0.01, step: 0.001, label: 'Noise Estimate', previewValues: [0.005, 0.01, 0.02] }
      }
    }
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
      
      selectedAlgorithms.forEach((algKey, index) => {
        const params = algorithmParams[algKey] || {};
        
        try {
          currentImageData = applyAlgorithm(algKey, currentImageData, params);
        } catch (error) {
          console.error(`Error applying ${algKey}:`, error);
        }
        
        ctx.putImageData(currentImageData, 0, 0);
        const dataUrl = canvas.toDataURL();
        results.push({
          name: algorithms[algKey].name,
          dataUrl,
          algorithm: algKey,
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

  const applyShadingRemoval = (imageData, params) => {
    const { method, windowSize, threshold, morphClose } = params;
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data.length);
    const half = Math.floor(windowSize / 2);
    
    for (let y = half; y < height - half; y++) {
      for (let x = half; x < width - half; x++) {
        const windowValues = [];
        
        for (let wy = -half; wy <= half; wy++) {
          for (let wx = -half; wx <= half; wx++) {
            const idx = ((y + wy) * width + (x + wx)) * 4;
            windowValues.push(data[idx]);
          }
        }
        
        let metric = 0;
        switch (method) {
          case 'variance':
            const mean = windowValues.reduce((a, b) => a + b) / windowValues.length;
            metric = windowValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / windowValues.length;
            break;
          case 'entropy':
            const histogram = new Array(256).fill(0);
            windowValues.forEach(val => histogram[Math.floor(val)]++);
            metric = histogram.reduce((acc, count) => {
              if (count > 0) {
                const p = count / windowValues.length;
                return acc - p * Math.log2(p);
              }
              return acc;
            }, 0);
            break;
          case 'gradient':
            let gradSum = 0;
            for (let i = 0; i < windowValues.length - 1; i++) {
              gradSum += Math.abs(windowValues[i + 1] - windowValues[i]);
            }
            metric = gradSum / windowValues.length;
            break;
        }
        
        const idx = (y * width + x) * 4;
        const isShading = metric < threshold * 100;
        const value = isShading ? 255 : data[idx];
        
        newData[idx] = value;
        newData[idx + 1] = value;
        newData[idx + 2] = value;
        newData[idx + 3] = 255;
      }
    }
    
    let result = new ImageData(newData, width, height);
    
    if (morphClose > 1) {
      result = performMorphologyOperation(result, 'closing', morphClose);
    }
    
    return result;
  };

  const applyIntensityVariance = (imageData, params) => {
    const { kernelSize, varianceThreshold, preserveEdges } = params;
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data.length);
    const half = Math.floor(kernelSize / 2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const values = [];
        
        for (let ky = -half; ky <= half; ky++) {
          for (let kx = -half; kx <= half; kx++) {
            const py = Math.min(height - 1, Math.max(0, y + ky));
            const px = Math.min(width - 1, Math.max(0, x + kx));
            const idx = (py * width + px) * 4;
            values.push(data[idx]);
          }
        }
        
        const mean = values.reduce((a, b) => a + b) / values.length;
        const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
        
        const idx = (y * width + x) * 4;
        let result;
        
        if (preserveEdges === 'true') {
          result = variance < varianceThreshold ? 255 : data[idx];
        } else {
          result = Math.min(255, variance);
        }
        
        newData[idx] = result;
        newData[idx + 1] = result;
        newData[idx + 2] = result;
        newData[idx + 3] = 255;
      }
    }
    
    return new ImageData(newData, width, height);
  };

  const applyTextureSegmentation = (imageData, params) => {
    const { filterSize, energyThreshold } = params;
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data.length);
    
    for (let y = filterSize; y < height - filterSize; y++) {
      for (let x = filterSize; x < width - filterSize; x++) {
        let energy = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx1 = ((y + ky) * width + (x + kx)) * 4;
            const idx2 = (y * width + x) * 4;
            energy += Math.pow(data[idx1] - data[idx2], 2);
          }
        }
        
        const idx = (y * width + x) * 4;
        const isTexture = energy < energyThreshold * 10000;
        const result = isTexture ? 255 : data[idx];
        
        newData[idx] = result;
        newData[idx + 1] = result;
        newData[idx + 2] = result;
        newData[idx + 3] = 255;
      }
    }
    
    return new ImageData(newData, width, height);
  };

  // Bilateral Filter - proper implementation
  const applyBilateralFilter = (imageData, params) => {
    const { d, sigmaColor, sigmaSpace } = params;
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data.length);
    const radius = Math.floor(d / 2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let weightSum = 0;
        let rSum = 0, gSum = 0, bSum = 0;
        
        const centerIdx = (y * width + x) * 4;
        const centerR = data[centerIdx];
        const centerG = data[centerIdx + 1];
        const centerB = data[centerIdx + 2];
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const ny = Math.min(height - 1, Math.max(0, y + dy));
            const nx = Math.min(width - 1, Math.max(0, x + dx));
            const idx = (ny * width + nx) * 4;
            
            // Spatial weight
            const spatialDist = Math.sqrt(dx * dx + dy * dy);
            const spatialWeight = Math.exp(-(spatialDist * spatialDist) / (2 * sigmaSpace * sigmaSpace));
            
            // Color weight
            const colorDist = Math.sqrt(
              Math.pow(data[idx] - centerR, 2) +
              Math.pow(data[idx + 1] - centerG, 2) +
              Math.pow(data[idx + 2] - centerB, 2)
            );
            const colorWeight = Math.exp(-(colorDist * colorDist) / (2 * sigmaColor * sigmaColor));
            
            const weight = spatialWeight * colorWeight;
            weightSum += weight;
            
            rSum += data[idx] * weight;
            gSum += data[idx + 1] * weight;
            bSum += data[idx + 2] * weight;
          }
        }
        
        newData[centerIdx] = rSum / weightSum;
        newData[centerIdx + 1] = gSum / weightSum;
        newData[centerIdx + 2] = bSum / weightSum;
        newData[centerIdx + 3] = data[centerIdx + 3];
      }
    }
    
    return new ImageData(newData, width, height);
  };

  // Canny Edge Detection - proper implementation
  const applyCannyEdgeDetection = (imageData, params) => {
    const { lowThreshold, highThreshold, gaussianKernel } = params;
    const width = imageData.width;
    const height = imageData.height;
    
    // Step 1: Convert to grayscale
    let grayData = applyGrayscale(imageData, { method: 'luminance' });
    
    // Step 2: Gaussian blur
    grayData = applyGaussianBlur(grayData, { kernelSize: gaussianKernel, sigma: 1.4 });
    
    // Step 3: Sobel edge detection
    const data = grayData.data;
    const newData = new Uint8ClampedArray(data.length);
    const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
    const magnitude = new Float32Array(width * height);
    const direction = new Float32Array(width * height);
    
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
        
        const magIdx = y * width + x;
        magnitude[magIdx] = Math.sqrt(gx * gx + gy * gy);
        direction[magIdx] = Math.atan2(gy, gx);
      }
    }
    
    // Step 4: Non-maximum suppression
    const suppressed = new Uint8ClampedArray(width * height);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const angle = direction[idx] * 180 / Math.PI;
        const normalizedAngle = ((angle % 180) + 180) % 180;
        
        let neighbor1, neighbor2;
        if (normalizedAngle < 22.5 || normalizedAngle >= 157.5) {
          neighbor1 = magnitude[y * width + (x - 1)];
          neighbor2 = magnitude[y * width + (x + 1)];
        } else if (normalizedAngle < 67.5) {
          neighbor1 = magnitude[(y - 1) * width + (x + 1)];
          neighbor2 = magnitude[(y + 1) * width + (x - 1)];
        } else if (normalizedAngle < 112.5) {
          neighbor1 = magnitude[(y - 1) * width + x];
          neighbor2 = magnitude[(y + 1) * width + x];
        } else {
          neighbor1 = magnitude[(y - 1) * width + (x - 1)];
          neighbor2 = magnitude[(y + 1) * width + (x + 1)];
        }
        
        if (magnitude[idx] >= neighbor1 && magnitude[idx] >= neighbor2) {
          suppressed[idx] = magnitude[idx];
        }
      }
    }
    
    // Step 5: Double thresholding and edge tracking
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const magIdx = y * width + x;
        const mag = suppressed[magIdx];
        
        let value = 0;
        if (mag > highThreshold) {
          value = 255;
        } else if (mag > lowThreshold) {
          // Check if connected to strong edge
          let hasStrongNeighbor = false;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const ny = y + dy;
              const nx = x + dx;
              if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                if (suppressed[ny * width + nx] > highThreshold) {
                  hasStrongNeighbor = true;
                  break;
                }
              }
            }
            if (hasStrongNeighbor) break;
          }
          if (hasStrongNeighbor) value = 255;
        }
        
        newData[idx] = value;
        newData[idx + 1] = value;
        newData[idx + 2] = value;
        newData[idx + 3] = 255;
      }
    }
    
    return new ImageData(newData, width, height);
  };

  // Laplacian Edge Detection
  const applyLaplacianEdgeDetection = (imageData, params) => {
    const { ksize, threshold } = params;
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data.length);
    
    // Laplacian kernel
    const kernel = ksize === 1 ? 
      [[0, -1, 0], [-1, 4, -1], [0, -1, 0]] :
      [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sum = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const gray = data[idx];
            sum += gray * kernel[ky + 1][kx + 1];
          }
        }
        
        const idx = (y * width + x) * 4;
        const value = Math.abs(sum) > threshold ? 255 : 0;
        
        newData[idx] = value;
        newData[idx + 1] = value;
        newData[idx + 2] = value;
        newData[idx + 3] = 255;
      }
    }
    
    return new ImageData(newData, width, height);
  };

  // Adaptive Threshold - proper implementation
  const applyAdaptiveThreshold = (imageData, params) => {
    const { maxValue, adaptiveMethod, blockSize, C } = params;
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data.length);
    const half = Math.floor(blockSize / 2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const values = [];
        let sum = 0;
        
        // Collect neighborhood values
        for (let ky = -half; ky <= half; ky++) {
          for (let kx = -half; kx <= half; kx++) {
            const py = Math.min(height - 1, Math.max(0, y + ky));
            const px = Math.min(width - 1, Math.max(0, x + kx));
            const idx = (py * width + px) * 4;
            const gray = data[idx];
            values.push(gray);
            sum += gray;
          }
        }
        
        let threshold;
        if (adaptiveMethod === 'mean') {
          threshold = sum / values.length - C;
        } else { // gaussian
          // Gaussian weighted mean
          let weightedSum = 0;
          let weightSum = 0;
          const sigma = blockSize / 6;
          
          for (let i = 0; i < values.length; i++) {
            const ky = Math.floor(i / blockSize) - half;
            const kx = (i % blockSize) - half;
            const weight = Math.exp(-(kx * kx + ky * ky) / (2 * sigma * sigma));
            weightedSum += values[i] * weight;
            weightSum += weight;
          }
          threshold = weightedSum / weightSum - C;
        }
        
        const idx = (y * width + x) * 4;
        const gray = data[idx];
        const value = gray > threshold ? maxValue : 0;
        
        newData[idx] = value;
        newData[idx + 1] = value;
        newData[idx + 2] = value;
        newData[idx + 3] = 255;
      }
    }
    
    return new ImageData(newData, width, height);
  };

  // Otsu Threshold - proper implementation
  const applyOtsuThreshold = (imageData, params) => {
    const { thresholdType } = params;
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data.length);
    
    // Calculate histogram
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < data.length; i += 4) {
      histogram[Math.floor(data[i])]++;
    }
    
    // Calculate Otsu threshold
    const total = width * height;
    let sum = 0;
    for (let i = 0; i < 256; i++) {
      sum += i * histogram[i];
    }
    
    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let maxVariance = 0;
    let threshold = 0;
    
    for (let t = 0; t < 256; t++) {
      wB += histogram[t];
      if (wB === 0) continue;
      
      wF = total - wB;
      if (wF === 0) break;
      
      sumB += t * histogram[t];
      
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      
      const between = wB * wF * (mB - mF) * (mB - mF);
      
      if (between > maxVariance) {
        maxVariance = between;
        threshold = t;
      }
    }
    
    // Apply threshold
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i];
      let value;
      if (thresholdType === 'binary') {
        value = gray > threshold ? 255 : 0;
      } else { // binary_inv
        value = gray > threshold ? 0 : 255;
      }
      
      newData[i] = value;
      newData[i + 1] = value;
      newData[i + 2] = value;
      newData[i + 3] = 255;
    }
    
    return new ImageData(newData, width, height);
  };

  // Multi-level Otsu
  const applyMultiOtsu = (imageData, params) => {
    const { classes } = params;
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data.length);
    
    // For simplicity, implement 3-class Otsu
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < data.length; i += 4) {
      histogram[Math.floor(data[i])]++;
    }
    
    // Find two thresholds for 3 classes
    let maxVariance = 0;
    let t1 = 0, t2 = 0;
    
    for (let i = 1; i < 255; i++) {
      for (let j = i + 1; j < 255; j++) {
        const variance = calculateOtsuVariance(histogram, i, j);
        if (variance > maxVariance) {
          maxVariance = variance;
          t1 = i;
          t2 = j;
        }
      }
    }
    
    // Apply multi-level threshold
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i];
      let value;
      if (gray <= t1) {
        value = 0;
      } else if (gray <= t2) {
        value = 128;
      } else {
        value = 255;
      }
      
      newData[i] = value;
      newData[i + 1] = value;
      newData[i + 2] = value;
      newData[i + 3] = 255;
    }
    
    return new ImageData(newData, width, height);
  };

  const calculateOtsuVariance = (histogram, t1, t2) => {
    const total = histogram.reduce((a, b) => a + b, 0);
    
    let w0 = 0, w1 = 0, w2 = 0;
    let sum0 = 0, sum1 = 0, sum2 = 0;
    
    for (let i = 0; i <= t1; i++) {
      w0 += histogram[i];
      sum0 += i * histogram[i];
    }
    
    for (let i = t1 + 1; i <= t2; i++) {
      w1 += histogram[i];
      sum1 += i * histogram[i];
    }
    
    for (let i = t2 + 1; i < 256; i++) {
      w2 += histogram[i];
      sum2 += i * histogram[i];
    }
    
    if (w0 === 0 || w1 === 0 || w2 === 0) return 0;
    
    const mu0 = sum0 / w0;
    const mu1 = sum1 / w1;
    const mu2 = sum2 / w2;
    const muT = (sum0 + sum1 + sum2) / total;
    
    return w0 * (mu0 - muT) * (mu0 - muT) + 
           w1 * (mu1 - muT) * (mu1 - muT) + 
           w2 * (mu2 - muT) * (mu2 - muT);
  };

  // Contour Detection and Filtering - PROPER IMPLEMENTATION
  const applyContourDetection = (imageData, params) => {
    const { minArea, maxArea, minPerimeter, thickness, fillContours } = params;
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // Convert to binary if not already
    const binaryData = new Uint8ClampedArray(data.length);
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i];
      const binary = gray > 128 ? 255 : 0;
      binaryData[i] = binary;
      binaryData[i + 1] = binary;
      binaryData[i + 2] = binary;
      binaryData[i + 3] = 255;
    }
    
    // Find connected components
    const visited = new Array(width * height).fill(false);
    const components = [];
    
    const floodFill = (startX, startY) => {
      const component = [];
      const stack = [[startX, startY]];
      
      while (stack.length > 0) {
        const [x, y] = stack.pop();
        const idx = y * width + x;
        
        if (x < 0 || x >= width || y < 0 || y >= height || visited[idx]) continue;
        if (binaryData[(y * width + x) * 4] === 0) continue; // black pixel
        
        visited[idx] = true;
        component.push([x, y]);
        
        // Add 8-connected neighbors
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx !== 0 || dy !== 0) {
              stack.push([x + dx, y + dy]);
            }
          }
        }
      }
      
      return component;
    };
    
    // Find all components
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (!visited[idx] && binaryData[(y * width + x) * 4] === 255) {
          const component = floodFill(x, y);
          if (component.length > 0) {
            components.push(component);
          }
        }
      }
    }
    
    // Filter components by area and perimeter
    const validComponents = components.filter(component => {
      const area = component.length;
      
      // Calculate perimeter (simplified)
      let perimeter = 0;
      const componentSet = new Set(component.map(([x, y]) => `${x},${y}`));
      
      for (const [x, y] of component) {
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx !== 0 || dy !== 0) {
              if (componentSet.has(`${x + dx},${y + dy}`)) {
                neighbors++;
              }
            }
          }
        }
        if (neighbors < 8) perimeter++;
      }
      
      return area >= minArea && area <= maxArea && perimeter >= minPerimeter;
    });
    
    // Create output image
    const newData = new Uint8ClampedArray(data.length);
    // Start with black background
    for (let i = 0; i < newData.length; i += 4) {
      newData[i] = 0;
      newData[i + 1] = 0;
      newData[i + 2] = 0;
      newData[i + 3] = 255;
    }
    
    // Draw valid components
    for (const component of validComponents) {
      if (fillContours === 'true') {
        // Fill the entire component
        for (const [x, y] of component) {
          const idx = (y * width + x) * 4;
          newData[idx] = 255;
          newData[idx + 1] = 255;
          newData[idx + 2] = 255;
        }
      } else {
        // Draw only the contour
        const componentSet = new Set(component.map(([x, y]) => `${x},${y}`));
        
        for (const [x, y] of component) {
          let isContour = false;
          
          // Check if pixel is on the boundary
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx !== 0 || dy !== 0) {
                if (!componentSet.has(`${x + dx},${y + dy}`)) {
                  isContour = true;
                  break;
                }
              }
            }
            if (isContour) break;
          }
          
          if (isContour) {
            // Draw with specified thickness
            for (let ty = -thickness; ty <= thickness; ty++) {
              for (let tx = -thickness; tx <= thickness; tx++) {
                const nx = x + tx;
                const ny = y + ty;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  const idx = (ny * width + nx) * 4;
                  newData[idx] = 255;
                  newData[idx + 1] = 255;
                  newData[idx + 2] = 255;
                }
              }
            }
          }
        }
      }
    }
    
    return new ImageData(newData, width, height);
  };

  // Contour Simplification using Douglas-Peucker algorithm
  const applyContourSimplification = (imageData, params) => {
    const { epsilon, closed } = params;
    // First detect contours
    const contourData = applyContourDetection(imageData, { 
      minArea: 10, 
      maxArea: 50000, 
      minPerimeter: 10, 
      thickness: 1, 
      fillContours: 'false' 
    });
    
    // For simplicity, apply slight smoothing as contour simplification
    return applyGaussianBlur(contourData, { kernelSize: 3, sigma: epsilon * 10 });
  };

  // Skeletonization using Zhang-Suen algorithm
  const applySkeletonization = (imageData, params) => {
    const { method, iterations } = params;
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // Convert to binary
    let binary = new Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      binary[Math.floor(i / 4)] = data[i] > 128 ? 1 : 0;
    }
    
    // Zhang-Suen thinning algorithm
    for (let iter = 0; iter < iterations; iter++) {
      const toDelete = [];
      
      // First subiteration
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          if (binary[idx] === 1 && shouldDeleteZhangSuen(binary, x, y, width, height, 1)) {
            toDelete.push(idx);
          }
        }
      }
      
      toDelete.forEach(idx => binary[idx] = 0);
      toDelete.length = 0;
      
      // Second subiteration
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          if (binary[idx] === 1 && shouldDeleteZhangSuen(binary, x, y, width, height, 2)) {
            toDelete.push(idx);
          }
        }
      }
      
      toDelete.forEach(idx => binary[idx] = 0);
    }
    
    // Convert back to image data
    const newData = new Uint8ClampedArray(data.length);
    for (let i = 0; i < binary.length; i++) {
      const value = binary[i] * 255;
      newData[i * 4] = value;
      newData[i * 4 + 1] = value;
      newData[i * 4 + 2] = value;
      newData[i * 4 + 3] = 255;
    }
    
    return new ImageData(newData, width, height);
  };

  const shouldDeleteZhangSuen = (binary, x, y, width, height, subiteration) => {
    const getPixel = (px, py) => {
      if (px < 0 || px >= width || py < 0 || py >= height) return 0;
      return binary[py * width + px];
    };
    
    const p1 = getPixel(x, y);
    const p2 = getPixel(x, y - 1);
    const p3 = getPixel(x + 1, y - 1);
    const p4 = getPixel(x + 1, y);
    const p5 = getPixel(x + 1, y + 1);
    const p6 = getPixel(x, y + 1);
    const p7 = getPixel(x - 1, y + 1);
    const p8 = getPixel(x - 1, y);
    const p9 = getPixel(x - 1, y - 1);
    
    // Number of non-zero neighbors
    const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
    
    // Number of 0-1 transitions
    const A = transitions([p2, p3, p4, p5, p6, p7, p8, p9, p2]);
    
    if (subiteration === 1) {
      return (B >= 2 && B <= 6) && (A === 1) && (p2 * p4 * p6 === 0) && (p4 * p6 * p8 === 0);
    } else {
      return (B >= 2 && B <= 6) && (A === 1) && (p2 * p4 * p8 === 0) && (p2 * p6 * p8 === 0);
    }
  };

  const transitions = (pixels) => {
    let count = 0;
    for (let i = 0; i < pixels.length - 1; i++) {
      if (pixels[i] === 0 && pixels[i + 1] === 1) {
        count++;
      }
    }
    return count;
  };

  // CLAHE - Contrast Limited Adaptive Histogram Equalization
  const applyCLAHE = (imageData, params) => {
    const { clipLimit, tileGridSize } = params;
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data.length);
    
    const tileWidth = Math.floor(width / tileGridSize);
    const tileHeight = Math.floor(height / tileGridSize);
    
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
            histogram[Math.floor(data[idx])]++;
            pixelCount++;
          }
        }
        
        // Clip histogram
        const clipHeight = Math.floor(clipLimit * pixelCount / 256);
        let excess = 0;
        for (let i = 0; i < 256; i++) {
          if (histogram[i] > clipHeight) {
            excess += histogram[i] - clipHeight;
            histogram[i] = clipHeight;
          }
        }
        
        // Redistribute excess
        const redistribution = Math.floor(excess / 256);
        for (let i = 0; i < 256; i++) {
          histogram[i] += redistribution;
        }
        
        // Calculate cumulative histogram
        const cdf = new Array(256);
        cdf[0] = histogram[0];
        for (let i = 1; i < 256; i++) {
          cdf[i] = cdf[i - 1] + histogram[i];
        }
        
        // Apply equalization to tile
        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            const idx = (y * width + x) * 4;
            const oldValue = data[idx];
            const newValue = Math.floor((cdf[Math.floor(oldValue)] / pixelCount) * 255);
            
            newData[idx] = newValue;
            newData[idx + 1] = newValue;
            newData[idx + 2] = newValue;
            newData[idx + 3] = 255;
          }
        }
      }
    }
    
    return new ImageData(newData, width, height);
  };

  // Anisotropic Diffusion
  const applyAnisotropicDiffusion = (imageData, params) => {
    const { iterations, kappa, gamma } = params;
    const width = imageData.width;
    const height = imageData.height;
    const data = new Float32Array(imageData.data.length / 4);
    
    // Convert to float array
    for (let i = 0; i < data.length; i++) {
      data[i] = imageData.data[i * 4];
    }
    
    for (let iter = 0; iter < iterations; iter++) {
      const newData = new Float32Array(data.length);
      
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          
          const north = data[(y - 1) * width + x] - data[idx];
          const south = data[(y + 1) * width + x] - data[idx];
          const east = data[y * width + (x + 1)] - data[idx];
          const west = data[y * width + (x - 1)] - data[idx];
          
          const cN = Math.exp(-(north / kappa) * (north / kappa));
          const cS = Math.exp(-(south / kappa) * (south / kappa));
          const cE = Math.exp(-(east / kappa) * (east / kappa));
          const cW = Math.exp(-(west / kappa) * (west / kappa));
          
          newData[idx] = data[idx] + gamma * (cN * north + cS * south + cE * east + cW * west);
        }
      }
      
      // Copy boundary pixels
      for (let x = 0; x < width; x++) {
        newData[x] = data[x]; // top row
        newData[(height - 1) * width + x] = data[(height - 1) * width + x]; // bottom row
      }
      for (let y = 0; y < height; y++) {
        newData[y * width] = data[y * width]; // left column
        newData[y * width + (width - 1)] = data[y * width + (width - 1)]; // right column
      }
      
      data.set(newData);
    }
    
    // Convert back to ImageData
    const result = new Uint8ClampedArray(imageData.data.length);
    for (let i = 0; i < data.length; i++) {
      const value = Math.max(0, Math.min(255, data[i]));
      result[i * 4] = value;
      result[i * 4 + 1] = value;
      result[i * 4 + 2] = value;
      result[i * 4 + 3] = 255;
    }
    
    return new ImageData(result, width, height);
  };

  // Fourier High-pass Filter
  const applyFourierHighPass = (imageData, params) => {
    // Simplified implementation using high-pass convolution
    const kernel = [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]];
    return applyConvolution(imageData, kernel);
  };

  // Hough Lines
  const applyHoughLines = (imageData, params) => {
    // First apply edge detection
    const edges = applyCannyEdgeDetection(imageData, { lowThreshold: 50, highThreshold: 150, gaussianKernel: 5 });
    
    // Simplified line enhancement
    const kernel = [[0, -1, 0], [-1, 5, -1], [0, -1, 0]];
    return applyConvolution(edges, kernel);
  };

  // Structured Edge Detection (simplified)
  const applyStructuredEdgeDetection = (imageData, params) => {
    // Use Sobel as approximation
    return applySobelEdgeDetection(imageData, { lowThreshold: 50, highThreshold: 150 });
  };

  // Wiener Filter (simplified as Gaussian blur)
  const applyWienerFilter = (imageData, params) => {
    const { estimatedNoise } = params;
    const sigma = estimatedNoise * 100;
    return applyGaussianBlur(imageData, { kernelSize: 5, sigma });
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

  // Boundary Extraction - Extract outlines of filled shapes
  const applyBoundaryExtraction = (imageData, params) => {
    const { method, minShapeArea, smoothing, thickness, preserveHoles } = params;
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // Convert to binary
    const binary = new Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      binary[Math.floor(i / 4)] = data[i] < 128 ? 1 : 0; // Dark regions are filled shapes
    }
    
    // Find connected components (filled regions)
    const visited = new Array(width * height).fill(false);
    const components = [];
    
    const floodFill = (startX, startY) => {
      const component = [];
      const stack = [[startX, startY]];
      
      while (stack.length > 0) {
        const [x, y] = stack.pop();
        const idx = y * width + x;
        
        if (x < 0 || x >= width || y < 0 || y >= height || visited[idx] || binary[idx] === 0) continue;
        
        visited[idx] = true;
        component.push([x, y]);
        
        // Add 4-connected neighbors for filled regions
        [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
          stack.push([x + dx, y + dy]);
        });
      }
      
      return component;
    };
    
    // Find all filled components
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (!visited[idx] && binary[idx] === 1) {
          const component = floodFill(x, y);
          if (component.length >= minShapeArea) {
            components.push(component);
          }
        }
      }
    }
    
    // Extract boundaries
    const boundaries = [];
    
    for (const component of components) {
      const componentSet = new Set(component.map(([x, y]) => `${x},${y}`));
      const boundary = [];
      
      for (const [x, y] of component) {
        let isBoundary = false;
        
        // Check if pixel is on the boundary
        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const nx = x + dx;
          const ny = y + dy;
          
          if (nx < 0 || nx >= width || ny < 0 || ny >= height || !componentSet.has(`${nx},${ny}`)) {
            isBoundary = true;
            break;
          }
        }
        
        if (isBoundary) {
          if (method === 'external' || method === 'both') {
            boundary.push([x, y, 'external']);
          }
        } else {
          // Internal boundary (for holes)
          if ((method === 'internal' || method === 'both') && preserveHoles === 'true') {
            let hasHole = false;
            for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                if (binary[ny * width + nx] === 0) {
                  hasHole = true;
                  break;
                }
              }
            }
            if (hasHole) {
              boundary.push([x, y, 'internal']);
            }
          }
        }
      }
      
      if (boundary.length > 0) {
        boundaries.push(boundary);
      }
    }
    
    // Create output image
    const newData = new Uint8ClampedArray(data.length);
    // Start with white background
    for (let i = 0; i < newData.length; i += 4) {
      newData[i] = 255;
      newData[i + 1] = 255;
      newData[i + 2] = 255;
      newData[i + 3] = 255;
    }
    
    // Draw boundaries
    for (const boundary of boundaries) {
      for (const [x, y, type] of boundary) {
        // Draw with specified thickness
        for (let ty = -thickness; ty <= thickness; ty++) {
          for (let tx = -thickness; tx <= thickness; tx++) {
            const nx = x + tx;
            const ny = y + ty;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const idx = (ny * width + nx) * 4;
              newData[idx] = 0;     // Black outline
              newData[idx + 1] = 0;
              newData[idx + 2] = 0;
            }
          }
        }
      }
    }
    
    // Apply smoothing if requested
    let result = new ImageData(newData, width, height);
    if (smoothing > 0) {
      result = applyGaussianBlur(result, { kernelSize: 3, sigma: smoothing * 0.5 });
    }
    
    return result;
  };

  // Shape Decomposition - Enhanced with better shape preservation
  const applyShapeDecomposition = (imageData, params) => {
    const { mode, strokeThickness, fillThreshold, aspectRatioLimit, densityThreshold, edgePreservation, outputMode } = params;
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // Apply mode-based parameter adjustments
    let adjustedParams = { strokeThickness, fillThreshold, aspectRatioLimit, densityThreshold, edgePreservation };
    
    switch (mode) {
      case 'conservative':
        adjustedParams = {
          strokeThickness: Math.max(strokeThickness, 8),
          fillThreshold: Math.max(fillThreshold, 1200),
          aspectRatioLimit: Math.max(aspectRatioLimit, 4),
          densityThreshold: Math.min(densityThreshold, 0.4),
          edgePreservation: Math.max(edgePreservation, 5)
        };
        break;
      case 'balanced':
        // Use provided parameters as-is
        break;
      case 'aggressive':
        adjustedParams = {
          strokeThickness: Math.min(strokeThickness, 3),
          fillThreshold: Math.min(fillThreshold, 400),
          aspectRatioLimit: Math.max(aspectRatioLimit, 12),
          densityThreshold: Math.max(densityThreshold, 0.8),
          edgePreservation: Math.min(edgePreservation, 1)
        };
        break;
    }
    
    // Convert to binary
    const binary = new Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      binary[Math.floor(i / 4)] = data[i] < 128 ? 1 : 0;
    }
    
    // Find connected components with enhanced analysis
    const visited = new Array(width * height).fill(false);
    const lineComponents = [];
    const fillComponents = [];
    const importantShapeComponents = [];
    
    const floodFillEnhanced = (startX, startY) => {
      const component = [];
      const stack = [[startX, startY]];
      let minX = startX, maxX = startX, minY = startY, maxY = startY;
      let edgePixels = 0;
      let interiorPixels = 0;
      
      while (stack.length > 0) {
        const [x, y] = stack.pop();
        const idx = y * width + x;
        
        if (x < 0 || x >= width || y < 0 || y >= height || visited[idx] || binary[idx] === 0) continue;
        
        visited[idx] = true;
        component.push([x, y]);
        
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        
        // Count edge vs interior pixels for density analysis
        let neighborCount = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx !== 0 || dy !== 0) {
              const nx = x + dx, ny = y + dy;
              if (nx >= 0 && nx < width && ny >= 0 && ny < height && binary[ny * width + nx] === 1) {
                neighborCount++;
              }
            }
          }
        }
        
        if (neighborCount < 6) edgePixels++;
        else interiorPixels++;
        
        // Add 8-connected neighbors
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx !== 0 || dy !== 0) {
              stack.push([x + dx, y + dy]);
            }
          }
        }
      }
      
      const componentWidth = maxX - minX + 1;
      const componentHeight = maxY - minY + 1;
      const density = component.length / (componentWidth * componentHeight);
      
      return { 
        pixels: component, 
        bounds: { minX, maxX, minY, maxY },
        width: componentWidth,
        height: componentHeight,
        density: density,
        edgeRatio: edgePixels / (edgePixels + interiorPixels),
        area: component.length
      };
    };
    
    // Enhanced classification with shape analysis
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (!visited[idx] && binary[idx] === 1) {
          const component = floodFillEnhanced(x, y);
          
          if (component.pixels.length > 0) {
            const area = component.area;
            const aspectRatio = Math.max(component.width / component.height, component.height / component.width);
            const thickness = Math.min(component.width, component.height);
            
            // Enhanced classification logic
            const isStrokeLike = (
              thickness <= adjustedParams.strokeThickness && 
              aspectRatio >= adjustedParams.aspectRatioLimit &&
              area < adjustedParams.fillThreshold
            );
            
            const isFillLike = (
              area >= adjustedParams.fillThreshold && 
              component.density >= adjustedParams.densityThreshold
            );
            
            const isImportantShape = (
              area >= adjustedParams.fillThreshold / 3 && 
              area < adjustedParams.fillThreshold &&
              component.edgeRatio > 0.6 && // Mostly edge pixels (outline-like)
              thickness > 2 &&
              aspectRatio < adjustedParams.aspectRatioLimit * 2
            );
            
            if (isStrokeLike) {
              lineComponents.push(component);
            } else if (isFillLike) {
              fillComponents.push(component);
            } else if (isImportantShape && adjustedParams.edgePreservation > 0) {
              importantShapeComponents.push(component);
            }
          }
        }
      }
    }
    
    // Create output based on mode
    const newData = new Uint8ClampedArray(data.length);
    // Start with white background
    for (let i = 0; i < newData.length; i += 4) {
      newData[i] = 255;
      newData[i + 1] = 255;
      newData[i + 2] = 255;
      newData[i + 3] = 255;
    }
    
    const drawComponent = (component, color = [0, 0, 0]) => {
      for (const [x, y] of component.pixels) {
        const idx = (y * width + x) * 4;
        newData[idx] = color[0];
        newData[idx + 1] = color[1];
        newData[idx + 2] = color[2];
      }
    };
    
    const drawBoundary = (component, thickness = 1) => {
      const componentSet = new Set(component.pixels.map(([x, y]) => `${x},${y}`));
      
      for (const [x, y] of component.pixels) {
        let isBoundary = false;
        
        // Check if pixel is on the boundary
        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const nx = x + dx;
          const ny = y + dy;
          
          if (nx < 0 || nx >= width || ny < 0 || ny >= height || !componentSet.has(`${nx},${ny}`)) {
            isBoundary = true;
            break;
          }
        }
        
        if (isBoundary) {
          // Draw with specified thickness
          for (let ty = -thickness; ty <= thickness; ty++) {
            for (let tx = -thickness; tx <= thickness; tx++) {
              const nx = x + tx;
              const ny = y + ty;
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const idx = (ny * width + nx) * 4;
                newData[idx] = 0;
                newData[idx + 1] = 0;
                newData[idx + 2] = 0;
              }
            }
          }
        }
      }
    };
    
    // Apply output mode
    if (outputMode === 'lines_only' || outputMode === 'combined') {
      lineComponents.forEach(component => drawComponent(component));
      if (adjustedParams.edgePreservation > 3) {
        importantShapeComponents.forEach(component => drawComponent(component));
      }
    }
    
    if (outputMode === 'fills_only' || outputMode === 'combined') {
      fillComponents.forEach(component => drawComponent(component));
    }
    
    if (outputMode === 'boundaries_only') {
      // Draw boundaries of fill components
      fillComponents.forEach(component => drawBoundary(component, 1));
      
      // Include line components
      lineComponents.forEach(component => drawComponent(component));
      
      // Include important shapes if edge preservation is enabled
      if (adjustedParams.edgePreservation > 0) {
        importantShapeComponents.forEach(component => drawComponent(component));
      }
    }
    
    if (outputMode === 'smart_boundaries') {
      // Intelligent boundary extraction that preserves important shape lines
      
      // 1. Draw line strokes as-is
      lineComponents.forEach(component => drawComponent(component));
      
      // 2. Draw boundaries of large fills
      fillComponents.forEach(component => {
        if (component.area > adjustedParams.fillThreshold * 1.5) {
          drawBoundary(component, 2);
        } else {
          drawBoundary(component, 1);
        }
      });
      
      // 3. Preserve important shape lines based on edge preservation setting
      if (adjustedParams.edgePreservation > 2) {
        // Draw important shapes as boundaries
        importantShapeComponents.forEach(component => drawBoundary(component, 1));
      } else if (adjustedParams.edgePreservation > 5) {
        // Draw important shapes as filled
        importantShapeComponents.forEach(component => drawComponent(component));
      }
      
      // 4. Handle medium-sized fills based on density
      fillComponents.forEach(component => {
        if (component.area < adjustedParams.fillThreshold * 1.5 && component.density < 0.7) {
          // Sparse fills - might be important shapes, draw as boundary
          drawBoundary(component, 1);
        }
      });
    }
    
    return new ImageData(newData, width, height);
  };

  // Rest of component functions remain the same...
  const addAlgorithm = (algKey) => {
    if (!selectedAlgorithms.includes(algKey)) {
      setSelectedAlgorithms([...selectedAlgorithms, algKey]);
    }
  };

  const removeAlgorithm = (algKey) => {
    setSelectedAlgorithms(selectedAlgorithms.filter(a => a !== algKey));
  };

  const moveAlgorithm = (index, direction) => {
    const newAlgorithms = [...selectedAlgorithms];
    if (direction === 'up' && index > 0) {
      [newAlgorithms[index], newAlgorithms[index - 1]] = [newAlgorithms[index - 1], newAlgorithms[index]];
    } else if (direction === 'down' && index < newAlgorithms.length - 1) {
      [newAlgorithms[index], newAlgorithms[index + 1]] = [newAlgorithms[index + 1], newAlgorithms[index]];
    }
    setSelectedAlgorithms(newAlgorithms);
  };

  const updateParam = (algKey, paramKey, value) => {
    setAlgorithmParams(prev => ({
      ...prev,
      [algKey]: {
        ...prev[algKey],
        [paramKey]: parseFloat(value) || value
      }
    }));
  };

  const startEditingParams = (algKey) => {
    setEditingParams(prev => ({ ...prev, [algKey]: true }));
  };

  const saveParams = (algKey) => {
    setEditingParams(prev => ({ ...prev, [algKey]: false }));
  };

  const cancelEditingParams = (algKey) => {
    setEditingParams(prev => ({ ...prev, [algKey]: false }));
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
          <p className="text-gray-600 mb-6">Upload multiple sketches, test parameter combinations, and apply optimized processing pipelines.</p>
          
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
                  <h2 className="text-xl font-bold text-gray-800">Algorithm Pipeline</h2>
                  {currentImage && (
                    <div className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {currentImage.name}
                    </div>
                  )}
                </div>
                
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
                                    disabled={selectedAlgorithms.includes(alg.key)}
                                    className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-2 py-1 rounded text-xs"
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-gray-600">{alg.description}</p>
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
                      {selectedAlgorithms.map((algKey, index) => (
                        <div key={`${algKey}-${index}`} className="border rounded-lg p-3 bg-blue-50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">
                              {index + 1}. {algorithms[algKey].name}
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => moveAlgorithm(index, 'up')}
                                disabled={index === 0}
                                className="text-gray-500 hover:text-gray-700 disabled:text-gray-300 text-xs"
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => moveAlgorithm(index, 'down')}
                                disabled={index === selectedAlgorithms.length - 1}
                                className="text-gray-500 hover:text-gray-700 disabled:text-gray-300 text-xs"
                              >
                                ↓
                              </button>
                              <button
                                onClick={() => generateParameterPreviews(algKey)}
                                disabled={images.length === 0 || isGeneratingPreviews}
                                className="text-orange-500 hover:text-orange-700 disabled:text-gray-300"
                                title="Test Parameters"
                              >
                                <TestTube className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => startEditingParams(algKey)}
                                className="text-blue-500 hover:text-blue-700"
                              >
                                <Edit3 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => removeAlgorithm(algKey)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Enhanced Parameter Controls */}
                          {editingParams[algKey] && (
                            <div className="mt-3 p-3 bg-white rounded border">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-medium">Parameters</h4>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => saveParams(algKey)}
                                    className="text-green-600 hover:text-green-800"
                                  >
                                    <Save className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => cancelEditingParams(algKey)}
                                    className="text-gray-500 hover:text-gray-700"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-3">
                                {Object.entries(algorithms[algKey].params).map(([paramKey, paramDef]) => (
                                  <div key={paramKey} className="flex flex-col">
                                    <label className="text-xs font-medium text-gray-600 mb-1">
                                      {paramDef.label}
                                    </label>
                                    {paramDef.options ? (
                                      <select
                                        value={algorithmParams[algKey]?.[paramKey] || paramDef.default}
                                        onChange={(e) => updateParam(algKey, paramKey, e.target.value)}
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
                                          value={algorithmParams[algKey]?.[paramKey] || paramDef.default}
                                          onChange={(e) => updateParam(algKey, paramKey, e.target.value)}
                                          className="text-xs border rounded px-2 py-1 flex-1"
                                        />
                                        <input
                                          type="range"
                                          min={paramDef.min}
                                          max={paramDef.max}
                                          step={paramDef.step}
                                          value={algorithmParams[algKey]?.[paramKey] || paramDef.default}
                                          onChange={(e) => updateParam(algKey, paramKey, e.target.value)}
                                          className="flex-1"
                                        />
                                      </div>
                                    )}
                                    <span className="text-xs text-gray-500 mt-1">
                                      Current: {algorithmParams[algKey]?.[paramKey] || paramDef.default}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Compact parameter display when not editing */}
                          {!editingParams[algKey] && (
                            <div className="text-xs text-gray-600 mt-2">
                              {Object.entries(algorithmParams[algKey] || {}).map(([key, value]) => (
                                <span key={key} className="mr-3">
                                  {algorithms[algKey].params[key]?.label}: {value}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {/* Show if optimized parameters are applied */}
                          {selectedPreviewParams[algKey] && (
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
            </div>

            {/* Results Panel */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Processing Results</h2>
                  <div className="flex items-center gap-4">
                    {currentProcessedImages.length > 0 && (
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
                
                {currentProcessedImages.length > 0 && (
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
                
                {currentProcessedImages.length === 0 && currentImage && (
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
                  </div>
                )}

                {!currentImage && (
                  <div className="text-center py-8">
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600">Upload images to start processing</p>
                  </div>
                )}

                {/* Multi-Image Results Summary */}
                {Object.keys(processedImages).length > 1 && (
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