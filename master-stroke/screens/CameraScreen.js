import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Platform
} from 'react-native';
import { Camera } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import * as Permissions from 'expo-permissions';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Toast from 'react-native-toast-message';

// API configuration
const API_URL = __DEV__ 
  ? Platform.OS === 'ios' 
    ? 'http://localhost:8000' 
    : 'http://10.0.2.2:8000'
  : 'https://api.master-stroke.com';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function CameraScreen({ navigation, route }) {
  const cameraRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [type, setType] = useState(Camera.Constants.Type.back);
  const [isCapturing, setIsCapturing] = useState(false);
  const [overlayImg, setOverlayImg] = useState(null);
  const [alignmentScore, setAlignmentScore] = useState(0);
  const [showGuide, setShowGuide] = useState(true);
  
  // Get current step SVG path from navigation params
  const currentStepSvgPath = route.params?.stepSvgPath || null;

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const snapAndUpload = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    
    try {
      // Take picture
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        exif: false
      });

      // Create form data
      const formData = new FormData();
      formData.append('file', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: 'capture.jpg'
      });
      
      if (currentStepSvgPath) {
        formData.append('step_svg', currentStepSvgPath);
      }

      // Upload to server
      const response = await axios.post(`${API_URL}/capture`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 10000, // 10 second timeout
      });

      const { 
        preview_png, 
        alignment_score, 
        quality_feedback,
        quality_valid,
        warp_matrix
      } = response.data;

      // Update UI with results
      setOverlayImg(`data:image/png;base64,${preview_png}`);
      setAlignmentScore(alignment_score);

      // Show quality feedback
      if (quality_valid) {
        Toast.show({
          type: 'success',
          text1: 'Capture Successful',
          text2: quality_feedback,
          visibilityTime: 3000,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Poor Alignment',
          text2: quality_feedback,
          visibilityTime: 4000,
        });
      }

      // Navigate to next screen if capture is good
      if (quality_valid && alignment_score > 0.25) {
        setTimeout(() => {
          navigation.navigate('EditScreen', {
            capturedImage: overlayImg,
            warpMatrix: warp_matrix,
            originalPhoto: photo.uri
          });
        }, 1500);
      }

    } catch (error) {
      console.error('Capture error:', error);
      
      let errorMessage = 'Failed to process image';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout - check your connection';
      } else if (!error.response) {
        errorMessage = 'Cannot connect to server';
      }
      
      Toast.show({
        type: 'error',
        text1: 'Capture Failed',
        text2: errorMessage,
        visibilityTime: 4000,
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const toggleCameraType = () => {
    setType(
      type === Camera.Constants.Type.back
        ? Camera.Constants.Type.front
        : Camera.Constants.Type.back
    );
  };

  const toggleGuide = () => {
    setShowGuide(!showGuide);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No access to camera</Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => Permissions.askAsync(Permissions.CAMERA)}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      <Camera 
        style={styles.camera} 
        type={type} 
        ref={cameraRef}
        ratio="4:3"
      >
        {/* Guide overlay */}
        {showGuide && (
          <View style={styles.guideOverlay}>
            <View style={styles.guideFrame}>
              <View style={[styles.guideCorner, styles.guideCornerTL]} />
              <View style={[styles.guideCorner, styles.guideCornerTR]} />
              <View style={[styles.guideCorner, styles.guideCornerBL]} />
              <View style={[styles.guideCorner, styles.guideCornerBR]} />
            </View>
            <Text style={styles.guideText}>
              Align paper within frame
            </Text>
          </View>
        )}

        {/* Preview overlay */}
        {overlayImg && (
          <Image 
            source={{ uri: overlayImg }} 
            style={styles.overlayImage}
            resizeMode="contain"
          />
        )}

        {/* Top controls */}
        <View style={styles.topControls}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>

          <View style={styles.alignmentIndicator}>
            <Text style={styles.alignmentText}>
              {alignmentScore > 0 
                ? `${Math.round(alignmentScore * 100)}% aligned`
                : 'Position paper'
              }
            </Text>
            <View style={styles.alignmentBar}>
              <View 
                style={[
                  styles.alignmentFill,
                  { 
                    width: `${alignmentScore * 100}%`,
                    backgroundColor: alignmentScore > 0.4 ? '#4CAF50' : '#FF9800'
                  }
                ]}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={toggleGuide}
          >
            <Ionicons 
              name={showGuide ? "grid" : "grid-outline"} 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomControls}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={toggleCameraType}
          >
            <Ionicons name="camera-reverse" size={30} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.captureButton,
              isCapturing && styles.captureButtonDisabled
            ]}
            onPress={snapAndUpload}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator size="large" color="white" />
            ) : (
              <View style={styles.captureButtonInner} />
            )}
          </TouchableOpacity>

          <View style={styles.iconButton} />
        </View>
      </Camera>

      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  topControls: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  guideOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideFrame: {
    width: screenWidth * 0.8,
    height: screenWidth * 0.8,
    position: 'relative',
  },
  guideCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: 'white',
    borderWidth: 3,
  },
  guideCornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  guideCornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  guideCornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  guideCornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  guideText: {
    color: 'white',
    fontSize: 16,
    marginTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  overlayImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },
  alignmentIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 150,
  },
  alignmentText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 5,
  },
  alignmentBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  alignmentFill: {
    height: '100%',
    borderRadius: 2,
  },
  errorText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
  },
});