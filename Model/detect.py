import cv2
import time
from roboflow import Roboflow
from pymongo import MongoClient
from datetime import datetime
import geocoder
import os

# MongoDB connection
client = MongoClient('mongodb+srv://root:root@cluster0.ik1za.mongodb.net/')
db = client['SmartWaste']
collection = db['tasks']

# Initialize the Roboflow client
print("Initializing Roboflow client...")
rf = Roboflow(api_key="OnGIwp43w9s3C9lPMInc")
project = rf.workspace().project("smartwaste-jp5l5")
model = project.version(1).model
print("Roboflow model loaded successfully!")

# Open webcam (Change to video file if needed)
print("Opening camera...")
cap = cv2.VideoCapture(0)  # Use 0 for webcam or 'video.mp4' for file

if not cap.isOpened():
    print("Error: Could not open camera. Please check your camera connection.")
    exit()
    
print("Camera opened successfully!")

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
        print(f"⚠️ Problem detected at approx. location (x={center_x}, y={center_y})")

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

print("Starting continuous waste detection...")
print("Press 'q' to exit")

try:
    # Create a directory to store temporary frames if it doesn't exist
    if not os.path.exists("temp"):
        os.makedirs("temp")
    
    # For rate control but still ensure continuous processing
    last_process_time = time.time()
    process_interval = 0.5  # Seconds between API calls (adjust based on Roboflow rate limits)
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("Error: Failed to read frame from camera")
            time.sleep(1)  # Wait a bit before trying again
            continue

        # Create a copy of the frame for display
        display_frame = frame.copy()
        
        current_time = time.time()
        # Process frames continuously but respect a minimum interval to avoid API rate limits
        if current_time - last_process_time >= process_interval:
            last_process_time = current_time
            
            # Save the frame to a temporary image file for Roboflow inference
            temp_file = os.path.join("temp", "temp_frame.jpg")
            cv2.imwrite(temp_file, frame)
            
            try:
                # Run inference on the frame using Roboflow
                results = model.predict(temp_file, confidence=40, overlap=30).json()
                
                # Process predictions
                if 'predictions' in results:
                    predictions_count = len(results['predictions'])
                    if predictions_count > 0:
                        print(f"Found {predictions_count} waste item(s) in current frame")
                    
                    for prediction in results['predictions']:
                        x = int(prediction['x'])
                        y = int(prediction['y'])
                        w = int(prediction['width'] / 2)
                        h = int(prediction['height'] / 2)
                        class_name = prediction['class']
                        score = prediction['confidence'] / 100  # Convert to 0-1 range
                        
                        # Convert to x1, y1, x2, y2 format for consistency with original code
                        x1 = x - w
                        y1 = y - h
                        x2 = x + w
                        y2 = y + h
                        
                        # Draw rectangle on frame for display
                        cv2.rectangle(display_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                        label = f"{class_name}: {score:.2f}"
                        cv2.putText(display_frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)
                        
                        # Also draw on original frame for saved images
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                        cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)
            
                        # Log detection - keep original detection classes and confidence threshold
                        if class_name.lower() in ["bin", "garbage", "spills"] and score >= 0.0:
                            log_detection(class_name, x1, y1, x2, y2, frame, score)
            except Exception as e:
                print(f"Error during inference: {e}")
        
        # Add status text to the display frame
        cv2.putText(display_frame, "Press 'q' to exit", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        
        # Show detection window
        cv2.imshow("Smart Waste Detection", display_frame)
        
        # Exit on pressing 'q'
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
            
except KeyboardInterrupt:
    print("\nDetection stopped by user")
except Exception as e:
    print(f"\nAn error occurred: {e}")
finally:
    # Cleanup
    print("Cleaning up...")
    cap.release()
    cv2.destroyAllWindows()
    if os.path.exists("temp"):
        for file in os.listdir("temp"):
            os.remove(os.path.join("temp", file))
        os.rmdir("temp")
    print("Clean up complete, exiting...")

