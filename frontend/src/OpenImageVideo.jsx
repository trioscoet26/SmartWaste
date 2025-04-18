import { useState, useEffect } from "react";
import axios from "axios";

const OpenImageVideo = () => {
  const API_URL = import.meta.env.VITE_FLASK_API_URL; // Get Flask API URL from .env
  const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY; // Get Groq API key from .env
  const GROQ_API_URL = "https://api.groq.com/openai/v1"; // Groq API endpoint
  
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [wasteAnalysis, setWasteAnalysis] = useState(null);
  const [error, setError] = useState(null);

  // Clean up preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFileChange = async (event) => {
    setError(null);
    setWasteAnalysis(null);
    
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    
    // Create preview for the file
    const previewUrl = URL.createObjectURL(selectedFile);
    setPreview(previewUrl);
    
    // Update status message
    const statusElement = document.getElementById('camera-status');
    if (statusElement) {
      statusElement.textContent = 'File selected. Analyzing...';
      statusElement.className = 'mt-4 w-full text-center text-sm text-gray-600 dark:text-gray-300';
    }
    
    // Display the image or video in the placeholder
    const placeholderElement = document.getElementById('camera-placeholder');
    const videoElement = document.getElementById('camera-feed');
    
    if (placeholderElement && videoElement) {
      // Hide the video element and show placeholder
      videoElement.classList.add('hidden');
      placeholderElement.classList.remove('hidden');
      
      // Set the preview as placeholder content
      if (selectedFile.type.startsWith('image/')) {
        placeholderElement.innerHTML = `<img src="${previewUrl}" alt="Selected" class="h-full w-full object-contain rounded-lg" />`;
      } else if (selectedFile.type.startsWith('video/')) {
        placeholderElement.innerHTML = `
          <video src="${previewUrl}" controls class="h-full w-full object-contain rounded-lg"></video>
        `;
      }
    }
    
    setLoading(true);
    
    try {
      // First, upload to your Flask API if needed
      const formData = new FormData();
      formData.append("file", selectedFile);
      
      // Check file type and decide which API to call
      const fileType = selectedFile.type.split("/")[0]; // 'image' or 'video'
      const endpoint = fileType === "image" ? "open_image" : "open_video";
      
      // Upload to Flask API
      await fetch(`${API_URL}/${endpoint}`, {
        method: "POST",
        body: formData,
      });
      
      // If it's an image, analyze for waste classification
      if (fileType === "image") {
        await analyzeWasteInImage(selectedFile);
      } else {
        // For videos, just display a message
        if (statusElement) {
          statusElement.textContent = 'Video uploaded successfully. Waste detection in videos is not yet supported.';
        }
      }
      
    } catch (error) {
      console.error("Error processing file:", error);
      setError(error.message);
      
      // Update status message
      const statusElement = document.getElementById('camera-status');
      if (statusElement) {
        statusElement.textContent = `Error: ${error.message}`;
        statusElement.className = 'mt-4 w-full text-center text-sm text-red-500';
      }
    }
    
    setLoading(false);
  };

  // Helper function to resize image and convert to base64
  const resizeAndConvertToBase64 = (file, maxDimension) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Calculate new dimensions while maintaining aspect ratio
          let width = img.width;
          let height = img.height;
          if (width > height && width > maxDimension) {
            height = height * (maxDimension / width);
            width = maxDimension;
          } else if (height > maxDimension) {
            width = width * (maxDimension / height);
            height = maxDimension;
          }
          
          // Create canvas and resize image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Get base64 representation (without the prefix)
          const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
          resolve(base64);
        };
        img.onerror = reject;
        img.src = event.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const analyzeWasteInImage = async (imageFile) => {
    setAnalyzing(true);
    
    // Update status message
    const statusElement = document.getElementById('camera-status');
    if (statusElement) {
      statusElement.textContent = 'Analyzing image for waste using AI...';
    }
    
    try {
      // Resize image before converting to base64
      const resizedImageBase64 = await resizeAndConvertToBase64(imageFile, 800); // Max dimension 800px
      
      // Prepare Groq AI prompt - check if Groq supports vision models
      // If vision model is supported:
      try {
        // Try with vision-specific format first
        const visionMessages = [
          { 
            role: "system", 
            content: "You are a waste detection and classification AI assistant. Analyze images to identify waste and provide structured JSON responses." 
          },
          { 
            role: "user", 
            content: [
              {
                type: "text",
                text: `Analyze this image and determine if it contains garbage/waste.
                If waste is detected:
                1. Identify the type of waste (plastic, paper, organic, metal, electronic, hazardous, mixed, etc.)
                2. Provide a confidence score (0-100%)
                3. Give a brief description of what you see
                4. Suggest proper disposal method
                
                Return your analysis as JSON with the following structure:
                {
                  "isWaste": boolean,
                  "wasteType": string or null,
                  "confidence": number between 0-100 or null,
                  "description": string,
                  "disposalMethod": string or null
                }
                
                If no waste is detected, set isWaste to false and provide a description of what you see.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${resizedImageBase64}`
                }
              }
            ]
          }
        ];
        
        // Call Groq AI API with vision model
        const response = await axios.post(`${GROQ_API_URL}/chat/completions`, {
          model: "meta-llama/llama-4-scout-17b-16e-instruct", // Use vision model if available
          messages: visionMessages,
          response_format: { type: "json_object" }
        }, {
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        // Parse and store the waste analysis results
        const result = JSON.parse(response.data.choices[0].message.content);
        setWasteAnalysis(result);
        
        // Update UI with results
        updateUIWithResults(result, statusElement);

      } catch (visionError) {
        console.warn("Vision model API failed, falling back to text-only approach:", visionError);
        
        // Fallback to text-only approach with compressed image data
        const textPrompt = `
          Analyze this image and determine if it contains garbage/waste.
          If waste is detected:
          1. Identify the type of waste (plastic, paper, organic, metal, electronic, hazardous, mixed, etc.)
          2. Provide a confidence score (0-100%)
          3. Give a brief description of what you see
          4. Suggest proper disposal method
          
          Return your analysis as JSON with the following structure:
          {
            "isWaste": boolean,
            "wasteType": string or null,
            "confidence": number between 0-100 or null,
            "description": string,
            "disposalMethod": string or null
          }
          
          If no waste is detected, set isWaste to false and provide a description of what you see.
          
          Image (base64): ${resizedImageBase64.substring(0, 100)}...
        `;
        
        // Standard text-based API call
        const response = await axios.post(`${GROQ_API_URL}/chat/completions`, {
          model: "llama3-70b-8192", // Or another appropriate Groq model
          messages: [
            { 
              role: "system", 
              content: "You are a waste detection and classification AI assistant. Analyze images to identify waste and provide structured JSON responses." 
            },
            { 
              role: "user", 
              content: textPrompt 
            }
          ],
          response_format: { type: "json_object" }
        }, {
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        // Parse and store the waste analysis results
        const result = JSON.parse(response.data.choices[0].message.content);
        setWasteAnalysis(result);
        
        // Update UI with results
        updateUIWithResults(result, statusElement);
      }
      
      // If waste is detected and we have location, we could store this data
      if (wasteAnalysis && wasteAnalysis.isWaste && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          try {
            const wasteData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              timestamp: new Date().toISOString(),
              wasteType: wasteAnalysis.wasteType,
              confidence: wasteAnalysis.confidence,
              description: wasteAnalysis.description
            };
            
            // Store in database
            await axios.post(`https://smartwaste-3smg.onrender.com/api/waste/store-waste`, wasteData);
            
            // Update status to show location was saved
            if (statusElement && wasteAnalysis.isWaste) {
              statusElement.innerHTML += `
                <p class="mt-2 text-green-600 dark:text-green-400">✓ Location saved to map</p>
              `;
            }
          } catch (error) {
            console.error("Error storing waste location:", error);
          }
        });
      }
      
    } catch (error) {
      console.error("Error analyzing waste in image:", error);
      setError(error.message);
      
      // Update status message
      if (statusElement) {
        statusElement.textContent = `Error analyzing image: ${error.message}`;
        statusElement.className = 'mt-4 w-full text-center text-sm text-red-500';
      }
    }
    
    setAnalyzing(false);
  };
  
  // Helper function to update UI with waste analysis results
  const updateUIWithResults = (result, statusElement) => {
    if (statusElement) {
      if (result.isWaste) {
        statusElement.innerHTML = `
          <div class="text-left p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
            <p class="font-medium mb-1">✅ Waste Detected (${result.confidence}% confidence)</p>
            <p class="mb-1"><span class="font-medium">Type:</span> ${result.wasteType}</p>
            <p class="mb-1"><span class="font-medium">Description:</span> ${result.description}</p>
            <p><span class="font-medium">Disposal:</span> ${result.disposalMethod}</p>
          </div>
        `;
        statusElement.className = 'mt-4 w-full text-sm text-gray-700 dark:text-gray-200';
      } else {
        statusElement.innerHTML = `
          <div class="text-left p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
            <p class="font-medium mb-1">❓ No Waste Detected</p>
            <p>${result.description}</p>
          </div>
        `;
        statusElement.className = 'mt-4 w-full text-sm text-gray-700 dark:text-gray-200';
      }
    }
  };

  return (
    <label className={`cursor-pointer ${loading || analyzing ? 'bg-gray-500' : 'bg-blue-500 hover:bg-blue-600'} text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center transition duration-300 transform hover:scale-105 ${(loading || analyzing) ? 'opacity-75 cursor-not-allowed' : ''}`}>
      <input
        type="file"
        accept="image/*,video/mp4"
        onChange={handleFileChange}
        className="hidden"
        disabled={loading || analyzing}
      />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 mr-2"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 10l7-7m0 0l7 7m-7-7v14"
        />
      </svg>
      {loading ? "Uploading..." : 
       analyzing ? "Analyzing Waste..." : 
       "Upload Image or Video"}
    </label>
  );
};

export default OpenImageVideo;