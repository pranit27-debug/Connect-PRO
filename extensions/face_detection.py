"""
Face Detection and Recognition Extension using OpenCV and MediaPipe
"""

import cv2
import numpy as np
import mediapipe as mp

class FaceDetectionExtension:
    def __init__(self):
        self.mp_face_detection = mp.solutions.face_detection
        self.mp_drawing = mp.solutions.drawing_utils
        self.face_detection = self.mp_face_detection.FaceDetection(
            model_selection=0, min_detection_confidence=0.5
        )
        
        # Load OpenCV face cascade for comparison
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        
    def detect_faces(self, image):
        """Detect faces using MediaPipe and draw bounding boxes"""
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.face_detection.process(rgb_image)
        
        annotated_image = image.copy()
        
        if results.detections:
            for detection in results.detections:
                # Get bounding box
                bboxC = detection.location_data.relative_bounding_box
                ih, iw, _ = annotated_image.shape
                bbox = int(bboxC.xmin * iw), int(bboxC.ymin * ih), \
                       int(bboxC.width * iw), int(bboxC.height * ih)
                
                # Draw bounding box
                cv2.rectangle(annotated_image, bbox, (0, 255, 0), 2)
                
                # Add confidence score
                confidence = detection.score[0]
                cv2.putText(annotated_image, f'Face: {confidence:.2f}', 
                           (bbox[0], bbox[1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 
                           0.9, (0, 255, 0), 2)
                
                # Draw facial landmarks
                self.mp_drawing.draw_detection(annotated_image, detection)
        
        return annotated_image
    
    def detect_faces_opencv(self, image):
        """Alternative face detection using OpenCV Haar Cascades"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
        
        annotated_image = image.copy()
        for (x, y, w, h) in faces:
            cv2.rectangle(annotated_image, (x, y), (x+w, y+h), (255, 0, 0), 2)
            cv2.putText(annotated_image, 'OpenCV Face', (x, y-10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 0, 0), 2)
        
        return annotated_image
