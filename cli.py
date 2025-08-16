"""
Command Line Interface for Connect-PRO
"""

import argparse
import cv2
import os
from extensions.face_detection import FaceDetectionExtension
from extensions.object_detection import ObjectDetectionExtension
from extensions.image_enhancement import ImageEnhancementExtension
from extensions.pose_estimation import PoseEstimationExtension
from extensions.style_transfer import StyleTransferExtension

class ConnectPROCLI:
    def __init__(self):
        self.extensions = {
            'face': FaceDetectionExtension(),
            'object': ObjectDetectionExtension(),
            'enhance': ImageEnhancementExtension(),
            'pose': PoseEstimationExtension(),
            'style': StyleTransferExtension()
        }
    
    def process_image(self, image_path, extension, output_path=None):
        """Process a single image"""
        if not os.path.exists(image_path):
            print(f"Error: Image file {image_path} not found")
            return
        
        # Load image
        image = cv2.imread(image_path)
        if image is None:
            print(f"Error: Could not load image {image_path}")
            return
        
        # Process based on extension
        if extension == 'face':
            result = self.extensions['face'].detect_faces(image)
        elif extension == 'object':
            result = self.extensions['object'].detect_objects(image)
        elif extension == 'enhance':
            result = self.extensions['enhance'].enhance_image(image)
        elif extension == 'pose':
            result = self.extensions['pose'].estimate_pose(image)
        elif extension == 'style':
            result = self.extensions['style'].apply_style(image)
        else:
            print(f"Unknown extension: {extension}")
            return
        
        # Save or display result
        if output_path:
            cv2.imwrite(output_path, result)
            print(f"Result saved to {output_path}")
        else:
            cv2.imshow(f'Connect-PRO - {extension}', result)
            cv2.waitKey(0)
            cv2.destroyAllWindows()
    
    def process_video(self, video_path, extension):
        """Process a video file"""
        if not os.path.exists(video_path):
            print(f"Error: Video file {video_path} not found")
            return
        
        cap = cv2.VideoCapture(video_path)
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Process frame based on extension
            if extension == 'face':
                result = self.extensions['face'].detect_faces(frame)
            elif extension == 'object':
                result = self.extensions['object'].detect_objects(frame)
            elif extension == 'enhance':
                result = self.extensions['enhance'].enhance_image(frame)
            elif extension == 'pose':
                result = self.extensions['pose'].estimate_pose(frame)
            elif extension == 'style':
                result = self.extensions['style'].apply_style(frame)
            else:
                result = frame
            
            cv2.imshow(f'Connect-PRO Video - {extension}', result)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        cap.release()
        cv2.destroyAllWindows()

def main():
    parser = argparse.ArgumentParser(description='Connect-PRO: OpenCV and Deep Learning Extensions')
    parser.add_argument('--input', '-i', required=True, help='Input image or video file')
    parser.add_argument('--extension', '-e', required=True, 
                       choices=['face', 'object', 'enhance', 'pose', 'style'],
                       help='Extension to use')
    parser.add_argument('--output', '-o', help='Output file path (for images only)')
    parser.add_argument('--type', '-t', choices=['image', 'video'], default='image',
                       help='Input type (image or video)')
    
    args = parser.parse_args()
    
    cli = ConnectPROCLI()
    
    if args.type == 'image':
        cli.process_image(args.input, args.extension, args.output)
    else:
        cli.process_video(args.input, args.extension)

if __name__ == "__main__":
    main()
