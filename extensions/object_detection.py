"""
Object Detection Extension using YOLO and TensorFlow
"""

import cv2
import numpy as np
from ultralytics import YOLO
import torch

class ObjectDetectionExtension:
    def __init__(self):
        # Load YOLOv8 model
        try:
            self.yolo_model = YOLO('yolov8n.pt')  # nano version for faster inference
        except:
            print("YOLOv8 model not found. Will download on first use.")
            self.yolo_model = None
        
        # COCO class names
        self.class_names = [
            'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck',
            'boat', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench',
            'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra',
            'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
            'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove',
            'skateboard', 'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup',
            'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange',
            'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
            'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
            'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
            'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier',
            'toothbrush'
        ]
        
        # Colors for different classes
        self.colors = np.random.uniform(0, 255, size=(len(self.class_names), 3))
    
    def detect_objects(self, image):
        """Detect objects using YOLOv8"""
        if self.yolo_model is None:
            self.yolo_model = YOLO('yolov8n.pt')
        
        # Run inference
        results = self.yolo_model(image)
        
        # Process results
        annotated_image = image.copy()
        
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    # Get box coordinates
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                    
                    # Get confidence and class
                    confidence = box.conf[0].cpu().numpy()
                    class_id = int(box.cls[0].cpu().numpy())
                    
                    if confidence > 0.5:  # Confidence threshold
                        # Get class name and color
                        class_name = self.class_names[class_id] if class_id < len(self.class_names) else f"Class {class_id}"
                        color = self.colors[class_id % len(self.colors)]
                        
                        # Draw bounding box
                        cv2.rectangle(annotated_image, (x1, y1), (x2, y2), color, 2)
                        
                        # Add label
                        label = f"{class_name}: {confidence:.2f}"
                        label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
                        cv2.rectangle(annotated_image, (x1, y1 - label_size[1] - 10), 
                                    (x1 + label_size[0], y1), color, -1)
                        cv2.putText(annotated_image, label, (x1, y1 - 5), 
                                  cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
        
        return annotated_image
    
    def detect_objects_with_tracking(self, video_path):
        """Object detection with tracking for video files"""
        cap = cv2.VideoCapture(video_path)
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            # Process frame
            processed_frame = self.detect_objects(frame)
            
            # Display frame
            cv2.imshow('Object Detection', processed_frame)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        cap.release()
        cv2.destroyAllWindows()
