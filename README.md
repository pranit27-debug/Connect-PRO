# Connect-PRO: OpenCV and Deep Learning Extensions

A comprehensive computer vision application with multiple AI-powered extensions for image and video processing.

## 🚀 Features

### Core Extensions
- **Face Detection & Recognition** - Advanced face detection using MediaPipe and OpenCV
- **Object Detection** - YOLO-based real-time object detection
- **Image Enhancement** - Multiple enhancement techniques including CLAHE, denoising, and super-resolution
- **Pose Estimation** - Human pose detection and analysis with exercise form feedback
- **Neural Style Transfer** - Artistic style filters and neural style transfer

### Interfaces
- **Streamlit Web App** - User-friendly web interface
- **Command Line Interface** - Batch processing and automation
- **Python API** - Programmatic access to all extensions

## 📦 Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd Connect-PRO
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Create necessary directories:**
```python
from config import Config
Config.create_directories()
```

## 🎯 Quick Start

### Web Interface (Recommended)
```bash
streamlit run main.py
```
Then open your browser to `http://localhost:8501`

### Command Line Interface
```bash
# Face detection on image
python cli.py -i image.jpg -e face -o output.jpg

# Object detection on video
python cli.py -i video.mp4 -e object -t video

# Image enhancement
python cli.py -i image.jpg -e enhance -o enhanced.jpg

# Pose estimation
python cli.py -i image.jpg -e pose -o pose_result.jpg

# Style transfer
python cli.py -i image.jpg -e style -o stylized.jpg
```

### Python API
```python
from extensions.face_detection import FaceDetectionExtension
from extensions.object_detection import ObjectDetectionExtension
import cv2

# Initialize extensions
face_detector = FaceDetectionExtension()
object_detector = ObjectDetectionExtension()

# Load and process image
image = cv2.imread('your_image.jpg')
faces_detected = face_detector.detect_faces(image)
objects_detected = object_detector.detect_objects(image)

# Save results
cv2.imwrite('faces_result.jpg', faces_detected)
cv2.imwrite('objects_result.jpg', objects_detected)
```

## 🔧 Extensions Overview

### 1. Face Detection Extension
- **MediaPipe Integration**: High-accuracy face detection
- **OpenCV Haar Cascades**: Alternative detection method
- **Features**: Bounding boxes, confidence scores, facial landmarks

### 2. Object Detection Extension
- **YOLOv8**: State-of-the-art object detection
- **80 COCO Classes**: Comprehensive object recognition
- **Real-time Processing**: Optimized for speed and accuracy

### 3. Image Enhancement Extension
- **Histogram Equalization**: Improve contrast
- **CLAHE**: Adaptive histogram equalization
- **Denoising**: Remove image noise
- **Sharpening**: Enhance image details
- **Auto Enhancement**: Intelligent multi-step enhancement

### 4. Pose Estimation Extension
- **MediaPipe Pose**: 33-point pose landmarks
- **Pose Analysis**: Gesture and posture detection
- **Exercise Form**: Basic fitness form analysis
- **Real-time Tracking**: Smooth landmark tracking

### 5. Style Transfer Extension
- **Artistic Filters**: Pencil sketch, cartoon, oil painting
- **Watercolor Effect**: Artistic watercolor simulation
- **Vintage Filter**: Sepia and retro effects
- **Neural Style Transfer**: Deep learning-based style transfer (extensible)

## 📁 Project Structure

```
Connect-PRO/
├── main.py                 # Streamlit web application
├── cli.py                  # Command line interface
├── config.py               # Configuration settings
├── requirements.txt        # Python dependencies
├── README.md              # This file
├── extensions/            # Extension modules
│   ├── __init__.py
│   ├── face_detection.py
│   ├── object_detection.py
│   ├── image_enhancement.py
│   ├── pose_estimation.py
│   └── style_transfer.py
├── uploads/               # Uploaded files (auto-created)
├── outputs/               # Processed outputs (auto-created)
└── temp/                  # Temporary files (auto-created)
```

## 🛠️ Configuration

Edit `config.py` to customize:
- Detection confidence thresholds
- Model paths
- Image/video processing settings
- Supported file formats

## 📊 Supported Formats

### Images
- JPEG (.jpg, .jpeg)
- PNG (.png)
- BMP (.bmp)
- TIFF (.tiff)

### Videos
- MP4 (.mp4)
- AVI (.avi)
- MOV (.mov)
- MKV (.mkv)
- WMV (.wmv)

## 🔬 Advanced Usage

### Batch Processing
```python
from extensions.image_enhancement import ImageEnhancementExtension

enhancer = ImageEnhancementExtension()
images = [cv2.imread(f'image_{i}.jpg') for i in range(10)]
enhanced_images = enhancer.batch_enhance(images, method='auto_enhance')
```

### Video Processing
```python
from extensions.pose_estimation import PoseEstimationExtension

pose_estimator = PoseEstimationExtension()
pose_estimator.estimate_pose_video('workout_video.mp4')
```

### Custom Style Transfer
```python
from extensions.style_transfer import StyleTransferExtension

style_transfer = StyleTransferExtension()
result = style_transfer.apply_style(image, style='watercolor')
```

## 🚀 Performance Tips

1. **GPU Acceleration**: Install CUDA-enabled versions of TensorFlow and PyTorch for faster processing
2. **Model Optimization**: Use lighter models (YOLOv8n) for real-time applications
3. **Image Resizing**: Resize large images before processing to improve speed
4. **Batch Processing**: Process multiple images together for better efficiency

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add your extension or improvement
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Dependencies

- OpenCV 4.8+
- TensorFlow 2.13+
- PyTorch 2.0+
- MediaPipe 0.10+
- Ultralytics YOLOv8
- Streamlit 1.26+

## 📞 Support

For issues and questions:
1. Check the documentation
2. Search existing issues
3. Create a new issue with detailed description

## 🎉 Acknowledgments

- OpenCV community for computer vision tools
- MediaPipe team for pose estimation and face detection
- Ultralytics for YOLOv8 implementation
- TensorFlow and PyTorch teams for deep learning frameworks
