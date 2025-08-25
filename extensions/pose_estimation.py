"""
Pose Estimation Extension using MediaPipe and OpenCV
"""

import cv2
import numpy as np
import mediapipe as mp

class PoseEstimationExtension:
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        
        # Initialize pose estimation
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            smooth_landmarks=True,
            enable_segmentation=False,
            smooth_segmentation=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        # Define pose connections for custom drawing
        self.pose_connections = [
            # Torso
            (11, 12), (11, 13), (12, 14), (13, 15), (14, 16),
            # Arms
            (11, 23), (12, 24), (23, 25), (24, 26), (25, 27), (26, 28),
            # Legs
            (23, 24), (23, 25), (24, 26), (25, 27), (26, 28),
            # Face
            (0, 1), (1, 2), (2, 3), (3, 7), (0, 4), (4, 5), (5, 6), (6, 8)
        ]
    
    def estimate_pose(self, image):
        """Estimate pose and draw landmarks"""
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.pose.process(rgb_image)
        
        annotated_image = image.copy()
        
        if results.pose_landmarks:
            # Draw pose landmarks
            self.mp_drawing.draw_landmarks(
                annotated_image,
                results.pose_landmarks,
                self.mp_pose.POSE_CONNECTIONS,
                landmark_drawing_spec=self.mp_drawing_styles.get_default_pose_landmarks_style()
            )
            
            # Add pose analysis
            pose_analysis = self.analyze_pose(results.pose_landmarks)
            self.draw_pose_analysis(annotated_image, pose_analysis)
        
        return annotated_image
    
    def analyze_pose(self, landmarks):
        """Analyze pose for specific gestures or positions"""
        analysis = {}
        
        if landmarks:
            # Get landmark coordinates
            h, w = 480, 640  # Default dimensions
            landmark_coords = []
            for landmark in landmarks.landmark:
                x = int(landmark.x * w)
                y = int(landmark.y * h)
                landmark_coords.append((x, y))
            
            # Analyze arm positions
            left_shoulder = landmark_coords[11]
            left_elbow = landmark_coords[13]
            left_wrist = landmark_coords[15]
            right_shoulder = landmark_coords[12]
            right_elbow = landmark_coords[14]
            right_wrist = landmark_coords[16]
            
            # Check if arms are raised
            analysis['left_arm_raised'] = left_wrist[1] < left_shoulder[1]
            analysis['right_arm_raised'] = right_wrist[1] < right_shoulder[1]
            analysis['both_arms_raised'] = analysis['left_arm_raised'] and analysis['right_arm_raised']
            
            # Check body posture
            nose = landmark_coords[0]
            left_hip = landmark_coords[23]
            right_hip = landmark_coords[24]
            
            # Calculate body lean
            hip_center_x = (left_hip[0] + right_hip[0]) / 2
            body_lean = abs(nose[0] - hip_center_x)
            analysis['body_lean'] = 'straight' if body_lean < 20 else 'leaning'
            
            # Detect jumping (both feet off ground estimation)
            left_ankle = landmark_coords[27]
            right_ankle = landmark_coords[28]
            hip_center_y = (left_hip[1] + right_hip[1]) / 2
            
            ankle_height = min(left_ankle[1], right_ankle[1])
            analysis['possibly_jumping'] = (hip_center_y - ankle_height) < 100
        
        return analysis
    
    def draw_pose_analysis(self, image, analysis):
        """Draw pose analysis results on image"""
        y_offset = 30
        
        for key, value in analysis.items():
            text = f"{key.replace('_', ' ').title()}: {value}"
            cv2.putText(image, text, (10, y_offset), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            y_offset += 25
    
    def estimate_pose_video(self, video_path):
        """Process video for pose estimation"""
        cap = cv2.VideoCapture(video_path)
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Process frame
            processed_frame = self.estimate_pose(frame)
            
            # Display frame
            cv2.imshow('Pose Estimation', processed_frame)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        cap.release()
        cv2.destroyAllWindows()
    
    def detect_exercise_form(self, image):
        """Analyze exercise form (basic implementation)"""
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.pose.process(rgb_image)
        
        annotated_image = image.copy()
        form_feedback = []
        
        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            
            # Basic squat form analysis
            left_knee = landmarks[25]
            right_knee = landmarks[26]
            left_ankle = landmarks[27]
            right_ankle = landmarks[28]
            left_hip = landmarks[23]
            right_hip = landmarks[24]
            
            # Check knee alignment
            knee_ankle_alignment = abs(left_knee.x - left_ankle.x) < 0.1
            if knee_ankle_alignment:
                form_feedback.append("✓ Good knee alignment")
            else:
                form_feedback.append("⚠ Check knee alignment")
            
            # Check hip depth
            hip_knee_depth = (left_hip.y + right_hip.y) / 2 > (left_knee.y + right_knee.y) / 2
            if hip_knee_depth:
                form_feedback.append("✓ Good squat depth")
            else:
                form_feedback.append("⚠ Squat deeper")
            
            # Draw feedback
            for i, feedback in enumerate(form_feedback):
                cv2.putText(annotated_image, feedback, (10, 30 + i * 30), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            
            # Draw pose landmarks
            self.mp_drawing.draw_landmarks(
                annotated_image, results.pose_landmarks, self.mp_pose.POSE_CONNECTIONS)
        
        return annotated_image
