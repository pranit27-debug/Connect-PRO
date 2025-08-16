"""
Connect-PRO: OpenCV and Deep Learning Extensions
A comprehensive computer vision application with multiple AI capabilities
"""

import cv2
import numpy as np
import streamlit as st
from PIL import Image
import torch
import tensorflow as tf
from ultralytics import YOLO
import mediapipe as mp
import matplotlib.pyplot as plt
from extensions.face_detection import FaceDetectionExtension
from extensions.object_detection import ObjectDetectionExtension
from extensions.image_enhancement import ImageEnhancementExtension
from extensions.pose_estimation import PoseEstimationExtension
from extensions.style_transfer import StyleTransferExtension

class ConnectPRO:
    def __init__(self):
        self.face_detector = FaceDetectionExtension()
        self.object_detector = ObjectDetectionExtension()
        self.image_enhancer = ImageEnhancementExtension()
        self.pose_estimator = PoseEstimationExtension()
        self.style_transfer = StyleTransferExtension()
        
    def run_streamlit_app(self):
        st.set_page_config(
            page_title="Connect-PRO",
            page_icon="🔍",
            layout="wide"
        )
        
        st.title("🔍 Connect-PRO: AI Vision Extensions")
        st.markdown("### Advanced Computer Vision & Deep Learning Platform")
        
        # Sidebar for extension selection
        st.sidebar.title("Extensions")
        extension = st.sidebar.selectbox(
            "Choose an extension:",
            [
                "Face Detection & Recognition",
                "Object Detection (YOLO)",
                "Image Enhancement",
                "Pose Estimation",
                "Neural Style Transfer"
            ]
        )
        
        # File uploader
        uploaded_file = st.file_uploader(
            "Upload an image or video",
            type=['jpg', 'jpeg', 'png', 'mp4', 'avi', 'mov']
        )
        
        if uploaded_file is not None:
            if uploaded_file.type.startswith('image'):
                self.process_image(uploaded_file, extension)
            else:
                self.process_video(uploaded_file, extension)
    
    def process_image(self, uploaded_file, extension):
        # Convert uploaded file to OpenCV format
        image = Image.open(uploaded_file)
        cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("Original Image")
            st.image(image, use_column_width=True)
        
        with col2:
            st.subheader("Processed Image")
            
            if extension == "Face Detection & Recognition":
                result = self.face_detector.detect_faces(cv_image)
            elif extension == "Object Detection (YOLO)":
                result = self.object_detector.detect_objects(cv_image)
            elif extension == "Image Enhancement":
                result = self.image_enhancer.enhance_image(cv_image)
            elif extension == "Pose Estimation":
                result = self.pose_estimator.estimate_pose(cv_image)
            elif extension == "Neural Style Transfer":
                result = self.style_transfer.apply_style(cv_image)
            
            # Convert back to RGB for display
            result_rgb = cv2.cvtColor(result, cv2.COLOR_BGR2RGB)
            st.image(result_rgb, use_column_width=True)
    
    def process_video(self, uploaded_file, extension):
        st.info("Video processing feature - Coming soon!")
        st.write("This will process video files frame by frame using the selected extension.")

def main():
    app = ConnectPRO()
    app.run_streamlit_app()

if __name__ == "__main__":
    main()
