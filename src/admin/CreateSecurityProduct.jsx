import React, { useState, useEffect } from "react";
import { db, auth } from "../config/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

// Use the production API URL directly to avoid connection issues
const API_URL = "https://transgression-vigilance.vercel.app";

const CreateSecurityProduct = ({ onClose }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [media, setMedia] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState({ checked: false, working: false });
  
  const navigate = useNavigate();
  const userId = auth.currentUser?.uid || "unknown";
  
  // Handle file selection
  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMedia(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };
  
  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/");
    }
    
    // Check if the API is working
    checkApiStatus();
  }, [navigate]);

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
      formData.append("fileName", `product_${Date.now()}_${file.name}`);
      formData.append("publicKey", "public_KoLQpUZM3TZfPrc1If4RUVRgHAw=");
      formData.append("signature", authData.signature);
      formData.append("expire", authData.expire);
      formData.append("token", authData.token);
      formData.append("folder", "/security-products");
      
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
    if (!title.trim()) {
      alert("Please enter a product title");
      return false;
    }
    if (!description.trim()) {
      alert("Please enter a product description");
      return false;
    }
    if (!link.trim()) {
      alert("Please enter a product link");
      return false;
    }
    if (!media) {
      alert("Please upload a product image");
      return false;
    }
    
    // Basic URL validation
    try {
      new URL(link);
    } catch (e) {
      alert("Please enter a valid URL (including http:// or https://)");
      return false;
    }
    
    return true;
  };

  // Handle product creation
  const handleCreate = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Check if API is working before attempting upload
      if (!apiStatus.working) {
        await checkApiStatus();
        if (!apiStatus.working) {
          throw new Error("API is not available. Please try again later.");
        }
      }

      const mediaUrl = await uploadToImageKit(media);
      if (!mediaUrl) {
        alert("Image upload failed. Cannot create product listing.");
        setLoading(false);
        return;
      }

      // Store product data in Firestore
      await addDoc(collection(db, "securityProducts"), {
        title,
        description,
        link,
        imageUrl: mediaUrl,
        createdBy: userId,
        createdAt: new Date(),
      });

      alert("Security product added successfully!");
      onClose();
    } catch (error) {
      console.error("Error creating security product:", error);
      alert("Failed to add security product: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md relative shadow-xl">
        <button 
          onClick={onClose} 
          className="absolute top-2 right-4 text-2xl text-gray-600 hover:text-gray-800"
        >
          &times;
        </button>

        <h2 className="text-xl font-semibold mb-4 text-gray-800">Add Security Product</h2>

        {!apiStatus.working && apiStatus.checked && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded border border-red-300">
            API connection error. Some features may not work properly.
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Title
            </label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded focus:ring-red-500 focus:border-red-500"
              placeholder="Enter product title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="w-full p-2 border border-gray-300 rounded resize-none focus:ring-red-500 focus:border-red-500"
              rows="3"
              placeholder="Enter product description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Link
            </label>
            <input
              type="url"
              className="w-full p-2 border border-gray-300 rounded focus:ring-red-500 focus:border-red-500"
              placeholder="https://example.com/product"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Image
            </label>
            <div className="flex items-center">
              <label className="cursor-pointer flex items-center justify-center w-full p-2 border border-gray-300 border-dashed rounded-lg hover:bg-gray-50">
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
                  <span className="text-sm text-gray-500">Upload image</span>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleMediaChange} 
                  className="hidden" 
                />
              </label>
            </div>
          </div>

          {previewUrl && (
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preview
              </label>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-full h-48 object-cover" 
                />
              </div>
            </div>
          )}

          <button
            onClick={handleCreate}
            className="w-full bg-red-600 text-white p-2 rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Adding Product..." : "Add Security Product"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateSecurityProduct;
// import React, { useState } from "react";
// import { db, auth } from "../config/firebase";
// import { collection, addDoc } from "firebase/firestore";

// const CreateSecurityProduct = ({ onClose }) => {
//   const [title, setTitle] = useState("");
//   const [description, setDescription] = useState("");
//   const [link, setLink] = useState("");
//   const [media, setMedia] = useState(null);
//   const [previewUrl, setPreviewUrl] = useState(null);
//   const [loading, setLoading] = useState(false);

//   const userId = auth.currentUser?.uid || "unknown";

//   // Handle file selection
//   const handleMediaChange = (e) => {
//     const file = e.target.files[0];
//     if (file) {
//       setMedia(file);
//       setPreviewUrl(URL.createObjectURL(file));
//     }
//   };

//   // Upload to ImageKit
//   const uploadToImageKit = async () => {
//     if (!media) return "";

//     try {
//       const authResponse = await fetch("http://localhost:5000/auth");
//       const authData = await authResponse.json();

//       const formData = new FormData();
//       formData.append("file", media);
//       formData.append("fileName", media.name);
//       formData.append("publicKey", "public_KoLQpUZM3TZfPrc1If4RUVRgHAw=");
//       formData.append("signature", authData.signature);
//       formData.append("expire", authData.expire);
//       formData.append("token", authData.token);
//       formData.append("folder", "/security-products");

//       const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
//         method: "POST",
//         body: formData,
//       });

//       const result = await response.json();
//       if (!result.url) throw new Error("Upload failed: " + (result.error?.message || "Unknown error"));

//       return result.url;
//     } catch (error) {
//       console.error("Image upload failed:", error);
//       alert("Image upload failed. Check console for details.");
//       return "";
//     }
//   };

//   // Form validation
//   const validateForm = () => {
//     if (!title.trim()) {
//       alert("Please enter a product title");
//       return false;
//     }
//     if (!description.trim()) {
//       alert("Please enter a product description");
//       return false;
//     }
//     if (!link.trim()) {
//       alert("Please enter a product link");
//       return false;
//     }
//     if (!media) {
//       alert("Please upload a product image");
//       return false;
//     }
    
//     // Basic URL validation
//     try {
//       new URL(link);
//     } catch (e) {
//       alert("Please enter a valid URL (including http:// or https://)");
//       return false;
//     }
    
//     return true;
//   };

//   // Handle product creation
//   const handleCreate = async () => {
//     if (!validateForm()) return;

//     setLoading(true);
//     try {
//       const mediaUrl = await uploadToImageKit();
//       if (!mediaUrl) {
//         alert("Image upload failed. Cannot create product listing.");
//         setLoading(false);
//         return;
//       }

//       // Store product data in Firestore
//       await addDoc(collection(db, "securityProducts"), {
//         title,
//         description,
//         link,
//         imageUrl: mediaUrl,
//         createdBy: userId,
//         createdAt: new Date(),
//       });

//       alert("Security product added successfully!");
//       onClose();
//     } catch (error) {
//       console.error("Error creating security product:", error);
//       alert("Failed to add security product. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
//       <div className="bg-white p-6 rounded-lg w-full max-w-md relative shadow-xl">
//         <button 
//           onClick={onClose} 
//           className="absolute top-2 right-4 text-2xl text-gray-600 hover:text-gray-800"
//         >
//           &times;
//         </button>

//         <h2 className="text-xl font-semibold mb-4 text-gray-800">Add Security Product</h2>

//         <div className="space-y-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Product Title
//             </label>
//             <input
//               type="text"
//               className="w-full p-2 border border-gray-300 rounded focus:ring-red-500 focus:border-red-500"
//               placeholder="Enter product title"
//               value={title}
//               onChange={(e) => setTitle(e.target.value)}
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Description
//             </label>
//             <textarea
//               className="w-full p-2 border border-gray-300 rounded resize-none focus:ring-red-500 focus:border-red-500"
//               rows="3"
//               placeholder="Enter product description"
//               value={description}
//               onChange={(e) => setDescription(e.target.value)}
//             ></textarea>
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Product Link
//             </label>
//             <input
//               type="url"
//               className="w-full p-2 border border-gray-300 rounded focus:ring-red-500 focus:border-red-500"
//               placeholder="https://example.com/product"
//               value={link}
//               onChange={(e) => setLink(e.target.value)}
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Product Image
//             </label>
//             <div className="flex items-center">
//               <label className="cursor-pointer flex items-center justify-center w-full p-2 border border-gray-300 border-dashed rounded-lg hover:bg-gray-50">
//                 <div className="space-y-1 text-center">
//                   <svg
//                     className="mx-auto h-12 w-12 text-gray-400"
//                     stroke="currentColor"
//                     fill="none"
//                     viewBox="0 0 48 48"
//                     aria-hidden="true"
//                   >
//                     <path
//                       d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
//                       strokeWidth="2"
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                     />
//                   </svg>
//                   <span className="text-sm text-gray-500">Upload image</span>
//                 </div>
//                 <input 
//                   type="file" 
//                   accept="image/*" 
//                   onChange={handleMediaChange} 
//                   className="hidden" 
//                 />
//               </label>
//             </div>
//           </div>

//           {previewUrl && (
//             <div className="mt-2">
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Preview
//               </label>
//               <div className="border border-gray-300 rounded-lg overflow-hidden">
//                 <img 
//                   src={previewUrl} 
//                   alt="Preview" 
//                   className="w-full h-48 object-cover" 
//                 />
//               </div>
//             </div>
//           )}

//           <button
//             onClick={handleCreate}
//             className="w-full bg-red-600 text-white p-2 rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//             disabled={loading}
//           >
//             {loading ? "Adding Product..." : "Add Security Product"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CreateSecurityProduct;
