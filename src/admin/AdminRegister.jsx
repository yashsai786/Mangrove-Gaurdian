import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, googleProvider } from "../config/firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithPopup 
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp, 
  query, 
  collection, 
  where, 
  getDocs 
} from "firebase/firestore";

// Use the production API URL directly to avoid connection issues
const API_URL = "https://transgression-vigilance.vercel.app";

const AdminReg = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    contact: "",
    dob: "",
    gender: "",
    address: "",
    profilePic: null,
  });

  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [userId, setUserId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [apiStatus, setApiStatus] = useState({ checked: false, working: false });

  useEffect(() => {
    // Check if the API is working
    checkApiStatus();
  }, []);

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
    
    // Reset email check when email changes
    if (e.target.name === "email") {
      setEmailExists(false);
      setUserId(null);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, profilePic: file });
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const checkEmail = async () => {
    if (!formData.email) return;
    
    setCheckingEmail(true);
    try {
      // Query Firestore to check if email exists
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", formData.email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // User exists
        const userDoc = querySnapshot.docs[0];
        setEmailExists(true);
        setUserId(userDoc.id);
      } else {
        setEmailExists(false);
        setUserId(null);
      }
    } catch (error) {
      console.error("Error checking email:", error);
    } finally {
      setCheckingEmail(false);
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
    
    // First check if email exists if we haven't checked yet
    if (!emailExists && !checkingEmail && !userId) {
      await checkEmail();
      if (emailExists) {
        return; // Stop here to let user see the message that email exists
      }
    }
    
    setLoading(true);
    setError("");

    try {
      // Check if API is working before attempting upload for new users
      if (!emailExists && !apiStatus.working) {
        await checkApiStatus();
        if (!apiStatus.working) {
          throw new Error("API is not available. Please try again later.");
        }
      }

      if (emailExists && userId) {
        // Update existing user to admin
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          role: "admin",
          status: "enabled",
          // Optionally update other fields if provided
          ...(formData.username && { username: formData.username }),
          ...(formData.contact && { contact: formData.contact }),
          ...(formData.dob && { dob: formData.dob }),
          ...(formData.gender && { gender: formData.gender }),
          ...(formData.address && { address: formData.address }),
        });
        
        alert("User role updated to admin successfully!");
        navigate("/");
      } else {
        // New user registration
        if (formData.password !== formData.confirmPassword) {
          setError("Passwords do not match!");
          setLoading(false);
          return;
        }
        
        // Create new user
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;

        let profilePicUrl = "";
        if (formData.profilePic) {
          profilePicUrl = await uploadToImageKit(formData.profilePic);
          if (!profilePicUrl) {
            alert("Image upload failed but continuing with registration.");
          }
        }

        await setDoc(doc(db, "users", user.uid), {
          username: formData.username,
          email: formData.email,
          contact: formData.contact,
          dob: formData.dob,
          gender: formData.gender,
          address: formData.address,
          profilePic: profilePicUrl,
          reg_date: serverTimestamp(),
          role: "admin",
          status: "enabled"
        });

        alert("New admin user registered successfully!");
        navigate("/admin");
      }
    } catch (error) {
      console.error("Error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user exists in Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        // User exists, update to admin
        await updateDoc(userDocRef, {
          role: "admin",
          status: "enabled",
        });
        alert("User role updated to admin successfully!");
      } else {
        // Create new user with admin role
        await setDoc(userDocRef, {
          username: user.displayName || "",
          email: user.email,
          profilePic: user.photoURL || "",
          contact: "",
          dob: "",
          gender: "",
          address: "",
          reg_date: serverTimestamp(),
          role: "admin",
          status: "enabled"
        });
        alert("New admin user created with Google successfully!");
      }
      
      navigate("/");
    } catch (error) {
      console.error("Google sign-in error", error);
      setError(error.message);
    }
  };

  // Add blur event to check email when user moves away from email field
  const handleEmailBlur = () => {
    checkEmail();
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-4">Admin Registration</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        
        {!apiStatus.working && apiStatus.checked && !emailExists && (
          <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
            API connection error. Profile picture upload may not work properly.
          </div>
        )}
        
        {emailExists && (
          <div className="bg-blue-100 text-blue-700 p-4 rounded mb-4">
            Email already exists. Form submission will update user to admin role.
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input 
              type="email" 
              name="email" 
              value={formData.email}
              onChange={handleChange} 
              onBlur={handleEmailBlur}
              required 
              className="w-full p-2 border rounded" 
            />
            {checkingEmail && <p className="text-sm text-gray-500">Checking email...</p>}
          </div>
          
          {/* Only show password fields for new users */}
          {!emailExists && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input 
                  type="password" 
                  name="password" 
                  value={formData.password}
                  onChange={handleChange} 
                  required={!emailExists}
                  className="w-full p-2 border rounded" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                <input 
                  type="password" 
                  name="confirmPassword" 
                  value={formData.confirmPassword}
                  onChange={handleChange} 
                  required={!emailExists}
                  className="w-full p-2 border rounded" 
                />
              </div>
            </>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input 
              type="text" 
              name="username" 
              value={formData.username}
              onChange={handleChange} 
              required={!emailExists}
              className="w-full p-2 border rounded" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Contact</label>
            <input 
              type="text" 
              name="contact" 
              value={formData.contact}
              onChange={handleChange} 
              required={!emailExists}
              className="w-full p-2 border rounded" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
            <input 
              type="date" 
              name="dob" 
              value={formData.dob}
              onChange={handleChange} 
              required={!emailExists}
              className="w-full p-2 border rounded" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Gender</label>
            <select 
              name="gender" 
              value={formData.gender}
              onChange={handleChange} 
              required={!emailExists}
              className="w-full p-2 border rounded"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <textarea 
              name="address" 
              value={formData.address}
              onChange={handleChange} 
              required={!emailExists}
              className="w-full p-2 border rounded"
            ></textarea>
          </div>

          {/* Only show profile picture upload for new users */}
          {!emailExists && (
            <div className="flex flex-col items-center">
              {previewUrl && <img src={previewUrl} alt="Profile Preview" className="w-24 h-24 rounded-full mb-2" />}
              <label className="cursor-pointer bg-gray-200 px-4 py-2 rounded">
                Upload Profile Picture
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          )}
          
          <button 
            type="submit" 
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? "Processing..." : emailExists ? "Update to Admin" : "Register as Admin"}
          </button>
        </form>
        
        <div className="mt-4">
          <button 
            onClick={handleGoogleSignIn} 
            className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-600"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminReg;
// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { auth, db, googleProvider } from "../config/firebase";
// import { 
//   createUserWithEmailAndPassword, 
//   signInWithPopup 
// } from "firebase/auth";
// import { 
//   doc, 
//   setDoc, 
//   getDoc, 
//   updateDoc, 
//   serverTimestamp, 
//   query, 
//   collection, 
//   where, 
//   getDocs 
// } from "firebase/firestore";

// const AdminReg = () => {
//   const navigate = useNavigate();
//   const [formData, setFormData] = useState({
//     email: "",
//     password: "",
//     confirmPassword: "",
//     username: "",
//     contact: "",
//     dob: "",
//     gender: "",
//     address: "",
//     profilePic: null,
//   });

//   const [previewUrl, setPreviewUrl] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [checkingEmail, setCheckingEmail] = useState(false);
//   const [emailExists, setEmailExists] = useState(false);
//   const [userId, setUserId] = useState(null);
//   const [sidebarOpen, setSidebarOpen] = useState(true);

//   const handleChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
    
//     // Reset email check when email changes
//     if (e.target.name === "email") {
//       setEmailExists(false);
//       setUserId(null);
//     }
//   };

//   const handleFileChange = (e) => {
//     const file = e.target.files[0];
//     if (file) {
//       setFormData({ ...formData, profilePic: file });
//       setPreviewUrl(URL.createObjectURL(file));
//     }
//   };

//   const checkEmail = async () => {
//     if (!formData.email) return;
    
//     setCheckingEmail(true);
//     try {
//       // Query Firestore to check if email exists
//       const usersRef = collection(db, "users");
//       const q = query(usersRef, where("email", "==", formData.email));
//       const querySnapshot = await getDocs(q);
      
//       if (!querySnapshot.empty) {
//         // User exists
//         const userDoc = querySnapshot.docs[0];
//         setEmailExists(true);
//         setUserId(userDoc.id);
//       } else {
//         setEmailExists(false);
//         setUserId(null);
//       }
//     } catch (error) {
//       console.error("Error checking email:", error);
//     } finally {
//       setCheckingEmail(false);
//     }
//   };

//   const uploadToImageKit = async (file) => {
//     if (!file) return "";

//     try {
//       const authResponse = await fetch("http://localhost:5000/auth");
//       const authData = await authResponse.json();

//       const formData = new FormData();
//       formData.append("file", file);
//       formData.append("fileName", file.name);
//       formData.append("publicKey", "public_KoLQpUZM3TZfPrc1If4RUVRgHAw=");
//       formData.append("signature", authData.signature);
//       formData.append("expire", authData.expire);
//       formData.append("token", authData.token);
//       formData.append("folder", "/profile_pictures");

//       const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
//         method: "POST",
//         body: formData,
//       });

//       const result = await response.json();
//       if (!result.url) throw new Error("Upload failed: " + (result.error?.message || "Unknown error"));

//       return result.url;
//     } catch (error) {
//       console.error("Image upload failed:", error);
//       return "";
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
    
//     // First check if email exists if we haven't checked yet
//     if (!emailExists && !checkingEmail && !userId) {
//       await checkEmail();
//       if (emailExists) {
//         return; // Stop here to let user see the message that email exists
//       }
//     }
    
//     setLoading(true);
//     setError("");

//     try {
//       if (emailExists && userId) {
//         // Update existing user to admin
//         const userRef = doc(db, "users", userId);
//         await updateDoc(userRef, {
//           role: "admin",
//           status: "enabled",
//           // Optionally update other fields if provided
//           ...(formData.username && { username: formData.username }),
//           ...(formData.contact && { contact: formData.contact }),
//           ...(formData.dob && { dob: formData.dob }),
//           ...(formData.gender && { gender: formData.gender }),
//           ...(formData.address && { address: formData.address }),
//         });
        
//         alert("User role updated to admin successfully!");
//         navigate("/");
//       } else {
//         // New user registration
//         if (formData.password !== formData.confirmPassword) {
//           setError("Passwords do not match!");
//           setLoading(false);
//           return;
//         }
        
//         // Create new user
//         const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
//         const user = userCredential.user;

//         let profilePicUrl = "";
//         if (formData.profilePic) {
//           profilePicUrl = await uploadToImageKit(formData.profilePic);
//         }

//         await setDoc(doc(db, "users", user.uid), {
//           username: formData.username,
//           email: formData.email,
//           contact: formData.contact,
//           dob: formData.dob,
//           gender: formData.gender,
//           address: formData.address,
//           profilePic: profilePicUrl,
//           reg_date: serverTimestamp(),
//           role: "admin",
//           status: "enabled"
//         });

//         alert("New admin user registered successfully!");
//         navigate("/");
//       }
//     } catch (error) {
//       console.error("Error:", error);
//       setError(error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleGoogleSignIn = async () => {
//     try {
//       const result = await signInWithPopup(auth, googleProvider);
//       const user = result.user;
      
//       // Check if user exists in Firestore
//       const userDocRef = doc(db, "users", user.uid);
//       const userDoc = await getDoc(userDocRef);
      
//       if (userDoc.exists()) {
//         // User exists, update to admin
//         await updateDoc(userDocRef, {
//           role: "admin",
//           status: "enabled",
//         });
//         alert("User role updated to admin successfully!");
//       } else {
//         // Create new user with admin role
//         await setDoc(userDocRef, {
//           username: user.displayName || "",
//           email: user.email,
//           profilePic: user.photoURL || "",
//           contact: "",
//           dob: "",
//           gender: "",
//           address: "",
//           reg_date: serverTimestamp(),
//           role: "admin",
//           status: "enabled"
//         });
//         alert("New admin user created with Google successfully!");
//       }
      
//       navigate("/");
//     } catch (error) {
//       console.error("Google sign-in error", error);
//       setError(error.message);
//     }
//   };

//   // Add blur event to check email when user moves away from email field
//   const handleEmailBlur = () => {
//     checkEmail();
//   };

//   const toggleSidebar = () => {
//     setSidebarOpen(!sidebarOpen);
//   };

//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
//       <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
//         <h2 className="text-2xl font-bold text-center mb-4">Admin Registration</h2>
//         {error && <p className="text-red-500 text-center mb-4">{error}</p>}
//         {emailExists && (
//           <div className="bg-blue-100 text-blue-700 p-4 rounded mb-4">
//             Email already exists. Form submission will update user to admin role.
//           </div>
//         )}
        
//         <form onSubmit={handleSubmit} className="space-y-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700">Email</label>
//             <input 
//               type="email" 
//               name="email" 
//               value={formData.email}
//               onChange={handleChange} 
//               onBlur={handleEmailBlur}
//               required 
//               className="w-full p-2 border rounded" 
//             />
//             {checkingEmail && <p className="text-sm text-gray-500">Checking email...</p>}
//           </div>
          
//           {/* Only show password fields for new users */}
//           {!emailExists && (
//             <>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700">Password</label>
//                 <input 
//                   type="password" 
//                   name="password" 
//                   value={formData.password}
//                   onChange={handleChange} 
//                   required={!emailExists}
//                   className="w-full p-2 border rounded" 
//                 />
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
//                 <input 
//                   type="password" 
//                   name="confirmPassword" 
//                   value={formData.confirmPassword}
//                   onChange={handleChange} 
//                   required={!emailExists}
//                   className="w-full p-2 border rounded" 
//                 />
//               </div>
//             </>
//           )}
          
//           <div>
//             <label className="block text-sm font-medium text-gray-700">Username</label>
//             <input 
//               type="text" 
//               name="username" 
//               value={formData.username}
//               onChange={handleChange} 
//               required={!emailExists}
//               className="w-full p-2 border rounded" 
//             />
//           </div>
          
//           <div>
//             <label className="block text-sm font-medium text-gray-700">Contact</label>
//             <input 
//               type="text" 
//               name="contact" 
//               value={formData.contact}
//               onChange={handleChange} 
//               required={!emailExists}
//               className="w-full p-2 border rounded" 
//             />
//           </div>
          
//           <div>
//             <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
//             <input 
//               type="date" 
//               name="dob" 
//               value={formData.dob}
//               onChange={handleChange} 
//               required={!emailExists}
//               className="w-full p-2 border rounded" 
//             />
//           </div>
          
//           <div>
//             <label className="block text-sm font-medium text-gray-700">Gender</label>
//             <select 
//               name="gender" 
//               value={formData.gender}
//               onChange={handleChange} 
//               required={!emailExists}
//               className="w-full p-2 border rounded"
//             >
//               <option value="">Select Gender</option>
//               <option value="Male">Male</option>
//               <option value="Female">Female</option>
//               <option value="Other">Other</option>
//             </select>
//           </div>
          
//           <div>
//             <label className="block text-sm font-medium text-gray-700">Address</label>
//             <textarea 
//               name="address" 
//               value={formData.address}
//               onChange={handleChange} 
//               required={!emailExists}
//               className="w-full p-2 border rounded"
//             ></textarea>
//           </div>

//           {/* Only show profile picture upload for new users */}
//           {!emailExists && (
//             <div className="flex flex-col items-center">
//               {previewUrl && <img src={previewUrl} alt="Profile Preview" className="w-24 h-24 rounded-full mb-2" />}
//               <label className="cursor-pointer bg-gray-200 px-4 py-2 rounded">
//                 Upload Profile Picture
//                 <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
//               </label>
//             </div>
//           )}
          
//           <button 
//             type="submit" 
//             className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
//             disabled={loading}
//           >
//             {loading ? "Processing..." : emailExists ? "Update to Admin" : "Register as Admin"}
//           </button>
//         </form>
        
//         <div className="mt-4">
//           <button 
//             onClick={handleGoogleSignIn} 
//             className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-600"
//           >
//             Sign in with Google
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AdminReg;
