"""
Neural Style Transfer Extension using TensorFlow and OpenCV
"""

import cv2
import numpy as np
import tensorflow as tf
from PIL import Image
import requests
import os

class StyleTransferExtension:
    def __init__(self):
        self.model = None
        self.load_model()
        
        # Predefined artistic filters using OpenCV
        self.artistic_filters = {
            'pencil_sketch': self.pencil_sketch,
            'cartoon': self.cartoon_effect,
            'oil_painting': self.oil_painting_effect,
            'watercolor': self.watercolor_effect,
            'vintage': self.vintage_effect
        }
    
    def load_model(self):
        """Load pre-trained style transfer model"""
        try:
            # Try to load a lightweight style transfer model
            # This is a placeholder - in practice, you'd load a real model
            print("Style transfer model loading...")
            # self.model = tf.keras.models.load_model('style_transfer_model.h5')
        except:
            print("Neural style transfer model not available. Using artistic filters.")
            self.model = None
    
    def apply_style(self, image, style='cartoon'):
        """Apply artistic style to image"""
        if style in self.artistic_filters:
            return self.artistic_filters[style](image)
        else:
            return self.cartoon_effect(image)
    
    def pencil_sketch(self, image):
        """Convert image to pencil sketch"""
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Create inverted grayscale
        gray_inv = 255 - gray
        
        # Apply Gaussian blur
        gray_inv_blur = cv2.GaussianBlur(gray_inv, (21, 21), 0)
        
        # Create pencil sketch
        sketch = cv2.divide(gray, 255 - gray_inv_blur, scale=256)
        
        # Convert back to BGR
        sketch_bgr = cv2.cvtColor(sketch, cv2.COLOR_GRAY2BGR)
        
        return sketch_bgr
    
    def cartoon_effect(self, image):
        """Apply cartoon effect"""
        # Reduce noise
        bilateral = cv2.bilateralFilter(image, 15, 80, 80)
        
        # Create edge mask
        gray = cv2.cvtColor(bilateral, cv2.COLOR_BGR2GRAY)
        gray_blur = cv2.medianBlur(gray, 5)
        edges = cv2.adaptiveThreshold(gray_blur, 255, cv2.ADAPTIVE_THRESH_MEAN_C, 
                                     cv2.THRESH_BINARY, 9, 9)
        
        # Convert edges to 3-channel
        edges = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
        
        # Combine with bilateral filtered image
        cartoon = cv2.bitwise_and(bilateral, edges)
        
        # Enhance colors
        cartoon = cv2.addWeighted(cartoon, 0.8, bilateral, 0.2, 0)
        
        return cartoon
    
    def oil_painting_effect(self, image):
        """Apply oil painting effect"""
        # Use OpenCV's oil painting filter
        oil_painting = cv2.xphoto.oilPainting(image, 7, 1)
        return oil_painting
    
    def watercolor_effect(self, image):
        """Apply watercolor effect"""
        # Smooth the image
        smooth = cv2.bilateralFilter(image, 15, 80, 80)
        smooth = cv2.bilateralFilter(smooth, 15, 80, 80)
        
        # Create edge mask
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        edges = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, 
                                     cv2.THRESH_BINARY, 9, 9)
        edges = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
        
        # Combine
        watercolor = cv2.bitwise_and(smooth, edges)
        
        # Add some blur for watercolor effect
        watercolor = cv2.GaussianBlur(watercolor, (3, 3), 0)
        
        return watercolor
    
    def vintage_effect(self, image):
        """Apply vintage/sepia effect"""
        # Create sepia kernel
        sepia_kernel = np.array([[0.272, 0.534, 0.131],
                                [0.349, 0.686, 0.168],
                                [0.393, 0.769, 0.189]])
        
        # Apply sepia effect
        sepia = cv2.transform(image, sepia_kernel)
        
        # Add some noise for vintage look
        noise = np.random.randint(0, 50, image.shape, dtype=np.uint8)
        vintage = cv2.add(sepia, noise)
        
        # Reduce brightness slightly
        vintage = cv2.addWeighted(vintage, 0.8, np.zeros(vintage.shape, dtype=np.uint8), 0, -20)
        
        return vintage
    
    def neural_style_transfer(self, content_image, style_image):
        """Apply neural style transfer (placeholder implementation)"""
        if self.model is None:
            # Fallback to artistic filter
            return self.cartoon_effect(content_image)
        
        # Preprocess images
        content_processed = self.preprocess_image(content_image)
        style_processed = self.preprocess_image(style_image)
        
        # Apply style transfer (this would use the actual model)
        # stylized_image = self.model([content_processed, style_processed])
        
        # For now, return cartoon effect
        return self.cartoon_effect(content_image)
    
    def preprocess_image(self, image):
        """Preprocess image for neural network"""
        # Resize image
        image = cv2.resize(image, (256, 256))
        
        # Normalize pixel values
        image = image.astype(np.float32) / 255.0
        
        # Add batch dimension
        image = np.expand_dims(image, axis=0)
        
        return image
    
    def batch_style_transfer(self, images, style='cartoon'):
        """Apply style transfer to multiple images"""
        stylized_images = []
        for image in images:
            stylized = self.apply_style(image, style)
            stylized_images.append(stylized)
        return stylized_images
