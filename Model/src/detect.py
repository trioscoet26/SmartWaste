import cv2
import torch
import time
from ultralytics import YOLO
from pymongo import MongoClient
from datetime import datetime
import geocoder
import math
from datetime import datetime



# MongoDB connection
client = MongoClient('mongodb+srv://root:root@cluster0.ik1za.mongodb.net/')
db = client['SmartWaste']
collection = db['tasks']

# Load YOLOv8 model
model = YOLO("best.pt")  # Use your trained model

# Open webcam (Change to video file if needed)
cap = cv2.VideoCapture(0)  # Use 0 for webcam or 'video.mp4' for file

# Dictionary to store detected problem locations
detected_sites = {}

def calculate_severity(x1, y1, x2, y2, frame_height, frame_width):
    """Calculate severity based on the size of detected object relative to frame size"""
    # Calculate area of detection
    detection_area = (x2 - x1) * (y2 - y1)
    frame_area = frame_height * frame_width
    
    # Calculate percentage of frame covered
    coverage_percentage = (detection_area / frame_area) * 100
    
    if coverage_percentage >= 20:
        return "High"
    elif coverage_percentage >= 10:
        return "Medium"
    else:
        return "Low"

def calculate_priority(class_name, severity):
    """Calculate priority based on class type and severity"""
    # Class priority mapping
    class_priority = {
        "spills": "High",  # Highest priority
        "garbage": "Medium",  # Medium priority
        "trash": "Low",    # Lower priority
    }
    
    # Get base priority for the class (default to "Low" if class not found)
    base_priority = class_priority.get(class_name.lower(), "Low")
    
    # For simplicity, use the higher of class priority or severity
    priority_levels = {"High": 3, "Medium": 2, "Low": 1}
    
    if priority_levels.get(severity, 1) > priority_levels.get(base_priority, 1):
        return severity
    else:
        return base_priority

def get_gps_coordinates():
    """Get current GPS coordinates of the laptop"""
    g = geocoder.ip('me')
    if g.latlng:
        return g.latlng
    return None, None

def log_detection(class_name, x1, y1, x2, y2, frame, score):
    """Logs detection, captures a screenshot and stores in MongoDB"""
    global detected_sites
    center_x = (x1 + x2) / 2
    center_y = (y1 + y2) / 2
    key = (int(center_x / 50), int(center_y / 50))  # Normalize positions to avoid duplicates
    
    if key not in detected_sites:
        detected_sites[key] = True
        print(f"⚠️ problem detected at approx. location (x={center_x}, y={center_y})")

        # Save screenshot
        timestamp = time.strftime("%Y%m%d-%H%M%S")
        filename = f"problem_detected_{timestamp}.jpg"
        cv2.imwrite(filename, frame)
        print(f"📸 Screenshot saved: {filename}")

        # Get frame dimensions
        frame_height, frame_width = frame.shape[:2]
        
        # Calculate severity based on size
        severity = calculate_severity(x1, y1, x2, y2, frame_height, frame_width)
        
        # Calculate priority based on class and severity
        priority = calculate_priority(class_name, severity)
        
        # Calculate size (area in pixels)
        detection_size = (x2 - x1) * (y2 - y1)
        
        # Get GPS coordinates
        latitude, longitude = get_gps_coordinates()

        # Store in MongoDB
        detection_data = {
            "size": detection_size,  # Required field
            "department": "cleaning" if class_name.lower() != "spills" else "spill",
            "severity": severity,  # "High", "Medium", or "Low"
            "priority": priority,  # "High", "Medium", or "Low" 
            "location": f"CAM1-{center_x:.0f}-{center_y:.0f}",  # String location
            "latitude": latitude,
            "longitude": longitude,
            "assigned": False,
            "assignedWorker": None,
            "processing": False,
            "status": "Incomplete",
            "description": f"Detected {class_name} with {score:.2f} confidence.",
            "imagePath": filename,
            "locationDetails": {  # Store detailed location as a separate field
                "x": center_x,
                "y": center_y,
                "width": x2 - x1,
                "height": y2 - y1,
                "coveragePercentage": ((x2 - x1) * (y2 - y1) / (frame_height * frame_width)) * 100
            },
            "confidenceScore": score,
            "createdAt": datetime.now()
        }
        
        # Insert into MongoDB
        insert_result = collection.insert_one(detection_data)
        print(f"✅ Detection data stored in MongoDB with ID: {insert_result.inserted_id}")
        
       
while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    # Run YOLO model on frame
    results = model(frame)
    
    for result in results:
        pred = result.boxes
        if pred is None:
            continue
        
        boxes = pred.xyxy  # Bounding box coordinates
        scores = pred.conf  # Confidence scores
        class_ids = pred.cls.int()  # Class IDs

        indices = cv2.dnn.NMSBoxes(
            boxes.tolist(), scores.tolist(), score_threshold=0.5, nms_threshold=0.4
        )

        if len(indices) > 0:
          for i in indices.flatten():

            x1, y1, x2, y2 = map(int, boxes[i])
            class_id = class_ids[i].item()
            score = scores[i].item()

            # Draw bounding box
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            label = f"{model.names[class_id]}: {score:.2f}"
            cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)

            # Log detection
            if model.names[class_id] in ["bin", "garbage", "spills"] and score > 0.5:
                log_detection(model.names[class_id], x1, y1, x2, y2, frame, score)

    # Show detection window
    cv2.imshow("YOLO Detection", frame)
    
    # Exit on pressing 'q'
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
