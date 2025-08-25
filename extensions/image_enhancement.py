"""
Image Enhancement Extension using OpenCV and Deep Learning
"""

import cv2
import numpy as np
from PIL import Image, ImageEnhance

class ImageEnhancementExtension:
    def __init__(self):
        self.enhancement_methods = {
            'histogram_equalization': self.histogram_equalization,
            'clahe': self.clahe_enhancement,
            'gaussian_blur': self.gaussian_blur,
            'sharpen': self.sharpen_image,
            'denoise': self.denoise_image,
            'super_resolution': self.super_resolution,
            'auto_enhance': self.auto_enhance
        }
    
    def enhance_image(self, image, method='auto_enhance'):
        """Apply selected enhancement method"""
        if method in self.enhancement_methods:
            return self.enhancement_methods[method](image)
        else:
            return self.auto_enhance(image)
    
    def histogram_equalization(self, image):
        """Apply histogram equalization"""
        # Convert to YUV color space
        yuv = cv2.cvtColor(image, cv2.COLOR_BGR2YUV)
        
        # Apply histogram equalization to Y channel
        yuv[:,:,0] = cv2.equalizeHist(yuv[:,:,0])
        
        # Convert back to BGR
        enhanced = cv2.cvtColor(yuv, cv2.COLOR_YUV2BGR)
        return enhanced
    
    def clahe_enhancement(self, image):
        """Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)"""
        # Convert to LAB color space
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        
        # Apply CLAHE to L channel
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        lab[:,:,0] = clahe.apply(lab[:,:,0])
        
        # Convert back to BGR
        enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
        return enhanced
    
    def gaussian_blur(self, image):
        """Apply Gaussian blur for noise reduction"""
        return cv2.GaussianBlur(image, (5, 5), 0)
    
    def sharpen_image(self, image):
        """Sharpen image using kernel convolution"""
        kernel = np.array([[-1,-1,-1],
                          [-1, 9,-1],
                          [-1,-1,-1]])
        sharpened = cv2.filter2D(image, -1, kernel)
        return sharpened
    
    def denoise_image(self, image):
        """Remove noise using Non-local Means Denoising"""
        denoised = cv2.fastNlMeansDenoisingColored(image, None, 10, 10, 7, 21)
        return denoised
    
    def super_resolution(self, image):
        """Simple super-resolution using bicubic interpolation"""
        height, width = image.shape[:2]
        # Upscale by 2x
        enhanced = cv2.resize(image, (width*2, height*2), interpolation=cv2.INTER_CUBIC)
        # Then downscale back to original size with better quality
        enhanced = cv2.resize(enhanced, (width, height), interpolation=cv2.INTER_AREA)
        return enhanced
    
    def auto_enhance(self, image):
        """Automatically enhance image using multiple techniques"""
        # Step 1: CLAHE for contrast enhancement
        enhanced = self.clahe_enhancement(image)
        
        # Step 2: Slight sharpening
        kernel = np.array([[0,-1,0],
                          [-1,5,-1],
                          [0,-1,0]])
        enhanced = cv2.filter2D(enhanced, -1, kernel)
        
        # Step 3: Color enhancement using PIL
        pil_image = Image.fromarray(cv2.cvtColor(enhanced, cv2.COLOR_BGR2RGB))
        
        # Enhance color saturation
        enhancer = ImageEnhance.Color(pil_image)
        pil_image = enhancer.enhance(1.2)
        
        # Enhance brightness slightly
        enhancer = ImageEnhance.Brightness(pil_image)
        pil_image = enhancer.enhance(1.1)
        
        # Convert back to OpenCV format
        enhanced = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        return enhanced
    
    def batch_enhance(self, images, method='auto_enhance'):
        """Enhance multiple images"""
        enhanced_images = []
        for image in images:
            enhanced = self.enhance_image(image, method)
            enhanced_images.append(enhanced)
        return enhanced_images
