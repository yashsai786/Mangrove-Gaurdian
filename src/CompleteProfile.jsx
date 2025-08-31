import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "./config/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { updatePassword } from "firebase/auth";

// Use the production API URL directly to avoid connection issues
const API_URL = "https://transgression-vigilance.vercel.app";

const CompleteProfile = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    contact: "",
    dob: "",
    gender: "",
    address: "",
    password: "",
    profilePic: null,
  });
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [apiStatus, setApiStatus] = useState({ checked: false, working: false });

  useEffect(() => {
    // Check if user is logged in
    if (!auth.currentUser) {
      navigate("/");
      return;
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFormData({ ...formData, profilePic: file });
    
    // Create preview URL
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
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
      formData.append("fileName", `profile_${Date.now()}_${file.name}`);
      formData.append("publicKey", "public_KoLQpUZM3TZfPrc1If4RUVRgHAw=");
      formData.append("signature", authData.signature);
      formData.append("expire", authData.expire);
      formData.append("token", authData.token);
      formData.append("folder", "/profile_pictures");
      
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
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("No user logged in.");
      }

      // Check if API is working before attempting upload
      if (!apiStatus.working) {
        await checkApiStatus();
        if (!apiStatus.working) {
          throw new Error("API is not available. Please try again later.");
        }
      }
  
      let uploadedImageUrl = "";
  
      if (formData.profilePic) {
        uploadedImageUrl = await uploadToImageKit(formData.profilePic);
        if (!uploadedImageUrl) {
          throw new Error("Profile picture upload failed.");
        }
      }
  
      const userData = {
        username: formData.username,
        email: user.email || "",
        contact: formData.contact,
        dob: formData.dob,
        gender: formData.gender,
        address: formData.address,
        reg_date: serverTimestamp(),
        role: "user",
        status: "enabled"
      };
  
      if (uploadedImageUrl) {
        userData.profilePic = uploadedImageUrl;
      }
  
      await setDoc(doc(db, "users", user.uid), userData, { merge: true });
  
      if (formData.password) {
        await updatePassword(user, formData.password);
      }
  
      // Success notification
      alert("Profile completed successfully! Please log in again.");
      await auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error updating profile", error);
      alert(`Failed to complete profile: ${error.message}`);
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-4xl w-full">
        <div className="md:flex">
          {/* Left side - Image & Welcome */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-800 md:w-1/2 p-8 text-white flex flex-col justify-center">
            <h1 className="text-3xl font-bold mb-4">Complete Your Profile</h1>
            <p className="text-blue-100 mb-6">Set up your account to get the most out of our platform</p>
            <div className="hidden md:block">
              <div className="border-2 border-blue-400 p-1 rounded-full inline-block">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-32 h-32">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Right side - Form */}
          <div className="md:w-1/2 p-8">
            {!apiStatus.working && apiStatus.checked && (
              <div className="mb-4 p-2 bg-red-100 text-red-700 rounded border border-red-300">
                API connection error. Some features may not work properly.
              </div>
            )}
          
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex justify-center md:hidden mb-6">
                <div className="border-2 border-blue-400 p-1 rounded-full inline-block">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-24 h-24 text-blue-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              
              {/* Profile Picture Upload */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-24 h-24 relative mb-3">
                  {previewUrl ? (
                    <img 
                      src={previewUrl} 
                      alt="Profile Preview" 
                      className="w-24 h-24 rounded-full object-cover border-4 border-blue-100"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  <label htmlFor="profilePic" className="absolute -right-1 bottom-0 bg-blue-500 rounded-full p-1 cursor-pointer shadow-md hover:bg-blue-600 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </label>
                  <input 
                    id="profilePic" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileChange} 
                    required
                  />
                </div>
                <p className="text-sm text-gray-500">Upload Profile Picture</p>
              </div>
              
              {/* Username - Added field */}
              <div>
                <label className="text-sm font-medium text-gray-700">Username</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    className="block w-full pr-10 border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md transition"
                    placeholder="Choose a username"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contact */}
                <div className="relative">
                  <label className="text-sm font-medium text-gray-700">Contact Number</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="text"
                      name="contact"
                      value={formData.contact}
                      onChange={handleChange}
                      required
                      className="block w-full pr-10 border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md transition"
                      placeholder="+1 (555) 000-0000"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                  </div>
                </div>
              
                {/* Date of Birth */}
                <div className="relative">
                  <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="date"
                      name="dob"
                      value={formData.dob}
                      onChange={handleChange}
                      required
                      className="block w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md transition"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Gender */}
              <div>
                <label className="text-sm font-medium text-gray-700">Gender</label>
                <div className="mt-1 flex space-x-4">
                  {["Male", "Female", "Other"].map((option) => (
                    <label key={option} className="flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value={option}
                        checked={formData.gender === option}
                        onChange={handleChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-2 text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Address */}
              <div>
                <label className="text-sm font-medium text-gray-700">Address</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    rows={3}
                    className="block w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md transition"
                    placeholder="Enter your full address"
                  />
                </div>
              </div>
              
              {/* Password */}
              <div>
                <label className="text-sm font-medium text-gray-700">Set Password</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="block w-full pr-10 border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md transition"
                    placeholder="Create a secure password"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Complete Profile'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;
// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { auth, db } from "./config/firebase";
// import { doc, setDoc, serverTimestamp } from "firebase/firestore";
// import { updatePassword } from "firebase/auth";

// const CompleteProfile = () => {
//   const navigate = useNavigate();
//   const [formData, setFormData] = useState({
//     username: "",  // Added username field
//     contact: "",
//     dob: "",
//     gender: "",
//     address: "",
//     password: "",
//     profilePic: null,
//   });
//   const [loading, setLoading] = useState(false);
//   const [profilePicUrl, setProfilePicUrl] = useState("");
//   const [previewUrl, setPreviewUrl] = useState("");

//   const handleChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   const handleFileChange = (e) => {
//     const file = e.target.files[0];
//     setFormData({ ...formData, profilePic: file });
    
//     // Create preview URL
//     if (file) {
//       const reader = new FileReader();
//       reader.onloadend = () => {
//         setPreviewUrl(reader.result);
//       };
//       reader.readAsDataURL(file);
//     }
//   };

//   const uploadImageToImageKit = async (file) => {
//     if (!file) return null;
  
//     try {
//       // Step 1: Fetch authentication parameters from your backend
//       const authResponse = await fetch("http://localhost:5000/auth");
//       const authData = await authResponse.json();
  
//       // Step 2: Prepare form data
//       const formData = new FormData();
//       formData.append("file", file);
//       formData.append("fileName", file.name);
//       formData.append("publicKey", "public_KoLQpUZM3TZfPrc1If4RUVRgHAw=");
//       formData.append("signature", authData.signature);
//       formData.append("expire", authData.expire);
//       formData.append("token", authData.token);
//       formData.append("folder", "/profile_pictures");
  
//       // Step 3: Upload to ImageKit
//       const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
//         method: "POST",
//         body: formData,
//       });
  
//       const result = await response.json();
  
//       if (!result.url) {
//         throw new Error("Upload failed: " + (result.error?.message || "Unknown error"));
//       }
  
//       return result.url;
//     } catch (error) {
//       console.error("Image upload failed:", error);
//       throw error;
//     }
//   };
  
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
    
//     try {
//       const user = auth.currentUser;
//       if (!user) {
//         throw new Error("No user logged in.");
//       }
  
//       let uploadedImageUrl = profilePicUrl;
  
//       if (formData.profilePic) {
//         uploadedImageUrl = await uploadImageToImageKit(formData.profilePic);
//         setProfilePicUrl(uploadedImageUrl);
//       }
  
//       const userData = {
//         username: formData.username, // Use the entered username instead of displayName
//         email: user.email || "",
//         contact: formData.contact,
//         dob: formData.dob,
//         gender: formData.gender,
//         address: formData.address,
//         reg_date: serverTimestamp(),
//         role: "user",
//         status: "new"
//       };
  
//       if (uploadedImageUrl) {
//         userData.profilePic = uploadedImageUrl;
//       }
  
//       await setDoc(doc(db, "users", user.uid), userData, { merge: true });
  
//       if (formData.password) {
//         await updatePassword(user, formData.password);
//       }
  
//       // Success notification
//       setLoading(false);
//       await auth.signOut();
//       navigate("/login");
//     } catch (error) {
//       console.error("Error updating profile", error);
//       setLoading(false);
//       // Show error toast/notification here
//     }
//   };
  
//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
//       <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-4xl w-full">
//         <div className="md:flex">
//           {/* Left side - Image & Welcome */}
//           <div className="bg-gradient-to-br from-blue-600 to-indigo-800 md:w-1/2 p-8 text-white flex flex-col justify-center">
//             <h1 className="text-3xl font-bold mb-4">Complete Your Profile</h1>
//             <p className="text-blue-100 mb-6">Set up your account to get the most out of our platform</p>
//             <div className="hidden md:block">
//               <div className="border-2 border-blue-400 p-1 rounded-full inline-block">
//                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-32 h-32">
//                   <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
//                 </svg>
//               </div>
//             </div>
//           </div>
          
//           {/* Right side - Form */}
//           <div className="md:w-1/2 p-8">
//             <form onSubmit={handleSubmit} className="space-y-5">
//               <div className="flex justify-center md:hidden mb-6">
//                 <div className="border-2 border-blue-400 p-1 rounded-full inline-block">
//                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-24 h-24 text-blue-600">
//                     <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
//                   </svg>
//                 </div>
//               </div>
              
//               {/* Profile Picture Upload */}
//               <div className="flex flex-col items-center mb-6">
//                 <div className="w-24 h-24 relative mb-3">
//                   {previewUrl ? (
//                     <img 
//                       src={previewUrl} 
//                       alt="Profile Preview" 
//                       className="w-24 h-24 rounded-full object-cover border-4 border-blue-100"
//                     />
//                   ) : (
//                     <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
//                       <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
//                       </svg>
//                     </div>
//                   )}
//                   <label htmlFor="profilePic" className="absolute -right-1 bottom-0 bg-blue-500 rounded-full p-1 cursor-pointer shadow-md hover:bg-blue-600 transition">
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
//                     </svg>
//                   </label>
//                   <input 
//                     id="profilePic" 
//                     type="file" 
//                     accept="image/*" 
//                     className="hidden" 
//                     onChange={handleFileChange} 
//                     required
//                   />
//                 </div>
//                 <p className="text-sm text-gray-500">Upload Profile Picture</p>
//               </div>
              
//               {/* Username - Added field */}
//               <div>
//                 <label className="text-sm font-medium text-gray-700">Username</label>
//                 <div className="mt-1 relative rounded-md shadow-sm">
//                   <input
//                     type="text"
//                     name="username"
//                     value={formData.username}
//                     onChange={handleChange}
//                     required
//                     className="block w-full pr-10 border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md transition"
//                     placeholder="Choose a username"
//                   />
//                   <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
//                     </svg>
//                   </div>
//                 </div>
//               </div>
              
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 {/* Contact */}
//                 <div className="relative">
//                   <label className="text-sm font-medium text-gray-700">Contact Number</label>
//                   <div className="mt-1 relative rounded-md shadow-sm">
//                     <input
//                       type="text"
//                       name="contact"
//                       value={formData.contact}
//                       onChange={handleChange}
//                       required
//                       className="block w-full pr-10 border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md transition"
//                       placeholder="+1 (555) 000-0000"
//                     />
//                     <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
//                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
//                       </svg>
//                     </div>
//                   </div>
//                 </div>
              
//                 {/* Date of Birth */}
//                 <div className="relative">
//                   <label className="text-sm font-medium text-gray-700">Date of Birth</label>
//                   <div className="mt-1 relative rounded-md shadow-sm">
//                     <input
//                       type="date"
//                       name="dob"
//                       value={formData.dob}
//                       onChange={handleChange}
//                       required
//                       className="block w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md transition"
//                     />
//                     <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
//                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                       </svg>
//                     </div>
//                   </div>
//                 </div>
//               </div>
              
//               {/* Gender */}
//               <div>
//                 <label className="text-sm font-medium text-gray-700">Gender</label>
//                 <div className="mt-1 flex space-x-4">
//                   {["Male", "Female", "Other"].map((option) => (
//                     <label key={option} className="flex items-center">
//                       <input
//                         type="radio"
//                         name="gender"
//                         value={option}
//                         checked={formData.gender === option}
//                         onChange={handleChange}
//                         className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
//                       />
//                       <span className="ml-2 text-gray-700">{option}</span>
//                     </label>
//                   ))}
//                 </div>
//               </div>
              
//               {/* Address */}
//               <div>
//                 <label className="text-sm font-medium text-gray-700">Address</label>
//                 <div className="mt-1 relative rounded-md shadow-sm">
//                   <textarea
//                     name="address"
//                     value={formData.address}
//                     onChange={handleChange}
//                     required
//                     rows={3}
//                     className="block w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md transition"
//                     placeholder="Enter your full address"
//                   />
//                 </div>
//               </div>
              
//               {/* Password */}
//               <div>
//                 <label className="text-sm font-medium text-gray-700">Set Password</label>
//                 <div className="mt-1 relative rounded-md shadow-sm">
//                   <input
//                     type="password"
//                     name="password"
//                     value={formData.password}
//                     onChange={handleChange}
//                     required
//                     className="block w-full pr-10 border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md transition"
//                     placeholder="Create a secure password"
//                   />
//                   <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
//                     </svg>
//                   </div>
//                 </div>
//               </div>
              
//               {/* Submit Button */}
//               <div className="pt-3">
//                 <button
//                   type="submit"
//                   disabled={loading}
//                   className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
//                 >
//                   {loading ? (
//                     <>
//                       <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                       </svg>
//                       Processing...
//                     </>
//                   ) : (
//                     'Complete Profile'
//                   )}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CompleteProfile;


// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { auth, db } from "./config/firebase";
// import { doc, setDoc, serverTimestamp } from "firebase/firestore";
// import { updatePassword } from "firebase/auth";

// const CompleteProfile = () => {
//   const navigate = useNavigate();
//   const [formData, setFormData] = useState({
//     contact: "",
//     dob: "",
//     gender: "",
//     address: "",
//     password: "",
//     profilePic: null,
//   });
//   const [loading, setLoading] = useState(false);
//   const [profilePicUrl, setProfilePicUrl] = useState("");
//   const [previewUrl, setPreviewUrl] = useState("");

//   const handleChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   const handleFileChange = (e) => {
//     const file = e.target.files[0];
//     setFormData({ ...formData, profilePic: file });
    
//     // Create preview URL
//     if (file) {
//       const reader = new FileReader();
//       reader.onloadend = () => {
//         setPreviewUrl(reader.result);
//       };
//       reader.readAsDataURL(file);
//     }
//   };

//   const uploadImageToImageKit = async (file) => {
//     if (!file) return null;
  
//     try {
//       // Step 1: Fetch authentication parameters from your backend
//       const authResponse = await fetch("http://localhost:5000/auth");
//       const authData = await authResponse.json();
  
//       // Step 2: Prepare form data
//       const formData = new FormData();
//       formData.append("file", file);
//       formData.append("fileName", file.name);
//       formData.append("publicKey", "public_KoLQpUZM3TZfPrc1If4RUVRgHAw=");
//       formData.append("signature", authData.signature);
//       formData.append("expire", authData.expire);
//       formData.append("token", authData.token);
//       formData.append("folder", "/profile_pictures");
  
//       // Step 3: Upload to ImageKit
//       const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
//         method: "POST",
//         body: formData,
//       });
  
//       const result = await response.json();
  
//       if (!result.url) {
//         throw new Error("Upload failed: " + (result.error?.message || "Unknown error"));
//       }
  
//       return result.url;
//     } catch (error) {
//       console.error("Image upload failed:", error);
//       throw error;
//     }
//   };
  
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
    
//     try {
//       const user = auth.currentUser;
//       if (!user) {
//         throw new Error("No user logged in.");
//       }
  
//       let uploadedImageUrl = profilePicUrl;
  
//       if (formData.profilePic) {
//         uploadedImageUrl = await uploadImageToImageKit(formData.profilePic);
//         setProfilePicUrl(uploadedImageUrl);
//       }
  
//       const userData = {
//         username: user.displayName || "",
//         email: user.email || "",
//         contact: formData.contact,
//         dob: formData.dob,
//         gender: formData.gender,
//         address: formData.address,
//         reg_date: serverTimestamp(),
//         role: "user",
//         status: "new"
//       };
  
//       if (uploadedImageUrl) {
//         userData.profilePic = uploadedImageUrl;
//       }
  
//       await setDoc(doc(db, "users", user.uid), userData, { merge: true });
  
//       if (formData.password) {
//         await updatePassword(user, formData.password);
//       }
  
//       // Success notification
//       setLoading(false);
//       navigate("/home");
//     } catch (error) {
//       console.error("Error updating profile", error);
//       setLoading(false);
//       // Show error toast/notification here
//     }
//   };
  
//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
//       <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-4xl w-full">
//         <div className="md:flex">
//           {/* Left side - Image & Welcome */}
//           <div className="bg-gradient-to-br from-blue-600 to-indigo-800 md:w-1/2 p-8 text-white flex flex-col justify-center">
//             <h1 className="text-3xl font-bold mb-4">Complete Your Profile</h1>
//             <p className="text-blue-100 mb-6">Set up your account to get the most out of our platform</p>
//             <div className="hidden md:block">
//               <div className="border-2 border-blue-400 p-1 rounded-full inline-block">
//                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-32 h-32">
//                   <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
//                 </svg>
//               </div>
//             </div>
//           </div>
          
//           {/* Right side - Form */}
//           <div className="md:w-1/2 p-8">
//             <form onSubmit={handleSubmit} className="space-y-5">
//               <div className="flex justify-center md:hidden mb-6">
//                 <div className="border-2 border-blue-400 p-1 rounded-full inline-block">
//                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-24 h-24 text-blue-600">
//                     <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
//                   </svg>
//                 </div>
//               </div>
              
//               {/* Profile Picture Upload */}
//               <div className="flex flex-col items-center mb-6">
//                 <div className="w-24 h-24 relative mb-3">
//                   {previewUrl ? (
//                     <img 
//                       src={previewUrl} 
//                       alt="Profile Preview" 
//                       className="w-24 h-24 rounded-full object-cover border-4 border-blue-100"
//                     />
//                   ) : (
//                     <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
//                       <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
//                       </svg>
//                     </div>
//                   )}
//                   <label htmlFor="profilePic" className="absolute -right-1 bottom-0 bg-blue-500 rounded-full p-1 cursor-pointer shadow-md hover:bg-blue-600 transition">
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
//                     </svg>
//                   </label>
//                   <input 
//                     id="profilePic" 
//                     type="file" 
//                     accept="image/*" 
//                     className="hidden" 
//                     onChange={handleFileChange} 
//                     required
//                   />
//                 </div>
//                 <p className="text-sm text-gray-500">Upload Profile Picture</p>
//               </div>
              
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 {/* Contact */}
//                 <div className="relative">
//                   <label className="text-sm font-medium text-gray-700">Contact Number</label>
//                   <div className="mt-1 relative rounded-md shadow-sm">
//                     <input
//                       type="text"
//                       name="contact"
//                       value={formData.contact}
//                       onChange={handleChange}
//                       required
//                       className="block w-full pr-10 border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md transition"
//                       placeholder="+1 (555) 000-0000"
//                     />
//                     <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
//                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
//                       </svg>
//                     </div>
//                   </div>
//                 </div>
              
//                 {/* Date of Birth */}
//                 <div className="relative">
//                   <label className="text-sm font-medium text-gray-700">Date of Birth</label>
//                   <div className="mt-1 relative rounded-md shadow-sm">
//                     <input
//                       type="date"
//                       name="dob"
//                       value={formData.dob}
//                       onChange={handleChange}
//                       required
//                       className="block w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md transition"
//                     />
//                     <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
//                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                       </svg>
//                     </div>
//                   </div>
//                 </div>
//               </div>
              
//               {/* Gender */}
//               <div>
//                 <label className="text-sm font-medium text-gray-700">Gender</label>
//                 <div className="mt-1 flex space-x-4">
//                   {["Male", "Female", "Other"].map((option) => (
//                     <label key={option} className="flex items-center">
//                       <input
//                         type="radio"
//                         name="gender"
//                         value={option}
//                         checked={formData.gender === option}
//                         onChange={handleChange}
//                         className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
//                       />
//                       <span className="ml-2 text-gray-700">{option}</span>
//                     </label>
//                   ))}
//                 </div>
//               </div>
              
//               {/* Address */}
//               <div>
//                 <label className="text-sm font-medium text-gray-700">Address</label>
//                 <div className="mt-1 relative rounded-md shadow-sm">
//                   <textarea
//                     name="address"
//                     value={formData.address}
//                     onChange={handleChange}
//                     required
//                     rows={3}
//                     className="block w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md transition"
//                     placeholder="Enter your full address"
//                   />
//                 </div>
//               </div>
              
//               {/* Password */}
//               <div>
//                 <label className="text-sm font-medium text-gray-700">Set Password</label>
//                 <div className="mt-1 relative rounded-md shadow-sm">
//                   <input
//                     type="password"
//                     name="password"
//                     value={formData.password}
//                     onChange={handleChange}
//                     required
//                     className="block w-full pr-10 border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md transition"
//                     placeholder="Create a secure password"
//                   />
//                   <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
//                     </svg>
//                   </div>
//                 </div>
//               </div>
              
//               {/* Submit Button */}
//               <div className="pt-3">
//                 <button
//                   type="submit"
//                   disabled={loading}
//                   className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
//                 >
//                   {loading ? (
//                     <>
//                       <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                       </svg>
//                       Processing...
//                     </>
//                   ) : (
//                     'Complete Profile'
//                   )}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CompleteProfile;
