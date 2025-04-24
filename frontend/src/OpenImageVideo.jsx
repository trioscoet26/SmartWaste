import { useState, useEffect } from "react";
import { Groq } from "groq-sdk";

const OpenImageVideo = () => {
  const API_URL = import.meta.env.VITE_FLASK_API_URL; // Get Flask API URL from .env
  const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY; // Get Groq API key from .env
  
  // Initialize Groq client
  const groq = new Groq({
    apiKey: GROQ_API_KEY, dangerouslyAllowBrowser: true,
  });
  
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
      const resizedImageBase64 = await resizeAndConvertToBase64(imageFile, 500); 
      
      // Try with vision-specific model first
      try {
        // Using Groq SDK for vision model request
        const visionResponse = await groq.chat.completions.create({
          model: "meta-llama/llama-4-scout-17b-16e-instruct", // Use vision model
          messages: [
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
                  3. Give a detailed description of what you see and Additional Details  
                  4. Suggest proper disposal method in details 
                  
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
          ],
          response_format: { type: "json_object" }
        });
        
        // Parse and store the waste analysis results
        const result = JSON.parse(visionResponse.choices[0].message.content);
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
          3. Give a detailed description of what you see and Additional Details  
          4. Suggest proper disposal method in details 
          
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
        
        // Using Groq SDK for text-based model request
        const textResponse = await groq.chat.completions.create({
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
        });
        
        // Parse and store the waste analysis results
        const result = JSON.parse(textResponse.choices[0].message.content);
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
            await fetch(`${API_URL}/api/waste/store-waste`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(wasteData)
            });
            
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
        // Enhanced UI for waste detection
        statusElement.innerHTML = `
          <div class="text-left p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border-l-4 border-green-500 shadow-sm">
            <div class="flex items-center mb-3">
              <div class="bg-green-100 dark:bg-green-800 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600 dark:text-green-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 class="font-bold text-green-700 dark:text-green-300">Waste Detected</h4>
                <div class="flex items-center mt-1">
                  <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div class="bg-green-600 h-2.5 rounded-full" style="width: ${result.confidence}%"></div>
                  </div>
                  <span class="ml-2 text-xs font-medium text-gray-700 dark:text-gray-300">${result.confidence}%</span>
                </div>
              </div>
            </div>
            
            <div class="grid grid-cols-1 gap-2 pt-2 border-t border-green-200 dark:border-green-800">
              <div>
                <h5 class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Type</h5>
                <p class="font-medium text-gray-800 dark:text-gray-200 flex items-center">
                  <span class="w-3 h-3 rounded-full ${getWasteTypeColor(result.wasteType)} mr-2"></span>
                  ${result.wasteType}
                </p>
              </div>
              
              <div>
                <h5 class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Description</h5>
                <p class="text-gray-700 dark:text-gray-300">${result.description}</p>
              </div>
              
              <div>
                <h5 class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Recommended Disposal</h5>
                <div class="flex items-start mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500 mr-1 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p class="text-gray-700 dark:text-gray-300">${result.disposalMethod}</p>
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        // Enhanced UI for no waste detection
        statusElement.innerHTML = `
          <div class="text-left p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border-l-4 border-yellow-500 shadow-sm">
            <div class="flex items-center mb-3">
              <div class="bg-yellow-100 dark:bg-yellow-800 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-600 dark:text-yellow-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h4 class="font-bold text-yellow-700 dark:text-yellow-300">No Waste Detected</h4>
            </div>
            
            <div class="pt-2 border-t border-yellow-200 dark:border-yellow-800">
              <p class="text-gray-700 dark:text-gray-300">${result.description}</p>
            </div>
          </div>
        `;
      }
      
      statusElement.className = 'mt-4 w-full text-sm';
    }
  };

  // Helper function to get background color based on waste type
  const getWasteTypeColor = (wasteType) => {
    const wasteColors = {
      'Plastic': 'bg-yellow-500',
      'Paper': 'bg-blue-500',
      'Glass': 'bg-green-500',
      'Metal': 'bg-yellow-500',
      'Electronic': 'bg-purple-500',
      'E-waste': 'bg-purple-500',
      'Hazardous': 'bg-orange-500',
      'Organic': 'bg-emerald-500',
      'mixed': 'bg-yellow-500'
    };
    
    return wasteColors[wasteType] || 'bg-gray-500';
  };

  return (
    <div className="flex justify-center">
      <label className={`w-80 cursor-pointer ${loading || analyzing ? 'bg-gray-500' : 'bg-blue-500 hover:bg-blue-600'} text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center transition duration-300 transform hover:scale-105 ${(loading || analyzing) ? 'opacity-75 cursor-not-allowed' : ''}`}>
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
       "Detect & Classify Waste"}
    </label>
    </div>
  );
};

export default OpenImageVideo;