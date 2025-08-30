import React, { useState, useEffect } from "react";
import { db, auth } from "./config/firebase";
import { collection, addDoc, getDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

// Use the production API URL directly to avoid connection issues
const API_URL = "https://transgression-vigilance.vercel.app";

// Teachable Machine model URL
const TM_MODEL_URL = "/my_model/";  // Updated path to correctly reference files in public directory

const CreatePost = ({ onClose }) => {
  const [content, setContent] = useState("");
  const [media, setMedia] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("Anonymous");
  const [apiStatus, setApiStatus] = useState({ checked: false, working: false });
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [locationError, setLocationError] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [tmModel, setTmModel] = useState(null);
  const [classificationResult, setClassificationResult] = useState("");
  const [classifying, setClassifying] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(null);
  
  const navigate = useNavigate();
  const userId = auth.currentUser?.uid || "unknown";

  // Load TensorFlow.js and Teachable Machine
  useEffect(() => {
    // Check if scripts are already loaded
    if ((window.tf && window.tmImage) || scriptsLoaded) {
      console.log("✅ TensorFlow.js and Teachable Machine already loaded");
      return;
    }

    const loadScripts = async () => {
      try {
        // Load TensorFlow.js Core
        if (!window.tf) {
          await new Promise((resolve, reject) => {
            const tfScript = document.createElement("script");
            tfScript.src = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.11.0/dist/tf.min.js";
            tfScript.async = false;
            tfScript.onload = () => {
              console.log("✅ TensorFlow.js Core loaded");
              resolve();
            };
            tfScript.onerror = () => {
              reject(new Error("Failed to load TensorFlow.js Core"));
            };
            document.body.appendChild(tfScript);
          });
        }

        // Wait for TF to be fully initialized
        await window.tf.ready();
        console.log("✅ TensorFlow.js initialized");

        // Load TensorFlow Backend
        if (!window.tf.backend()) {
          await new Promise((resolve, reject) => {
            const tfBackendScript = document.createElement("script");
            tfBackendScript.src = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl@3.11.0/dist/tf-backend-webgl.min.js";
            tfBackendScript.async = false;
            tfBackendScript.onload = () => {
              console.log("✅ TensorFlow.js WebGL backend loaded");
              resolve();
            };
            tfBackendScript.onerror = () => {
              reject(new Error("Failed to load TensorFlow.js WebGL backend"));
            };
            document.body.appendChild(tfBackendScript);
          });
          await window.tf.setBackend('webgl');
        }

        // Load Teachable Machine
        if (!window.tmImage) {
          await new Promise((resolve, reject) => {
            const tmScript = document.createElement("script");
            tmScript.src = "https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8.5/dist/teachablemachine-image.min.js";
            tmScript.async = false;
            tmScript.onload = () => {
              console.log("✅ Teachable Machine library loaded");
              resolve();
            };
            tmScript.onerror = () => {
              reject(new Error("Failed to load Teachable Machine"));
            };
            document.body.appendChild(tmScript);
          });
        }
        
        setScriptsLoaded(true);
        setScriptError(null);
      } catch (error) {
        console.error("Error loading scripts:", error);
        setScriptError("Failed to load AI components. Image analysis will not work.");
      }
    };

    loadScripts();
  }, [scriptsLoaded]);

  // Load the Teachable Machine model
  const loadTmModel = async () => {
    if (tmModel) return tmModel;
    
    if (!window.tmImage) {
      throw new Error("Teachable Machine library not loaded yet");
    }
    
    try {
      setClassifying(true);
      const modelURL = TM_MODEL_URL + "model.json";
      const metadataURL = TM_MODEL_URL + "metadata.json";
      console.log("Loading model from:", window.location.origin + modelURL);
      console.log("Metadata URL:", window.location.origin + metadataURL);
      
      // First check if we can access the model files
      try {
        const modelResponse = await fetch(modelURL);
        if (!modelResponse.ok) {
          throw new Error(`Failed to fetch model.json: ${modelResponse.status} ${modelResponse.statusText}`);
        }
        const metadataResponse = await fetch(metadataURL);
        if (!metadataResponse.ok) {
          throw new Error(`Failed to fetch metadata.json: ${metadataResponse.status} ${metadataResponse.statusText}`);
        }
        
        // Log the model structure
        const modelJson = await modelResponse.clone().json();
        console.log("Model structure:", modelJson);
        
        // Log the metadata structure
        const metadataJson = await metadataResponse.clone().json();
        console.log("Metadata structure:", metadataJson);
      } catch (error) {
        console.error("Failed to fetch model files:", error);
        throw error;
      }

      console.log("Attempting to load model with tmImage...");
      const model = await window.tmImage.load(modelURL, metadataURL);
      console.log("Model loaded successfully, checking model properties...");
      
      // Verify the model has the expected methods
      if (typeof model.predict !== 'function') {
        throw new Error("Loaded model does not have a predict function");
      }
      setTmModel(model);
      console.log("✅ Model loaded successfully");
      return model;
    } catch (error) {
      console.error("Error loading model:", error);
      setScriptError("Failed to load AI model. Please check the model path.");
      throw error;
    } finally {
      setClassifying(false);
    }
  };

  // Classify an image using the Teachable Machine model
  const classifyImage = async (imageElement) => {
    if (!window.tmImage) {
      throw new Error("Teachable Machine library not loaded");
    }
    
    try {
      setClassifying(true);
      const model = await loadTmModel();
      console.log("Classifying image...");
      
      // Ensure TensorFlow.js is properly initialized
      if (!window.tf || !window.tf.ready) {
        throw new Error("TensorFlow.js not properly initialized");
      }
      
      // Log memory state before prediction
      console.log("TensorFlow memory state:", window.tf.memory());
      
      // Verify image element is valid
      if (!(imageElement instanceof HTMLImageElement)) {
        throw new Error("Invalid image element provided");
      }
      console.log("Image dimensions:", imageElement.width, "x", imageElement.height);
      
      // Ensure image is loaded
      if (!imageElement.complete || !imageElement.naturalWidth) {
        throw new Error("Image is not fully loaded");
      }
      
      console.log("Making prediction...");
      const predictions = await model.predict(imageElement);
      console.log("Raw predictions:", predictions);
      
      // Find the prediction with the highest probability
      let bestPrediction = predictions[0];
      for (let i = 1; i < predictions.length; i++) {
        if (predictions[i].probability > bestPrediction.probability) {
          bestPrediction = predictions[i];
        }
      }
      
      const result = `${bestPrediction.className} (${(bestPrediction.probability * 100).toFixed(1)}%)`;
      setClassificationResult(result);
      return result;
    } catch (error) {
      console.error("Error classifying image:", error);
      setClassificationResult("Classification failed");
      setScriptError("Image analysis error. Please try a different image.");
      throw error;
    } finally {
      setClassifying(false);
    }
  };

  // Check if user is authenticated and fetch username
  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/");
      return;
    }
    
    // Check if the API is working
    checkApiStatus();
    
    // Fetch username from Firestore
    const fetchUsername = async () => {
      if (userId === "unknown") return;

      try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          setUsername(userDoc.data().name || "Anonymous");
        }
      } catch (error) {
        console.error("Error fetching username:", error);
      }
    };

    fetchUsername();
  }, [userId, navigate]);
  
  const checkApiStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`);
      const data = await response.json();
      setApiStatus({ checked: true, working: data.status === "ok" });
      console.log("API status:", data.status === "ok" ? "working" : "not working");
    } catch (error) {
      console.error("API health check failed:", error);
      setApiStatus({ checked: true, working: false });
    }
  };

  // Get user's current location
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setLocation(coords);
          setLocationError(null);
          setGettingLocation(false);
          resolve(coords);
        },
        (err) => {
          const errorMessage = 'Unable to retrieve location. Please enable location services.';
          setLocationError(errorMessage);
          setGettingLocation(false);
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  };

  // Handle file selection
  const handleMediaChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setMedia(file);
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setClassificationResult(""); // Reset previous classification
    setScriptError(null); // Reset script errors
    
    // Classify the image
    const img = new Image();
    img.src = preview;
    
    img.onload = async () => {
      try {
        // Wait for scripts to load if they're not ready yet
        if (!window.tmImage) {
          setClassifying(true);
          setClassificationResult("Loading AI components...");
          // Wait a bit for scripts to load
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        await classifyImage(img);
      } catch (error) {
        console.error("Classification error:", error);
        setClassificationResult("Analysis failed");
      }
    };
  };

  // Upload to ImageKit using production API
  const uploadToImageKit = async (file) => {
    if (!file) return "";

    try {
      console.log("Getting ImageKit auth tokens from:", `${API_URL}/api/auth`);
      const authResponse = await fetch(`${API_URL}/api/auth`);
      if (!authResponse.ok) {
        throw new Error(`Failed to get auth tokens: ${authResponse.status} ${authResponse.statusText}`);
      }
      
      const authData = await authResponse.json();
      console.log("Auth data received:", authData);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", `post_${Date.now()}_${file.name}`);
      formData.append("publicKey", "public_KoLQpUZM3TZfPrc1If4RUVRgHAw=");
      formData.append("signature", authData.signature);
      formData.append("expire", authData.expire);
      formData.append("token", authData.token);
      formData.append("folder", "/uploads");
      
      console.log("Uploading to ImageKit...");
      const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Upload result:", result);
      
      if (!result.url) {
        throw new Error("Upload failed: " + (result.error?.message || "No URL returned"));
      }

      return result.url;
    } catch (error) {
      console.error("Image upload failed:", error);
      alert(`Image upload failed: ${error.message}`);
      return "";
    }
  };

  // Form validation
  const validateForm = () => {
    if (!content.trim()) {
      alert("Please enter some content for your post");
      return false;
    }
    if (!media) {
      alert("Please upload an image for your post");
      return false;
    }
    return true;
  };

  // Handle post creation
  const handlePost = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Get current location first
      let currentLocation;
      try {
        currentLocation = await getCurrentLocation();
      } catch (error) {
        console.error("Location error:", error);
        const confirmWithoutLocation = window.confirm(
          "Unable to get your location. Do you want to continue posting without location data?"
        );
        if (!confirmWithoutLocation) {
          setLoading(false);
          return;
        }
        currentLocation = { latitude: null, longitude: null };
      }

      // Check if API is working before attempting upload
      if (!apiStatus.working) {
        await checkApiStatus();
        if (!apiStatus.working) {
          throw new Error("API is not available. Please try again later.");
        }
      }

      const mediaUrl = await uploadToImageKit(media);
      if (!mediaUrl) {
        alert("Image upload failed. Cannot create post.");
        setLoading(false);
        return;
      }

      // Store post data in Firestore with location coordinates
      const postData = {
        username,
        userId,
        content,
        mediaUrl,
        classification: classificationResult, // Add classification result to post data
        location: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        },
        createdAt: new Date(),
      };

      await addDoc(collection(db, "posts"), postData);

      alert("Post created successfully!");
      onClose();
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
      <div className="bg-gray-900 text-white p-6 rounded-lg w-full max-w-md relative shadow-xl">
        <button 
          onClick={onClose} 
          className="absolute top-2 right-4 text-2xl text-gray-400 hover:text-gray-200"
        >
          &times;
        </button>

        <h2 className="text-xl font-semibold mb-4">Create a Post</h2>

        {!apiStatus.working && apiStatus.checked && (
          <div className="mb-4 p-2 bg-red-900 text-white rounded border border-red-700">
            API connection error. Image upload may not work properly.
          </div>
        )}

        {scriptError && (
          <div className="mb-4 p-2 bg-yellow-900 text-white rounded border border-yellow-700">
            {scriptError}
          </div>
        )}

        <textarea
          className="w-full p-2 bg-gray-800 rounded resize-none focus:ring-red-500 focus:border-red-500"
          rows="3"
          placeholder="What do you want to share?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        ></textarea>

        {/* Location Status Display */}
        <div className="mt-2 p-2 bg-gray-800 rounded">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">
              📍 Location will be captured on post
            </span>
            {gettingLocation && (
              <span className="text-xs text-blue-400">Getting location...</span>
            )}
          </div>
          {location.latitude && location.longitude && (
            <div className="text-xs text-green-400 mt-1">
              ✓ Location ready: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </div>
          )}
          {locationError && (
            <div className="text-xs text-red-400 mt-1">
              ⚠️ {locationError}
            </div>
          )}
        </div>

        <div className="mt-4">
          <label className="cursor-pointer flex items-center justify-center w-full p-2 border border-gray-700 border-dashed rounded-lg hover:bg-gray-800">
            <div className="space-y-1 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-sm text-gray-400">Upload image</span>
            </div>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleMediaChange} 
              className="hidden" 
            />
          </label>
        </div>

        {previewUrl && (
          <div className="mt-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Preview
            </label>
            <div className="border border-gray-700 rounded-lg overflow-hidden">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-full h-48 object-cover" 
              />
            </div>
            
            {/* Classification Result */}
            {classifying ? (
              <div className="mt-2 text-sm text-blue-400">
                Analyzing image...
              </div>
            ) : classificationResult && (
              <div className="mt-2 p-2 bg-gray-800 rounded">
                <div className="text-sm font-medium text-gray-300">Image Analysis:</div>
                <div className="text-green-400">{classificationResult}</div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handlePost}
          className="w-full bg-red-600 text-white p-2 rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          disabled={loading || gettingLocation}
        >
          {loading ? "Posting..." : gettingLocation ? "Getting Location..." : "Post"}
        </button>

        <div className="mt-2 text-xs text-gray-400 text-center">
          Your location will be automatically captured when you post
        </div>
      </div>
    </div>
  );
};

export default CreatePost;

// import React, { useState, useEffect, useRef } from "react";
// import { db, auth } from "./config/firebase";
// import { collection, addDoc, getDoc, doc } from "firebase/firestore";
// import { useNavigate } from "react-router-dom";

// // Use the production API URL directly to avoid connection issues
// const API_URL = "https://transgression-vigilance.vercel.app";

// // Replace this with your Teachable Machine model URL
// const TEACHABLE_MACHINE_MODEL_URL = "https://teachablemachine.withgoogle.com/models/S6qsdZW7J/";

// const CreatePost = ({ onClose }) => {
//   const [content, setContent] = useState("");
//   const [media, setMedia] = useState(null);
//   const [previewUrl, setPreviewUrl] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [username, setUsername] = useState("Anonymous");
//   const [apiStatus, setApiStatus] = useState({ checked: false, working: false });
//   const [location, setLocation] = useState({ latitude: null, longitude: null });
//   const [locationError, setLocationError] = useState(null);
//   const [gettingLocation, setGettingLocation] = useState(false);
//   const [moderationStatus, setModerationStatus] = useState(null); // "checking", "approved", "rejected"
//   const [moderationScore, setModerationScore] = useState(0);
//   const [moderationDetails, setModerationDetails] = useState("");
//   const [model, setModel] = useState(null);
  
//   const navigate = useNavigate();
//   const userId = auth.currentUser?.uid || "unknown";
//   const imageRef = useRef(null);

//   // Load Teachable Machine model
//   useEffect(() => {
//     const loadModel = async () => {
//       try {
//         // Load TensorFlow.js and Teachable Machine library
//         if (!window.tf) {
//           const script1 = document.createElement('script');
//           script1.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js';
//           document.head.appendChild(script1);
          
//           await new Promise(resolve => {
//             script1.onload = resolve;
//           });
//         }

//         if (!window.tmImage) {
//           const script2 = document.createElement('script');
//           script2.src = 'https://cdn.jsdelivr.net/npm/@teachablemachine/image@latest/dist/tf.min.js';
//           document.head.appendChild(script2);
          
//           await new Promise(resolve => {
//             script2.onload = resolve;
//           });
//         }

//         // Load your trained model
//         const loadedModel = await window.tmImage.load(
//           TEACHABLE_MACHINE_MODEL_URL + 'model.json',
//           TEACHABLE_MACHINE_MODEL_URL + 'metadata.json'
//         );
        
//         setModel(loadedModel);
//         console.log('Teachable Machine model loaded successfully');
//       } catch (error) {
//         console.error('Failed to load Teachable Machine model:', error);
//         alert('Failed to load AI moderation model. Please refresh and try again.');
//       }
//     };

//     loadModel();
//   }, []);

//   // Check if user is authenticated and fetch username
//   useEffect(() => {
//     if (!auth.currentUser) {
//       navigate("/");
//       return;
//     }
    
//     checkApiStatus();
    
//     const fetchUsername = async () => {
//       if (userId === "unknown") return;

//       try {
//         const userDoc = await getDoc(doc(db, "users", userId));
//         if (userDoc.exists()) {
//           setUsername(userDoc.data().name || "Anonymous");
//         }
//       } catch (error) {
//         console.error("Error fetching username:", error);
//       }
//     };

//     fetchUsername();
//   }, [userId, navigate]);
  
//   const checkApiStatus = async () => {
//     try {
//       const response = await fetch(`${API_URL}/api/health`);
//       const data = await response.json();
//       setApiStatus({ checked: true, working: data.status === "ok" });
//       console.log("API status:", data.status === "ok" ? "working" : "not working");
//     } catch (error) {
//       console.error("API health check failed:", error);
//       setApiStatus({ checked: true, working: false });
//     }
//   };

//   // AI Image Moderation using Teachable Machine
//   const moderateImageWithTeachableMachine = async (file) => {
//     if (!model) {
//       alert('AI model not loaded yet. Please wait and try again.');
//       return false;
//     }

//     try {
//       setModerationStatus("checking");
//       console.log("Starting Teachable Machine moderation...");
      
//       // Create an image element to load the file
//       const img = new Image();
//       const canvas = document.createElement('canvas');
//       const ctx = canvas.getContext('2d');
      
//       return new Promise((resolve) => {
//         img.onload = async () => {
//           // Resize image to model input size (usually 224x224 for Teachable Machine)
//           canvas.width = 224;
//           canvas.height = 224;
//           ctx.drawImage(img, 0, 0, 224, 224);
          
//           try {
//             // Get predictions from the model
//             const predictions = await model.predict(canvas);
//             console.log('Teachable Machine predictions:', predictions);
            
//             // Find the highest confidence prediction
//             let maxConfidence = 0;
//             let predictedClass = '';
            
//             predictions.forEach((prediction) => {
//               if (prediction.probability > maxConfidence) {
//                 maxConfidence = prediction.probability;
//                 predictedClass = prediction.className;
//               }
//             });
            
//             // Convert confidence to percentage score
//             const score = Math.round(maxConfidence * 100);
            
//             // Determine if approved based on your class labels
//             // Adjust these based on your Teachable Machine classes
//             const approvedClasses = ['appropriate', 'safe', 'good', 'approved', 'clean'];
//             const rejectedClasses = ['inappropriate', 'unsafe', 'bad', 'rejected', 'explicit'];
            
//             let isApproved;
//             if (approvedClasses.some(cls => predictedClass.toLowerCase().includes(cls.toLowerCase()))) {
//               isApproved = score > 50; // High confidence in "good" class
//             } else if (rejectedClasses.some(cls => predictedClass.toLowerCase().includes(cls.toLowerCase()))) {
//               isApproved = score < 50; // Low confidence in "bad" class means it's probably good
//             } else {
//               // For custom class names, use score threshold
//               isApproved = score > 70; // Higher threshold for unknown classes
//             }
            
//             setModerationScore(score);
//             setModerationDetails(`Detected: ${predictedClass} (${score}% confidence)`);
            
//             if (isApproved) {
//               setModerationStatus("approved");
//               resolve(true);
//             } else {
//               setModerationStatus("rejected");
//               alert(`Image rejected: ${predictedClass} detected with ${score}% confidence`);
//               resolve(false);
//             }
            
//           } catch (error) {
//             console.error('Prediction failed:', error);
//             setModerationStatus("rejected");
//             alert('Failed to analyze image. Please try again.');
//             resolve(false);
//           }
//         };
        
//         img.onerror = () => {
//           setModerationStatus("rejected");
//           alert('Failed to load image for analysis.');
//           resolve(false);
//         };
        
//         img.src = URL.createObjectURL(file);
//       });
      
//     } catch (error) {
//       console.error("Teachable Machine moderation failed:", error);
//       setModerationStatus("rejected");
//       alert("Failed to check image. Please try again.");
//       return false;
//     }
//   };

//   // Get user's current location
//   const getCurrentLocation = () => {
//     return new Promise((resolve, reject) => {
//       if (!('geolocation' in navigator)) {
//         reject(new Error('Geolocation is not supported by this browser'));
//         return;
//       }

//       setGettingLocation(true);
//       navigator.geolocation.getCurrentPosition(
//         (position) => {
//           const coords = {
//             latitude: position.coords.latitude,
//             longitude: position.coords.longitude,
//           };
//           setLocation(coords);
//           setLocationError(null);
//           setGettingLocation(false);
//           resolve(coords);
//         },
//         (err) => {
//           const errorMessage = 'Unable to retrieve location. Please enable location services.';
//           setLocationError(errorMessage);
//           setGettingLocation(false);
//           reject(new Error(errorMessage));
//         },
//         {
//           enableHighAccuracy: true,
//           timeout: 10000,
//           maximumAge: 300000
//         }
//       );
//     });
//   };

//   // Handle file selection with Teachable Machine moderation
//   const handleMediaChange = async (e) => {
//     const file = e.target.files[0];
//     if (file) {
//       // Check file size (optional)
//       if (file.size > 10 * 1024 * 1024) { // 10MB limit
//         alert('File too large. Please select an image under 10MB.');
//         e.target.value = '';
//         return;
//       }

//       // Check file type
//       if (!file.type.startsWith('image/')) {
//         alert('Please select a valid image file.');
//         e.target.value = '';
//         return;
//       }

//       setMedia(file);
//       setPreviewUrl(URL.createObjectURL(file));
      
//       // Start Teachable Machine moderation
//       const isApproved = await moderateImageWithTeachableMachine(file);
      
//       if (!isApproved) {
//         // Clear the selected file if rejected
//         setMedia(null);
//         setPreviewUrl(null);
//         e.target.value = '';
//       }
//     }
//   };

//   // Upload to ImageKit (only called if image passes moderation)
//   const uploadToImageKit = async (file) => {
//     if (!file) return "";

//     try {
//       console.log("Getting ImageKit auth tokens from:", `${API_URL}/api/auth`);
//       const authResponse = await fetch(`${API_URL}/api/auth`);
//       if (!authResponse.ok) {
//         throw new Error(`Failed to get auth tokens: ${authResponse.status} ${authResponse.statusText}`);
//       }
      
//       const authData = await authResponse.json();
//       console.log("Auth data received:", authData);

//       const formData = new FormData();
//       formData.append("file", file);
//       formData.append("fileName", `post_${Date.now()}_${file.name}`);
//       formData.append("publicKey", "public_KoLQpUZM3TZfPrc1If4RUVRgHAw=");
//       formData.append("signature", authData.signature);
//       formData.append("expire", authData.expire);
//       formData.append("token", authData.token);
//       formData.append("folder", "/uploads");
      
//       console.log("Uploading to ImageKit...");
//       const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
//         method: "POST",
//         body: formData,
//       });

//       if (!response.ok) {
//         throw new Error(`Upload failed with status: ${response.status} ${response.statusText}`);
//       }

//       const result = await response.json();
//       console.log("Upload result:", result);
      
//       if (!result.url) {
//         throw new Error("Upload failed: " + (result.error?.message || "No URL returned"));
//       }

//       return result.url;
//     } catch (error) {
//       console.error("Image upload failed:", error);
//       alert(`Image upload failed: ${error.message}`);
//       return "";
//     }
//   };

//   // Form validation
//   const validateForm = () => {
//     if (!content.trim()) {
//       alert("Please enter some content for your post");
//       return false;
//     }
//     if (!media) {
//       alert("Please upload an image for your post");
//       return false;
//     }
//     if (moderationStatus !== "approved") {
//       alert("Please wait for image approval or upload a different image");
//       return false;
//     }
//     return true;
//   };

//   // Handle post creation
//   const handlePost = async () => {
//     if (!validateForm()) return;

//     setLoading(true);
//     try {
//       // Get current location first
//       let currentLocation;
//       try {
//         currentLocation = await getCurrentLocation();
//       } catch (error) {
//         console.error("Location error:", error);
//         const confirmWithoutLocation = window.confirm(
//           "Unable to get your location. Do you want to continue posting without location data?"
//         );
//         if (!confirmWithoutLocation) {
//           setLoading(false);
//           return;
//         }
//         currentLocation = { latitude: null, longitude: null };
//       }

//       if (!apiStatus.working) {
//         await checkApiStatus();
//         if (!apiStatus.working) {
//           throw new Error("API is not available. Please try again later.");
//         }
//       }

//       const mediaUrl = await uploadToImageKit(media);
//       if (!mediaUrl) {
//         alert("Image upload failed. Cannot create post.");
//         setLoading(false);
//         return;
//       }

//       // Store post data in Firestore
//       const postData = {
//         username,
//         userId,
//         content,
//         mediaUrl,
//         location: {
//           latitude: currentLocation.latitude,
//           longitude: currentLocation.longitude,
//         },
//         moderationScore: moderationScore,
//         moderationDetails: moderationDetails,
//         moderationApproved: true,
//         createdAt: new Date(),
//       };

//       await addDoc(collection(db, "posts"), postData);

//       alert("Post created successfully!");
//       onClose();
//     } catch (error) {
//       console.error("Error creating post:", error);
//       alert("Failed to create post: " + error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Helper function to get moderation status styling
//   const getModerationStatusStyle = () => {
//     switch (moderationStatus) {
//       case "checking":
//         return "bg-yellow-900 text-yellow-200 border-yellow-700";
//       case "approved":
//         return "bg-green-900 text-green-200 border-green-700";
//       case "rejected":
//         return "bg-red-900 text-red-200 border-red-700";
//       default:
//         return "";
//     }
//   };

//   const getModerationStatusText = () => {
//     switch (moderationStatus) {
//       case "checking":
//         return "🔍 Analyzing image with AI...";
//       case "approved":
//         return `✅ Image approved (${moderationScore}% confidence)`;
//       case "rejected":
//         return `❌ Image rejected (${moderationDetails})`;
//       default:
//         return "";
//     }
//   };

//   return (
//     <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
//       <div className="bg-gray-900 text-white p-6 rounded-lg w-full max-w-md relative shadow-xl">
//         <button 
//           onClick={onClose} 
//           className="absolute top-2 right-4 text-2xl text-gray-400 hover:text-gray-200"
//         >
//           &times;
//         </button>

//         <h2 className="text-xl font-semibold mb-4">Create a Post</h2>

//         {!model && (
//           <div className="mb-4 p-2 bg-blue-900 text-blue-200 rounded border border-blue-700">
//             🤖 Loading AI moderation model...
//           </div>
//         )}

//         {!apiStatus.working && apiStatus.checked && (
//           <div className="mb-4 p-2 bg-red-900 text-white rounded border border-red-700">
//             API connection error. Image upload may not work properly.
//           </div>
//         )}

//         <textarea
//           className="w-full p-2 bg-gray-800 rounded resize-none focus:ring-red-500 focus:border-red-500"
//           rows="3"
//           placeholder="What do you want to share?"
//           value={content}
//           onChange={(e) => setContent(e.target.value)}
//         ></textarea>

//         {/* Location Status Display */}
//         <div className="mt-2 p-2 bg-gray-800 rounded">
//           <div className="flex items-center justify-between">
//             <span className="text-sm text-gray-300">
//               📍 Location will be captured on post
//             </span>
//             {gettingLocation && (
//               <span className="text-xs text-blue-400">Getting location...</span>
//             )}
//           </div>
//           {location.latitude && location.longitude && (
//             <div className="text-xs text-green-400 mt-1">
//               ✓ Location ready: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
//             </div>
//           )}
//           {locationError && (
//             <div className="text-xs text-red-400 mt-1">
//               ⚠️ {locationError}
//             </div>
//           )}
//         </div>

//         {/* Image Upload Section */}
//         <div className="mt-4">
//           <label className="cursor-pointer flex items-center justify-center w-full p-2 border border-gray-700 border-dashed rounded-lg hover:bg-gray-800">
//             <div className="space-y-1 text-center">
//               <svg
//                 className="mx-auto h-12 w-12 text-gray-400"
//                 stroke="currentColor"
//                 fill="none"
//                 viewBox="0 0 48 48"
//                 aria-hidden="true"
//               >
//                 <path
//                   d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
//                   strokeWidth="2"
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                 />
//               </svg>
//               <span className="text-sm text-gray-400">
//                 {!model ? "Loading AI model..." : "Upload image (AI will check it)"}
//               </span>
//             </div>
//             <input 
//               type="file" 
//               accept="image/*" 
//               onChange={handleMediaChange} 
//               className="hidden"
//               disabled={moderationStatus === "checking" || !model}
//             />
//           </label>
//         </div>

//         {/* Moderation Status Display */}
//         {moderationStatus && (
//           <div className={`mt-2 p-2 rounded border ${getModerationStatusStyle()}`}>
//             <div className="text-sm text-center">
//               {getModerationStatusText()}
//             </div>
//             {moderationDetails && moderationStatus === "approved" && (
//               <div className="text-xs text-center mt-1 opacity-75">
//                 {moderationDetails}
//               </div>
//             )}
//           </div>
//         )}

//         {/* Image Preview (only show if approved) */}
//         {previewUrl && moderationStatus === "approved" && (
//           <div className="mt-2">
//             <label className="block text-sm font-medium text-gray-300 mb-1">
//               Preview - AI Approved ✓
//             </label>
//             <div className="border border-green-700 rounded-lg overflow-hidden">
//               <img 
//                 ref={imageRef}
//                 src={previewUrl} 
//                 alt="Preview" 
//                 className="w-full h-48 object-cover" 
//               />
//             </div>
//           </div>
//         )}

//         <button
//           onClick={handlePost}
//           className="w-full bg-red-600 text-white p-2 rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
//           disabled={loading || gettingLocation || moderationStatus !== "approved" || !model}
//         >
//           {loading ? "Posting..." : 
//            gettingLocation ? "Getting Location..." : 
//            moderationStatus === "checking" ? "AI Checking Image..." :
//            !model ? "Loading AI Model..." :
//            moderationStatus !== "approved" ? "Upload & Approve Image First" :
//            "Post"}
//         </button>

//         <div className="mt-2 text-xs text-gray-400 text-center">
//           🤖 Powered by Teachable Machine AI • Your location will be captured when you post
//           {moderationStatus === "approved" && ` • Score: ${moderationScore}%`}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CreatePost;

// // import React, { useState, useEffect } from "react";
// // import { db, auth } from "./config/firebase";
// // import { collection, addDoc, getDoc, doc } from "firebase/firestore";
// // import { useNavigate } from "react-router-dom";

// // // Use the production API URL directly to avoid connection issues
// // const API_URL = "https://transgression-vigilance.vercel.app";

// // const CreatePost = ({ onClose }) => {
// //   const [content, setContent] = useState("");
// //   const [media, setMedia] = useState(null);
// //   const [previewUrl, setPreviewUrl] = useState(null);
// //   const [loading, setLoading] = useState(false);
// //   const [username, setUsername] = useState("Anonymous"); // Default value
// //   const [apiStatus, setApiStatus] = useState({ checked: false, working: false });
// //   const [location, setLocation] = useState({ latitude: null, longitude: null });
// //   const [locationError, setLocationError] = useState(null);
// //   const [gettingLocation, setGettingLocation] = useState(false);
  
// //   const navigate = useNavigate();
// //   const userId = auth.currentUser?.uid || "unknown";

// //   // Check if user is authenticated and fetch username
// //   useEffect(() => {
// //     if (!auth.currentUser) {
// //       navigate("/");
// //       return;
// //     }
    
// //     // Check if the API is working
// //     checkApiStatus();
    
// //     // Fetch username from Firestore
// //     const fetchUsername = async () => {
// //       if (userId === "unknown") return;

// //       try {
// //         const userDoc = await getDoc(doc(db, "users", userId));
// //         if (userDoc.exists()) {
// //           setUsername(userDoc.data().name || "Anonymous");
// //         }
// //       } catch (error) {
// //         console.error("Error fetching username:", error);
// //       }
// //     };

// //     fetchUsername();
// //   }, [userId, navigate]);
  
// //   const checkApiStatus = async () => {
// //     try {
// //       const response = await fetch(`${API_URL}/api/health`);
// //       const data = await response.json();
// //       setApiStatus({ checked: true, working: data.status === "ok" });
// //       console.log("API status:", data.status === "ok" ? "working" : "not working");
// //     } catch (error) {
// //       console.error("API health check failed:", error);
// //       setApiStatus({ checked: true, working: false });
// //     }
// //   };

// //   // Get user's current location
// //   const getCurrentLocation = () => {
// //     return new Promise((resolve, reject) => {
// //       if (!('geolocation' in navigator)) {
// //         reject(new Error('Geolocation is not supported by this browser'));
// //         return;
// //       }

// //       setGettingLocation(true);
// //       navigator.geolocation.getCurrentPosition(
// //         (position) => {
// //           const coords = {
// //             latitude: position.coords.latitude,
// //             longitude: position.coords.longitude,
// //           };
// //           setLocation(coords);
// //           setLocationError(null);
// //           setGettingLocation(false);
// //           resolve(coords);
// //         },
// //         (err) => {
// //           const errorMessage = 'Unable to retrieve location. Please enable location services.';
// //           setLocationError(errorMessage);
// //           setGettingLocation(false);
// //           reject(new Error(errorMessage));
// //         },
// //         {
// //           enableHighAccuracy: true,
// //           timeout: 10000,
// //           maximumAge: 300000 // 5 minutes
// //         }
// //       );
// //     });
// //   };

// //   // Handle file selection
// //   const handleMediaChange = (e) => {
// //     const file = e.target.files[0];
// //     if (file) {
// //       setMedia(file);
// //       setPreviewUrl(URL.createObjectURL(file));
// //     }
// //   };

// //   // Upload to ImageKit using production API
// //   const uploadToImageKit = async (file) => {
// //     if (!file) return "";

// //     try {
// //       console.log("Getting ImageKit auth tokens from:", `${API_URL}/api/auth`);
// //       const authResponse = await fetch(`${API_URL}/api/auth`);
// //       if (!authResponse.ok) {
// //         throw new Error(`Failed to get auth tokens: ${authResponse.status} ${authResponse.statusText}`);
// //       }
      
// //       const authData = await authResponse.json();
// //       console.log("Auth data received:", authData);

// //       const formData = new FormData();
// //       formData.append("file", file);
// //       formData.append("fileName", `post_${Date.now()}_${file.name}`);
// //       formData.append("publicKey", "public_KoLQpUZM3TZfPrc1If4RUVRgHAw=");
// //       formData.append("signature", authData.signature);
// //       formData.append("expire", authData.expire);
// //       formData.append("token", authData.token);
// //       formData.append("folder", "/uploads");
      
// //       console.log("Uploading to ImageKit...");
// //       const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
// //         method: "POST",
// //         body: formData,
// //       });

// //       if (!response.ok) {
// //         throw new Error(`Upload failed with status: ${response.status} ${response.statusText}`);
// //       }

// //       const result = await response.json();
// //       console.log("Upload result:", result);
      
// //       if (!result.url) {
// //         throw new Error("Upload failed: " + (result.error?.message || "No URL returned"));
// //       }

// //       return result.url;
// //     } catch (error) {
// //       console.error("Image upload failed:", error);
// //       alert(`Image upload failed: ${error.message}`);
// //       return "";
// //     }
// //   };

// //   // Form validation
// //   const validateForm = () => {
// //     if (!content.trim()) {
// //       alert("Please enter some content for your post");
// //       return false;
// //     }
// //     if (!media) {
// //       alert("Please upload an image for your post");
// //       return false;
// //     }
// //     return true;
// //   };

// //   // Handle post creation
// //   const handlePost = async () => {
// //     if (!validateForm()) return;

// //     setLoading(true);
// //     try {
// //       // Get current location first
// //       let currentLocation;
// //       try {
// //         currentLocation = await getCurrentLocation();
// //       } catch (error) {
// //         console.error("Location error:", error);
// //         const confirmWithoutLocation = window.confirm(
// //           "Unable to get your location. Do you want to continue posting without location data?"
// //         );
// //         if (!confirmWithoutLocation) {
// //           setLoading(false);
// //           return;
// //         }
// //         currentLocation = { latitude: null, longitude: null };
// //       }

// //       // Check if API is working before attempting upload
// //       if (!apiStatus.working) {
// //         await checkApiStatus();
// //         if (!apiStatus.working) {
// //           throw new Error("API is not available. Please try again later.");
// //         }
// //       }

// //       const mediaUrl = await uploadToImageKit(media);
// //       if (!mediaUrl) {
// //         alert("Image upload failed. Cannot create post.");
// //         setLoading(false);
// //         return;
// //       }

// //       // Store post data in Firestore with location coordinates
// //       const postData = {
// //         username,
// //         userId,
// //         content,
// //         mediaUrl,
// //         location: {
// //           latitude: currentLocation.latitude,
// //           longitude: currentLocation.longitude,
// //         },
// //         createdAt: new Date(),
// //       };

// //       await addDoc(collection(db, "posts"), postData);

// //       alert("Post created successfully!");
// //       onClose();
// //     } catch (error) {
// //       console.error("Error creating post:", error);
// //       alert("Failed to create post: " + error.message);
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   return (
// //     <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
// //       <div className="bg-gray-900 text-white p-6 rounded-lg w-full max-w-md relative shadow-xl">
// //         <button 
// //           onClick={onClose} 
// //           className="absolute top-2 right-4 text-2xl text-gray-400 hover:text-gray-200"
// //         >
// //           &times;
// //         </button>

// //         <h2 className="text-xl font-semibold mb-4">Create a Post</h2>

// //         {!apiStatus.working && apiStatus.checked && (
// //           <div className="mb-4 p-2 bg-red-900 text-white rounded border border-red-700">
// //             API connection error. Image upload may not work properly.
// //           </div>
// //         )}

// //         <textarea
// //           className="w-full p-2 bg-gray-800 rounded resize-none focus:ring-red-500 focus:border-red-500"
// //           rows="3"
// //           placeholder="What do you want to share?"
// //           value={content}
// //           onChange={(e) => setContent(e.target.value)}
// //         ></textarea>

// //         {/* Location Status Display */}
// //         <div className="mt-2 p-2 bg-gray-800 rounded">
// //           <div className="flex items-center justify-between">
// //             <span className="text-sm text-gray-300">
// //               📍 Location will be captured on post
// //             </span>
// //             {gettingLocation && (
// //               <span className="text-xs text-blue-400">Getting location...</span>
// //             )}
// //           </div>
// //           {location.latitude && location.longitude && (
// //             <div className="text-xs text-green-400 mt-1">
// //               ✓ Location ready: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
// //             </div>
// //           )}
// //           {locationError && (
// //             <div className="text-xs text-red-400 mt-1">
// //               ⚠️ {locationError}
// //             </div>
// //           )}
// //         </div>

// //         <div className="mt-4">
// //           <label className="cursor-pointer flex items-center justify-center w-full p-2 border border-gray-700 border-dashed rounded-lg hover:bg-gray-800">
// //             <div className="space-y-1 text-center">
// //               <svg
// //                 className="mx-auto h-12 w-12 text-gray-400"
// //                 stroke="currentColor"
// //                 fill="none"
// //                 viewBox="0 0 48 48"
// //                 aria-hidden="true"
// //               >
// //                 <path
// //                   d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
// //                   strokeWidth="2"
// //                   strokeLinecap="round"
// //                   strokeLinejoin="round"
// //                 />
// //               </svg>
// //               <span className="text-sm text-gray-400">Upload image</span>
// //             </div>
// //             <input 
// //               type="file" 
// //               accept="image/*" 
// //               onChange={handleMediaChange} 
// //               className="hidden" 
// //             />
// //           </label>
// //         </div>

// //         {previewUrl && (
// //           <div className="mt-2">
// //             <label className="block text-sm font-medium text-gray-300 mb-1">
// //               Preview
// //             </label>
// //             <div className="border border-gray-700 rounded-lg overflow-hidden">
// //               <img 
// //                 src={previewUrl} 
// //                 alt="Preview" 
// //                 className="w-full h-48 object-cover" 
// //               />
// //             </div>
// //           </div>
// //         )}

// //         <button
// //           onClick={handlePost}
// //           className="w-full bg-red-600 text-white p-2 rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
// //           disabled={loading || gettingLocation}
// //         >
// //           {loading ? "Posting..." : gettingLocation ? "Getting Location..." : "Post"}
// //         </button>

// //         <div className="mt-2 text-xs text-gray-400 text-center">
// //           Your location will be automatically captured when you post
// //         </div>
// //       </div>
// //     </div>
// //   );
// // };

// // export default CreatePost;
