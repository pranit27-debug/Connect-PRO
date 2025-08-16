"""
Configuration settings for Connect-PRO
"""

import os

class Config:
    # Model paths
    YOLO_MODEL_PATH = 'yolov8n.pt'
    STYLE_TRANSFER_MODEL_PATH = 'style_transfer_model.h5'
    
    # Detection thresholds
    FACE_DETECTION_CONFIDENCE = 0.5
    OBJECT_DETECTION_CONFIDENCE = 0.5
    POSE_DETECTION_CONFIDENCE = 0.5
    
    # Image processing settings
    MAX_IMAGE_SIZE = (1920, 1080)
    DEFAULT_ENHANCEMENT_METHOD = 'auto_enhance'
    DEFAULT_STYLE = 'cartoon'
    
    # Video processing settings
    VIDEO_FPS = 30
    VIDEO_CODEC = 'mp4v'
    
    # Streamlit settings
    STREAMLIT_PORT = 8501
    STREAMLIT_HOST = 'localhost'
    
    # File paths
    UPLOAD_FOLDER = 'uploads'
    OUTPUT_FOLDER = 'outputs'
    TEMP_FOLDER = 'temp'
    
    # Supported file formats
    SUPPORTED_IMAGE_FORMATS = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']
    SUPPORTED_VIDEO_FORMATS = ['.mp4', '.avi', '.mov', '.mkv', '.wmv']
    
    @classmethod
    def create_directories(cls):
        """Create necessary directories"""
        directories = [cls.UPLOAD_FOLDER, cls.OUTPUT_FOLDER, cls.TEMP_FOLDER]
        for directory in directories:
            os.makedirs(directory, exist_ok=True)
    
    @classmethod
    def is_supported_image(cls, filename):
        """Check if file is a supported image format"""
        return any(filename.lower().endswith(ext) for ext in cls.SUPPORTED_IMAGE_FORMATS)
    
    @classmethod
    def is_supported_video(cls, filename):
        """Check if file is a supported video format"""
        return any(filename.lower().endswith(ext) for ext in cls.SUPPORTED_VIDEO_FORMATS)
