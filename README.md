# AI-Powered Waste & Spill Detection System

## 🚀 Overview
An intelligent waste management solution that leverages AI-powered surveillance to detect garbage and spills in real time. The system automates task allocation to cleanup crews, enables public reporting of waste, and incentivizes community participation through rewards.

Our solution integrates **Groq's** high-performance AI inference for rapid detection and sentiment analysis, and **Fluvio** for real-time data streaming and processing.

## 🔗 Live Demo
👉 [Click here to view our live demo](https://smart-waste-virid.vercel.app/)

---

## 🛠️ Tech Stack & Services

### 🌐 Frontend
- ![React](https://img.shields.io/badge/-React.js-61DAFB?logo=react&logoColor=white&style=flat-square) React.js  
- ![TailwindCSS](https://img.shields.io/badge/-TailwindCSS-38B2AC?logo=tailwind-css&logoColor=white&style=flat-square) Tailwind CSS  
- ![React Charts](https://img.shields.io/badge/-React%20Charts-FF6F61?logo=chartdotjs&logoColor=white&style=flat-square) React Charts  

### 🧠 Backend
- ![Node.js](https://img.shields.io/badge/-Node.js-339933?logo=node.js&logoColor=white&style=flat-square) Node.js  
- ![Express.js](https://img.shields.io/badge/-Express.js-000000?logo=express&logoColor=white&style=flat-square) Express.js  

### 💾 Database
- ![MongoDB](https://img.shields.io/badge/-MongoDB-47A248?logo=mongodb&logoColor=white&style=flat-square) MongoDB  
- ![MongoDB Atlas](https://img.shields.io/badge/-MongoDB%20Atlas-11B48A?logo=mongodb&logoColor=white&style=flat-square) MongoDB Atlas (Cloud)  

### 🔌 Services
- ![GROQ](https://img.shields.io/badge/-GROQ%20API-FF4685?style=flat-square) GROQ API  
- ![GROQ SDK](https://img.shields.io/badge/-GROQ%20SDK-FF4685?style=flat-square) GROQ SDK  
- ![Fluvio](https://img.shields.io/badge/-Fluvio%20Client-FF4C4C?style=flat-square) Fluvio Client  

### 🧩 Core Technologies
- **Groq LPU (Language Processing Unit):** Ultra-low latency AI inference for real-time waste detection, classification, and sentiment analysis
- **Fluvio:** Stream processing platform for handling real-time data flows
- **AI-Powered CCTV:** Turns existing camera infrastructure into intelligent detection nodes
- **React.js & Node.js:** Seamless frontend and backend development
- **PyTorch:** For training and deploying AI models
- **MongoDB:** Persistent and structured data storage

### ☁️ Services Used
- **Groq API:** High-speed inference and NLP capabilities
- **Fluvio Streaming Platform:** Real-time data pipeline and event processing
- **MongoDB Atlas Cloud Storage:** Stores image and detection data securely on MongoDB Atlas
- **Clerk Authentication Services:** Ensures secure user access and roles
- **Razorpay Payment Gateway:** Processes community reward and incentive payouts
- **Twilio Notification Service:** Automated Calls and SMS to Notify Cleaning Crew

---

## ✨ Features

### 🗑️ Real-Time Waste Detection & Classification
- Detects garbage and spills from CCTV feeds instantly using Groq inference
- Classifies waste into categories: plastic, organic, liquid, etc.
- Prioritizes cleanup based on hazard level and location urgency
- Ultra-low latency streaming using Groq-optimized pipelines

### 🤖 Automated Task Management
- Automatically assigns cleanup jobs to field workers
- Routes are optimized for time and hazard level
- Tracks real-time status of each assigned task
- Measures performance metrics for reporting

### 📱 Interactive Public Reporting System
- Mobile-friendly interface for public waste reporting
- Live map displays hotspots and cleaning updates
- AI-powered verification to prevent false reports
- Gamified community participation and leaderboard

### 💬 Sentiment Analysis Pipeline
- Uses Groq AI  and `sentiment` library to process feedback
- Analyzes how citizens feel about area cleanliness
- Detects early signs of dissatisfaction or praise
- Provides actionable insights to improve services

### 🔄 Real-Time Data Processing with Fluvio
1. ✍️ **User submits a review** through the frontend
2. 🚀 **Backend API sends review** to a Fluvio topic
3. 🧠 **Fluvio consumer triggers** the `sentiment` library to compute score
4. 🔁 **Frontend receives sentiment score** instantly for live feedback

### 🎁 Reward System
- Public participation is rewarded with redeemable points
- AI ensures reports are legitimate before issuing rewards
- Tracks and celebrates top contributors
- Community challenges to increase civic engagement

---

## 🧰 Installation Instructions

### 📋 Prerequisites
- Node.js (v16+)
- Docker & Docker Compose
- Python 3.9+
- Groq API Key
- Fluvio Cluster (self-hosted or cloud-based)

### 📦 Step 1: Clone the Repository
```bash
git clone https://github.com/yourusername/waste-detection-system.git
cd waste-detection-system
```

### ⚙️ Step 2: Setup Environment Variables
```bash
cp .env.example .env
# Update the .env file with Groq API Key and Fluvio configurations
```

### 📥 Step 3: Install Dependencies
```bash
# Backend
cd backend
npm install
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### 🔌 Step 4: Setup Fluvio
```bash
# Install Fluvio CLI
download and run:
curl -fsS https://packages.fluvio.io/v1/install.sh | bash

# Start cluster (if local)
fluvio cluster start

# Create required topics
fluvio topic create waste-detections
fluvio topic create cleanup-tasks
fluvio topic create user-reports
fluvio topic create sentiment-analysis
```

### 🤖 Step 5: Configure Groq Integration
```bash
# Export API key
env variable:
export GROQ_API_KEY=your_api_key_here

# Test API connectivity
python scripts/test_groq_connection.py
```

### 🔄 Step 6: Start the Services
```bash
# Using Docker Compose
docker-compose up -d

# Or manually
cd backend && npm start
cd ../frontend && npm start
cd ../ml-service && python app.py
```

### 🌍 Step 7: Launch Application
Visit `http://localhost:3000` to explore the platform.

---

## 🤝 Contributing
We welcome your ideas, improvements, and bug fixes! See our [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## 📄 License
Licensed under the MIT License. See [LICENSE](LICENSE) for more information.

