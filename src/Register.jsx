import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, googleProvider } from "./config/firebase";
import { createUserWithEmailAndPassword, signInWithPopup, fetchSignInMethodsForEmail } from "firebase/auth";
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import EmailVerification from "./EmailVerification";

const Register = () => {
  const API_URL = "https://transgression-vigilance.vercel.app";

  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    username: "",
    contact: "",
    dob: "",
    gender: "",
    address: "",
    profilePic: null,
  });

  // Background image URL
  const img = 'https://plus.unsplash.com/premium_photo-1661854901998-bcc2d0212780?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  
  // Added state for mobile check (just checking if it exists, no OTP)
  const [checkingMobile, setCheckingMobile] = useState(false);
  const [mobileExists, setMobileExists] = useState(false);
  
  // State for email verification
  const [showOtpSection, setShowOtpSection] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  
  // Debug state for API connection issues
  const [apiStatus, setApiStatus] = useState({ checked: false, working: false });

  useEffect(() => {
    if (auth.currentUser) {
      navigate("/");
    }
    
    // Check if the API is working
    checkApiStatus();
  }, [navigate]);

  // Check if the API is responsive
  const checkApiStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`);
      const data = await response.json();
      setApiStatus({ checked: true, working: data.status === "ok" });
    } catch (error) {
      console.error("API health check failed:", error);
      setApiStatus({ checked: true, working: false });
    }
  };

  const handleEmailVerificationComplete = (isVerified) => {
    setOtpVerified(isVerified);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    
    // Reset email check when email changes
    if (e.target.name === "email") {
      setEmailExists(false);
      setOtpVerified(false);
      setShowOtpSection(false);
    }
    
    // Reset mobile check when contact changes
    if (e.target.name === "contact") {
      setMobileExists(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, profilePic: file });
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Check if email exists in both Firebase Auth and Firestore
  const checkEmailExists = async (email) => {
    try {
      // First check with Firebase Authentication
      const methods = await fetchSignInMethodsForEmail(auth, email);
      
      // Then check with Firestore in case the email exists in database but not in auth
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);
      
      return methods.length > 0 || !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking email:", error);
      return false; // If there's an error, we proceed with caution
    }
  };

  // Check if mobile number exists in Firestore
  const checkMobileExists = async (mobile) => {
    try {
      // Check with Firestore if the contact/mobile exists
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("contact", "==", mobile));
      const querySnapshot = await getDocs(q);
      
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking mobile:", error);
      return false; // If there's an error, we proceed with caution
    }
  };

  const checkEmail = async () => {
    if (!formData.email) return;
    
    setCheckingEmail(true);
    setError("");
    
    try {
      const exists = await checkEmailExists(formData.email);
      
      if (exists) {
        setEmailExists(true);
        setShowOtpSection(false);
      } else {
        setEmailExists(false);
        // Show OTP section only if email is valid and not registered
        setShowOtpSection(true);
      }
    } catch (error) {
      console.error("Error checking email:", error);
      setError("Failed to check email availability. Please try again.");
    } finally {
      setCheckingEmail(false);
    }
  };

  // Check if mobile exists when user moves away from mobile field
  const checkMobile = async () => {
    if (!formData.contact) return;
    
    setCheckingMobile(true);
    setError("");
    
    try {
      const exists = await checkMobileExists(formData.contact);
      
      if (exists) {
        setMobileExists(true);
        setError("This mobile number is already registered. Please use a different number.");
      } else {
        setMobileExists(false);
      }
    } catch (error) {
      console.error("Error checking mobile:", error);
      setError("Failed to check mobile availability. Please try again.");
    } finally {
      setCheckingMobile(false);
    }
  };

  const sendOTP = async () => {
    setError("");
    
    try {
      const response = await fetch(`${API_URL}/api/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: formData.email }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowOtpSection(true);
        setError("");
      } else {
        setError(data.message || "Failed to send OTP. Please try again.");
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      setError("Network error. Please check your connection and try again.");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Check if email verification is required and not completed
    if (showOtpSection && !otpVerified) {
      setError("Please verify your email before registering");
      return;
    }
    
    // Check if email exists
    if (emailExists) {
      setError("This email is already registered. Please log in instead.");
      return;
    }
    
    // Check if mobile exists
    if (mobileExists) {
      setError("This mobile number is already registered. Please use a different number.");
      return;
    }
    
    // Validate name
    const nameValidation = isLikelyValidName(formData.name);
    if (!nameValidation.isValid) {
      setError(nameValidation.message);
      return;
    }
    
    setLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      let profilePicUrl = "";
      if (formData.profilePic) {
        profilePicUrl = await uploadToImageKit(formData.profilePic);
      }

      await setDoc(doc(db, "users", user.uid), {
        name: formData.name,
        username: formData.username,
        email: formData.email,
        contact: formData.contact,
        dob: formData.dob,
        gender: formData.gender,
        address: formData.address,
        profilePic: profilePicUrl,
        reg_date: serverTimestamp(),
        role: "user",
        pinCode: "", 
        status: "new", 
        emailVerified: true
      });

      alert("User registered successfully!");
      navigate("/");
    } catch (error) {
      console.error("Error registering user", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      await setDoc(doc(db, "users", user.uid), {
        name: user.displayName,
        username: user.displayName,
        email: user.email,
        profilePic: user.photoURL,
        contact: "",
        dob: "",
        gender: "",
        address: "",
        reg_date: serverTimestamp(),
        role: "user",
        status: "new",
        pinCode: "", 
        emailVerified: true
      }, { merge: true });

      alert("Signed in with Google successfully!");
      navigate("/home");
    } catch (error) {
      console.error("Google sign-in error", error);
      setError(error.message);
    }
  };

  // Add blur event to check email when user moves away from email field
  const handleEmailBlur = () => {
    checkEmail();
  };

  return (
    <div 
      style={{ 
        backgroundImage: `url(${img})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
        overflow: 'auto'
      }}
    >
      {/* Semi-transparent overlay */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem',
          minHeight: '100vh',
          overflow: 'auto'
        }}
      >
        <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg w-full max-w-md my-8" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
          <h2 className="text-2xl font-bold text-center mb-4 text-green-600">Register for Mangrove Guardian</h2>
          
          {/* API Status Warning */}
          {apiStatus.checked && !apiStatus.working && (
            <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
              <p className="font-bold">API Connection Issue</p>
              <p>Unable to connect to the server. Verification and image upload may not work correctly.</p>
            </div>
          )}
          
          {error && <p className="text-red-500 text-center mb-4">{error}</p>}
          {emailExists && (
            <div className="bg-yellow-100 text-yellow-700 p-4 rounded mb-4">
              This email is already registered. Please <span className="underline cursor-pointer" onClick={() => navigate("/login")}>log in</span> instead.
            </div>
          )}
          
          <form onSubmit={handleRegister} className="space-y-3">
            {/* Name field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input 
                type="text" 
                id="name"
                name="name" 
                placeholder="Full Name" 
                value={formData.name}
                onChange={handleChange}
                required 
                className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input 
                type="email" 
                id="email"
                name="email" 
                placeholder="Email" 
                value={formData.email}
                onChange={handleChange} 
                onBlur={handleEmailBlur}
                required 
                className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
              />
              {checkingEmail && <p className="text-sm text-gray-500">Checking email...</p>}
            </div>
            
            {/* Email Verification Component */}
            {showOtpSection && (
              <EmailVerification
                email={formData.email}
                isEmailExists={emailExists}
                onVerificationComplete={handleEmailVerificationComplete}
                apiUrl={API_URL}
              />
            )}
            
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input 
                type="text" 
                id="username"
                name="username" 
                placeholder="Username" 
                value={formData.username}
                onChange={handleChange} 
                required 
                className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input 
                type="password" 
                id="password"
                name="password" 
                placeholder="Password" 
                value={formData.password}
                onChange={handleChange} 
                required 
                className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input 
                type="password" 
                id="confirmPassword"
                name="confirmPassword" 
                placeholder="Confirm Password" 
                value={formData.confirmPassword}
                onChange={handleChange} 
                required 
                className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
              />
            </div>
            
            <div>
              <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
              <input 
                type="text" 
                id="contact"
                name="contact" 
                placeholder="Contact" 
                value={formData.contact}
                onChange={handleChange}
                required 
                className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
              />
              {checkingMobile && <p className="text-sm text-gray-500">Checking mobile number...</p>}
              {mobileExists && (
                <p className="text-red-500 text-sm mt-1">This mobile number is already registered. Please use a different number.</p>
              )}
            </div>
            
            <div>
              <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input 
                type="date" 
                id="dob"
                name="dob" 
                value={formData.dob}
                onChange={handleChange} 
                required 
                className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
              />
            </div>
            
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select 
                id="gender"
                name="gender" 
                value={formData.gender}
                onChange={handleChange} 
                required 
                className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea 
                id="address"
                name="address" 
                placeholder="Address" 
                value={formData.address}
                onChange={handleChange} 
                required 
                className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500"
                rows="3"
              ></textarea>
            </div>

            <div className="flex flex-col items-center">
              {previewUrl && <img src={previewUrl} alt="Profile Preview" className="w-24 h-24 rounded-full mb-2 object-cover" />}
              <label className="cursor-pointer bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">
                Upload Profile Picture
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
            
            <button 
              type="submit" 
              className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700" 
              disabled={loading || emailExists || mobileExists || 
              (showOtpSection && !otpVerified)}
            >
              {loading ? "Registering..." : "Register"}
            </button>
          </form>
          
          <button 
            onClick={handleGoogleSignIn} 
            className="mt-4 w-full flex items-center justify-center bg-white text-gray-700 border border-gray-300 p-2 rounded hover:bg-gray-50"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </button>
          
          <p className="mt-4 text-center text-gray-600">
            Already have an account? <span className="text-green-600 cursor-pointer font-semibold" onClick={() => navigate("/login")}>Login</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;



// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { auth, db, googleProvider } from "./config/firebase";
// import { createUserWithEmailAndPassword, signInWithPopup, fetchSignInMethodsForEmail } from "firebase/auth";
// import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
// import ToxicityDetector from "./ToxicityDetector";
// import EmailVerification from "./EmailVerification";

// const Register = () => {
//   // API credentials for OTP.dev - keeping this in case needed elsewhere
//   // const OTP_API_KEY = "6kYl97wGW2X0IPyUsnhNgOMSE3zVTmpL";
//   // const OTP_API_TOKEN = "38fcuvgs4o0hl6tm9y72qza1bwnpi5xk";
  
//   // Use the correct API URL based on environment
//   const API_URL = "https://transgression-vigilance.vercel.app";

//   const navigate = useNavigate();
//   const [formData, setFormData] = useState({
//     email: "",
//     password: "",
//     confirmPassword: "",
//     name: "",
//     username: "",
//     contact: "",
//     dob: "",
//     gender: "",
//     address: "",
//     profilePic: null,
//   });

//   // Background image URL
//   const img = 'https://od.lk/s/OV8yNDk0MzM4ODZf/login2.jpg';

//   const [previewUrl, setPreviewUrl] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [checkingEmail, setCheckingEmail] = useState(false);
//   const [emailExists, setEmailExists] = useState(false);
  
//   // Added state for mobile check (just checking if it exists, no OTP)
//   const [checkingMobile, setCheckingMobile] = useState(false);
//   const [mobileExists, setMobileExists] = useState(false);
  
//   // State for toxicity model
//   const [toxicityModel, setToxicityModel] = useState(null);
//   const [toxicityError, setToxicityError] = useState("");

//   // Add state for name validation error
//   const [nameError, setNameError] = useState("");
  
//   // State for email verification
//   const [showOtpSection, setShowOtpSection] = useState(false);
//   const [otpVerified, setOtpVerified] = useState(false);
  
//   // Debug state for API connection issues
//   const [apiStatus, setApiStatus] = useState({ checked: false, working: false });

//   useEffect(() => {
//     if (auth.currentUser) {
//       navigate("/");
//     }
    
//     // Check if the API is working
//     checkApiStatus();
//   }, [navigate]);

//   // Check if the API is responsive
//   const checkApiStatus = async () => {
//     try {
//       const response = await fetch(`${API_URL}/api/health`);
//       const data = await response.json();
//       setApiStatus({ checked: true, working: data.status === "ok" });
//     } catch (error) {
//       console.error("API health check failed:", error);
//       setApiStatus({ checked: true, working: false });
//     }
//   };

//   const handleModelLoad = (model) => {
//     setToxicityModel(model);
//   };

//   const handleToxicityCheck = (isAcceptable, errorMessage) => {
//     setToxicityError(errorMessage);
//   };

//   const handleEmailVerificationComplete = (isVerified) => {
//     setOtpVerified(isVerified);
//   };

//   // const isLikelyValidName = (value) => {
//   //   if (!value) return false;
    
//   //   // Basic checks for a likely valid name
//   //   const hasVowel = /[aeiouAEIOU]/.test(value);
//   //   const onlyAllowedChars = /^[a-zA-Z\s'-]+$/.test(value);
//   //   const noRepetition = !/(.)\1{2,}/.test(value); // e.g., no "aaa"
//   //   const hasProperLength = value.length >= 2 && value.length <= 50;
//   //   const noConsecutiveSymbols = !/['-]{2,}/.test(value); // No -- or ''
//   //   const doesntStartWithAbc = !/^abc/i.test(value); // New check for names starting with "abc"
    
//   //   // Return validation result with specific error message
//   //   if (!hasProperLength) {
//   //     return { isValid: false, message: "Name should be between 2 and 50 characters" };
//   //   }
//   //   if (!onlyAllowedChars) {
//   //     return { isValid: false, message: "Name should only contain letters, spaces, hyphens or apostrophes" };
//   //   }
//   //   if (!hasVowel) {
//   //     return { isValid: false, message: "Invalid Name : Pls enter valid Name" };
//   //   }
//   //   if (!noRepetition) {
//   //     return { isValid: false, message: "Your Name looks invalid pls enter valid Name" };
//   //   }
//   //   if (!noConsecutiveSymbols) {
//   //     return { isValid: false, message: "Your Name looks invalid pls enter valid name as Name contains consecutive special characters" };
//   //   }
//   //   if (!doesntStartWithAbc) {
//   //     return { isValid: false, message: "Your Name looks invalid pls enter valid Name" };
//   //   }
    
//   //   return { isValid: true, message: "" };
//   // };

  
//   // Smart name validation function
//   const isLikelyValidName = (value) => {
//     if (!value) return false;
    
//     // Basic checks for a likely valid name
//     const hasVowel = /[aeiouAEIOU]/.test(value);
//     const onlyAllowedChars = /^[a-zA-Z\s'-]+$/.test(value);
//     const noRepetition = !/(.)\1{2,}/.test(value); // e.g., no "aaa"
//     const hasProperLength = value.length >= 2 && value.length <= 50;
//     const noConsecutiveSymbols = !/['-]{2,}/.test(value); // No -- or ''
//     const doesntStartWithAbc = !/^abc/i.test(value); // Check for names starting with "abc"
    
//     // New check for alphabetical sequences
//     const noAlphabeticalSequence = (str) => {
//         str = str.toLowerCase();
//         for (let i = 0; i <= str.length - 3; i++) {
//             // Check if three consecutive characters are in alphabetical sequence
//             if (
//                 str.charCodeAt(i + 1) === str.charCodeAt(i) + 1 &&
//                 str.charCodeAt(i + 2) === str.charCodeAt(i) + 2
//             ) {
//                 return false;
//             }
//         }
//         return true;
//     };
    
//     // Return validation result with specific error message
//     if (!hasProperLength) {
//       return { isValid: false, message: "Name should be between 2 and 50 characters" };
//     }
//     if (!onlyAllowedChars) {
//       return { isValid: false, message: "Name should only contain letters, spaces, hyphens or apostrophes" };
//     }
//     if (!hasVowel) {
//       return { isValid: false, message: "Invalid Name : Pls enter valid Name" };
//     }
//     if (!noRepetition) {
//       return { isValid: false, message: "Your Name looks invalid pls enter valid Name" };
//     }
//     if (!noConsecutiveSymbols) {
//       return { isValid: false, message: "Your Name looks invalid pls enter valid Name as Name contains consecutive special characters" };
//     }
//     if (!doesntStartWithAbc) {
//       return { isValid: false, message: "Your Name looks invalid pls enter valid Name" };
//     }
//     if (!noAlphabeticalSequence(value)) {
//       return { isValid: false, message: "Your Name looks invalid as it contains sequential alphabetical characters, please enter a valid Name" };
//     }
    
//     return { isValid: true, message: "" };
// };
//   const handleChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
    
//     // Reset errors when name changes
//     if (e.target.name === "name") {
//       setNameError("");
//       setToxicityError("");
//     }
    
//     // Reset email check when email changes
//     if (e.target.name === "email") {
//       setEmailExists(false);
//       setOtpVerified(false);
//       setShowOtpSection(false);
//     }
    
//     // Reset mobile check when contact changes
//     if (e.target.name === "contact") {
//       setMobileExists(false);
//     }
//   };

//   const handleFileChange = (e) => {
//     const file = e.target.files[0];
//     if (file) {
//       setFormData({ ...formData, profilePic: file });
//       setPreviewUrl(URL.createObjectURL(file));
//     }
//   };

//   // Check if email exists in both Firebase Auth and Firestore
//   const checkEmailExists = async (email) => {
//     try {
//       // First check with Firebase Authentication
//       const methods = await fetchSignInMethodsForEmail(auth, email);
      
//       // Then check with Firestore in case the email exists in database but not in auth
//       const usersRef = collection(db, "users");
//       const q = query(usersRef, where("email", "==", email));
//       const querySnapshot = await getDocs(q);
      
//       return methods.length > 0 || !querySnapshot.empty;
//     } catch (error) {
//       console.error("Error checking email:", error);
//       return false; // If there's an error, we proceed with caution
//     }
//   };

//   // Check if mobile number exists in Firestore
//   const checkMobileExists = async (mobile) => {
//     try {
//       // Check with Firestore if the contact/mobile exists
//       const usersRef = collection(db, "users");
//       const q = query(usersRef, where("contact", "==", mobile));
//       const querySnapshot = await getDocs(q);
      
//       return !querySnapshot.empty;
//     } catch (error) {
//       console.error("Error checking mobile:", error);
//       return false; // If there's an error, we proceed with caution
//     }
//   };

//   const checkEmail = async () => {
//     if (!formData.email) return;
    
//     setCheckingEmail(true);
//     setError("");
    
//     try {
//       const exists = await checkEmailExists(formData.email);
      
//       if (exists) {
//         setEmailExists(true);
//         setShowOtpSection(false);
//       } else {
//         setEmailExists(false);
//         // Show OTP section only if email is valid and not registered
//         setShowOtpSection(true);
//       }
//     } catch (error) {
//       console.error("Error checking email:", error);
//       setError("Failed to check email availability. Please try again.");
//     } finally {
//       setCheckingEmail(false);
//     }
//   };

//   // Check if mobile exists when user moves away from mobile field
//   const checkMobile = async () => {
//     if (!formData.contact) return;
    
//     setCheckingMobile(true);
//     setError("");
    
//     try {
//       const exists = await checkMobileExists(formData.contact);
      
//       if (exists) {
//         setMobileExists(true);
//         setError("This mobile number is already registered. Please use a different number.");
//       } else {
//         setMobileExists(false);
//       }
//     } catch (error) {
//       console.error("Error checking mobile:", error);
//       setError("Failed to check mobile availability. Please try again.");
//     } finally {
//       setCheckingMobile(false);
//     }
//   };

//   const uploadToImageKit = async (file) => {
//     if (!file) return "";

//     try {
//       console.log("Getting ImageKit auth tokens");
//       const authResponse = await fetch(`${API_URL}/api/auth`);
//       if (!authResponse.ok) {
//         throw new Error(`Failed to get auth tokens: ${authResponse.status} ${authResponse.statusText}`);
//       }
      
//       const authData = await authResponse.json();
//       console.log("Auth data received:", authData);

//       const formData = new FormData();
//       formData.append("file", file);
//       formData.append("fileName", `profile_${Date.now()}_${file.name}`);
//       formData.append("publicKey", "public_KoLQpUZM3TZfPrc1If4RUVRgHAw=");
//       formData.append("signature", authData.signature);
//       formData.append("expire", authData.expire);
//       formData.append("token", authData.token);
//       formData.append("folder", "/profile_pictures");
      
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

//   const handleRegister = async (e) => {
//     e.preventDefault();
    
//     // Check if email verification is required and not completed
//     if (showOtpSection && !otpVerified) {
//       setError("Please verify your email before registering");
//       return;
//     }
    
//     // Check if email exists
//     if (emailExists) {
//       setError("This email is already registered. Please log in instead.");
//       return;
//     }
    
//     // Check if mobile exists
//     if (mobileExists) {
//       setError("This mobile number is already registered. Please use a different number.");
//       return;
//     }
    
//     // Check for name or toxicity error
//     if (nameError || toxicityError) {
//       return;
//     }
    
//     setLoading(true);
//     setError("");

//     if (formData.password !== formData.confirmPassword) {
//       setError("Passwords do not match!");
//       setLoading(false);
//       return;
//     }

//     try {
//       const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
//       const user = userCredential.user;

//       let profilePicUrl = "";
//       if (formData.profilePic) {
//         profilePicUrl = await uploadToImageKit(formData.profilePic);
//       }

//       await setDoc(doc(db, "users", user.uid), {
//         name: formData.name,
//         username: formData.username,
//         email: formData.email,
//         contact: formData.contact,
//         dob: formData.dob,
//         gender: formData.gender,
//         address: formData.address,
//         profilePic: profilePicUrl,
//         reg_date: serverTimestamp(),
//         role: "user",
//         pinCode: "", 
//         status: "new", 
//         emailVerified: true,
//         phoneVerified: false // We're no longer verifying phone, so this stays false
//       });

//       alert("User registered successfully!");
//       navigate("/");
//     } catch (error) {
//       console.error("Error registering user", error);
//       setError(error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleGoogleSignIn = async () => {
//     try {
//       // Before signing in with Google, we need to get the email that will be used
//       const result = await signInWithPopup(auth, googleProvider);
//       const user = result.user;
//       const email = user.email;
      
//       // Check if this email already exists in our system
//       const emailExists = await checkEmailExists(email);
      
//       if (emailExists) {
//         // If email exists, show alert and redirect to login
//         alert("This email is already registered. Redirecting to login page.");
//         navigate("/login");
//         return;
//       }
      
//       // If email doesn't exist, proceed with creating the user account
//       await setDoc(doc(db, "users", user.uid), {
//         name: user.displayName,
//         username: user.displayName,
//         email: user.email,
//         profilePic: user.photoURL,
//         contact: "",
//         dob: "",
//         gender: "",
//         address: "",
//         reg_date: serverTimestamp(),
//         role: "user",
//         status: "new",
//         pinCode: "", 
//         emailVerified: true,
//         phoneVerified: false
//       }, { merge: true });

//       alert("Signed in with Google successfully!");
//       navigate("/home");
//     } catch (error) {
//       console.error("Google sign-in error", error);
//       setError(error.message);
//     }
//   };

//   // Add blur event to check email when user moves away from email field
//   const handleEmailBlur = () => {
//     checkEmail();
//   };
  
//   // Add blur event handlers for name and mobile checks
//   const handleNameBlur = async () => {
//     // First perform local name validation
//     const nameValidation = isLikelyValidName(formData.name);
    
//     if (!nameValidation.isValid) {
//       setNameError(nameValidation.message);
//       return; // Don't proceed to toxicity check if name format is invalid
//     }
    
//     // If name format is valid, then check for toxicity
//     if (toxicityModel && formData.name) {
//       await toxicityModel.classify([formData.name])
//         .then(predictions => {
//           const isToxic = predictions.some(
//             (prediction) =>
//               prediction.results[0].match === true &&
//               ['toxicity', 'insult', 'threat', 'identity_attack'].includes(prediction.label)
//           );
          
//           if (isToxic) {
//             setToxicityError("The name you entered appears inappropriate. Please choose a different name.");
//           } else {
//             setToxicityError("");
//           }
//         })
//         .catch(error => {
//           console.error("Error checking name toxicity:", error);
//         });
//     }
//   };
  
//   const handleMobileBlur = () => {
//     checkMobile();
//   };

//   return (
//     <div 
//       style={{ 
//         backgroundImage: `url(${img})`,
//         backgroundSize: 'cover',
//         backgroundPosition: 'center',
//         backgroundRepeat: 'no-repeat',
//         minHeight: '100vh',
//         width: '100%',
//         position: 'relative',
//         overflow: 'auto'
//       }}
//     >
//       {/* Semi-transparent overlay */}
//       <div 
//         style={{
//           position: 'absolute',
//           top: 0,
//           left: 0,
//           right: 0,
//           bottom: 0,
//           backgroundColor: 'rgba(0, 0, 0, 0.5)',
//           display: 'flex',
//           alignItems: 'center',
//           justifyContent: 'center',
//           padding: '2rem 1rem',
//           minHeight: '100vh',
//           overflow: 'auto'
//         }}
//       >
//         <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg w-full max-w-md my-8" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
//           <h2 className="text-2xl font-bold text-center mb-4 text-red-600">Register for Transgression Vigilance</h2>
          
//           {/* Toxicity Detector Component */}
//           <ToxicityDetector 
//             onModelLoad={handleModelLoad}
//             onCheckToxicity={handleToxicityCheck}
//           />
          
//           {/* API Status Warning */}
//           {apiStatus.checked && !apiStatus.working && (
//             <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
//               <p className="font-bold">API Connection Issue</p>
//               <p>Unable to connect to the server. Verification and image upload may not work correctly.</p>
//             </div>
//           )}
          
//           {error && <p className="text-red-500 text-center mb-4">{error}</p>}
//           {emailExists && (
//             <div className="bg-yellow-100 text-yellow-700 p-4 rounded mb-4">
//               This email is already registered. Please <span className="underline cursor-pointer" onClick={() => navigate("/login")}>log in</span> instead.
//             </div>
//           )}
          
//           <form onSubmit={handleRegister} className="space-y-3">
//             {/* Name field */}
//             <div>
//               <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
//               <input 
//                 type="text" 
//                 id="name"
//                 name="name" 
//                 placeholder="Full Name" 
//                 value={formData.name}
//                 onChange={handleChange}
//                 onBlur={handleNameBlur}
//                 required 
//                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
//               />
//               {nameError && (
//                 <p className="text-red-500 text-sm mt-1">{nameError}</p>
//               )}
//               {toxicityError && (
//                 <p className="text-red-500 text-sm mt-1">{toxicityError}</p>
//               )}
//             </div>
            
//             <div>
//               <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
//               <input 
//                 type="email" 
//                 id="email"
//                 name="email" 
//                 placeholder="Email" 
//                 value={formData.email}
//                 onChange={handleChange} 
//                 onBlur={handleEmailBlur}
//                 required 
//                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
//               />
//               {checkingEmail && <p className="text-sm text-gray-500">Checking email...</p>}
//             </div>
            
//             {/* Email Verification Component */}
//             {showOtpSection && (
//               <EmailVerification
//                 email={formData.email}
//                 isEmailExists={emailExists}
//                 onVerificationComplete={handleEmailVerificationComplete}
//                 apiUrl={API_URL}
//               />
//             )}
            
//             <div>
//               <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
//               <input 
//                 type="text" 
//                 id="username"
//                 name="username" 
//                 placeholder="Username" 
//                 value={formData.username}
//                 onChange={handleChange} 
//                 required 
//                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
//               />
//             </div>
            
//             <div>
//               <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
//               <input 
//                 type="password" 
//                 id="password"
//                 name="password" 
//                 placeholder="Password" 
//                 value={formData.password}
//                 onChange={handleChange} 
//                 required 
//                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
//               />
//             </div>
            
//             <div>
//               <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
//               <input 
//                 type="password" 
//                 id="confirmPassword"
//                 name="confirmPassword" 
//                 placeholder="Confirm Password" 
//                 value={formData.confirmPassword}
//                 onChange={handleChange} 
//                 required 
//                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
//               />
//             </div>
            
//             <div>
//               <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
//               <input 
//                 type="text" 
//                 id="contact"
//                 name="contact" 
//                 placeholder="Contact" 
//                 value={formData.contact}
//                 onChange={handleChange}
//                 onBlur={handleMobileBlur} 
//                 required 
//                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
//               />
//               {checkingMobile && <p className="text-sm text-gray-500">Checking mobile number...</p>}
//               {mobileExists && (
//                 <p className="text-red-500 text-sm mt-1">This mobile number is already registered. Please use a different number.</p>
//               )}
//             </div>
            
//             <div>
//               <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
//               <input 
//                 type="date" 
//                 id="dob"
//                 name="dob" 
//                 value={formData.dob}
//                 onChange={handleChange} 
//                 required 
//                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
//               />
//             </div>
            
//             <div>
//               <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
//               <select 
//                 id="gender"
//                 name="gender" 
//                 value={formData.gender}
//                 onChange={handleChange} 
//                 required 
//                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500"
//               >
//                 <option value="">Select Gender</option>
//                 <option value="Male">Male</option>
//                 <option value="Female">Female</option>
//                 <option value="Other">Other</option>
//               </select>
//             </div>
            
//             <div>
//               <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
//               <textarea 
//                 id="address"
//                 name="address" 
//                 placeholder="Address" 
//                 value={formData.address}
//                 onChange={handleChange} 
//                 required 
//                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500"
//                 rows="3"
//               ></textarea>
//             </div>

//             <div className="flex flex-col items-center">
//               {previewUrl && <img src={previewUrl} alt="Profile Preview" className="w-24 h-24 rounded-full mb-2 object-cover" />}
//               <label className="cursor-pointer bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">
//                 Upload Profile Picture
//                 <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
//               </label>
//             </div>
            
//             <button 
//               type="submit" 
//               className="w-full bg-red-600 text-white p-2 rounded hover:bg-red-700" 
//               disabled={loading || emailExists || mobileExists || 
//               nameError || // Add name error to disable conditions
//               (showOtpSection && !otpVerified) || 
//               !!toxicityError}
//             >
//               {loading ? "Registering..." : "Register"}
//             </button>
//           </form>
          
//           <button 
//             onClick={handleGoogleSignIn} 
//             className="mt-4 w-full flex items-center justify-center bg-white text-gray-700 border border-gray-300 p-2 rounded hover:bg-gray-50"
//           >
//             <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
//               <path
//                 fill="#4285F4"
//                 d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
//               />
//               <path
//                 fill="#34A853"
//                 d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
//               />
//               <path
//                 fill="#FBBC05"
//                 d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
//               />
//               <path
//                 fill="#EA4335"
//                 d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
//               />
//             </svg>
//             Sign in with Google
//           </button>
          
//           <p className="mt-4 text-center text-gray-600">
//             Already have an account? <span className="text-red-600 cursor-pointer font-semibold" onClick={() => navigate("/login")}>Login</span>
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Register;


// // import React, { useState, useEffect } from "react";
// // import { useNavigate } from "react-router-dom";
// // import { auth, db, googleProvider } from "./config/firebase";
// // import { createUserWithEmailAndPassword, signInWithPopup, fetchSignInMethodsForEmail } from "firebase/auth";
// // import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
// // import ToxicityDetector from "./ToxicityDetector";
// // import EmailVerification from "./EmailVerification";

// // const Register = () => {
// //   // API credentials for OTP.dev - keeping this in case needed elsewhere
// //   // const OTP_API_KEY = "6kYl97wGW2X0IPyUsnhNgOMSE3zVTmpL";
// //   // const OTP_API_TOKEN = "38fcuvgs4o0hl6tm9y72qza1bwnpi5xk";
  
// //   // Use the correct API URL based on environment
// //   const API_URL = "https://transgression-vigilance.vercel.app";

// //   const navigate = useNavigate();
// //   const [formData, setFormData] = useState({
// //     email: "",
// //     password: "",
// //     confirmPassword: "",
// //     name: "",
// //     username: "",
// //     contact: "",
// //     dob: "",
// //     gender: "",
// //     address: "",
// //     profilePic: null,
// //   });

// //   // Background image URL
// //   const img = 'https://od.lk/s/OV8yNDk0MzM4ODZf/login2.jpg';

// //   const [previewUrl, setPreviewUrl] = useState(null);
// //   const [loading, setLoading] = useState(false);
// //   const [error, setError] = useState("");
// //   const [checkingEmail, setCheckingEmail] = useState(false);
// //   const [emailExists, setEmailExists] = useState(false);
  
// //   // Added state for mobile check (just checking if it exists, no OTP)
// //   const [checkingMobile, setCheckingMobile] = useState(false);
// //   const [mobileExists, setMobileExists] = useState(false);
  
// //   // State for toxicity model
// //   const [toxicityModel, setToxicityModel] = useState(null);
// //   const [toxicityError, setToxicityError] = useState("");
  
// //   // State for email verification
// //   const [showOtpSection, setShowOtpSection] = useState(false);
// //   const [otpVerified, setOtpVerified] = useState(false);
  
// //   // Debug state for API connection issues
// //   const [apiStatus, setApiStatus] = useState({ checked: false, working: false });

// //   useEffect(() => {
// //     if (auth.currentUser) {
// //       navigate("/");
// //     }
    
// //     // Check if the API is working
// //     checkApiStatus();
// //   }, [navigate]);

// //   // Check if the API is responsive
// //   const checkApiStatus = async () => {
// //     try {
// //       const response = await fetch(`${API_URL}/api/health`);
// //       const data = await response.json();
// //       setApiStatus({ checked: true, working: data.status === "ok" });
// //     } catch (error) {
// //       console.error("API health check failed:", error);
// //       setApiStatus({ checked: true, working: false });
// //     }
// //   };

// //   const handleModelLoad = (model) => {
// //     setToxicityModel(model);
// //   };

// //   const handleToxicityCheck = (isAcceptable, errorMessage) => {
// //     setToxicityError(errorMessage);
// //   };

// //   const handleEmailVerificationComplete = (isVerified) => {
// //     setOtpVerified(isVerified);
// //   };

// //   const handleChange = (e) => {
// //     setFormData({ ...formData, [e.target.name]: e.target.value });
    
// //     // Reset toxicity error when name changes
// //     if (e.target.name === "name") {
// //       setToxicityError("");
// //     }
    
// //     // Reset email check when email changes
// //     if (e.target.name === "email") {
// //       setEmailExists(false);
// //       setOtpVerified(false);
// //       setShowOtpSection(false);
// //     }
    
// //     // Reset mobile check when contact changes
// //     if (e.target.name === "contact") {
// //       setMobileExists(false);
// //     }
// //   };

// //   const handleFileChange = (e) => {
// //     const file = e.target.files[0];
// //     if (file) {
// //       setFormData({ ...formData, profilePic: file });
// //       setPreviewUrl(URL.createObjectURL(file));
// //     }
// //   };

// //   // Check if email exists in both Firebase Auth and Firestore
// //   const checkEmailExists = async (email) => {
// //     try {
// //       // First check with Firebase Authentication
// //       const methods = await fetchSignInMethodsForEmail(auth, email);
      
// //       // Then check with Firestore in case the email exists in database but not in auth
// //       const usersRef = collection(db, "users");
// //       const q = query(usersRef, where("email", "==", email));
// //       const querySnapshot = await getDocs(q);
      
// //       return methods.length > 0 || !querySnapshot.empty;
// //     } catch (error) {
// //       console.error("Error checking email:", error);
// //       return false; // If there's an error, we proceed with caution
// //     }
// //   };

// //   // Check if mobile number exists in Firestore
// //   const checkMobileExists = async (mobile) => {
// //     try {
// //       // Check with Firestore if the contact/mobile exists
// //       const usersRef = collection(db, "users");
// //       const q = query(usersRef, where("contact", "==", mobile));
// //       const querySnapshot = await getDocs(q);
      
// //       return !querySnapshot.empty;
// //     } catch (error) {
// //       console.error("Error checking mobile:", error);
// //       return false; // If there's an error, we proceed with caution
// //     }
// //   };

// //   const checkEmail = async () => {
// //     if (!formData.email) return;
    
// //     setCheckingEmail(true);
// //     setError("");
    
// //     try {
// //       const exists = await checkEmailExists(formData.email);
      
// //       if (exists) {
// //         setEmailExists(true);
// //         setShowOtpSection(false);
// //       } else {
// //         setEmailExists(false);
// //         // Show OTP section only if email is valid and not registered
// //         setShowOtpSection(true);
// //       }
// //     } catch (error) {
// //       console.error("Error checking email:", error);
// //       setError("Failed to check email availability. Please try again.");
// //     } finally {
// //       setCheckingEmail(false);
// //     }
// //   };

// //   // Check if mobile exists when user moves away from mobile field
// //   const checkMobile = async () => {
// //     if (!formData.contact) return;
    
// //     setCheckingMobile(true);
// //     setError("");
    
// //     try {
// //       const exists = await checkMobileExists(formData.contact);
      
// //       if (exists) {
// //         setMobileExists(true);
// //         setError("This mobile number is already registered. Please use a different number.");
// //       } else {
// //         setMobileExists(false);
// //       }
// //     } catch (error) {
// //       console.error("Error checking mobile:", error);
// //       setError("Failed to check mobile availability. Please try again.");
// //     } finally {
// //       setCheckingMobile(false);
// //     }
// //   };

// //   const uploadToImageKit = async (file) => {
// //     if (!file) return "";

// //     try {
// //       console.log("Getting ImageKit auth tokens");
// //       const authResponse = await fetch(`${API_URL}/api/auth`);
// //       if (!authResponse.ok) {
// //         throw new Error(`Failed to get auth tokens: ${authResponse.status} ${authResponse.statusText}`);
// //       }
      
// //       const authData = await authResponse.json();
// //       console.log("Auth data received:", authData);

// //       const formData = new FormData();
// //       formData.append("file", file);
// //       formData.append("fileName", `profile_${Date.now()}_${file.name}`);
// //       formData.append("publicKey", "public_KoLQpUZM3TZfPrc1If4RUVRgHAw=");
// //       formData.append("signature", authData.signature);
// //       formData.append("expire", authData.expire);
// //       formData.append("token", authData.token);
// //       formData.append("folder", "/profile_pictures");
      
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

// //   const handleRegister = async (e) => {
// //     e.preventDefault();
    
// //     // Check if email verification is required and not completed
// //     if (showOtpSection && !otpVerified) {
// //       setError("Please verify your email before registering");
// //       return;
// //     }
    
// //     // Check if email exists
// //     if (emailExists) {
// //       setError("This email is already registered. Please log in instead.");
// //       return;
// //     }
    
// //     // Check if mobile exists
// //     if (mobileExists) {
// //       setError("This mobile number is already registered. Please use a different number.");
// //       return;
// //     }
    
// //     // Check for toxicity error
// //     if (toxicityError) {
// //       return;
// //     }
    
// //     setLoading(true);
// //     setError("");

// //     if (formData.password !== formData.confirmPassword) {
// //       setError("Passwords do not match!");
// //       setLoading(false);
// //       return;
// //     }

// //     try {
// //       const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
// //       const user = userCredential.user;

// //       let profilePicUrl = "";
// //       if (formData.profilePic) {
// //         profilePicUrl = await uploadToImageKit(formData.profilePic);
// //       }

// //       await setDoc(doc(db, "users", user.uid), {
// //         name: formData.name,
// //         username: formData.username,
// //         email: formData.email,
// //         contact: formData.contact,
// //         dob: formData.dob,
// //         gender: formData.gender,
// //         address: formData.address,
// //         profilePic: profilePicUrl,
// //         reg_date: serverTimestamp(),
// //         role: "user",
// //         pinCode: "", 
// //         status: "new", 
// //         emailVerified: true,
// //         phoneVerified: false // We're no longer verifying phone, so this stays false
// //       });

// //       alert("User registered successfully!");
// //       navigate("/");
// //     } catch (error) {
// //       console.error("Error registering user", error);
// //       setError(error.message);
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const handleGoogleSignIn = async () => {
// //     try {
// //       // Before signing in with Google, we need to get the email that will be used
// //       const result = await signInWithPopup(auth, googleProvider);
// //       const user = result.user;
// //       const email = user.email;
      
// //       // Check if this email already exists in our system
// //       const emailExists = await checkEmailExists(email);
      
// //       if (emailExists) {
// //         // If email exists, show alert and redirect to login
// //         alert("This email is already registered. Redirecting to login page.");
// //         navigate("/login");
// //         return;
// //       }
      
// //       // If email doesn't exist, proceed with creating the user account
// //       await setDoc(doc(db, "users", user.uid), {
// //         name: user.displayName,
// //         username: user.displayName,
// //         email: user.email,
// //         profilePic: user.photoURL,
// //         contact: "",
// //         dob: "",
// //         gender: "",
// //         address: "",
// //         reg_date: serverTimestamp(),
// //         role: "user",
// //         status: "new",
// //         pinCode: "", 
// //         emailVerified: true,
// //         phoneVerified: false
// //       }, { merge: true });

// //       alert("Signed in with Google successfully!");
// //       navigate("/home");
// //     } catch (error) {
// //       console.error("Google sign-in error", error);
// //       setError(error.message);
// //     }
// //   };

// //   // Add blur event to check email when user moves away from email field
// //   const handleEmailBlur = () => {
// //     checkEmail();
// //   };
  
// //   // Add blur event handlers for name and mobile checks
// //   const handleNameBlur = async () => {
// //     if (toxicityModel && formData.name) {
// //       await toxicityModel.classify([formData.name])
// //         .then(predictions => {
// //           const isToxic = predictions.some(
// //             (prediction) =>
// //               prediction.results[0].match === true &&
// //               ['toxicity', 'insult', 'threat', 'identity_attack'].includes(prediction.label)
// //           );
          
// //           if (isToxic) {
// //             setToxicityError("The name you entered appears inappropriate. Please choose a different name.");
// //           } else {
// //             setToxicityError("");
// //           }
// //         })
// //         .catch(error => {
// //           console.error("Error checking name toxicity:", error);
// //         });
// //     }
// //   };
  
// //   const handleMobileBlur = () => {
// //     checkMobile();
// //   };

// //   return (
// //     <div 
// //       style={{ 
// //         backgroundImage: `url(${img})`,
// //         backgroundSize: 'cover',
// //         backgroundPosition: 'center',
// //         backgroundRepeat: 'no-repeat',
// //         minHeight: '100vh',
// //         width: '100%',
// //         position: 'relative',
// //         overflow: 'auto'
// //       }}
// //     >
// //       {/* Semi-transparent overlay */}
// //       <div 
// //         style={{
// //           position: 'absolute',
// //           top: 0,
// //           left: 0,
// //           right: 0,
// //           bottom: 0,
// //           backgroundColor: 'rgba(0, 0, 0, 0.5)',
// //           display: 'flex',
// //           alignItems: 'center',
// //           justifyContent: 'center',
// //           padding: '2rem 1rem',
// //           minHeight: '100vh',
// //           overflow: 'auto'
// //         }}
// //       >
// //         <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg w-full max-w-md my-8" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
// //           <h2 className="text-2xl font-bold text-center mb-4 text-red-600">Register for Transgression Vigilance</h2>
          
// //           {/* Toxicity Detector Component */}
// //           <ToxicityDetector 
// //             onModelLoad={handleModelLoad}
// //             onCheckToxicity={handleToxicityCheck}
// //           />
          
// //           {/* API Status Warning */}
// //           {apiStatus.checked && !apiStatus.working && (
// //             <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
// //               <p className="font-bold">API Connection Issue</p>
// //               <p>Unable to connect to the server. Verification and image upload may not work correctly.</p>
// //             </div>
// //           )}
          
// //           {error && <p className="text-red-500 text-center mb-4">{error}</p>}
// //           {emailExists && (
// //             <div className="bg-yellow-100 text-yellow-700 p-4 rounded mb-4">
// //               This email is already registered. Please <span className="underline cursor-pointer" onClick={() => navigate("/login")}>log in</span> instead.
// //             </div>
// //           )}
          
// //           <form onSubmit={handleRegister} className="space-y-3">
// //             {/* Name field */}
// //             <div>
// //               <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
// //               <input 
// //                 type="text" 
// //                 id="name"
// //                 name="name" 
// //                 placeholder="Full Name" 
// //                 value={formData.name}
// //                 onChange={handleChange}
// //                 onBlur={handleNameBlur}
// //                 required 
// //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// //               />
// //               {toxicityError && (
// //                 <p className="text-red-500 text-sm mt-1">{toxicityError}</p>
// //               )}
// //             </div>
            
// //             <div>
// //               <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
// //               <input 
// //                 type="email" 
// //                 id="email"
// //                 name="email" 
// //                 placeholder="Email" 
// //                 value={formData.email}
// //                 onChange={handleChange} 
// //                 onBlur={handleEmailBlur}
// //                 required 
// //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// //               />
// //               {checkingEmail && <p className="text-sm text-gray-500">Checking email...</p>}
// //             </div>
            
// //             {/* Email Verification Component */}
// //             {showOtpSection && (
// //               <EmailVerification
// //                 email={formData.email}
// //                 isEmailExists={emailExists}
// //                 onVerificationComplete={handleEmailVerificationComplete}
// //                 apiUrl={API_URL}
// //               />
// //             )}
            
// //             <div>
// //               <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
// //               <input 
// //                 type="text" 
// //                 id="username"
// //                 name="username" 
// //                 placeholder="Username" 
// //                 value={formData.username}
// //                 onChange={handleChange} 
// //                 required 
// //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// //               />
// //             </div>
            
// //             <div>
// //               <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
// //               <input 
// //                 type="password" 
// //                 id="password"
// //                 name="password" 
// //                 placeholder="Password" 
// //                 value={formData.password}
// //                 onChange={handleChange} 
// //                 required 
// //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// //               />
// //             </div>
            
// //             <div>
// //               <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
// //               <input 
// //                 type="password" 
// //                 id="confirmPassword"
// //                 name="confirmPassword" 
// //                 placeholder="Confirm Password" 
// //                 value={formData.confirmPassword}
// //                 onChange={handleChange} 
// //                 required 
// //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// //               />
// //             </div>
            
// //             <div>
// //               <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
// //               <input 
// //                 type="text" 
// //                 id="contact"
// //                 name="contact" 
// //                 placeholder="Contact" 
// //                 value={formData.contact}
// //                 onChange={handleChange}
// //                 onBlur={handleMobileBlur} 
// //                 required 
// //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// //               />
// //               {checkingMobile && <p className="text-sm text-gray-500">Checking mobile number...</p>}
// //               {mobileExists && (
// //                 <p className="text-red-500 text-sm mt-1">This mobile number is already registered. Please use a different number.</p>
// //               )}
// //             </div>
            
// //             <div>
// //               <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
// //               <input 
// //                 type="date" 
// //                 id="dob"
// //                 name="dob" 
// //                 value={formData.dob}
// //                 onChange={handleChange} 
// //                 required 
// //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// //               />
// //             </div>
            
// //             <div>
// //               <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
// //               <select 
// //                 id="gender"
// //                 name="gender" 
// //                 value={formData.gender}
// //                 onChange={handleChange} 
// //                 required 
// //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500"
// //               >
// //                 <option value="">Select Gender</option>
// //                 <option value="Male">Male</option>
// //                 <option value="Female">Female</option>
// //                 <option value="Other">Other</option>
// //               </select>
// //             </div>
            
// //             <div>
// //               <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
// //               <textarea 
// //                 id="address"
// //                 name="address" 
// //                 placeholder="Address" 
// //                 value={formData.address}
// //                 onChange={handleChange} 
// //                 required 
// //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500"
// //                 rows="3"
// //               ></textarea>
// //             </div>

// //             <div className="flex flex-col items-center">
// //               {previewUrl && <img src={previewUrl} alt="Profile Preview" className="w-24 h-24 rounded-full mb-2 object-cover" />}
// //               <label className="cursor-pointer bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">
// //                 Upload Profile Picture
// //                 <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
// //               </label>
// //             </div>
            
// //             <button 
// //               type="submit" 
// //               className="w-full bg-red-600 text-white p-2 rounded hover:bg-red-700" 
// //               disabled={loading || emailExists || mobileExists || 
// //               (showOtpSection && !otpVerified) || 
// //               !!toxicityError}
// //             >
// //               {loading ? "Registering..." : "Register"}
// //             </button>
// //           </form>
          
// //           <button 
// //             onClick={handleGoogleSignIn} 
// //             className="mt-4 w-full flex items-center justify-center bg-white text-gray-700 border border-gray-300 p-2 rounded hover:bg-gray-50"
// //           >
// //             <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
// //               <path
// //                 fill="#4285F4"
// //                 d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
// //               />
// //               <path
// //                 fill="#34A853"
// //                 d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
// //               />
// //               <path
// //                 fill="#FBBC05"
// //                 d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
// //               />
// //               <path
// //                 fill="#EA4335"
// //                 d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
// //               />
// //             </svg>
// //             Sign in with Google
// //           </button>
          
// //           <p className="mt-4 text-center text-gray-600">
// //             Already have an account? <span className="text-red-600 cursor-pointer font-semibold" onClick={() => navigate("/login")}>Login</span>
// //           </p>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // };

// // export default Register;

// // // import React, { useState, useEffect } from "react";
// // // import { useNavigate } from "react-router-dom";
// // // import { auth, db, googleProvider } from "./config/firebase";
// // // import { createUserWithEmailAndPassword, signInWithPopup, fetchSignInMethodsForEmail } from "firebase/auth";
// // // import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
// // // import ToxicityDetector from "./ToxicityDetector";
// // // import EmailVerification from "./EmailVerification";

// // // const Register = () => {
// // //   // Use the correct API URL based on environment
// // //   const API_URL = "https://transgression-vigilance.vercel.app";

// // //   const navigate = useNavigate();
// // //   const [formData, setFormData] = useState({
// // //     email: "",
// // //     password: "",
// // //     confirmPassword: "",
// // //     name: "",
// // //     username: "",
// // //     contact: "",
// // //     dob: "",
// // //     gender: "",
// // //     address: "",
// // //     profilePic: null,
// // //   });

// // //   // Background image URL
// // //   const img = 'https://od.lk/s/OV8yNDk0MzM4ODZf/login2.jpg';

// // //   const [previewUrl, setPreviewUrl] = useState(null);
// // //   const [loading, setLoading] = useState(false);
// // //   const [error, setError] = useState("");
// // //   const [checkingEmail, setCheckingEmail] = useState(false);
// // //   const [emailExists, setEmailExists] = useState(false);
  
// // //   // Added states for mobile verification
// // //   const [checkingMobile, setCheckingMobile] = useState(false);
// // //   const [mobileExists, setMobileExists] = useState(false);
  
// // //   // State for toxicity model
// // //   const [toxicityModel, setToxicityModel] = useState(null);
// // //   const [toxicityError, setToxicityError] = useState("");
  
// // //   // State for email verification
// // //   const [showOtpSection, setShowOtpSection] = useState(false);
// // //   const [otpVerified, setOtpVerified] = useState(false);
  
// // //   // Debug state for API connection issues
// // //   const [apiStatus, setApiStatus] = useState({ checked: false, working: false });

// // //   useEffect(() => {
// // //     if (auth.currentUser) {
// // //       navigate("/");
// // //     }
    
// // //     // Check if the API is working
// // //     checkApiStatus();
// // //   }, [navigate]);

// // //   // Check if the API is responsive
// // //   const checkApiStatus = async () => {
// // //     try {
// // //       const response = await fetch(`${API_URL}/api/health`);
// // //       const data = await response.json();
// // //       setApiStatus({ checked: true, working: data.status === "ok" });
// // //     } catch (error) {
// // //       console.error("API health check failed:", error);
// // //       setApiStatus({ checked: true, working: false });
// // //     }
// // //   };

// // //   const handleModelLoad = (model) => {
// // //     setToxicityModel(model);
// // //   };

// // //   const handleToxicityCheck = (isAcceptable, errorMessage) => {
// // //     setToxicityError(errorMessage);
// // //   };

// // //   const handleVerificationComplete = (isVerified) => {
// // //     setOtpVerified(isVerified);
// // //   };

// // //   const handleChange = (e) => {
// // //     setFormData({ ...formData, [e.target.name]: e.target.value });
    
// // //     // Reset toxicity error when name changes
// // //     if (e.target.name === "name") {
// // //       setToxicityError("");
// // //     }
    
// // //     // Reset email check when email changes
// // //     if (e.target.name === "email") {
// // //       setEmailExists(false);
// // //       setOtpVerified(false);
// // //       setShowOtpSection(false);
// // //     }
    
// // //     // Reset mobile check when contact changes
// // //     if (e.target.name === "contact") {
// // //       setMobileExists(false);
// // //     }
// // //   };

// // //   const handleFileChange = (e) => {
// // //     const file = e.target.files[0];
// // //     if (file) {
// // //       setFormData({ ...formData, profilePic: file });
// // //       setPreviewUrl(URL.createObjectURL(file));
// // //     }
// // //   };

// // //   // Check if email exists in both Firebase Auth and Firestore
// // //   const checkEmailExists = async (email) => {
// // //     try {
// // //       // First check with Firebase Authentication
// // //       const methods = await fetchSignInMethodsForEmail(auth, email);
      
// // //       // Then check with Firestore in case the email exists in database but not in auth
// // //       const usersRef = collection(db, "users");
// // //       const q = query(usersRef, where("email", "==", email));
// // //       const querySnapshot = await getDocs(q);
      
// // //       return methods.length > 0 || !querySnapshot.empty;
// // //     } catch (error) {
// // //       console.error("Error checking email:", error);
// // //       return false; // If there's an error, we proceed with caution
// // //     }
// // //   };

// // //   // Check if mobile number exists in Firestore
// // //   const checkMobileExists = async (mobile) => {
// // //     try {
// // //       // Check with Firestore if the contact/mobile exists
// // //       const usersRef = collection(db, "users");
// // //       const q = query(usersRef, where("contact", "==", mobile));
// // //       const querySnapshot = await getDocs(q);
      
// // //       return !querySnapshot.empty;
// // //     } catch (error) {
// // //       console.error("Error checking mobile:", error);
// // //       return false; // If there's an error, we proceed with caution
// // //     }
// // //   };

// // //   const checkEmail = async () => {
// // //     if (!formData.email) return;
    
// // //     setCheckingEmail(true);
// // //     setError("");
    
// // //     try {
// // //       const exists = await checkEmailExists(formData.email);
      
// // //       if (exists) {
// // //         setEmailExists(true);
// // //         setShowOtpSection(false);
// // //       } else {
// // //         setEmailExists(false);
// // //         // Show OTP section only if email is valid and not registered
// // //         setShowOtpSection(true);
// // //       }
// // //     } catch (error) {
// // //       console.error("Error checking email:", error);
// // //       setError("Failed to check email availability. Please try again.");
// // //     } finally {
// // //       setCheckingEmail(false);
// // //     }
// // //   };

// // //   // Check if mobile exists when user moves away from mobile field
// // //   const checkMobile = async () => {
// // //     if (!formData.contact) return;
    
// // //     setCheckingMobile(true);
// // //     setError("");
    
// // //     try {
// // //       const exists = await checkMobileExists(formData.contact);
      
// // //       if (exists) {
// // //         setMobileExists(true);
// // //         setError("This mobile number is already registered. Please use a different number.");
// // //       } else {
// // //         setMobileExists(false);
// // //       }
// // //     } catch (error) {
// // //       console.error("Error checking mobile:", error);
// // //       setError("Failed to check mobile availability. Please try again.");
// // //     } finally {
// // //       setCheckingMobile(false);
// // //     }
// // //   };

// // //   const uploadToImageKit = async (file) => {
// // //     if (!file) return "";

// // //     try {
// // //       console.log("Getting ImageKit auth tokens");
// // //       const authResponse = await fetch(`${API_URL}/api/auth`);
// // //       if (!authResponse.ok) {
// // //         throw new Error(`Failed to get auth tokens: ${authResponse.status} ${authResponse.statusText}`);
// // //       }
      
// // //       const authData = await authResponse.json();
// // //       console.log("Auth data received:", authData);

// // //       const formData = new FormData();
// // //       formData.append("file", file);
// // //       formData.append("fileName", `profile_${Date.now()}_${file.name}`);
// // //       formData.append("publicKey", "public_KoLQpUZM3TZfPrc1If4RUVRgHAw=");
// // //       formData.append("signature", authData.signature);
// // //       formData.append("expire", authData.expire);
// // //       formData.append("token", authData.token);
// // //       formData.append("folder", "/profile_pictures");
      
// // //       console.log("Uploading to ImageKit...");
// // //       const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
// // //         method: "POST",
// // //         body: formData,
// // //       });

// // //       if (!response.ok) {
// // //         throw new Error(`Upload failed with status: ${response.status} ${response.statusText}`);
// // //       }

// // //       const result = await response.json();
// // //       console.log("Upload result:", result);
      
// // //       if (!result.url) {
// // //         throw new Error("Upload failed: " + (result.error?.message || "No URL returned"));
// // //       }

// // //       return result.url;
// // //     } catch (error) {
// // //       console.error("Image upload failed:", error);
// // //       alert(`Image upload failed: ${error.message}`);
// // //       return "";
// // //     }
// // //   };

// // //   const handleRegister = async (e) => {
// // //     e.preventDefault();
    
// // //     // Check if email verification is required and not completed
// // //     if (showOtpSection && !otpVerified) {
// // //       setError("Please verify your email before registering");
// // //       return;
// // //     }
    
// // //     // Check if email exists
// // //     if (emailExists) {
// // //       setError("This email is already registered. Please log in instead.");
// // //       return;
// // //     }
    
// // //     // Check if mobile exists
// // //     if (mobileExists) {
// // //       setError("This mobile number is already registered. Please use a different number.");
// // //       return;
// // //     }
    
// // //     // Check for toxicity error
// // //     if (toxicityError) {
// // //       return;
// // //     }
    
// // //     setLoading(true);
// // //     setError("");

// // //     if (formData.password !== formData.confirmPassword) {
// // //       setError("Passwords do not match!");
// // //       setLoading(false);
// // //       return;
// // //     }

// // //     try {
// // //       const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
// // //       const user = userCredential.user;

// // //       let profilePicUrl = "";
// // //       if (formData.profilePic) {
// // //         profilePicUrl = await uploadToImageKit(formData.profilePic);
// // //       }

// // //       await setDoc(doc(db, "users", user.uid), {
// // //         name: formData.name,
// // //         username: formData.username,
// // //         email: formData.email,
// // //         contact: formData.contact,
// // //         dob: formData.dob,
// // //         gender: formData.gender,
// // //         address: formData.address,
// // //         profilePic: profilePicUrl,
// // //         reg_date: serverTimestamp(),
// // //         role: "user",
// // //         pinCode: "", 
// // //         status: "new", 
// // //         emailVerified: true
// // //       });

// // //       alert("User registered successfully!");
// // //       navigate("/");
// // //     } catch (error) {
// // //       console.error("Error registering user", error);
// // //       setError(error.message);
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   };

// // //   const handleGoogleSignIn = async () => {
// // //     try {
// // //       // Before signing in with Google, we need to get the email that will be used
// // //       const result = await signInWithPopup(auth, googleProvider);
// // //       const user = result.user;
// // //       const email = user.email;
      
// // //       // Check if this email already exists in our system
// // //       const emailExists = await checkEmailExists(email);
      
// // //       if (emailExists) {
// // //         // If email exists, show alert and redirect to login
// // //         alert("This email is already registered. Redirecting to login page.");
// // //         navigate("/login");
// // //         return;
// // //       }
      
// // //       // If email doesn't exist, proceed with creating the user account
// // //       await setDoc(doc(db, "users", user.uid), {
// // //         name: user.displayName,
// // //         username: user.displayName,
// // //         email: user.email,
// // //         profilePic: user.photoURL,
// // //         contact: "",
// // //         dob: "",
// // //         gender: "",
// // //         address: "",
// // //         reg_date: serverTimestamp(),
// // //         role: "user",
// // //         status: "new",
// // //         pinCode: "", 
// // //         emailVerified: true
// // //       }, { merge: true });

// // //       alert("Signed in with Google successfully!");
// // //       navigate("/home");
// // //     } catch (error) {
// // //       console.error("Google sign-in error", error);
// // //       setError(error.message);
// // //     }
// // //   };

// // //   // Add blur event to check email when user moves away from email field
// // //   const handleEmailBlur = () => {
// // //     checkEmail();
// // //   };
  
// // //   // Add blur event handlers for name and mobile checks
// // //   const handleNameBlur = async () => {
// // //     if (toxicityModel && formData.name) {
// // //       await toxicityModel.classify([formData.name])
// // //         .then(predictions => {
// // //           const isToxic = predictions.some(
// // //             (prediction) =>
// // //               prediction.results[0].match === true &&
// // //               ['toxicity', 'insult', 'threat', 'identity_attack'].includes(prediction.label)
// // //           );
          
// // //           if (isToxic) {
// // //             setToxicityError("The name you entered appears inappropriate. Please choose a different name.");
// // //           } else {
// // //             setToxicityError("");
// // //           }
// // //         })
// // //         .catch(error => {
// // //           console.error("Error checking name toxicity:", error);
// // //         });
// // //     }
// // //   };
  
// // //   const handleMobileBlur = () => {
// // //     checkMobile();
// // //   };

// // //   return (
// // //     <div 
// // //       style={{ 
// // //         backgroundImage: `url(${img})`,
// // //         backgroundSize: 'cover',
// // //         backgroundPosition: 'center',
// // //         backgroundRepeat: 'no-repeat',
// // //         minHeight: '100vh',
// // //         width: '100%',
// // //         position: 'relative',
// // //         overflow: 'auto'
// // //       }}
// // //     >
// // //       {/* Semi-transparent overlay */}
// // //       <div 
// // //         style={{
// // //           position: 'absolute',
// // //           top: 0,
// // //           left: 0,
// // //           right: 0,
// // //           bottom: 0,
// // //           backgroundColor: 'rgba(0, 0, 0, 0.5)',
// // //           display: 'flex',
// // //           alignItems: 'center',
// // //           justifyContent: 'center',
// // //           padding: '2rem 1rem',
// // //           minHeight: '100vh',
// // //           overflow: 'auto'
// // //         }}
// // //       >
// // //         <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg w-full max-w-md my-8" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
// // //           <h2 className="text-2xl font-bold text-center mb-4 text-red-600">Register for Transgression Vigilance</h2>
          
// // //           {/* Toxicity Detector Component */}
// // //           <ToxicityDetector 
// // //             onModelLoad={handleModelLoad}
// // //             onCheckToxicity={handleToxicityCheck}
// // //           />
          
// // //           {/* API Status Warning */}
// // //           {apiStatus.checked && !apiStatus.working && (
// // //             <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
// // //               <p className="font-bold">API Connection Issue</p>
// // //               <p>Unable to connect to the server. Email verification and image upload may not work correctly.</p>
// // //             </div>
// // //           )}
          
// // //           {error && <p className="text-red-500 text-center mb-4">{error}</p>}
// // //           {emailExists && (
// // //             <div className="bg-yellow-100 text-yellow-700 p-4 rounded mb-4">
// // //               This email is already registered. Please <span className="underline cursor-pointer" onClick={() => navigate("/login")}>log in</span> instead.
// // //             </div>
// // //           )}
          
// // //           <form onSubmit={handleRegister} className="space-y-3">
// // //             {/* Name field */}
// // //             <div>
// // //               <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
// // //               <input 
// // //                 type="text" 
// // //                 id="name"
// // //                 name="name" 
// // //                 placeholder="Full Name" 
// // //                 value={formData.name}
// // //                 onChange={handleChange}
// // //                 onBlur={handleNameBlur}
// // //                 required 
// // //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// // //               />
// // //               {toxicityError && (
// // //                 <p className="text-red-500 text-sm mt-1">{toxicityError}</p>
// // //               )}
// // //             </div>
            
// // //             <div>
// // //               <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
// // //               <input 
// // //                 type="email" 
// // //                 id="email"
// // //                 name="email" 
// // //                 placeholder="Email" 
// // //                 value={formData.email}
// // //                 onChange={handleChange} 
// // //                 onBlur={handleEmailBlur}
// // //                 required 
// // //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// // //               />
// // //               {checkingEmail && <p className="text-sm text-gray-500">Checking email...</p>}
// // //             </div>
            
// // //             {/* Email Verification Component */}
// // //             {showOtpSection && (
// // //               <EmailVerification
// // //                 email={formData.email}
// // //                 isEmailExists={emailExists}
// // //                 onVerificationComplete={handleVerificationComplete}
// // //                 apiUrl={API_URL}
// // //               />
// // //             )}
            
// // //             <div>
// // //               <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
// // //               <input 
// // //                 type="text" 
// // //                 id="username"
// // //                 name="username" 
// // //                 placeholder="Username" 
// // //                 value={formData.username}
// // //                 onChange={handleChange} 
// // //                 required 
// // //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// // //               />
// // //             </div>
            
// // //             <div>
// // //               <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
// // //               <input 
// // //                 type="password" 
// // //                 id="password"
// // //                 name="password" 
// // //                 placeholder="Password" 
// // //                 value={formData.password}
// // //                 onChange={handleChange} 
// // //                 required 
// // //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// // //               />
// // //             </div>
            
// // //             <div>
// // //               <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
// // //               <input 
// // //                 type="password" 
// // //                 id="confirmPassword"
// // //                 name="confirmPassword" 
// // //                 placeholder="Confirm Password" 
// // //                 value={formData.confirmPassword}
// // //                 onChange={handleChange} 
// // //                 required 
// // //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// // //               />
// // //             </div>
            
// // //             <div>
// // //               <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
// // //               <input 
// // //                 type="text" 
// // //                 id="contact"
// // //                 name="contact" 
// // //                 placeholder="Contact" 
// // //                 value={formData.contact}
// // //                 onChange={handleChange}
// // //                 onBlur={handleMobileBlur} 
// // //                 required 
// // //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// // //               />
// // //               {checkingMobile && <p className="text-sm text-gray-500">Checking mobile number...</p>}
// // //               {mobileExists && (
// // //                 <p className="text-red-500 text-sm mt-1">This mobile number is already registered. Please use a different number.</p>
// // //               )}
// // //             </div>
            
// // //             <div>
// // //               <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
// // //               <input 
// // //                 type="date" 
// // //                 id="dob"
// // //                 name="dob" 
// // //                 value={formData.dob}
// // //                 onChange={handleChange} 
// // //                 required 
// // //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// // //               />
// // //             </div>
            
// // //             <div>
// // //               <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
// // //               <select 
// // //                 id="gender"
// // //                 name="gender" 
// // //                 value={formData.gender}
// // //                 onChange={handleChange} 
// // //                 required 
// // //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500"
// // //               >
// // //                 <option value="">Select Gender</option>
// // //                 <option value="Male">Male</option>
// // //                 <option value="Female">Female</option>
// // //                 <option value="Other">Other</option>
// // //               </select>
// // //             </div>
            
// // //             <div>
// // //               <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
// // //               <textarea 
// // //                 id="address"
// // //                 name="address" 
// // //                 placeholder="Address" 
// // //                 value={formData.address}
// // //                 onChange={handleChange} 
// // //                 required 
// // //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500"
// // //                 rows="3"
// // //               ></textarea>
// // //             </div>

// // //             <div className="flex flex-col items-center">
// // //               {previewUrl && <img src={previewUrl} alt="Profile Preview" className="w-24 h-24 rounded-full mb-2 object-cover" />}
// // //               <label className="cursor-pointer bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">
// // //                 Upload Profile Picture
// // //                 <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
// // //               </label>
// // //             </div>
            
// // //             <button 
// // //               type="submit" 
// // //               className="w-full bg-red-600 text-white p-2 rounded hover:bg-red-700" 
// // //               disabled={loading || emailExists || mobileExists || (showOtpSection && !otpVerified) || !!toxicityError}
// // //             >
// // //               {loading ? "Registering..." : "Register"}
// // //             </button>
// // //           </form>
          
// // //           <button 
// // //             onClick={handleGoogleSignIn} 
// // //             className="mt-4 w-full flex items-center justify-center bg-white text-gray-700 border border-gray-300 p-2 rounded hover:bg-gray-50"
// // //           >
// // //             <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
// // //               <path
// // //                 fill="#4285F4"
// // //                 d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
// // //               />
// // //               <path
// // //                 fill="#34A853"
// // //                 d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
// // //               />
// // //               <path
// // //                 fill="#FBBC05"
// // //                 d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
// // //               />
// // //               <path
// // //                 fill="#EA4335"
// // //                 d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
// // //               />
// // //             </svg>
// // //             Sign in with Google
// // //           </button>
          
// // //           <p className="mt-4 text-center text-gray-600">
// // //             Already have an account? <span className="text-red-600 cursor-pointer font-semibold" onClick={() => navigate("/login")}>Login</span>
// // //           </p>
// // //         </div>
// // //       </div>
// // //     </div>
// // //   );
// // // };

// // // export default Register;




// // // // import React, { useState, useEffect } from "react";
// // // // import { useNavigate } from "react-router-dom";
// // // // import { auth, db, googleProvider } from "./config/firebase";
// // // // import { createUserWithEmailAndPassword, signInWithPopup, fetchSignInMethodsForEmail } from "firebase/auth";
// // // // import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
// // // // import * as toxicity from '@tensorflow-models/toxicity';

// // // // const Register = () => {
// // // //   // Use the correct API URL based on environment
// // // //   const API_URL = "https://transgression-vigilance.vercel.app";

// // // //   // Toxicity detection threshold
// // // //   const TOXICITY_THRESHOLD = 0.4; // Higher = more strict

// // // //   const navigate = useNavigate();
// // // //   const [formData, setFormData] = useState({
// // // //     email: "",
// // // //     password: "",
// // // //     confirmPassword: "",
// // // //     name: "",
// // // //     username: "",
// // // //     contact: "",
// // // //     dob: "",
// // // //     gender: "",
// // // //     address: "",
// // // //     profilePic: null,
// // // //   });

// // // //   // Background image URL
// // // //   const img = 'https://od.lk/s/OV8yNDk0MzM4ODZf/login2.jpg';

// // // //   const [previewUrl, setPreviewUrl] = useState(null);
// // // //   const [loading, setLoading] = useState(false);
// // // //   const [error, setError] = useState("");
// // // //   const [checkingEmail, setCheckingEmail] = useState(false);
// // // //   const [emailExists, setEmailExists] = useState(false);
  
// // // //   // Added states for mobile verification
// // // //   const [checkingMobile, setCheckingMobile] = useState(false);
// // // //   const [mobileExists, setMobileExists] = useState(false);
  
// // // //   // Toxicity model state
// // // //   const [toxicityModel, setToxicityModel] = useState(null);
// // // //   const [isLoadingModel, setIsLoadingModel] = useState(true);
// // // //   const [toxicityError, setToxicityError] = useState("");
  
// // // //   // OTP-related states
// // // //   const [showOtpSection, setShowOtpSection] = useState(false);
// // // //   const [otp, setOtp] = useState("");
// // // //   const [otpSent, setOtpSent] = useState(false);
// // // //   const [otpVerified, setOtpVerified] = useState(false);
// // // //   const [otpError, setOtpError] = useState("");
// // // //   const [otpLoading, setOtpLoading] = useState(false);
// // // //   const [resendDisabled, setResendDisabled] = useState(false);
// // // //   const [timer, setTimer] = useState(0);
  
// // // //   // Debug state for API connection issues
// // // //   const [apiStatus, setApiStatus] = useState({ checked: false, working: false });

// // // //   useEffect(() => {
// // // //     if (auth.currentUser) {
// // // //       navigate("/");
// // // //     }
    
// // // //     // Check if the API is working
// // // //     checkApiStatus();
    
// // // //     // Load toxicity model
// // // //     loadToxicityModel();
// // // //   }, [navigate]);

// // // //   const loadToxicityModel = async () => {
// // // //     try {
// // // //       setIsLoadingModel(true);
// // // //       const model = await toxicity.load(TOXICITY_THRESHOLD);
// // // //       setToxicityModel(model);
// // // //       console.log("Toxicity model loaded successfully");
// // // //     } catch (error) {
// // // //       console.error("Failed to load toxicity model:", error);
// // // //     } finally {
// // // //       setIsLoadingModel(false);
// // // //     }
// // // //   };

// // // //   // Check if the API is responsive
// // // //   const checkApiStatus = async () => {
// // // //     try {
// // // //       const response = await fetch(`${API_URL}/api/health`);
// // // //       const data = await response.json();
// // // //       setApiStatus({ checked: true, working: data.status === "ok" });
// // // //     } catch (error) {
// // // //       console.error("API health check failed:", error);
// // // //       setApiStatus({ checked: true, working: false });
// // // //     }
// // // //   };

// // // //   // Timer for OTP resend
// // // //   useEffect(() => {
// // // //     let interval;
// // // //     if (timer > 0) {
// // // //       interval = setInterval(() => {
// // // //         setTimer((prevTimer) => prevTimer - 1);
// // // //       }, 1000);
// // // //     } else {
// // // //       setResendDisabled(false);
// // // //     }
    
// // // //     return () => clearInterval(interval);
// // // //   }, [timer]);

// // // //   const handleChange = (e) => {
// // // //     setFormData({ ...formData, [e.target.name]: e.target.value });
    
// // // //     // Reset toxicity error when name changes
// // // //     if (e.target.name === "name") {
// // // //       setToxicityError("");
// // // //     }
    
// // // //     // Reset email check when email changes
// // // //     if (e.target.name === "email") {
// // // //       setEmailExists(false);
// // // //       setOtpVerified(false);
// // // //       setShowOtpSection(false);
// // // //     }
    
// // // //     // Reset mobile check when contact changes
// // // //     if (e.target.name === "contact") {
// // // //       setMobileExists(false);
// // // //     }
// // // //   };

// // // //   const checkNameToxicity = async () => {
// // // //     if (!formData.name || !toxicityModel) return true;
    
// // // //     try {
// // // //       const predictions = await toxicityModel.classify([formData.name]);
      
// // // //       const isToxic = predictions.some(
// // // //         (prediction) =>
// // // //           prediction.results[0].match === true &&
// // // //           ['toxicity', 'insult', 'threat', 'identity_attack'].includes(prediction.label)
// // // //       );
      
// // // //       if (isToxic) {
// // // //         setToxicityError("The name you entered appears inappropriate. Please choose a different name.");
// // // //         return false;
// // // //       }
      
// // // //       setToxicityError("");
// // // //       return true;
// // // //     } catch (error) {
// // // //       console.error("Error checking name toxicity:", error);
// // // //       // If there's an error checking toxicity, we'll let it pass but log the error
// // // //       return true;
// // // //     }
// // // //   };

// // // //   const handleFileChange = (e) => {
// // // //     const file = e.target.files[0];
// // // //     if (file) {
// // // //       setFormData({ ...formData, profilePic: file });
// // // //       setPreviewUrl(URL.createObjectURL(file));
// // // //     }
// // // //   };

// // // //   // Check if email exists in both Firebase Auth and Firestore
// // // //   const checkEmailExists = async (email) => {
// // // //     try {
// // // //       // First check with Firebase Authentication
// // // //       const methods = await fetchSignInMethodsForEmail(auth, email);
      
// // // //       // Then check with Firestore in case the email exists in database but not in auth
// // // //       const usersRef = collection(db, "users");
// // // //       const q = query(usersRef, where("email", "==", email));
// // // //       const querySnapshot = await getDocs(q);
      
// // // //       return methods.length > 0 || !querySnapshot.empty;
// // // //     } catch (error) {
// // // //       console.error("Error checking email:", error);
// // // //       return false; // If there's an error, we proceed with caution
// // // //     }
// // // //   };

// // // //   // New function to check if mobile number exists in Firestore
// // // //   const checkMobileExists = async (mobile) => {
// // // //     try {
// // // //       // Check with Firestore if the contact/mobile exists
// // // //       const usersRef = collection(db, "users");
// // // //       const q = query(usersRef, where("contact", "==", mobile));
// // // //       const querySnapshot = await getDocs(q);
      
// // // //       return !querySnapshot.empty;
// // // //     } catch (error) {
// // // //       console.error("Error checking mobile:", error);
// // // //       return false; // If there's an error, we proceed with caution
// // // //     }
// // // //   };

// // // //   const checkEmail = async () => {
// // // //     if (!formData.email) return;
    
// // // //     setCheckingEmail(true);
// // // //     setError("");
    
// // // //     try {
// // // //       const exists = await checkEmailExists(formData.email);
      
// // // //       if (exists) {
// // // //         setEmailExists(true);
// // // //         setShowOtpSection(false);
// // // //       } else {
// // // //         setEmailExists(false);
// // // //         // Show OTP section only if email is valid and not registered
// // // //         setShowOtpSection(true);
// // // //       }
// // // //     } catch (error) {
// // // //       console.error("Error checking email:", error);
// // // //       setError("Failed to check email availability. Please try again.");
// // // //     } finally {
// // // //       setCheckingEmail(false);
// // // //     }
// // // //   };

// // // //   // New function to check if mobile exists when user moves away from mobile field
// // // //   const checkMobile = async () => {
// // // //     if (!formData.contact) return;
    
// // // //     setCheckingMobile(true);
// // // //     setError("");
    
// // // //     try {
// // // //       const exists = await checkMobileExists(formData.contact);
      
// // // //       if (exists) {
// // // //         setMobileExists(true);
// // // //         setError("This mobile number is already registered. Please use a different number.");
// // // //       } else {
// // // //         setMobileExists(false);
// // // //       }
// // // //     } catch (error) {
// // // //       console.error("Error checking mobile:", error);
// // // //       setError("Failed to check mobile availability. Please try again.");
// // // //     } finally {
// // // //       setCheckingMobile(false);
// // // //     }
// // // //   };

// // // //   const sendOTP = async () => {
// // // //     setOtpError("");
// // // //     setOtpLoading(true);
    
// // // //     try {
// // // //       console.log(`Sending OTP request to ${API_URL}/api/send-otp`);
      
// // // //       const response = await fetch(`${API_URL}/api/send-otp`, {
// // // //         method: "POST",
// // // //         headers: {
// // // //           "Content-Type": "application/json",
// // // //         },
// // // //         body: JSON.stringify({ email: formData.email }),
// // // //       });
      
// // // //       const data = await response.json();
// // // //       console.log("OTP response:", data);
      
// // // //       if (data.success) {
// // // //         setOtpSent(true);
// // // //         setResendDisabled(true);
// // // //         setTimer(60); // 60 seconds cooldown
// // // //       } else {
// // // //         setOtpError(data.message || "Failed to send OTP. Please try again.");
// // // //       }
// // // //     } catch (error) {
// // // //       console.error("Error sending OTP:", error);
// // // //       setOtpError("Network error. Please check your connection and try again.");
// // // //     } finally {
// // // //       setOtpLoading(false);
// // // //     }
// // // //   };

// // // //   const verifyOTP = async () => {
// // // //     if (!otp) {
// // // //       setOtpError("Please enter the OTP");
// // // //       return;
// // // //     }
    
// // // //     setOtpLoading(true);
// // // //     setOtpError("");
    
// // // //     try {
// // // //       const response = await fetch(`${API_URL}/api/verify-otp`, {
// // // //         method: "POST",
// // // //         headers: {
// // // //           "Content-Type": "application/json",
// // // //         },
// // // //         body: JSON.stringify({ email: formData.email, otp }),
// // // //       });
      
// // // //       const data = await response.json();
      
// // // //       if (data.success) {
// // // //         setOtpVerified(true);
// // // //         setOtpError("");
// // // //       } else {
// // // //         setOtpError(data.message || "Invalid OTP. Please try again.");
// // // //       }
// // // //     } catch (error) {
// // // //       console.error("Error verifying OTP:", error);
// // // //       setOtpError("Network error. Please check your connection and try again.");
// // // //     } finally {
// // // //       setOtpLoading(false);
// // // //     }
// // // //   };

// // // //   const uploadToImageKit = async (file) => {
// // // //     if (!file) return "";

// // // //     try {
// // // //       console.log("Getting ImageKit auth tokens");
// // // //       const authResponse = await fetch(`${API_URL}/api/auth`);
// // // //       if (!authResponse.ok) {
// // // //         throw new Error(`Failed to get auth tokens: ${authResponse.status} ${authResponse.statusText}`);
// // // //       }
      
// // // //       const authData = await authResponse.json();
// // // //       console.log("Auth data received:", authData);

// // // //       const formData = new FormData();
// // // //       formData.append("file", file);
// // // //       formData.append("fileName", `profile_${Date.now()}_${file.name}`);
// // // //       formData.append("publicKey", "public_KoLQpUZM3TZfPrc1If4RUVRgHAw=");
// // // //       formData.append("signature", authData.signature);
// // // //       formData.append("expire", authData.expire);
// // // //       formData.append("token", authData.token);
// // // //       formData.append("folder", "/profile_pictures");
      
// // // //       console.log("Uploading to ImageKit...");
// // // //       const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
// // // //         method: "POST",
// // // //         body: formData,
// // // //       });

// // // //       if (!response.ok) {
// // // //         throw new Error(`Upload failed with status: ${response.status} ${response.statusText}`);
// // // //       }

// // // //       const result = await response.json();
// // // //       console.log("Upload result:", result);
      
// // // //       if (!result.url) {
// // // //         throw new Error("Upload failed: " + (result.error?.message || "No URL returned"));
// // // //       }

// // // //       return result.url;
// // // //     } catch (error) {
// // // //       console.error("Image upload failed:", error);
// // // //       alert(`Image upload failed: ${error.message}`);
// // // //       return "";
// // // //     }
// // // //   };

// // // //   const handleRegister = async (e) => {
// // // //     e.preventDefault();
    
// // // //     // Check name for toxicity before proceeding
// // // //     const nameIsAcceptable = await checkNameToxicity();
// // // //     if (!nameIsAcceptable) {
// // // //       return;
// // // //     }
    
// // // //     // Check if email verification is required and not completed
// // // //     if (showOtpSection && !otpVerified) {
// // // //       setOtpError("Please verify your email before registering");
// // // //       return;
// // // //     }
    
// // // //     // Check if email exists
// // // //     if (emailExists) {
// // // //       setError("This email is already registered. Please log in instead.");
// // // //       return;
// // // //     }
    
// // // //     // Check if mobile exists
// // // //     if (mobileExists) {
// // // //       setError("This mobile number is already registered. Please use a different number.");
// // // //       return;
// // // //     }
    
// // // //     setLoading(true);
// // // //     setError("");

// // // //     if (formData.password !== formData.confirmPassword) {
// // // //       setError("Passwords do not match!");
// // // //       setLoading(false);
// // // //       return;
// // // //     }

// // // //     try {
// // // //       const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
// // // //       const user = userCredential.user;

// // // //       let profilePicUrl = "";
// // // //       if (formData.profilePic) {
// // // //         profilePicUrl = await uploadToImageKit(formData.profilePic);
// // // //       }

// // // //       await setDoc(doc(db, "users", user.uid), {
// // // //         name: formData.name,
// // // //         username: formData.username,
// // // //         email: formData.email,
// // // //         contact: formData.contact,
// // // //         dob: formData.dob,
// // // //         gender: formData.gender,
// // // //         address: formData.address,
// // // //         profilePic: profilePicUrl,
// // // //         reg_date: serverTimestamp(),
// // // //         role: "user",
// // // //         pinCode: "", 
// // // //         status: "new", 
// // // //         emailVerified: true
// // // //       });

// // // //       alert("User registered successfully!");
// // // //       navigate("/");
// // // //     } catch (error) {
// // // //       console.error("Error registering user", error);
// // // //       setError(error.message);
// // // //     } finally {
// // // //       setLoading(false);
// // // //     }
// // // //   };

// // // //   const handleGoogleSignIn = async () => {
// // // //     try {
// // // //       // Before signing in with Google, we need to get the email that will be used
// // // //       const result = await signInWithPopup(auth, googleProvider);
// // // //       const user = result.user;
// // // //       const email = user.email;
      
// // // //       // Check if this email already exists in our system
// // // //       const emailExists = await checkEmailExists(email);
      
// // // //       if (emailExists) {
// // // //         // If email exists, show alert and redirect to login
// // // //         alert("This email is already registered. Redirecting to login page.");
// // // //         navigate("/login");
// // // //         return;
// // // //       }
      
// // // //       // If email doesn't exist, proceed with creating the user account
// // // //       await setDoc(doc(db, "users", user.uid), {
// // // //         name: user.displayName,
// // // //         username: user.displayName,
// // // //         email: user.email,
// // // //         profilePic: user.photoURL,
// // // //         contact: "",
// // // //         dob: "",
// // // //         gender: "",
// // // //         address: "",
// // // //         reg_date: serverTimestamp(),
// // // //         role: "user",
// // // //         status: "new",
// // // //         pinCode: "", 
// // // //         emailVerified: true
// // // //       }, { merge: true });

// // // //       alert("Signed in with Google successfully!");
// // // //       navigate("/home");
// // // //     } catch (error) {
// // // //       console.error("Google sign-in error", error);
// // // //       setError(error.message);
// // // //     }
// // // //   };

// // // //   // Add blur event to check email when user moves away from email field
// // // //   const handleEmailBlur = () => {
// // // //     checkEmail();
// // // //   };

// // // //   // Add blur event to check name toxicity when user moves away from name field
// // // //   const handleNameBlur = async () => {
// // // //     await checkNameToxicity();
// // // //   };
  
// // // //   // Add blur event to check mobile when user moves away from contact field
// // // //   const handleMobileBlur = () => {
// // // //     checkMobile();
// // // //   };

// // // //   return (
// // // //     <div 
// // // //       style={{ 
// // // //         backgroundImage: `url(${img})`,
// // // //         backgroundSize: 'cover',
// // // //         backgroundPosition: 'center',
// // // //         backgroundRepeat: 'no-repeat',
// // // //         minHeight: '100vh',
// // // //         width: '100%',
// // // //         position: 'relative',
// // // //         overflow: 'auto'
// // // //       }}
// // // //     >
// // // //       {/* Semi-transparent overlay - FIXED OPACITY - was using rgba(0, 0, 0, 0.5) */}
// // // //       <div 
// // // //         style={{
// // // //           position: 'absolute',
// // // //           top: 0,
// // // //           left: 0,
// // // //           right: 0,
// // // //           bottom: 0,
// // // //           backgroundColor: 'rgba(0, 0, 0, 0.5)', // Make sure this value is always a valid number
// // // //           display: 'flex',
// // // //           alignItems: 'center',
// // // //           justifyContent: 'center',
// // // //           padding: '2rem 1rem',
// // // //           minHeight: '100vh',
// // // //           overflow: 'auto'
// // // //         }}
// // // //       >
// // // //         <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg w-full max-w-md my-8" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
// // // //           <h2 className="text-2xl font-bold text-center mb-4 text-red-600">Register for Transgression Vigilance</h2>
          
// // // //           {/* Model Loading Status */}
// // // //           {isLoadingModel && (
// // // //             <div className="bg-blue-100 text-blue-700 p-2 rounded mb-4 text-center">
// // // //               <p>Loading content filter...</p>
// // // //             </div>
// // // //           )}
          
// // // //           {/* API Status Warning */}
// // // //           {apiStatus.checked && !apiStatus.working && (
// // // //             <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
// // // //               <p className="font-bold">API Connection Issue</p>
// // // //               <p>Unable to connect to the server. Email verification and image upload may not work correctly.</p>
// // // //             </div>
// // // //           )}
          
// // // //           {error && <p className="text-red-500 text-center mb-4">{error}</p>}
// // // //           {emailExists && (
// // // //             <div className="bg-yellow-100 text-yellow-700 p-4 rounded mb-4">
// // // //               This email is already registered. Please <span className="underline cursor-pointer" onClick={() => navigate("/login")}>log in</span> instead.
// // // //             </div>
// // // //           )}
          
// // // //           <form onSubmit={handleRegister} className="space-y-3">
// // // //             {/* Name field */}
// // // //             <div>
// // // //               <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
// // // //               <input 
// // // //                 type="text" 
// // // //                 id="name"
// // // //                 name="name" 
// // // //                 placeholder="Full Name" 
// // // //                 value={formData.name}
// // // //                 onChange={handleChange}
// // // //                 onBlur={handleNameBlur}
// // // //                 required 
// // // //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// // // //               />
// // // //               {toxicityError && (
// // // //                 <p className="text-red-500 text-sm mt-1">{toxicityError}</p>
// // // //               )}
// // // //             </div>
            
// // // //             <div>
// // // //               <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
// // // //               <input 
// // // //                 type="email" 
// // // //                 id="email"
// // // //                 name="email" 
// // // //                 placeholder="Email" 
// // // //                 value={formData.email}
// // // //                 onChange={handleChange} 
// // // //                 onBlur={handleEmailBlur}
// // // //                 required 
// // // //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// // // //               />
// // // //               {checkingEmail && <p className="text-sm text-gray-500">Checking email...</p>}
// // // //             </div>
            
// // // //             {/* OTP Verification Section */}
// // // //             {showOtpSection && !emailExists && (
// // // //               <div className="bg-blue-50 p-4 rounded border border-blue-200">
// // // //                 <h3 className="font-semibold text-blue-800 mb-2">Email Verification</h3>
                
// // // //                 {otpVerified ? (
// // // //                   <div className="bg-green-100 text-green-700 p-2 rounded text-center">
// // // //                     Email verified successfully ✓
// // // //                   </div>
// // // //                 ) : (
// // // //                   <>
// // // //                     {otpSent ? (
// // // //                       <div className="space-y-3">
// // // //                         <p className="text-sm">We've sent a verification code to {formData.email}</p>
// // // //                         <div className="flex space-x-2">
// // // //                           <input 
// // // //                             type="text" 
// // // //                             placeholder="Enter 6-digit OTP" 
// // // //                             value={otp}
// // // //                             onChange={(e) => setOtp(e.target.value)}
// // // //                             maxLength={6}
// // // //                             className="w-full p-2 border rounded" 
// // // //                           />
// // // //                           <button 
// // // //                             type="button" 
// // // //                             onClick={verifyOTP}
// // // //                             disabled={otpLoading}
// // // //                             className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 whitespace-nowrap"
// // // //                           >
// // // //                             {otpLoading ? "Verifying..." : "Verify"}
// // // //                           </button>
// // // //                         </div>
// // // //                         <div className="flex justify-between items-center text-sm">
// // // //                           <button
// // // //                             type="button"
// // // //                             onClick={sendOTP}
// // // //                             disabled={resendDisabled}
// // // //                             className="text-red-600 hover:underline disabled:text-gray-400"
// // // //                           >
// // // //                             Resend OTP {timer > 0 ? `(${timer}s)` : ''}
// // // //                           </button>
// // // //                         </div>
// // // //                       </div>
// // // //                     ) : (
// // // //                       <div className="flex space-x-2">
// // // //                         <button 
// // // //                           type="button" 
// // // //                           onClick={sendOTP}
// // // //                           disabled={otpLoading}
// // // //                           className="w-full bg-red-600 text-white p-2 rounded hover:bg-red-700"
// // // //                         >
// // // //                           {otpLoading ? "Sending..." : "Send Verification Code"}
// // // //                         </button>
// // // //                       </div>
// // // //                     )}
// // // //                   </>
// // // //                 )}
                
// // // //                 {otpError && <p className="text-red-500 text-sm mt-2">{otpError}</p>}
// // // //               </div>
// // // //             )}
            
// // // //             <div>
// // // //               <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
// // // //               <input 
// // // //                 type="text" 
// // // //                 id="username"
// // // //                 name="username" 
// // // //                 placeholder="Username" 
// // // //                 value={formData.username}
// // // //                 onChange={handleChange} 
// // // //                 required 
// // // //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// // // //               />
// // // //             </div>
            
// // // //             <div>
// // // //               <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
// // // //               <input 
// // // //                 type="password" 
// // // //                 id="password"
// // // //                 name="password" 
// // // //                 placeholder="Password" 
// // // //                 value={formData.password}
// // // //                 onChange={handleChange} 
// // // //                 required 
// // // //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// // // //               />
// // // //             </div>
            
// // // //             <div>
// // // //               <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
// // // //               <input 
// // // //                 type="password" 
// // // //                 id="confirmPassword"
// // // //                 name="confirmPassword" 
// // // //                 placeholder="Confirm Password" 
// // // //                 value={formData.confirmPassword}
// // // //                 onChange={handleChange} 
// // // //                 required 
// // // //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// // // //               />
// // // //             </div>
            
// // // //             <div>
// // // //               <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
// // // //               <input 
// // // //                 type="text" 
// // // //                 id="contact"
// // // //                 name="contact" 
// // // //                 placeholder="Contact" 
// // // //                 value={formData.contact}
// // // //                 onChange={handleChange}
// // // //                 onBlur={handleMobileBlur} 
// // // //                 required 
// // // //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// // // //               />
// // // //               {checkingMobile && <p className="text-sm text-gray-500">Checking mobile number...</p>}
// // // //               {mobileExists && (
// // // //                 <p className="text-red-500 text-sm mt-1">This mobile number is already registered. Please use a different number.</p>
// // // //               )}
// // // //             </div>
            
// // // //             <div>
// // // //               <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
// // // //               <input 
// // // //                 type="date" 
// // // //                 id="dob"
// // // //                 name="dob" 
// // // //                 value={formData.dob}
// // // //                 onChange={handleChange} 
// // // //                 required 
// // // //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// // // //               />
// // // //             </div>
            
// // // //             <div>
// // // //               <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
// // // //               <select 
// // // //                 id="gender"
// // // //                 name="gender" 
// // // //                 value={formData.gender}
// // // //                 onChange={handleChange} 
// // // //                 required 
// // // //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500"
// // // //               >
// // // //                 <option value="">Select Gender</option>
// // // //                 <option value="Male">Male</option>
// // // //                 <option value="Female">Female</option>
// // // //                 <option value="Other">Other</option>
// // // //               </select>
// // // //             </div>
            
// // // //             <div>
// // // //               <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
// // // //               <textarea 
// // // //                 id="address"
// // // //                 name="address" 
// // // //                 placeholder="Address" 
// // // //                 value={formData.address}
// // // //                 onChange={handleChange} 
// // // //                 required 
// // // //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500"
// // // //                 rows="3"
// // // //               ></textarea>
// // // //             </div>

// // // //             <div className="flex flex-col items-center">
// // // //               {previewUrl && <img src={previewUrl} alt="Profile Preview" className="w-24 h-24 rounded-full mb-2 object-cover" />}
// // // //               <label className="cursor-pointer bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">
// // // //                 Upload Profile Picture
// // // //                 <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
// // // //               </label>
// // // //             </div>
            
// // // //             <button 
// // // //               type="submit" 
// // // //               className="w-full bg-red-600 text-white p-2 rounded hover:bg-red-700" 
// // // //               disabled={loading || emailExists || mobileExists || (showOtpSection && !otpVerified) || !!toxicityError}
// // // //             >
// // // //               {loading ? "Registering..." : "Register"}
// // // //             </button>
// // // //           </form>
          
// // // //           <button 
// // // //             onClick={handleGoogleSignIn} 
// // // //             className="mt-4 w-full flex items-center justify-center bg-white text-gray-700 border border-gray-300 p-2 rounded hover:bg-gray-50"
// // // //           >
// // // //             <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
// // // //               <path
// // // //                 fill="#4285F4"
// // // //                 d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
// // // //               />
// // // //               <path
// // // //                 fill="#34A853"
// // // //                 d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
// // // //               />
// // // //               <path
// // // //                 fill="#FBBC05"
// // // //                 d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
// // // //               />
// // // //               <path
// // // //                 fill="#EA4335"
// // // //                 d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
// // // //               />
// // // //             </svg>
// // // //             Sign in with Google
// // // //           </button>
          
// // // //           <p className="mt-4 text-center text-gray-600">
// // // //             Already have an account? <span className="text-red-600 cursor-pointer font-semibold" onClick={() => navigate("/login")}>Login</span>
// // // //           </p>
// // // //         </div>
// // // //       </div>
// // // //     </div>
// // // //   );
// // // // };

// // // // export default Register;



// // // // // import React, { useState, useEffect } from "react";
// // // // // import { useNavigate } from "react-router-dom";
// // // // // import { auth, db, googleProvider } from "./config/firebase";
// // // // // import { createUserWithEmailAndPassword, signInWithPopup, fetchSignInMethodsForEmail } from "firebase/auth";
// // // // // import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
// // // // // import * as toxicity from '@tensorflow-models/toxicity';

// // // // // const Register = () => {
// // // // //   // Use the correct API URL based on environment
// // // // //   const API_URL = process.env.REACT_APP_API_URL || "https://transgression-vigilance.vercel.app";

// // // // //   // Toxicity detection threshold
// // // // //   const TOXICITY_THRESHOLD = 0.4; // Higher = more strict

// // // // //   const navigate = useNavigate();
// // // // //   const [formData, setFormData] = useState({
// // // // //     email: "",
// // // // //     password: "",
// // // // //     confirmPassword: "",
// // // // //     name: "",
// // // // //     username: "",
// // // // //     contact: "",
// // // // //     dob: "",
// // // // //     gender: "",
// // // // //     address: "",
// // // // //     profilePic: null,
// // // // //   });

// // // // //   // Background image URL
// // // // //   const img = 'https://od.lk/s/OV8yNDk0MzM4ODZf/login2.jpg';

// // // // //   const [previewUrl, setPreviewUrl] = useState(null);
// // // // //   const [loading, setLoading] = useState(false);
// // // // //   const [error, setError] = useState("");
// // // // //   const [checkingEmail, setCheckingEmail] = useState(false);
// // // // //   const [emailExists, setEmailExists] = useState(false);
  
// // // // //   // Toxicity model state
// // // // //   const [toxicityModel, setToxicityModel] = useState(null);
// // // // //   const [isLoadingModel, setIsLoadingModel] = useState(true);
// // // // //   const [toxicityError, setToxicityError] = useState("");
  
// // // // //   // OTP-related states
// // // // //   const [showOtpSection, setShowOtpSection] = useState(false);
// // // // //   const [otp, setOtp] = useState("");
// // // // //   const [otpSent, setOtpSent] = useState(false);
// // // // //   const [otpVerified, setOtpVerified] = useState(false);
// // // // //   const [otpError, setOtpError] = useState("");
// // // // //   const [otpLoading, setOtpLoading] = useState(false);
// // // // //   const [resendDisabled, setResendDisabled] = useState(false);
// // // // //   const [timer, setTimer] = useState(0);
  
// // // // //   // Debug state for API connection issues
// // // // //   const [apiStatus, setApiStatus] = useState({ checked: false, working: false });

// // // // //   useEffect(() => {
// // // // //     if (auth.currentUser) {
// // // // //       navigate("/");
// // // // //     }
    
// // // // //     // Check if the API is working
// // // // //     checkApiStatus();
    
// // // // //     // Load toxicity model
// // // // //     loadToxicityModel();
// // // // //   }, [navigate]);

// // // // //   const loadToxicityModel = async () => {
// // // // //     try {
// // // // //       setIsLoadingModel(true);
// // // // //       const model = await toxicity.load(TOXICITY_THRESHOLD);
// // // // //       setToxicityModel(model);
// // // // //       console.log("Toxicity model loaded successfully");
// // // // //     } catch (error) {
// // // // //       console.error("Failed to load toxicity model:", error);
// // // // //     } finally {
// // // // //       setIsLoadingModel(false);
// // // // //     }
// // // // //   };

// // // // //   // Check if the API is responsive
// // // // //   const checkApiStatus = async () => {
// // // // //     try {
// // // // //       const response = await fetch(`${API_URL}/api/health`);
// // // // //       const data = await response.json();
// // // // //       setApiStatus({ checked: true, working: data.status === "ok" });
// // // // //     } catch (error) {
// // // // //       console.error("API health check failed:", error);
// // // // //       setApiStatus({ checked: true, working: false });
// // // // //     }
// // // // //   };

// // // // //   // Timer for OTP resend
// // // // //   useEffect(() => {
// // // // //     let interval;
// // // // //     if (timer > 0) {
// // // // //       interval = setInterval(() => {
// // // // //         setTimer((prevTimer) => prevTimer - 1);
// // // // //       }, 1000);
// // // // //     } else {
// // // // //       setResendDisabled(false);
// // // // //     }
    
// // // // //     return () => clearInterval(interval);
// // // // //   }, [timer]);

// // // // //   const handleChange = (e) => {
// // // // //     setFormData({ ...formData, [e.target.name]: e.target.value });
    
// // // // //     // Reset toxicity error when name changes
// // // // //     if (e.target.name === "name") {
// // // // //       setToxicityError("");
// // // // //     }
    
// // // // //     // Reset email check when email changes
// // // // //     if (e.target.name === "email") {
// // // // //       setEmailExists(false);
// // // // //       setOtpVerified(false);
// // // // //       setShowOtpSection(false);
// // // // //     }
// // // // //   };

// // // // //   const checkNameToxicity = async () => {
// // // // //     if (!formData.name || !toxicityModel) return true;
    
// // // // //     try {
// // // // //       const predictions = await toxicityModel.classify([formData.name]);
      
// // // // //       const isToxic = predictions.some(
// // // // //         (prediction) =>
// // // // //           prediction.results[0].match === true &&
// // // // //           ['toxicity', 'insult', 'threat', 'identity_attack'].includes(prediction.label)
// // // // //       );
      
// // // // //       if (isToxic) {
// // // // //         setToxicityError("The name you entered appears inappropriate. Please choose a different name.");
// // // // //         return false;
// // // // //       }
      
// // // // //       setToxicityError("");
// // // // //       return true;
// // // // //     } catch (error) {
// // // // //       console.error("Error checking name toxicity:", error);
// // // // //       // If there's an error checking toxicity, we'll let it pass but log the error
// // // // //       return true;
// // // // //     }
// // // // //   };

// // // // //   const handleFileChange = (e) => {
// // // // //     const file = e.target.files[0];
// // // // //     if (file) {
// // // // //       setFormData({ ...formData, profilePic: file });
// // // // //       setPreviewUrl(URL.createObjectURL(file));
// // // // //     }
// // // // //   };

// // // // //   // Check if email exists in both Firebase Auth and Firestore
// // // // //   const checkEmailExists = async (email) => {
// // // // //     try {
// // // // //       // First check with Firebase Authentication
// // // // //       const methods = await fetchSignInMethodsForEmail(auth, email);
      
// // // // //       // Then check with Firestore in case the email exists in database but not in auth
// // // // //       const usersRef = collection(db, "users");
// // // // //       const q = query(usersRef, where("email", "==", email));
// // // // //       const querySnapshot = await getDocs(q);
      
// // // // //       return methods.length > 0 || !querySnapshot.empty;
// // // // //     } catch (error) {
// // // // //       console.error("Error checking email:", error);
// // // // //       return false; // If there's an error, we proceed with caution
// // // // //     }
// // // // //   };

// // // // //   const checkEmail = async () => {
// // // // //     if (!formData.email) return;
    
// // // // //     setCheckingEmail(true);
// // // // //     setError("");
    
// // // // //     try {
// // // // //       const exists = await checkEmailExists(formData.email);
      
// // // // //       if (exists) {
// // // // //         setEmailExists(true);
// // // // //         setShowOtpSection(false);
// // // // //       } else {
// // // // //         setEmailExists(false);
// // // // //         // Show OTP section only if email is valid and not registered
// // // // //         setShowOtpSection(true);
// // // // //       }
// // // // //     } catch (error) {
// // // // //       console.error("Error checking email:", error);
// // // // //       setError("Failed to check email availability. Please try again.");
// // // // //     } finally {
// // // // //       setCheckingEmail(false);
// // // // //     }
// // // // //   };

// // // // //   const sendOTP = async () => {
// // // // //     setOtpError("");
// // // // //     setOtpLoading(true);
    
// // // // //     try {
// // // // //       console.log(`Sending OTP request to ${API_URL}/api/send-otp`);
      
// // // // //       const response = await fetch(`${API_URL}/api/send-otp`, {
// // // // //         method: "POST",
// // // // //         headers: {
// // // // //           "Content-Type": "application/json",
// // // // //         },
// // // // //         body: JSON.stringify({ email: formData.email }),
// // // // //       });
      
// // // // //       const data = await response.json();
// // // // //       console.log("OTP response:", data);
      
// // // // //       if (data.success) {
// // // // //         setOtpSent(true);
// // // // //         setResendDisabled(true);
// // // // //         setTimer(60); // 60 seconds cooldown
// // // // //       } else {
// // // // //         setOtpError(data.message || "Failed to send OTP. Please try again.");
// // // // //       }
// // // // //     } catch (error) {
// // // // //       console.error("Error sending OTP:", error);
// // // // //       setOtpError("Network error. Please check your connection and try again.");
// // // // //     } finally {
// // // // //       setOtpLoading(false);
// // // // //     }
// // // // //   };

// // // // //   const verifyOTP = async () => {
// // // // //     if (!otp) {
// // // // //       setOtpError("Please enter the OTP");
// // // // //       return;
// // // // //     }
    
// // // // //     setOtpLoading(true);
// // // // //     setOtpError("");
    
// // // // //     try {
// // // // //       const response = await fetch(`${API_URL}/api/verify-otp`, {
// // // // //         method: "POST",
// // // // //         headers: {
// // // // //           "Content-Type": "application/json",
// // // // //         },
// // // // //         body: JSON.stringify({ email: formData.email, otp }),
// // // // //       });
      
// // // // //       const data = await response.json();
      
// // // // //       if (data.success) {
// // // // //         setOtpVerified(true);
// // // // //         setOtpError("");
// // // // //       } else {
// // // // //         setOtpError(data.message || "Invalid OTP. Please try again.");
// // // // //       }
// // // // //     } catch (error) {
// // // // //       console.error("Error verifying OTP:", error);
// // // // //       setOtpError("Network error. Please check your connection and try again.");
// // // // //     } finally {
// // // // //       setOtpLoading(false);
// // // // //     }
// // // // //   };

// // // // //   const uploadToImageKit = async (file) => {
// // // // //     if (!file) return "";

// // // // //     try {
// // // // //       console.log("Getting ImageKit auth tokens");
// // // // //       const authResponse = await fetch(`${API_URL}/api/auth`);
// // // // //       if (!authResponse.ok) {
// // // // //         throw new Error(`Failed to get auth tokens: ${authResponse.status} ${authResponse.statusText}`);
// // // // //       }
      
// // // // //       const authData = await authResponse.json();
// // // // //       console.log("Auth data received:", authData);

// // // // //       const formData = new FormData();
// // // // //       formData.append("file", file);
// // // // //       formData.append("fileName", `profile_${Date.now()}_${file.name}`);
// // // // //       formData.append("publicKey", "public_KoLQpUZM3TZfPrc1If4RUVRgHAw=");
// // // // //       formData.append("signature", authData.signature);
// // // // //       formData.append("expire", authData.expire);
// // // // //       formData.append("token", authData.token);
// // // // //       formData.append("folder", "/profile_pictures");
      
// // // // //       console.log("Uploading to ImageKit...");
// // // // //       const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
// // // // //         method: "POST",
// // // // //         body: formData,
// // // // //       });

// // // // //       if (!response.ok) {
// // // // //         throw new Error(`Upload failed with status: ${response.status} ${response.statusText}`);
// // // // //       }

// // // // //       const result = await response.json();
// // // // //       console.log("Upload result:", result);
      
// // // // //       if (!result.url) {
// // // // //         throw new Error("Upload failed: " + (result.error?.message || "No URL returned"));
// // // // //       }

// // // // //       return result.url;
// // // // //     } catch (error) {
// // // // //       console.error("Image upload failed:", error);
// // // // //       alert(`Image upload failed: ${error.message}`);
// // // // //       return "";
// // // // //     }
// // // // //   };

// // // // //   const handleRegister = async (e) => {
// // // // //     e.preventDefault();
    
// // // // //     // Check name for toxicity before proceeding
// // // // //     const nameIsAcceptable = await checkNameToxicity();
// // // // //     if (!nameIsAcceptable) {
// // // // //       return;
// // // // //     }
    
// // // // //     // Check if email verification is required and not completed
// // // // //     if (showOtpSection && !otpVerified) {
// // // // //       setOtpError("Please verify your email before registering");
// // // // //       return;
// // // // //     }
    
// // // // //     // Check if email exists
// // // // //     if (emailExists) {
// // // // //       setError("This email is already registered. Please log in instead.");
// // // // //       return;
// // // // //     }
    
// // // // //     setLoading(true);
// // // // //     setError("");

// // // // //     if (formData.password !== formData.confirmPassword) {
// // // // //       setError("Passwords do not match!");
// // // // //       setLoading(false);
// // // // //       return;
// // // // //     }

// // // // //     try {
// // // // //       const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
// // // // //       const user = userCredential.user;

// // // // //       let profilePicUrl = "";
// // // // //       if (formData.profilePic) {
// // // // //         profilePicUrl = await uploadToImageKit(formData.profilePic);
// // // // //       }

// // // // //       await setDoc(doc(db, "users", user.uid), {
// // // // //         name: formData.name,
// // // // //         username: formData.username,
// // // // //         email: formData.email,
// // // // //         contact: formData.contact,
// // // // //         dob: formData.dob,
// // // // //         gender: formData.gender,
// // // // //         address: formData.address,
// // // // //         profilePic: profilePicUrl,
// // // // //         reg_date: serverTimestamp(),
// // // // //         role: "user",
// // // // //         pinCode: "", 
// // // // //         status: "new", 
// // // // //         emailVerified: true
// // // // //       });

// // // // //       alert("User registered successfully!");
// // // // //       navigate("/");
// // // // //     } catch (error) {
// // // // //       console.error("Error registering user", error);
// // // // //       setError(error.message);
// // // // //     } finally {
// // // // //       setLoading(false);
// // // // //     }
// // // // //   };

// // // // //   const handleGoogleSignIn = async () => {
// // // // //     try {
// // // // //       // Before signing in with Google, we need to get the email that will be used
// // // // //       const result = await signInWithPopup(auth, googleProvider);
// // // // //       const user = result.user;
// // // // //       const email = user.email;
      
// // // // //       // Check if this email already exists in our system
// // // // //       const emailExists = await checkEmailExists(email);
      
// // // // //       if (emailExists) {
// // // // //         // If email exists, show alert and redirect to login
// // // // //         alert("This email is already registered. Redirecting to login page.");
// // // // //         navigate("/login");
// // // // //         return;
// // // // //       }
      
// // // // //       // If email doesn't exist, proceed with creating the user account
// // // // //       await setDoc(doc(db, "users", user.uid), {
// // // // //         name: user.displayName,
// // // // //         username: user.displayName,
// // // // //         email: user.email,
// // // // //         profilePic: user.photoURL,
// // // // //         contact: "",
// // // // //         dob: "",
// // // // //         gender: "",
// // // // //         address: "",
// // // // //         reg_date: serverTimestamp(),
// // // // //         role: "user",
// // // // //         status: "new",
// // // // //         pinCode: "", 
// // // // //         emailVerified: true
// // // // //       }, { merge: true });

// // // // //       alert("Signed in with Google successfully!");
// // // // //       navigate("/home");
// // // // //     } catch (error) {
// // // // //       console.error("Google sign-in error", error);
// // // // //       setError(error.message);
// // // // //     }
// // // // //   };

// // // // //   // Add blur event to check email when user moves away from email field
// // // // //   const handleEmailBlur = () => {
// // // // //     checkEmail();
// // // // //   };

// // // // //   // Add blur event to check name toxicity when user moves away from name field
// // // // //   const handleNameBlur = async () => {
// // // // //     await checkNameToxicity();
// // // // //   };

// // // // //   return (
// // // // //     <div 
// // // // //       style={{ 
// // // // //         backgroundImage: `url(${img})`,
// // // // //         backgroundSize: 'cover',
// // // // //         backgroundPosition: 'center',
// // // // //         backgroundRepeat: 'no-repeat',
// // // // //         minHeight: '100vh',
// // // // //         width: '100%',
// // // // //         position: 'relative',
// // // // //         overflow: 'auto'
// // // // //       }}
// // // // //     >
// // // // //       {/* Semi-transparent overlay */}
// // // // //       <div 
// // // // //         style={{
// // // // //           position: 'absolute',
// // // // //           top: 0,
// // // // //           left: 0,
// // // // //           right: 0,
// // // // //           bottom: 0,
// // // // //           backgroundColor: 'rgba(0, 0, 0, 0.5)',
// // // // //           display: 'flex',
// // // // //           alignItems: 'center',
// // // // //           justifyContent: 'center',
// // // // //           padding: '2rem 1rem',
// // // // //           minHeight: '100vh',
// // // // //           overflow: 'auto'
// // // // //         }}
// // // // //       >
// // // // //         <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg w-full max-w-md my-8" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
// // // // //           <h2 className="text-2xl font-bold text-center mb-4 text-red-600">Register for Transgression Vigilance</h2>
          
// // // // //           {/* Model Loading Status */}
// // // // //           {isLoadingModel && (
// // // // //             <div className="bg-blue-100 text-blue-700 p-2 rounded mb-4 text-center">
// // // // //               <p>Loading content filter...</p>
// // // // //             </div>
// // // // //           )}
          
// // // // //           {/* API Status Warning */}
// // // // //           {apiStatus.checked && !apiStatus.working && (
// // // // //             <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
// // // // //               <p className="font-bold">API Connection Issue</p>
// // // // //               <p>Unable to connect to the server. Email verification and image upload may not work correctly.</p>
// // // // //             </div>
// // // // //           )}
          
// // // // //           {error && <p className="text-red-500 text-center mb-4">{error}</p>}
// // // // //           {emailExists && (
// // // // //             <div className="bg-yellow-100 text-yellow-700 p-4 rounded mb-4">
// // // // //               This email is already registered. Please <span className="underline cursor-pointer" onClick={() => navigate("/login")}>log in</span> instead.
// // // // //             </div>
// // // // //           )}
          
// // // // //           <form onSubmit={handleRegister} className="space-y-3">
// // // // //             {/* Name field */}
// // // // //             <div>
// // // // //               <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
// // // // //               <input 
// // // // //                 type="text" 
// // // // //                 id="name"
// // // // //                 name="name" 
// // // // //                 placeholder="Full Name" 
// // // // //                 value={formData.name}
// // // // //                 onChange={handleChange}
// // // // //                 onBlur={handleNameBlur}
// // // // //                 required 
// // // // //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// // // // //               />
// // // // //               {toxicityError && (
// // // // //                 <p className="text-red-500 text-sm mt-1">{toxicityError}</p>
// // // // //               )}
// // // // //             </div>
            
// // // // //             <div>
// // // // //               <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
// // // // //               <input 
// // // // //                 type="email" 
// // // // //                 id="email"
// // // // //                 name="email" 
// // // // //                 placeholder="Email" 
// // // // //                 value={formData.email}
// // // // //                 onChange={handleChange} 
// // // // //                 onBlur={handleEmailBlur}
// // // // //                 required 
// // // // //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// // // // //               />
// // // // //               {checkingEmail && <p className="text-sm text-gray-500">Checking email...</p>}
// // // // //             </div>
            
// // // // //             {/* OTP Verification Section */}
// // // // //             {showOtpSection && !emailExists && (
// // // // //               <div className="bg-blue-50 p-4 rounded border border-blue-200">
// // // // //                 <h3 className="font-semibold text-blue-800 mb-2">Email Verification</h3>
                
// // // // //                 {otpVerified ? (
// // // // //                   <div className="bg-green-100 text-green-700 p-2 rounded text-center">
// // // // //                     Email verified successfully ✓
// // // // //                   </div>
// // // // //                 ) : (
// // // // //                   <>
// // // // //                     {otpSent ? (
// // // // //                       <div className="space-y-3">
// // // // //                         <p className="text-sm">We've sent a verification code to {formData.email}</p>
// // // // //                         <div className="flex space-x-2">
// // // // //                           <input 
// // // // //                             type="text" 
// // // // //                             placeholder="Enter 6-digit OTP" 
// // // // //                             value={otp}
// // // // //                             onChange={(e) => setOtp(e.target.value)}
// // // // //                             maxLength={6}
// // // // //                             className="w-full p-2 border rounded" 
// // // // //                           />
// // // // //                           <button 
// // // // //                             type="button" 
// // // // //                             onClick={verifyOTP}
// // // // //                             disabled={otpLoading}
// // // // //                             className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 whitespace-nowrap"
// // // // //                           >
// // // // //                             {otpLoading ? "Verifying..." : "Verify"}
// // // // //                           </button>
// // // // //                         </div>
// // // // //                         <div className="flex justify-between items-center text-sm">
// // // // //                           <button
// // // // //                             type="button"
// // // // //                             onClick={sendOTP}
// // // // //                             disabled={resendDisabled}
// // // // //                             className="text-red-600 hover:underline disabled:text-gray-400"
// // // // //                           >
// // // // //                             Resend OTP {timer > 0 && `(${timer}s)`}
// // // // //                           </button>
// // // // //                         </div>
// // // // //                       </div>
// // // // //                     ) : (
// // // // //                       <div className="flex space-x-2">
// // // // //                         <button 
// // // // //                           type="button" 
// // // // //                           onClick={sendOTP}
// // // // //                           disabled={otpLoading}
// // // // //                           className="w-full bg-red-600 text-white p-2 rounded hover:bg-red-700"
// // // // //                         >
// // // // //                           {otpLoading ? "Sending..." : "Send Verification Code"}
// // // // //                         </button>
// // // // //                       </div>
// // // // //                     )}
// // // // //                   </>
// // // // //                 )}
                
// // // // //                 {otpError && <p className="text-red-500 text-sm mt-2">{otpError}</p>}
// // // // //               </div>
// // // // //             )}
            
// // // // //             <div>
// // // // //               <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
// // // // //               <input 
// // // // //                 type="text" 
// // // // //                 id="username"
// // // // //                 name="username" 
// // // // //                 placeholder="Username" 
// // // // //                 value={formData.username}
// // // // //                 onChange={handleChange} 
// // // // //                 required 
// // // // //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// // // // //               />
// // // // //             </div>
            
// // // // //             <div>
// // // // //               <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
// // // // //               <input 
// // // // //                 type="password" 
// // // // //                 id="password"
// // // // //                 name="password" 
// // // // //                 placeholder="Password" 
// // // // //                 value={formData.password}
// // // // //                 onChange={handleChange} 
// // // // //                 required 
// // // // //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// // // // //               />
// // // // //             </div>
            
// // // // //             <div>
// // // // //               <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
// // // // //               <input 
// // // // //                 type="password" 
// // // // //                 id="confirmPassword"
// // // // //                 name="confirmPassword" 
// // // // //                 placeholder="Confirm Password" 
// // // // //                 value={formData.confirmPassword}
// // // // //                 onChange={handleChange} 
// // // // //                 required 
// // // // //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// // // // //               />
// // // // //             </div>
            
// // // // //             <div>
// // // // //               <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
// // // // //               <input 
// // // // //                 type="text" 
// // // // //                 id="contact"
// // // // //                 name="contact" 
// // // // //                 placeholder="Contact" 
// // // // //                 value={formData.contact}
// // // // //                 onChange={handleChange} 
// // // // //                 required 
// // // // //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// // // // //               />
// // // // //             </div>
            
// // // // //             <div>
// // // // //               <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
// // // // //               <input 
// // // // //                 type="date" 
// // // // //                 id="dob"
// // // // //                 name="dob" 
// // // // //                 value={formData.dob}
// // // // //                 onChange={handleChange} 
// // // // //                 required 
// // // // //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// // // // //               />
// // // // //             </div>
            
// // // // //             <div>
// // // // //               <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
// // // // //               <select 
// // // // //                 id="gender"
// // // // //                 name="gender" 
// // // // //                 value={formData.gender}
// // // // //                 onChange={handleChange} 
// // // // //                 required 
// // // // //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500"
// // // // //               >
// // // // //                 <option value="">Select Gender</option>
// // // // //                 <option value="Male">Male</option>
// // // // //                 <option value="Female">Female</option>
// // // // //                 <option value="Other">Other</option>
// // // // //               </select>
// // // // //             </div>
            
// // // // //             <div>
// // // // //               <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
// // // // //               <textarea 
// // // // //                 id="address"
// // // // //                 name="address" 
// // // // //                 placeholder="Address" 
// // // // //                 value={formData.address}
// // // // //                 onChange={handleChange} 
// // // // //                 required 
// // // // //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500"
// // // // //                 rows="3"
// // // // //               ></textarea>
// // // // //             </div>

// // // // //             <div className="flex flex-col items-center">
// // // // //               {previewUrl && <img src={previewUrl} alt="Profile Preview" className="w-24 h-24 rounded-full mb-2 object-cover" />}
// // // // //               <label className="cursor-pointer bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">
// // // // //                 Upload Profile Picture
// // // // //                 <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
// // // // //               </label>
// // // // //             </div>
            
// // // // //             <button 
// // // // //               type="submit" 
// // // // //               className="w-full bg-red-600 text-white p-2 rounded hover:bg-red-700" 
// // // // //               disabled={loading || emailExists || (showOtpSection && !otpVerified) || !!toxicityError}
// // // // //             >
// // // // //               {loading ? "Registering..." : "Register"}
// // // // //             </button>
// // // // //           </form>
          
// // // // //           <button 
// // // // //             onClick={handleGoogleSignIn} 
// // // // //             className="mt-4 w-full flex items-center justify-center bg-white text-gray-700 border border-gray-300 p-2 rounded hover:bg-gray-50"
// // // // //           >
// // // // //             <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
// // // // //               <path
// // // // //                 fill="#4285F4"
// // // // //                 d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
// // // // //               />
// // // // //               <path
// // // // //                 fill="#34A853"
// // // // //                 d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
// // // // //               />
// // // // //               <path
// // // // //                 fill="#FBBC05"
// // // // //                 d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
// // // // //               />
// // // // //               <path
// // // // //                 fill="#EA4335"
// // // // //                 d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
// // // // //               />
// // // // //             </svg>
// // // // //             Sign in with Google
// // // // //           </button>
          
// // // // //           <p className="mt-4 text-center text-gray-600">
// // // // //             Already have an account? <span className="text-red-600 cursor-pointer font-semibold" onClick={() => navigate("/login")}>Login</span>
// // // // //           </p>
// // // // //         </div>
// // // // //       </div>
// // // // //     </div>
// // // // //   );
// // // // // };

// // // // // export default Register;


// // // // // // import React, { useState, useEffect } from "react";
// // // // // // import { useNavigate } from "react-router-dom";
// // // // // // import { auth, db, googleProvider } from "./config/firebase";
// // // // // // import { createUserWithEmailAndPassword, signInWithPopup, fetchSignInMethodsForEmail } from "firebase/auth";
// // // // // // import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
// // // // // // import * as toxicity from '@tensorflow-models/toxicity';


// // // // // // // Use the correct API URL based on environment
// // // // // // const API_URL = process.env.REACT_APP_API_URL || "https://transgression-vigilance.vercel.app";

// // // // // // // Toxicity detection threshold
// // // // // // const TOXICITY_THRESHOLD = 0.9; // Higher = more strict

// // // // // // const Register = () => {
// // // // // //   const navigate = useNavigate();
// // // // // //   const [formData, setFormData] = useState({
// // // // // //     email: "",
// // // // // //     password: "",
// // // // // //     confirmPassword: "",
// // // // // //     name: "", // Added name field
// // // // // //     username: "",
// // // // // //     contact: "",
// // // // // //     dob: "",
// // // // // //     gender: "",
// // // // // //     address: "",
// // // // // //     profilePic: null,
// // // // // //   });

// // // // // //   const [previewUrl, setPreviewUrl] = useState(null);
// // // // // //   const [loading, setLoading] = useState(false);
// // // // // //   const [error, setError] = useState("");
// // // // // //   const [checkingEmail, setCheckingEmail] = useState(false);
// // // // // //   const [emailExists, setEmailExists] = useState(false);
  
// // // // // //   // Toxicity model state
// // // // // //   const [toxicityModel, setToxicityModel] = useState(null);
// // // // // //   const [isLoadingModel, setIsLoadingModel] = useState(true);
// // // // // //   const [toxicityError, setToxicityError] = useState("");
  
// // // // // //   // OTP-related states
// // // // // //   const [showOtpSection, setShowOtpSection] = useState(false);
// // // // // //   const [otp, setOtp] = useState("");
// // // // // //   const [otpSent, setOtpSent] = useState(false);
// // // // // //   const [otpVerified, setOtpVerified] = useState(false);
// // // // // //   const [otpError, setOtpError] = useState("");
// // // // // //   const [otpLoading, setOtpLoading] = useState(false);
// // // // // //   const [resendDisabled, setResendDisabled] = useState(false);
// // // // // //   const [timer, setTimer] = useState(0);
  
// // // // // //   // Debug state for API connection issues
// // // // // //   const [apiStatus, setApiStatus] = useState({ checked: false, working: false });

// // // // // //   useEffect(() => {
// // // // // //     if (auth.currentUser) {
// // // // // //       navigate("/");
// // // // // //     }
    
// // // // // //     // Check if the API is working
// // // // // //     checkApiStatus();
    
// // // // // //     // Load toxicity model
// // // // // //     loadToxicityModel();
// // // // // //   }, [navigate]);

// // // // // //   const loadToxicityModel = async () => {
// // // // // //     try {
// // // // // //       setIsLoadingModel(true);
// // // // // //       const model = await toxicity.load(TOXICITY_THRESHOLD);
// // // // // //       setToxicityModel(model);
// // // // // //       console.log("Toxicity model loaded successfully");
// // // // // //     } catch (error) {
// // // // // //       console.error("Failed to load toxicity model:", error);
// // // // // //     } finally {
// // // // // //       setIsLoadingModel(false);
// // // // // //     }
// // // // // //   };

// // // // // //   // Check if the API is responsive
// // // // // //   const checkApiStatus = async () => {
// // // // // //     try {
// // // // // //       const response = await fetch(`${API_URL}/api/health`);
// // // // // //       const data = await response.json();
// // // // // //       setApiStatus({ checked: true, working: data.status === "ok" });
// // // // // //     } catch (error) {
// // // // // //       console.error("API health check failed:", error);
// // // // // //       setApiStatus({ checked: true, working: false });
// // // // // //     }
// // // // // //   };

// // // // // //   // Timer for OTP resend
// // // // // //   useEffect(() => {
// // // // // //     let interval;
// // // // // //     if (timer > 0) {
// // // // // //       interval = setInterval(() => {
// // // // // //         setTimer((prevTimer) => prevTimer - 1);
// // // // // //       }, 1000);
// // // // // //     } else {
// // // // // //       setResendDisabled(false);
// // // // // //     }
    
// // // // // //     return () => clearInterval(interval);
// // // // // //   }, [timer]);

// // // // // //   const handleChange = (e) => {
// // // // // //     setFormData({ ...formData, [e.target.name]: e.target.value });
    
// // // // // //     // Reset toxicity error when name changes
// // // // // //     if (e.target.name === "name") {
// // // // // //       setToxicityError("");
// // // // // //     }
    
// // // // // //     // Reset email check when email changes
// // // // // //     if (e.target.name === "email") {
// // // // // //       setEmailExists(false);
// // // // // //       setOtpVerified(false);
// // // // // //       setShowOtpSection(false);
// // // // // //     }
// // // // // //   };

// // // // // //   const checkNameToxicity = async () => {
// // // // // //     if (!formData.name || !toxicityModel) return true;
    
// // // // // //     try {
// // // // // //       const predictions = await toxicityModel.classify([formData.name]);
      
// // // // // //       const isToxic = predictions.some(
// // // // // //         (prediction) =>
// // // // // //           prediction.results[0].match === true &&
// // // // // //           ['toxicity', 'insult', 'threat', 'identity_attack'].includes(prediction.label)
// // // // // //       );
      
// // // // // //       if (isToxic) {
// // // // // //         setToxicityError("The name you entered appears inappropriate. Please choose a different name.");
// // // // // //         return false;
// // // // // //       }
      
// // // // // //       setToxicityError("");
// // // // // //       return true;
// // // // // //     } catch (error) {
// // // // // //       console.error("Error checking name toxicity:", error);
// // // // // //       // If there's an error checking toxicity, we'll let it pass but log the error
// // // // // //       return true;
// // // // // //     }
// // // // // //   };

// // // // // //   const handleFileChange = (e) => {
// // // // // //     const file = e.target.files[0];
// // // // // //     if (file) {
// // // // // //       setFormData({ ...formData, profilePic: file });
// // // // // //       setPreviewUrl(URL.createObjectURL(file));
// // // // // //     }
// // // // // //   };

// // // // // //   const checkEmail = async () => {
// // // // // //     if (!formData.email) return;
    
// // // // // //     setCheckingEmail(true);
// // // // // //     setError("");
    
// // // // // //     try {
// // // // // //       // First check with Firebase Authentication
// // // // // //       const methods = await fetchSignInMethodsForEmail(auth, formData.email);
      
// // // // // //       // Then check with Firestore in case the email exists in database but not in auth
// // // // // //       const usersRef = collection(db, "users");
// // // // // //       const q = query(usersRef, where("email", "==", formData.email));
// // // // // //       const querySnapshot = await getDocs(q);
      
// // // // // //       if (methods.length > 0 || !querySnapshot.empty) {
// // // // // //         setEmailExists(true);
// // // // // //         setShowOtpSection(false);
// // // // // //       } else {
// // // // // //         setEmailExists(false);
// // // // // //         // Show OTP section only if email is valid and not registered
// // // // // //         setShowOtpSection(true);
// // // // // //       }
// // // // // //     } catch (error) {
// // // // // //       console.error("Error checking email:", error);
// // // // // //       setError("Failed to check email availability. Please try again.");
// // // // // //     } finally {
// // // // // //       setCheckingEmail(false);
// // // // // //     }
// // // // // //   };

// // // // // //   const sendOTP = async () => {
// // // // // //     setOtpError("");
// // // // // //     setOtpLoading(true);
    
// // // // // //     try {
// // // // // //       console.log(`Sending OTP request to ${API_URL}/api/send-otp`);
      
// // // // // //       const response = await fetch(`${API_URL}/api/send-otp`, {
// // // // // //         method: "POST",
// // // // // //         headers: {
// // // // // //           "Content-Type": "application/json",
// // // // // //         },
// // // // // //         body: JSON.stringify({ email: formData.email }),
// // // // // //       });
      
// // // // // //       const data = await response.json();
// // // // // //       console.log("OTP response:", data);
      
// // // // // //       if (data.success) {
// // // // // //         setOtpSent(true);
// // // // // //         setResendDisabled(true);
// // // // // //         setTimer(60); // 60 seconds cooldown
// // // // // //       } else {
// // // // // //         setOtpError(data.message || "Failed to send OTP. Please try again.");
// // // // // //       }
// // // // // //     } catch (error) {
// // // // // //       console.error("Error sending OTP:", error);
// // // // // //       setOtpError("Network error. Please check your connection and try again.");
// // // // // //     } finally {
// // // // // //       setOtpLoading(false);
// // // // // //     }
// // // // // //   };

// // // // // //   const verifyOTP = async () => {
// // // // // //     if (!otp) {
// // // // // //       setOtpError("Please enter the OTP");
// // // // // //       return;
// // // // // //     }
    
// // // // // //     setOtpLoading(true);
// // // // // //     setOtpError("");
    
// // // // // //     try {
// // // // // //       const response = await fetch(`${API_URL}/api/verify-otp`, {
// // // // // //         method: "POST",
// // // // // //         headers: {
// // // // // //           "Content-Type": "application/json",
// // // // // //         },
// // // // // //         body: JSON.stringify({ email: formData.email, otp }),
// // // // // //       });
      
// // // // // //       const data = await response.json();
      
// // // // // //       if (data.success) {
// // // // // //         setOtpVerified(true);
// // // // // //         setOtpError("");
// // // // // //       } else {
// // // // // //         setOtpError(data.message || "Invalid OTP. Please try again.");
// // // // // //       }
// // // // // //     } catch (error) {
// // // // // //       console.error("Error verifying OTP:", error);
// // // // // //       setOtpError("Network error. Please check your connection and try again.");
// // // // // //     } finally {
// // // // // //       setOtpLoading(false);
// // // // // //     }
// // // // // //   };

// // // // // //   const uploadToImageKit = async (file) => {
// // // // // //     if (!file) return "";

// // // // // //     try {
// // // // // //       console.log("Getting ImageKit auth tokens");
// // // // // //       const authResponse = await fetch(`${API_URL}/api/auth`);
// // // // // //       if (!authResponse.ok) {
// // // // // //         throw new Error(`Failed to get auth tokens: ${authResponse.status} ${authResponse.statusText}`);
// // // // // //       }
      
// // // // // //       const authData = await authResponse.json();
// // // // // //       console.log("Auth data received:", authData);

// // // // // //       const formData = new FormData();
// // // // // //       formData.append("file", file);
// // // // // //       formData.append("fileName", `profile_${Date.now()}_${file.name}`);
// // // // // //       formData.append("publicKey", "public_KoLQpUZM3TZfPrc1If4RUVRgHAw=");
// // // // // //       formData.append("signature", authData.signature);
// // // // // //       formData.append("expire", authData.expire);
// // // // // //       formData.append("token", authData.token);
// // // // // //       formData.append("folder", "/profile_pictures");
      
// // // // // //       console.log("Uploading to ImageKit...");
// // // // // //       const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
// // // // // //         method: "POST",
// // // // // //         body: formData,
// // // // // //       });

// // // // // //       if (!response.ok) {
// // // // // //         throw new Error(`Upload failed with status: ${response.status} ${response.statusText}`);
// // // // // //       }

// // // // // //       const result = await response.json();
// // // // // //       console.log("Upload result:", result);
      
// // // // // //       if (!result.url) {
// // // // // //         throw new Error("Upload failed: " + (result.error?.message || "No URL returned"));
// // // // // //       }

// // // // // //       return result.url;
// // // // // //     } catch (error) {
// // // // // //       console.error("Image upload failed:", error);
// // // // // //       alert(`Image upload failed: ${error.message}`);
// // // // // //       return "";
// // // // // //     }
// // // // // //   };

// // // // // //   const handleRegister = async (e) => {
// // // // // //     e.preventDefault();
    
// // // // // //     // Check name for toxicity before proceeding
// // // // // //     const nameIsAcceptable = await checkNameToxicity();
// // // // // //     if (!nameIsAcceptable) {
// // // // // //       return;
// // // // // //     }
    
// // // // // //     // Check if email verification is required and not completed
// // // // // //     if (showOtpSection && !otpVerified) {
// // // // // //       setOtpError("Please verify your email before registering");
// // // // // //       return;
// // // // // //     }
    
// // // // // //     // Check if email exists
// // // // // //     if (emailExists) {
// // // // // //       setError("This email is already registered. Please log in instead.");
// // // // // //       return;
// // // // // //     }
    
// // // // // //     setLoading(true);
// // // // // //     setError("");

// // // // // //     if (formData.password !== formData.confirmPassword) {
// // // // // //       setError("Passwords do not match!");
// // // // // //       setLoading(false);
// // // // // //       return;
// // // // // //     }

// // // // // //     try {
// // // // // //       const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
// // // // // //       const user = userCredential.user;

// // // // // //       let profilePicUrl = "";
// // // // // //       if (formData.profilePic) {
// // // // // //         profilePicUrl = await uploadToImageKit(formData.profilePic);
// // // // // //       }

// // // // // //       await setDoc(doc(db, "users", user.uid), {
// // // // // //         name: formData.name, // Store name in Firebase
// // // // // //         username: formData.username,
// // // // // //         email: formData.email,
// // // // // //         contact: formData.contact,
// // // // // //         dob: formData.dob,
// // // // // //         gender: formData.gender,
// // // // // //         address: formData.address,
// // // // // //         profilePic: profilePicUrl,
// // // // // //         reg_date: serverTimestamp(),
// // // // // //         role: "user",
// // // // // //         pinCode: "", 
// // // // // //         status: "new", 
// // // // // //         emailVerified: true
// // // // // //       });

// // // // // //       alert("User registered successfully!");
// // // // // //       navigate("/");
// // // // // //     } catch (error) {
// // // // // //       console.error("Error registering user", error);
// // // // // //       setError(error.message);
// // // // // //     } finally {
// // // // // //       setLoading(false);
// // // // // //     }
// // // // // //   };

// // // // // //   const handleGoogleSignIn = async () => {
// // // // // //     try {
// // // // // //       const result = await signInWithPopup(auth, googleProvider);
// // // // // //       const user = result.user;

// // // // // //       // For Google sign-in, we'll use the display name as both name and username
// // // // // //       await setDoc(doc(db, "users", user.uid), {
// // // // // //         name: user.displayName, // Store name from Google account
// // // // // //         username: user.displayName,
// // // // // //         email: user.email,
// // // // // //         profilePic: user.photoURL,
// // // // // //         contact: "",
// // // // // //         dob: "",
// // // // // //         gender: "",
// // // // // //         address: "",
// // // // // //         reg_date: serverTimestamp(),
// // // // // //         role: "user",
// // // // // //         status: "new",
// // // // // //         pinCode: "", 
// // // // // //         emailVerified: true
// // // // // //       }, { merge: true });

// // // // // //       alert("Signed in with Google successfully!");
// // // // // //       navigate("/");
// // // // // //     } catch (error) {
// // // // // //       console.error("Google sign-in error", error);
// // // // // //       setError(error.message);
// // // // // //     }
// // // // // //   };

// // // // // //   // Add blur event to check email when user moves away from email field
// // // // // //   const handleEmailBlur = () => {
// // // // // //     checkEmail();
// // // // // //   };

// // // // // //   // Add blur event to check name toxicity when user moves away from name field
// // // // // //   const handleNameBlur = async () => {
// // // // // //     await checkNameToxicity();
// // // // // //   };

// // // // // //   return (
// // // // // //     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
// // // // // //       <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
// // // // // //         <h2 className="text-2xl font-bold text-center mb-4">Register</h2>
        
// // // // // //         {/* Model Loading Status */}
// // // // // //         {isLoadingModel && (
// // // // // //           <div className="bg-blue-100 text-blue-700 p-2 rounded mb-4 text-center">
// // // // // //             <p>Loading content filter...</p>
// // // // // //           </div>
// // // // // //         )}
        
// // // // // //         {/* API Status Warning */}
// // // // // //         {apiStatus.checked && !apiStatus.working && (
// // // // // //           <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
// // // // // //             <p className="font-bold">API Connection Issue</p>
// // // // // //             <p>Unable to connect to the server. Email verification and image upload may not work correctly.</p>
// // // // // //           </div>
// // // // // //         )}
        
// // // // // //         {error && <p className="text-red-500 text-center mb-4">{error}</p>}
// // // // // //         {emailExists && (
// // // // // //           <div className="bg-yellow-100 text-yellow-700 p-4 rounded mb-4">
// // // // // //             This email is already registered. Please <span className="underline cursor-pointer" onClick={() => navigate("/login")}>log in</span> instead.
// // // // // //           </div>
// // // // // //         )}
        
// // // // // //         <form onSubmit={handleRegister} className="space-y-4">
// // // // // //           {/* Name field - Added */}
// // // // // //           <div>
// // // // // //             <input 
// // // // // //               type="text" 
// // // // // //               name="name" 
// // // // // //               placeholder="Full Name" 
// // // // // //               value={formData.name}
// // // // // //               onChange={handleChange}
// // // // // //               onBlur={handleNameBlur}
// // // // // //               required 
// // // // // //               className="w-full p-2 border rounded" 
// // // // // //             />
// // // // // //             {toxicityError && (
// // // // // //               <p className="text-red-500 text-sm mt-1">{toxicityError}</p>
// // // // // //             )}
// // // // // //           </div>
          
// // // // // //           <div>
// // // // // //             <input 
// // // // // //               type="email" 
// // // // // //               name="email" 
// // // // // //               placeholder="Email" 
// // // // // //               value={formData.email}
// // // // // //               onChange={handleChange} 
// // // // // //               onBlur={handleEmailBlur}
// // // // // //               required 
// // // // // //               className="w-full p-2 border rounded" 
// // // // // //             />
// // // // // //             {checkingEmail && <p className="text-sm text-gray-500">Checking email...</p>}
// // // // // //           </div>
          
// // // // // //           {/* OTP Verification Section */}
// // // // // //           {showOtpSection && !emailExists && (
// // // // // //             <div className="bg-blue-50 p-4 rounded border border-blue-200">
// // // // // //               <h3 className="font-semibold text-blue-800 mb-2">Email Verification</h3>
              
// // // // // //               {otpVerified ? (
// // // // // //                 <div className="bg-green-100 text-green-700 p-2 rounded text-center">
// // // // // //                   Email verified successfully ✓
// // // // // //                 </div>
// // // // // //               ) : (
// // // // // //                 <>
// // // // // //                   {otpSent ? (
// // // // // //                     <div className="space-y-3">
// // // // // //                       <p className="text-sm">We've sent a verification code to {formData.email}</p>
// // // // // //                       <div className="flex space-x-2">
// // // // // //                         <input 
// // // // // //                           type="text" 
// // // // // //                           placeholder="Enter 6-digit OTP" 
// // // // // //                           value={otp}
// // // // // //                           onChange={(e) => setOtp(e.target.value)}
// // // // // //                           maxLength={6}
// // // // // //                           className="w-full p-2 border rounded" 
// // // // // //                         />
// // // // // //                         <button 
// // // // // //                           type="button" 
// // // // // //                           onClick={verifyOTP}
// // // // // //                           disabled={otpLoading}
// // // // // //                           className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 whitespace-nowrap"
// // // // // //                         >
// // // // // //                           {otpLoading ? "Verifying..." : "Verify"}
// // // // // //                         </button>
// // // // // //                       </div>
// // // // // //                       <div className="flex justify-between items-center text-sm">
// // // // // //                         <button
// // // // // //                           type="button"
// // // // // //                           onClick={sendOTP}
// // // // // //                           disabled={resendDisabled}
// // // // // //                           className="text-blue-600 hover:underline disabled:text-gray-400"
// // // // // //                         >
// // // // // //                           Resend OTP {timer > 0 && `(${timer}s)`}
// // // // // //                         </button>
// // // // // //                       </div>
// // // // // //                     </div>
// // // // // //                   ) : (
// // // // // //                     <div className="flex space-x-2">
// // // // // //                       <button 
// // // // // //                         type="button" 
// // // // // //                         onClick={sendOTP}
// // // // // //                         disabled={otpLoading}
// // // // // //                         className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
// // // // // //                       >
// // // // // //                         {otpLoading ? "Sending..." : "Send Verification Code"}
// // // // // //                       </button>
// // // // // //                     </div>
// // // // // //                   )}
// // // // // //                 </>
// // // // // //               )}
              
// // // // // //               {otpError && <p className="text-red-500 text-sm mt-2">{otpError}</p>}
// // // // // //             </div>
// // // // // //           )}
          
// // // // // //           <input 
// // // // // //             type="text" 
// // // // // //             name="username" 
// // // // // //             placeholder="Username" 
// // // // // //             value={formData.username}
// // // // // //             onChange={handleChange} 
// // // // // //             required 
// // // // // //             className="w-full p-2 border rounded" 
// // // // // //           />
// // // // // //           <input 
// // // // // //             type="password" 
// // // // // //             name="password" 
// // // // // //             placeholder="Password" 
// // // // // //             value={formData.password}
// // // // // //             onChange={handleChange} 
// // // // // //             required 
// // // // // //             className="w-full p-2 border rounded" 
// // // // // //           />
// // // // // //           <input 
// // // // // //             type="password" 
// // // // // //             name="confirmPassword" 
// // // // // //             placeholder="Confirm Password" 
// // // // // //             value={formData.confirmPassword}
// // // // // //             onChange={handleChange} 
// // // // // //             required 
// // // // // //             className="w-full p-2 border rounded" 
// // // // // //           />
// // // // // //           <input 
// // // // // //             type="text" 
// // // // // //             name="contact" 
// // // // // //             placeholder="Contact" 
// // // // // //             value={formData.contact}
// // // // // //             onChange={handleChange} 
// // // // // //             required 
// // // // // //             className="w-full p-2 border rounded" 
// // // // // //           />
// // // // // //           <input 
// // // // // //             type="date" 
// // // // // //             name="dob" 
// // // // // //             value={formData.dob}
// // // // // //             onChange={handleChange} 
// // // // // //             required 
// // // // // //             className="w-full p-2 border rounded" 
// // // // // //           />
// // // // // //           <select 
// // // // // //             name="gender" 
// // // // // //             value={formData.gender}
// // // // // //             onChange={handleChange} 
// // // // // //             required 
// // // // // //             className="w-full p-2 border rounded"
// // // // // //           >
// // // // // //             <option value="">Select Gender</option>
// // // // // //             <option value="Male">Male</option>
// // // // // //             <option value="Female">Female</option>
// // // // // //             <option value="Other">Other</option>
// // // // // //           </select>
// // // // // //           <textarea 
// // // // // //             name="address" 
// // // // // //             placeholder="Address" 
// // // // // //             value={formData.address}
// // // // // //             onChange={handleChange} 
// // // // // //             required 
// // // // // //             className="w-full p-2 border rounded"
// // // // // //           ></textarea>

// // // // // //           <div className="flex flex-col items-center">
// // // // // //             {previewUrl && <img src={previewUrl} alt="Profile Preview" className="w-24 h-24 rounded-full mb-2 object-cover" />}
// // // // // //             <label className="cursor-pointer bg-gray-200 px-4 py-2 rounded">
// // // // // //               Upload Profile Picture
// // // // // //               <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
// // // // // //             </label>
// // // // // //           </div>
          
// // // // // //           <button 
// // // // // //             type="submit" 
// // // // // //             className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600" 
// // // // // //             disabled={loading || emailExists || (showOtpSection && !otpVerified) || !!toxicityError}
// // // // // //           >
// // // // // //             {loading ? "Registering..." : "Register"}
// // // // // //           </button>
// // // // // //         </form>
        
// // // // // //         <button 
// // // // // //           onClick={handleGoogleSignIn} 
// // // // // //           className="mt-4 w-full bg-red-500 text-white p-2 rounded hover:bg-red-600"
// // // // // //         >
// // // // // //           Sign in with Google
// // // // // //         </button>
        
// // // // // //         <p className="mt-4 text-center text-gray-600">
// // // // // //           Already have an account? <span className="text-blue-500 cursor-pointer" onClick={() => navigate("/login")}>Login</span>
// // // // // //         </p>
// // // // // //       </div>
// // // // // //     </div>
// // // // // //   );
// // // // // // };

// // // // // // export default Register;


// // // // // // // import React, { useState, useEffect } from "react";
// // // // // // // import { useNavigate } from "react-router-dom";
// // // // // // // import { auth, db, googleProvider } from "./config/firebase";
// // // // // // // import { createUserWithEmailAndPassword, signInWithPopup, fetchSignInMethodsForEmail } from "firebase/auth";
// // // // // // // import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";

// // // // // // // // Use the correct API URL based on environment
// // // // // // // const API_URL = process.env.REACT_APP_API_URL || "https://transgression-vigilance.vercel.app";

// // // // // // // const Register = () => {
// // // // // // //   const navigate = useNavigate();
// // // // // // //   const [formData, setFormData] = useState({
// // // // // // //     email: "",
// // // // // // //     password: "",
// // // // // // //     confirmPassword: "",
// // // // // // //     username: "",
// // // // // // //     contact: "",
// // // // // // //     dob: "",
// // // // // // //     gender: "",
// // // // // // //     address: "",
// // // // // // //     profilePic: null,
// // // // // // //   });

// // // // // // //   const [previewUrl, setPreviewUrl] = useState(null);
// // // // // // //   const [loading, setLoading] = useState(false);
// // // // // // //   const [error, setError] = useState("");
// // // // // // //   const [checkingEmail, setCheckingEmail] = useState(false);
// // // // // // //   const [emailExists, setEmailExists] = useState(false);
  
// // // // // // //   // OTP-related states
// // // // // // //   const [showOtpSection, setShowOtpSection] = useState(false);
// // // // // // //   const [otp, setOtp] = useState("");
// // // // // // //   const [otpSent, setOtpSent] = useState(false);
// // // // // // //   const [otpVerified, setOtpVerified] = useState(false);
// // // // // // //   const [otpError, setOtpError] = useState("");
// // // // // // //   const [otpLoading, setOtpLoading] = useState(false);
// // // // // // //   const [resendDisabled, setResendDisabled] = useState(false);
// // // // // // //   const [timer, setTimer] = useState(0);
  
// // // // // // //   // Debug state for API connection issues
// // // // // // //   const [apiStatus, setApiStatus] = useState({ checked: false, working: false });

// // // // // // //   useEffect(() => {
// // // // // // //     if (auth.currentUser) {
// // // // // // //       navigate("/");
// // // // // // //     }
    
// // // // // // //     // Check if the API is working
// // // // // // //     checkApiStatus();
// // // // // // //   }, [navigate]);

// // // // // // //   // Check if the API is responsive
// // // // // // //   const checkApiStatus = async () => {
// // // // // // //     try {
// // // // // // //       const response = await fetch(`${API_URL}/api/health`);
// // // // // // //       const data = await response.json();
// // // // // // //       setApiStatus({ checked: true, working: data.status === "ok" });
// // // // // // //     } catch (error) {
// // // // // // //       console.error("API health check failed:", error);
// // // // // // //       setApiStatus({ checked: true, working: false });
// // // // // // //     }
// // // // // // //   };

// // // // // // //   // Timer for OTP resend
// // // // // // //   useEffect(() => {
// // // // // // //     let interval;
// // // // // // //     if (timer > 0) {
// // // // // // //       interval = setInterval(() => {
// // // // // // //         setTimer((prevTimer) => prevTimer - 1);
// // // // // // //       }, 1000);
// // // // // // //     } else {
// // // // // // //       setResendDisabled(false);
// // // // // // //     }
    
// // // // // // //     return () => clearInterval(interval);
// // // // // // //   }, [timer]);

// // // // // // //   const handleChange = (e) => {
// // // // // // //     setFormData({ ...formData, [e.target.name]: e.target.value });
    
// // // // // // //     // Reset email check when email changes
// // // // // // //     if (e.target.name === "email") {
// // // // // // //       setEmailExists(false);
// // // // // // //       setOtpVerified(false);
// // // // // // //       setShowOtpSection(false);
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const handleFileChange = (e) => {
// // // // // // //     const file = e.target.files[0];
// // // // // // //     if (file) {
// // // // // // //       setFormData({ ...formData, profilePic: file });
// // // // // // //       setPreviewUrl(URL.createObjectURL(file));
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const checkEmail = async () => {
// // // // // // //     if (!formData.email) return;
    
// // // // // // //     setCheckingEmail(true);
// // // // // // //     setError("");
    
// // // // // // //     try {
// // // // // // //       // First check with Firebase Authentication
// // // // // // //       const methods = await fetchSignInMethodsForEmail(auth, formData.email);
      
// // // // // // //       // Then check with Firestore in case the email exists in database but not in auth
// // // // // // //       const usersRef = collection(db, "users");
// // // // // // //       const q = query(usersRef, where("email", "==", formData.email));
// // // // // // //       const querySnapshot = await getDocs(q);
      
// // // // // // //       if (methods.length > 0 || !querySnapshot.empty) {
// // // // // // //         setEmailExists(true);
// // // // // // //         setShowOtpSection(false);
// // // // // // //       } else {
// // // // // // //         setEmailExists(false);
// // // // // // //         // Show OTP section only if email is valid and not registered
// // // // // // //         setShowOtpSection(true);
// // // // // // //       }
// // // // // // //     } catch (error) {
// // // // // // //       console.error("Error checking email:", error);
// // // // // // //       setError("Failed to check email availability. Please try again.");
// // // // // // //     } finally {
// // // // // // //       setCheckingEmail(false);
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const sendOTP = async () => {
// // // // // // //     setOtpError("");
// // // // // // //     setOtpLoading(true);
    
// // // // // // //     try {
// // // // // // //       console.log(`Sending OTP request to ${API_URL}/api/send-otp`);
      
// // // // // // //       const response = await fetch(`${API_URL}/api/send-otp`, {
// // // // // // //         method: "POST",
// // // // // // //         headers: {
// // // // // // //           "Content-Type": "application/json",
// // // // // // //         },
// // // // // // //         body: JSON.stringify({ email: formData.email }),
// // // // // // //       });
      
// // // // // // //       const data = await response.json();
// // // // // // //       console.log("OTP response:", data);
      
// // // // // // //       if (data.success) {
// // // // // // //         setOtpSent(true);
// // // // // // //         setResendDisabled(true);
// // // // // // //         setTimer(60); // 60 seconds cooldown
// // // // // // //       } else {
// // // // // // //         setOtpError(data.message || "Failed to send OTP. Please try again.");
// // // // // // //       }
// // // // // // //     } catch (error) {
// // // // // // //       console.error("Error sending OTP:", error);
// // // // // // //       setOtpError("Network error. Please check your connection and try again.");
// // // // // // //     } finally {
// // // // // // //       setOtpLoading(false);
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const verifyOTP = async () => {
// // // // // // //     if (!otp) {
// // // // // // //       setOtpError("Please enter the OTP");
// // // // // // //       return;
// // // // // // //     }
    
// // // // // // //     setOtpLoading(true);
// // // // // // //     setOtpError("");
    
// // // // // // //     try {
// // // // // // //       const response = await fetch(`${API_URL}/api/verify-otp`, {
// // // // // // //         method: "POST",
// // // // // // //         headers: {
// // // // // // //           "Content-Type": "application/json",
// // // // // // //         },
// // // // // // //         body: JSON.stringify({ email: formData.email, otp }),
// // // // // // //       });
      
// // // // // // //       const data = await response.json();
      
// // // // // // //       if (data.success) {
// // // // // // //         setOtpVerified(true);
// // // // // // //         setOtpError("");
// // // // // // //       } else {
// // // // // // //         setOtpError(data.message || "Invalid OTP. Please try again.");
// // // // // // //       }
// // // // // // //     } catch (error) {
// // // // // // //       console.error("Error verifying OTP:", error);
// // // // // // //       setOtpError("Network error. Please check your connection and try again.");
// // // // // // //     } finally {
// // // // // // //       setOtpLoading(false);
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const uploadToImageKit = async (file) => {
// // // // // // //     if (!file) return "";

// // // // // // //     try {
// // // // // // //       console.log("Getting ImageKit auth tokens");
// // // // // // //       const authResponse = await fetch(`${API_URL}/api/auth`);
// // // // // // //       if (!authResponse.ok) {
// // // // // // //         throw new Error(`Failed to get auth tokens: ${authResponse.status} ${authResponse.statusText}`);
// // // // // // //       }
      
// // // // // // //       const authData = await authResponse.json();
// // // // // // //       console.log("Auth data received:", authData);

// // // // // // //       const formData = new FormData();
// // // // // // //       formData.append("file", file);
// // // // // // //       formData.append("fileName", `profile_${Date.now()}_${file.name}`);
// // // // // // //       formData.append("publicKey", "public_KoLQpUZM3TZfPrc1If4RUVRgHAw=");
// // // // // // //       formData.append("signature", authData.signature);
// // // // // // //       formData.append("expire", authData.expire);
// // // // // // //       formData.append("token", authData.token);
// // // // // // //       formData.append("folder", "/profile_pictures");
      
// // // // // // //       console.log("Uploading to ImageKit...");
// // // // // // //       const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
// // // // // // //         method: "POST",
// // // // // // //         body: formData,
// // // // // // //       });

// // // // // // //       if (!response.ok) {
// // // // // // //         throw new Error(`Upload failed with status: ${response.status} ${response.statusText}`);
// // // // // // //       }

// // // // // // //       const result = await response.json();
// // // // // // //       console.log("Upload result:", result);
      
// // // // // // //       if (!result.url) {
// // // // // // //         throw new Error("Upload failed: " + (result.error?.message || "No URL returned"));
// // // // // // //       }

// // // // // // //       return result.url;
// // // // // // //     } catch (error) {
// // // // // // //       console.error("Image upload failed:", error);
// // // // // // //       alert(`Image upload failed: ${error.message}`);
// // // // // // //       return "";
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const handleRegister = async (e) => {
// // // // // // //     e.preventDefault();
    
// // // // // // //     // Check if email verification is required and not completed
// // // // // // //     if (showOtpSection && !otpVerified) {
// // // // // // //       setOtpError("Please verify your email before registering");
// // // // // // //       return;
// // // // // // //     }
    
// // // // // // //     // Check if email exists
// // // // // // //     if (emailExists) {
// // // // // // //       setError("This email is already registered. Please log in instead.");
// // // // // // //       return;
// // // // // // //     }
    
// // // // // // //     setLoading(true);
// // // // // // //     setError("");

// // // // // // //     if (formData.password !== formData.confirmPassword) {
// // // // // // //       setError("Passwords do not match!");
// // // // // // //       setLoading(false);
// // // // // // //       return;
// // // // // // //     }

// // // // // // //     try {
// // // // // // //       const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
// // // // // // //       const user = userCredential.user;

// // // // // // //       let profilePicUrl = "";
// // // // // // //       if (formData.profilePic) {
// // // // // // //         profilePicUrl = await uploadToImageKit(formData.profilePic);
// // // // // // //       }

// // // // // // //       await setDoc(doc(db, "users", user.uid), {
// // // // // // //         username: formData.username,
// // // // // // //         email: formData.email,
// // // // // // //         contact: formData.contact,
// // // // // // //         dob: formData.dob,
// // // // // // //         gender: formData.gender,
// // // // // // //         address: formData.address,
// // // // // // //         profilePic: profilePicUrl,
// // // // // // //         reg_date: serverTimestamp(),
// // // // // // //         role: "user",
// // // // // // //         pinCode: "", 
// // // // // // //         status: "new", 
// // // // // // //         emailVerified: true
// // // // // // //       });

// // // // // // //       alert("User registered successfully!");
// // // // // // //       navigate("/");
// // // // // // //     } catch (error) {
// // // // // // //       console.error("Error registering user", error);
// // // // // // //       setError(error.message);
// // // // // // //     } finally {
// // // // // // //       setLoading(false);
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const handleGoogleSignIn = async () => {
// // // // // // //     try {
// // // // // // //       const result = await signInWithPopup(auth, googleProvider);
// // // // // // //       const user = result.user;

// // // // // // //       await setDoc(doc(db, "users", user.uid), {
// // // // // // //         username: user.displayName,
// // // // // // //         email: user.email,
// // // // // // //         profilePic: user.photoURL,
// // // // // // //         contact: "",
// // // // // // //         dob: "",
// // // // // // //         gender: "",
// // // // // // //         address: "",
// // // // // // //         reg_date: serverTimestamp(),
// // // // // // //         role: "user",
// // // // // // //         status: "new",
// // // // // // //         pinCode: "", 
// // // // // // //         emailVerified: true
// // // // // // //       }, { merge: true });

// // // // // // //       alert("Signed in with Google successfully!");
// // // // // // //       navigate("/");
// // // // // // //     } catch (error) {
// // // // // // //       console.error("Google sign-in error", error);
// // // // // // //       setError(error.message);
// // // // // // //     }
// // // // // // //   };

// // // // // // //   // Add blur event to check email when user moves away from email field
// // // // // // //   const handleEmailBlur = () => {
// // // // // // //     checkEmail();
// // // // // // //   };

// // // // // // //   return (
// // // // // // //     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
// // // // // // //       <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
// // // // // // //         <h2 className="text-2xl font-bold text-center mb-4">Register</h2>
        
// // // // // // //         {/* API Status Warning */}
// // // // // // //         {apiStatus.checked && !apiStatus.working && (
// // // // // // //           <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
// // // // // // //             <p className="font-bold">API Connection Issue</p>
// // // // // // //             <p>Unable to connect to the server. Email verification and image upload may not work correctly.</p>
// // // // // // //           </div>
// // // // // // //         )}
        
// // // // // // //         {error && <p className="text-red-500 text-center mb-4">{error}</p>}
// // // // // // //         {emailExists && (
// // // // // // //           <div className="bg-yellow-100 text-yellow-700 p-4 rounded mb-4">
// // // // // // //             This email is already registered. Please <span className="underline cursor-pointer" onClick={() => navigate("/login")}>log in</span> instead.
// // // // // // //           </div>
// // // // // // //         )}
        
// // // // // // //         <form onSubmit={handleRegister} className="space-y-4">
// // // // // // //           <div>
// // // // // // //             <input 
// // // // // // //               type="email" 
// // // // // // //               name="email" 
// // // // // // //               placeholder="Email" 
// // // // // // //               value={formData.email}
// // // // // // //               onChange={handleChange} 
// // // // // // //               onBlur={handleEmailBlur}
// // // // // // //               required 
// // // // // // //               className="w-full p-2 border rounded" 
// // // // // // //             />
// // // // // // //             {checkingEmail && <p className="text-sm text-gray-500">Checking email...</p>}
// // // // // // //           </div>
          
// // // // // // //           {/* OTP Verification Section */}
// // // // // // //           {showOtpSection && !emailExists && (
// // // // // // //             <div className="bg-blue-50 p-4 rounded border border-blue-200">
// // // // // // //               <h3 className="font-semibold text-blue-800 mb-2">Email Verification</h3>
              
// // // // // // //               {otpVerified ? (
// // // // // // //                 <div className="bg-green-100 text-green-700 p-2 rounded text-center">
// // // // // // //                   Email verified successfully ✓
// // // // // // //                 </div>
// // // // // // //               ) : (
// // // // // // //                 <>
// // // // // // //                   {otpSent ? (
// // // // // // //                     <div className="space-y-3">
// // // // // // //                       <p className="text-sm">We've sent a verification code to {formData.email}</p>
// // // // // // //                       <div className="flex space-x-2">
// // // // // // //                         <input 
// // // // // // //                           type="text" 
// // // // // // //                           placeholder="Enter 6-digit OTP" 
// // // // // // //                           value={otp}
// // // // // // //                           onChange={(e) => setOtp(e.target.value)}
// // // // // // //                           maxLength={6}
// // // // // // //                           className="w-full p-2 border rounded" 
// // // // // // //                         />
// // // // // // //                         <button 
// // // // // // //                           type="button" 
// // // // // // //                           onClick={verifyOTP}
// // // // // // //                           disabled={otpLoading}
// // // // // // //                           className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 whitespace-nowrap"
// // // // // // //                         >
// // // // // // //                           {otpLoading ? "Verifying..." : "Verify"}
// // // // // // //                         </button>
// // // // // // //                       </div>
// // // // // // //                       <div className="flex justify-between items-center text-sm">
// // // // // // //                         <button
// // // // // // //                           type="button"
// // // // // // //                           onClick={sendOTP}
// // // // // // //                           disabled={resendDisabled}
// // // // // // //                           className="text-blue-600 hover:underline disabled:text-gray-400"
// // // // // // //                         >
// // // // // // //                           Resend OTP {timer > 0 && `(${timer}s)`}
// // // // // // //                         </button>
// // // // // // //                       </div>
// // // // // // //                     </div>
// // // // // // //                   ) : (
// // // // // // //                     <div className="flex space-x-2">
// // // // // // //                       <button 
// // // // // // //                         type="button" 
// // // // // // //                         onClick={sendOTP}
// // // // // // //                         disabled={otpLoading}
// // // // // // //                         className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
// // // // // // //                       >
// // // // // // //                         {otpLoading ? "Sending..." : "Send Verification Code"}
// // // // // // //                       </button>
// // // // // // //                     </div>
// // // // // // //                   )}
// // // // // // //                 </>
// // // // // // //               )}
              
// // // // // // //               {otpError && <p className="text-red-500 text-sm mt-2">{otpError}</p>}
// // // // // // //             </div>
// // // // // // //           )}
          
// // // // // // //           <input 
// // // // // // //             type="text" 
// // // // // // //             name="username" 
// // // // // // //             placeholder="Username" 
// // // // // // //             value={formData.username}
// // // // // // //             onChange={handleChange} 
// // // // // // //             required 
// // // // // // //             className="w-full p-2 border rounded" 
// // // // // // //           />
// // // // // // //           <input 
// // // // // // //             type="password" 
// // // // // // //             name="password" 
// // // // // // //             placeholder="Password" 
// // // // // // //             value={formData.password}
// // // // // // //             onChange={handleChange} 
// // // // // // //             required 
// // // // // // //             className="w-full p-2 border rounded" 
// // // // // // //           />
// // // // // // //           <input 
// // // // // // //             type="password" 
// // // // // // //             name="confirmPassword" 
// // // // // // //             placeholder="Confirm Password" 
// // // // // // //             value={formData.confirmPassword}
// // // // // // //             onChange={handleChange} 
// // // // // // //             required 
// // // // // // //             className="w-full p-2 border rounded" 
// // // // // // //           />
// // // // // // //           <input 
// // // // // // //             type="text" 
// // // // // // //             name="contact" 
// // // // // // //             placeholder="Contact" 
// // // // // // //             value={formData.contact}
// // // // // // //             onChange={handleChange} 
// // // // // // //             required 
// // // // // // //             className="w-full p-2 border rounded" 
// // // // // // //           />
// // // // // // //           <input 
// // // // // // //             type="date" 
// // // // // // //             name="dob" 
// // // // // // //             value={formData.dob}
// // // // // // //             onChange={handleChange} 
// // // // // // //             required 
// // // // // // //             className="w-full p-2 border rounded" 
// // // // // // //           />
// // // // // // //           <select 
// // // // // // //             name="gender" 
// // // // // // //             value={formData.gender}
// // // // // // //             onChange={handleChange} 
// // // // // // //             required 
// // // // // // //             className="w-full p-2 border rounded"
// // // // // // //           >
// // // // // // //             <option value="">Select Gender</option>
// // // // // // //             <option value="Male">Male</option>
// // // // // // //             <option value="Female">Female</option>
// // // // // // //             <option value="Other">Other</option>
// // // // // // //           </select>
// // // // // // //           <textarea 
// // // // // // //             name="address" 
// // // // // // //             placeholder="Address" 
// // // // // // //             value={formData.address}
// // // // // // //             onChange={handleChange} 
// // // // // // //             required 
// // // // // // //             className="w-full p-2 border rounded"
// // // // // // //           ></textarea>

// // // // // // //           <div className="flex flex-col items-center">
// // // // // // //             {previewUrl && <img src={previewUrl} alt="Profile Preview" className="w-24 h-24 rounded-full mb-2 object-cover" />}
// // // // // // //             <label className="cursor-pointer bg-gray-200 px-4 py-2 rounded">
// // // // // // //               Upload Profile Picture
// // // // // // //               <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
// // // // // // //             </label>
// // // // // // //           </div>
          
// // // // // // //           <button 
// // // // // // //             type="submit" 
// // // // // // //             className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600" 
// // // // // // //             disabled={loading || emailExists || (showOtpSection && !otpVerified)}
// // // // // // //           >
// // // // // // //             {loading ? "Registering..." : "Register"}
// // // // // // //           </button>
// // // // // // //         </form>
        
// // // // // // //         <button 
// // // // // // //           onClick={handleGoogleSignIn} 
// // // // // // //           className="mt-4 w-full bg-red-500 text-white p-2 rounded hover:bg-red-600"
// // // // // // //         >
// // // // // // //           Sign in with Google
// // // // // // //         </button>
        
// // // // // // //         <p className="mt-4 text-center text-gray-600">
// // // // // // //           Already have an account? <span className="text-blue-500 cursor-pointer" onClick={() => navigate("/login")}>Login</span>
// // // // // // //         </p>
// // // // // // //       </div>
// // // // // // //     </div>
// // // // // // //   );
// // // // // // // };

// // // // // // // export default Register;

// // // // // // // import React, { useState, useEffect } from "react";
// // // // // // // import { useNavigate } from "react-router-dom";
// // // // // // // import { auth, db, googleProvider } from "./config/firebase";
// // // // // // // import { createUserWithEmailAndPassword, signInWithPopup, fetchSignInMethodsForEmail } from "firebase/auth";
// // // // // // // import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";

// // // // // // // const Register = () => {
// // // // // // //   const navigate = useNavigate();
// // // // // // //   const [formData, setFormData] = useState({
// // // // // // //     email: "",
// // // // // // //     password: "",
// // // // // // //     confirmPassword: "",
// // // // // // //     username: "",
// // // // // // //     contact: "",
// // // // // // //     dob: "",
// // // // // // //     gender: "",
// // // // // // //     address: "",
// // // // // // //     profilePic: null,
// // // // // // //   });

// // // // // // //   const [previewUrl, setPreviewUrl] = useState(null);
// // // // // // //   const [loading, setLoading] = useState(false);
// // // // // // //   const [error, setError] = useState("");
// // // // // // //   const [checkingEmail, setCheckingEmail] = useState(false);
// // // // // // //   const [emailExists, setEmailExists] = useState(false);
  
// // // // // // //   // OTP-related states
// // // // // // //   const [showOtpSection, setShowOtpSection] = useState(false);
// // // // // // //   const [otp, setOtp] = useState("");
// // // // // // //   const [otpSent, setOtpSent] = useState(false);
// // // // // // //   const [otpVerified, setOtpVerified] = useState(false);
// // // // // // //   const [otpError, setOtpError] = useState("");
// // // // // // //   const [otpLoading, setOtpLoading] = useState(false);
// // // // // // //   const [resendDisabled, setResendDisabled] = useState(false);
// // // // // // //   const [timer, setTimer] = useState(0);

// // // // // // //   useEffect(() => {
// // // // // // //     if (auth.currentUser) {
// // // // // // //       navigate("/");
// // // // // // //     }
// // // // // // //   }, [navigate]);

// // // // // // //   // Timer for OTP resend
// // // // // // //   useEffect(() => {
// // // // // // //     let interval;
// // // // // // //     if (timer > 0) {
// // // // // // //       interval = setInterval(() => {
// // // // // // //         setTimer((prevTimer) => prevTimer - 1);
// // // // // // //       }, 1000);
// // // // // // //     } else {
// // // // // // //       setResendDisabled(false);
// // // // // // //     }
    
// // // // // // //     return () => clearInterval(interval);
// // // // // // //   }, [timer]);

// // // // // // //   const handleChange = (e) => {
// // // // // // //     setFormData({ ...formData, [e.target.name]: e.target.value });
    
// // // // // // //     // Reset email check when email changes
// // // // // // //     if (e.target.name === "email") {
// // // // // // //       setEmailExists(false);
// // // // // // //       setOtpVerified(false);
// // // // // // //       setShowOtpSection(false);
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const handleFileChange = (e) => {
// // // // // // //     const file = e.target.files[0];
// // // // // // //     if (file) {
// // // // // // //       setFormData({ ...formData, profilePic: file });
// // // // // // //       setPreviewUrl(URL.createObjectURL(file));
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const checkEmail = async () => {
// // // // // // //     if (!formData.email) return;
    
// // // // // // //     setCheckingEmail(true);
// // // // // // //     setError("");
    
// // // // // // //     try {
// // // // // // //       // First check with Firebase Authentication
// // // // // // //       const methods = await fetchSignInMethodsForEmail(auth, formData.email);
      
// // // // // // //       // Then check with Firestore in case the email exists in database but not in auth
// // // // // // //       const usersRef = collection(db, "users");
// // // // // // //       const q = query(usersRef, where("email", "==", formData.email));
// // // // // // //       const querySnapshot = await getDocs(q);
      
// // // // // // //       if (methods.length > 0 || !querySnapshot.empty) {
// // // // // // //         setEmailExists(true);
// // // // // // //         setShowOtpSection(false);
// // // // // // //       } else {
// // // // // // //         setEmailExists(false);
// // // // // // //         // Show OTP section only if email is valid and not registered
// // // // // // //         setShowOtpSection(true);
// // // // // // //       }
// // // // // // //     } catch (error) {
// // // // // // //       console.error("Error checking email:", error);
// // // // // // //       // Don't set error message here as it might confuse users during normal email checking
// // // // // // //     } finally {
// // // // // // //       setCheckingEmail(false);
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const sendOTP = async () => {
// // // // // // //     setOtpError("");
// // // // // // //     setOtpLoading(true);
    
// // // // // // //     try {
// // // // // // //       const response = await fetch("http://localhost:5000/api/send-otp", {
// // // // // // //         method: "POST",
// // // // // // //         headers: {
// // // // // // //           "Content-Type": "application/json",
// // // // // // //         },
// // // // // // //         body: JSON.stringify({ email: formData.email }),
// // // // // // //       });
      
// // // // // // //       const data = await response.json();
      
// // // // // // //       if (data.success) {
// // // // // // //         setOtpSent(true);
// // // // // // //         setResendDisabled(true);
// // // // // // //         setTimer(60); // 60 seconds cooldown
// // // // // // //       } else {
// // // // // // //         setOtpError(data.message || "Failed to send OTP. Please try again.");
// // // // // // //       }
// // // // // // //     } catch (error) {
// // // // // // //       console.error("Error sending OTP:", error);
// // // // // // //       setOtpError("Network error. Please check your connection and try again.");
// // // // // // //     } finally {
// // // // // // //       setOtpLoading(false);
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const verifyOTP = async () => {
// // // // // // //     if (!otp) {
// // // // // // //       setOtpError("Please enter the OTP");
// // // // // // //       return;
// // // // // // //     }
    
// // // // // // //     setOtpLoading(true);
// // // // // // //     setOtpError("");
    
// // // // // // //     try {
// // // // // // //       const response = await fetch("http://localhost:5000/api/verify-otp", {
// // // // // // //         method: "POST",
// // // // // // //         headers: {
// // // // // // //           "Content-Type": "application/json",
// // // // // // //         },
// // // // // // //         body: JSON.stringify({ email: formData.email, otp }),
// // // // // // //       });
      
// // // // // // //       const data = await response.json();
      
// // // // // // //       if (data.success) {
// // // // // // //         setOtpVerified(true);
// // // // // // //         setOtpError("");
// // // // // // //       } else {
// // // // // // //         setOtpError(data.message || "Invalid OTP. Please try again.");
// // // // // // //       }
// // // // // // //     } catch (error) {
// // // // // // //       console.error("Error verifying OTP:", error);
// // // // // // //       setOtpError("Network error. Please check your connection and try again.");
// // // // // // //     } finally {
// // // // // // //       setOtpLoading(false);
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const uploadToImageKit = async (file) => {
// // // // // // //     if (!file) return "";

// // // // // // //     try {
// // // // // // //       const authResponse = await fetch("http://localhost:5000/auth");
// // // // // // //       const authData = await authResponse.json();

// // // // // // //       const formData = new FormData();
// // // // // // //       formData.append("file", file);
// // // // // // //       formData.append("fileName", file.name);
// // // // // // //       formData.append("publicKey", "public_KoLQpUZM3TZfPrc1If4RUVRgHAw=");
// // // // // // //       formData.append("signature", authData.signature);
// // // // // // //       formData.append("expire", authData.expire);
// // // // // // //       formData.append("token", authData.token);
// // // // // // //       formData.append("folder", "/profile_pictures");

// // // // // // //       const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
// // // // // // //         method: "POST",
// // // // // // //         body: formData,
// // // // // // //       });

// // // // // // //       const result = await response.json();
// // // // // // //       if (!result.url) throw new Error("Upload failed: " + (result.error?.message || "Unknown error"));

// // // // // // //       return result.url;
// // // // // // //     } catch (error) {
// // // // // // //       console.error("Image upload failed:", error);
// // // // // // //       alert("Image upload failed. Check console for details.");
// // // // // // //       return "";
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const handleRegister = async (e) => {
// // // // // // //     e.preventDefault();
    
// // // // // // //     // Check if email verification is required and not completed
// // // // // // //     if (showOtpSection && !otpVerified) {
// // // // // // //       setOtpError("Please verify your email before registering");
// // // // // // //       return;
// // // // // // //     }
    
// // // // // // //     // Check if email exists
// // // // // // //     if (emailExists) {
// // // // // // //       setError("This email is already registered. Please log in instead.");
// // // // // // //       return;
// // // // // // //     }
    
// // // // // // //     setLoading(true);
// // // // // // //     setError("");

// // // // // // //     if (formData.password !== formData.confirmPassword) {
// // // // // // //       setError("Passwords do not match!");
// // // // // // //       setLoading(false);
// // // // // // //       return;
// // // // // // //     }

// // // // // // //     try {
// // // // // // //       const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
// // // // // // //       const user = userCredential.user;

// // // // // // //       let profilePicUrl = "";
// // // // // // //       if (formData.profilePic) {
// // // // // // //         profilePicUrl = await uploadToImageKit(formData.profilePic);
// // // // // // //       }

// // // // // // //       await setDoc(doc(db, "users", user.uid), {
// // // // // // //         username: formData.username,
// // // // // // //         email: formData.email,
// // // // // // //         contact: formData.contact,
// // // // // // //         dob: formData.dob,
// // // // // // //         gender: formData.gender,
// // // // // // //         address: formData.address,
// // // // // // //         profilePic: profilePicUrl,
// // // // // // //         reg_date: serverTimestamp(),
// // // // // // //         role: "user",
// // // // // // //         pinCode: "", 
// // // // // // //         status: "new", // Changed from "new" to "active" since email is verified
// // // // // // //         emailVerified: true
// // // // // // //       });

// // // // // // //       alert("User registered successfully!");
// // // // // // //       navigate("/");
// // // // // // //     } catch (error) {
// // // // // // //       console.error("Error registering user", error);
// // // // // // //       setError(error.message);
// // // // // // //     } finally {
// // // // // // //       setLoading(false);
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const handleGoogleSignIn = async () => {
// // // // // // //     try {
// // // // // // //       const result = await signInWithPopup(auth, googleProvider);
// // // // // // //       const user = result.user;

// // // // // // //       await setDoc(doc(db, "users", user.uid), {
// // // // // // //         username: user.displayName,
// // // // // // //         email: user.email,
// // // // // // //         profilePic: user.photoURL,
// // // // // // //         contact: "",
// // // // // // //         dob: "",
// // // // // // //         gender: "",
// // // // // // //         address: "",
// // // // // // //         reg_date: serverTimestamp(),
// // // // // // //         role: "user",
// // // // // // //         status: "new",
// // // // // // //         pinCode: "", 
// // // // // // //         emailVerified: true
// // // // // // //       }, { merge: true });

// // // // // // //       alert("Signed in with Google successfully!");
// // // // // // //       navigate("/");
// // // // // // //     } catch (error) {
// // // // // // //       console.error("Google sign-in error", error);
// // // // // // //       setError(error.message);
// // // // // // //     }
// // // // // // //   };

// // // // // // //   // Add blur event to check email when user moves away from email field
// // // // // // //   const handleEmailBlur = () => {
// // // // // // //     checkEmail();
// // // // // // //   };

// // // // // // //   return (
// // // // // // //     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
// // // // // // //       <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
// // // // // // //         <h2 className="text-2xl font-bold text-center mb-4">Register</h2>
// // // // // // //         {error && <p className="text-red-500 text-center mb-4">{error}</p>}
// // // // // // //         {emailExists && (
// // // // // // //           <div className="bg-yellow-100 text-yellow-700 p-4 rounded mb-4">
// // // // // // //             This email is already registered. Please <span className="underline cursor-pointer" onClick={() => navigate("/login")}>log in</span> instead.
// // // // // // //           </div>
// // // // // // //         )}
        
// // // // // // //         <form onSubmit={handleRegister} className="space-y-4">
// // // // // // //           <div>
// // // // // // //             <input 
// // // // // // //               type="email" 
// // // // // // //               name="email" 
// // // // // // //               placeholder="Email" 
// // // // // // //               value={formData.email}
// // // // // // //               onChange={handleChange} 
// // // // // // //               onBlur={handleEmailBlur}
// // // // // // //               required 
// // // // // // //               className="w-full p-2 border rounded" 
// // // // // // //             />
// // // // // // //             {checkingEmail && <p className="text-sm text-gray-500">Checking email...</p>}
// // // // // // //           </div>
          
// // // // // // //           {/* OTP Verification Section */}
// // // // // // //           {showOtpSection && !emailExists && (
// // // // // // //             <div className="bg-blue-50 p-4 rounded border border-blue-200">
// // // // // // //               <h3 className="font-semibold text-blue-800 mb-2">Email Verification</h3>
              
// // // // // // //               {otpVerified ? (
// // // // // // //                 <div className="bg-green-100 text-green-700 p-2 rounded text-center">
// // // // // // //                   Email verified successfully ✓
// // // // // // //                 </div>
// // // // // // //               ) : (
// // // // // // //                 <>
// // // // // // //                   {otpSent ? (
// // // // // // //                     <div className="space-y-3">
// // // // // // //                       <p className="text-sm">We've sent a verification code to {formData.email}</p>
// // // // // // //                       <div className="flex space-x-2">
// // // // // // //                         <input 
// // // // // // //                           type="text" 
// // // // // // //                           placeholder="Enter 6-digit OTP" 
// // // // // // //                           value={otp}
// // // // // // //                           onChange={(e) => setOtp(e.target.value)}
// // // // // // //                           maxLength={6}
// // // // // // //                           className="w-full p-2 border rounded" 
// // // // // // //                         />
// // // // // // //                         <button 
// // // // // // //                           type="button" 
// // // // // // //                           onClick={verifyOTP}
// // // // // // //                           disabled={otpLoading}
// // // // // // //                           className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 whitespace-nowrap"
// // // // // // //                         >
// // // // // // //                           {otpLoading ? "Verifying..." : "Verify"}
// // // // // // //                         </button>
// // // // // // //                       </div>
// // // // // // //                       <div className="flex justify-between items-center text-sm">
// // // // // // //                         <button
// // // // // // //                           type="button"
// // // // // // //                           onClick={sendOTP}
// // // // // // //                           disabled={resendDisabled}
// // // // // // //                           className="text-blue-600 hover:underline disabled:text-gray-400"
// // // // // // //                         >
// // // // // // //                           Resend OTP {timer > 0 && `(${timer}s)`}
// // // // // // //                         </button>
// // // // // // //                       </div>
// // // // // // //                     </div>
// // // // // // //                   ) : (
// // // // // // //                     <div className="flex space-x-2">
// // // // // // //                       <button 
// // // // // // //                         type="button" 
// // // // // // //                         onClick={sendOTP}
// // // // // // //                         disabled={otpLoading}
// // // // // // //                         className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
// // // // // // //                       >
// // // // // // //                         {otpLoading ? "Sending..." : "Send Verification Code"}
// // // // // // //                       </button>
// // // // // // //                     </div>
// // // // // // //                   )}
// // // // // // //                 </>
// // // // // // //               )}
              
// // // // // // //               {otpError && <p className="text-red-500 text-sm mt-2">{otpError}</p>}
// // // // // // //             </div>
// // // // // // //           )}
          
// // // // // // //           <input 
// // // // // // //             type="text" 
// // // // // // //             name="username" 
// // // // // // //             placeholder="Username" 
// // // // // // //             value={formData.username}
// // // // // // //             onChange={handleChange} 
// // // // // // //             required 
// // // // // // //             className="w-full p-2 border rounded" 
// // // // // // //           />
// // // // // // //           <input 
// // // // // // //             type="password" 
// // // // // // //             name="password" 
// // // // // // //             placeholder="Password" 
// // // // // // //             value={formData.password}
// // // // // // //             onChange={handleChange} 
// // // // // // //             required 
// // // // // // //             className="w-full p-2 border rounded" 
// // // // // // //           />
// // // // // // //           <input 
// // // // // // //             type="password" 
// // // // // // //             name="confirmPassword" 
// // // // // // //             placeholder="Confirm Password" 
// // // // // // //             value={formData.confirmPassword}
// // // // // // //             onChange={handleChange} 
// // // // // // //             required 
// // // // // // //             className="w-full p-2 border rounded" 
// // // // // // //           />
// // // // // // //           <input 
// // // // // // //             type="text" 
// // // // // // //             name="contact" 
// // // // // // //             placeholder="Contact" 
// // // // // // //             value={formData.contact}
// // // // // // //             onChange={handleChange} 
// // // // // // //             required 
// // // // // // //             className="w-full p-2 border rounded" 
// // // // // // //           />
// // // // // // //           <input 
// // // // // // //             type="date" 
// // // // // // //             name="dob" 
// // // // // // //             value={formData.dob}
// // // // // // //             onChange={handleChange} 
// // // // // // //             required 
// // // // // // //             className="w-full p-2 border rounded" 
// // // // // // //           />
// // // // // // //           <select 
// // // // // // //             name="gender" 
// // // // // // //             value={formData.gender}
// // // // // // //             onChange={handleChange} 
// // // // // // //             required 
// // // // // // //             className="w-full p-2 border rounded"
// // // // // // //           >
// // // // // // //             <option value="">Select Gender</option>
// // // // // // //             <option value="Male">Male</option>
// // // // // // //             <option value="Female">Female</option>
// // // // // // //             <option value="Other">Other</option>
// // // // // // //           </select>
// // // // // // //           <textarea 
// // // // // // //             name="address" 
// // // // // // //             placeholder="Address" 
// // // // // // //             value={formData.address}
// // // // // // //             onChange={handleChange} 
// // // // // // //             required 
// // // // // // //             className="w-full p-2 border rounded"
// // // // // // //           ></textarea>

// // // // // // //           <div className="flex flex-col items-center">
// // // // // // //             {previewUrl && <img src={previewUrl} alt="Profile Preview" className="w-24 h-24 rounded-full mb-2" />}
// // // // // // //             <label className="cursor-pointer bg-gray-200 px-4 py-2 rounded">
// // // // // // //               Upload Profile Picture
// // // // // // //               <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
// // // // // // //             </label>
// // // // // // //           </div>
          
// // // // // // //           <button 
// // // // // // //             type="submit" 
// // // // // // //             className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600" 
// // // // // // //             disabled={loading || emailExists || (showOtpSection && !otpVerified)}
// // // // // // //           >
// // // // // // //             {loading ? "Registering..." : "Register"}
// // // // // // //           </button>
// // // // // // //         </form>
        
// // // // // // //         <button 
// // // // // // //           onClick={handleGoogleSignIn} 
// // // // // // //           className="mt-4 w-full bg-red-500 text-white p-2 rounded hover:bg-red-600"
// // // // // // //         >
// // // // // // //           Sign in with Google
// // // // // // //         </button>
        
// // // // // // //         <p className="mt-4 text-center text-gray-600">
// // // // // // //           Already have an account? <span className="text-blue-500 cursor-pointer" onClick={() => navigate("/login")}>Login</span>
// // // // // // //         </p>
// // // // // // //       </div>
// // // // // // //     </div>
// // // // // // //   );
// // // // // // // };

// // // // // // // export default Register;




// // // // // // // import React, { useState, useEffect } from "react";
// // // // // // // import { useNavigate } from "react-router-dom";
// // // // // // // import { auth, db, googleProvider } from "./config/firebase";
// // // // // // // import { createUserWithEmailAndPassword, signInWithPopup, fetchSignInMethodsForEmail } from "firebase/auth";
// // // // // // // import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";

// // // // // // // const Register = () => {
// // // // // // //   const navigate = useNavigate();
// // // // // // //   const [formData, setFormData] = useState({
// // // // // // //     email: "",
// // // // // // //     password: "",
// // // // // // //     confirmPassword: "",
// // // // // // //     username: "",
// // // // // // //     contact: "",
// // // // // // //     dob: "",
// // // // // // //     gender: "",
// // // // // // //     address: "",
// // // // // // //     profilePic: null,
// // // // // // //   });

// // // // // // //   const [previewUrl, setPreviewUrl] = useState(null);
// // // // // // //   const [loading, setLoading] = useState(false);
// // // // // // //   const [error, setError] = useState("");
// // // // // // //   const [checkingEmail, setCheckingEmail] = useState(false);
// // // // // // //   const [emailExists, setEmailExists] = useState(false);

// // // // // // //   useEffect(() => {
// // // // // // //     if (auth.currentUser) {
// // // // // // //       navigate("/");
// // // // // // //     }
// // // // // // //   }, [navigate]);

// // // // // // //   const handleChange = (e) => {
// // // // // // //     setFormData({ ...formData, [e.target.name]: e.target.value });
    
// // // // // // //     // Reset email check when email changes
// // // // // // //     if (e.target.name === "email") {
// // // // // // //       setEmailExists(false);
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const handleFileChange = (e) => {
// // // // // // //     const file = e.target.files[0];
// // // // // // //     if (file) {
// // // // // // //       setFormData({ ...formData, profilePic: file });
// // // // // // //       setPreviewUrl(URL.createObjectURL(file));
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const checkEmail = async () => {
// // // // // // //     if (!formData.email) return;
    
// // // // // // //     setCheckingEmail(true);
// // // // // // //     setError("");
    
// // // // // // //     try {
// // // // // // //       // First check with Firebase Authentication
// // // // // // //       const methods = await fetchSignInMethodsForEmail(auth, formData.email);
      
// // // // // // //       // Then check with Firestore in case the email exists in database but not in auth
// // // // // // //       const usersRef = collection(db, "users");
// // // // // // //       const q = query(usersRef, where("email", "==", formData.email));
// // // // // // //       const querySnapshot = await getDocs(q);
      
// // // // // // //       if (methods.length > 0 || !querySnapshot.empty) {
// // // // // // //         setEmailExists(true);
// // // // // // //       } else {
// // // // // // //         setEmailExists(false);
// // // // // // //       }
// // // // // // //     } catch (error) {
// // // // // // //       console.error("Error checking email:", error);
// // // // // // //       // Don't set error message here as it might confuse users during normal email checking
// // // // // // //     } finally {
// // // // // // //       setCheckingEmail(false);
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const uploadToImageKit = async (file) => {
// // // // // // //     if (!file) return "";

// // // // // // //     try {
// // // // // // //       const authResponse = await fetch("http://localhost:5000/auth");
// // // // // // //       const authData = await authResponse.json();

// // // // // // //       const formData = new FormData();
// // // // // // //       formData.append("file", file);
// // // // // // //       formData.append("fileName", file.name);
// // // // // // //       formData.append("publicKey", "public_KoLQpUZM3TZfPrc1If4RUVRgHAw=");
// // // // // // //       formData.append("signature", authData.signature);
// // // // // // //       formData.append("expire", authData.expire);
// // // // // // //       formData.append("token", authData.token);
// // // // // // //       formData.append("folder", "/profile_pictures");

// // // // // // //       const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
// // // // // // //         method: "POST",
// // // // // // //         body: formData,
// // // // // // //       });

// // // // // // //       const result = await response.json();
// // // // // // //       if (!result.url) throw new Error("Upload failed: " + (result.error?.message || "Unknown error"));

// // // // // // //       return result.url;
// // // // // // //     } catch (error) {
// // // // // // //       console.error("Image upload failed:", error);
// // // // // // //       alert("Image upload failed. Check console for details.");
// // // // // // //       return "";
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const handleRegister = async (e) => {
// // // // // // //     e.preventDefault();
    
// // // // // // //     // First check if email exists if we haven't checked yet
// // // // // // //     if (!checkingEmail && !emailExists) {
// // // // // // //       await checkEmail();
      
// // // // // // //       // If we just found out the email exists, stop here and show the message
// // // // // // //       if (emailExists) {
// // // // // // //         return;
// // // // // // //       }
// // // // // // //     }
    
// // // // // // //     if (emailExists) {
// // // // // // //       setError("This email is already registered. Please log in instead.");
// // // // // // //       return;
// // // // // // //     }
    
// // // // // // //     setLoading(true);
// // // // // // //     setError("");

// // // // // // //     if (formData.password !== formData.confirmPassword) {
// // // // // // //       setError("Passwords do not match!");
// // // // // // //       setLoading(false);
// // // // // // //       return;
// // // // // // //     }

// // // // // // //     try {
// // // // // // //       const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
// // // // // // //       const user = userCredential.user;

// // // // // // //       let profilePicUrl = "";
// // // // // // //       if (formData.profilePic) {
// // // // // // //         profilePicUrl = await uploadToImageKit(formData.profilePic);
// // // // // // //       }

// // // // // // //       await setDoc(doc(db, "users", user.uid), {
// // // // // // //         username: formData.username,
// // // // // // //         email: formData.email,
// // // // // // //         contact: formData.contact,
// // // // // // //         dob: formData.dob,
// // // // // // //         gender: formData.gender,
// // // // // // //         address: formData.address,
// // // // // // //         profilePic: profilePicUrl,
// // // // // // //         reg_date: serverTimestamp(),
// // // // // // //         role: "user",
// // // // // // //         status: "new"
// // // // // // //       });

// // // // // // //       alert("User registered successfully!");
// // // // // // //       navigate("/");
// // // // // // //     } catch (error) {
// // // // // // //       console.error("Error registering user", error);
// // // // // // //       setError(error.message);
// // // // // // //     } finally {
// // // // // // //       setLoading(false);
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const handleGoogleSignIn = async () => {
// // // // // // //     try {
// // // // // // //       const result = await signInWithPopup(auth, googleProvider);
// // // // // // //       const user = result.user;

// // // // // // //       await setDoc(doc(db, "users", user.uid), {
// // // // // // //         username: user.displayName,
// // // // // // //         email: user.email,
// // // // // // //         profilePic: user.photoURL,
// // // // // // //         contact: "",
// // // // // // //         dob: "",
// // // // // // //         gender: "",
// // // // // // //         address: "",
// // // // // // //         reg_date: serverTimestamp(),
// // // // // // //         role: "user",
// // // // // // //         status: "new"
// // // // // // //       }, { merge: true });

// // // // // // //       alert("Signed in with Google successfully!");
// // // // // // //       navigate("/");
// // // // // // //     } catch (error) {
// // // // // // //       console.error("Google sign-in error", error);
// // // // // // //       setError(error.message);
// // // // // // //     }
// // // // // // //   };

// // // // // // //   // Add blur event to check email when user moves away from email field
// // // // // // //   const handleEmailBlur = () => {
// // // // // // //     checkEmail();
// // // // // // //   };

// // // // // // //   return (
// // // // // // //     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
// // // // // // //       <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
// // // // // // //         <h2 className="text-2xl font-bold text-center mb-4">Register</h2>
// // // // // // //         {error && <p className="text-red-500 text-center mb-4">{error}</p>}
// // // // // // //         {emailExists && (
// // // // // // //           <div className="bg-yellow-100 text-yellow-700 p-4 rounded mb-4">
// // // // // // //             This email is already registered. Please <span className="underline cursor-pointer" onClick={() => navigate("/login")}>log in</span> instead.
// // // // // // //           </div>
// // // // // // //         )}
        
// // // // // // //         <form onSubmit={handleRegister} className="space-y-4">
// // // // // // //           <div>
// // // // // // //             <input 
// // // // // // //               type="email" 
// // // // // // //               name="email" 
// // // // // // //               placeholder="Email" 
// // // // // // //               value={formData.email}
// // // // // // //               onChange={handleChange} 
// // // // // // //               onBlur={handleEmailBlur}
// // // // // // //               required 
// // // // // // //               className="w-full p-2 border rounded" 
// // // // // // //             />
// // // // // // //             {checkingEmail && <p className="text-sm text-gray-500">Checking email...</p>}
// // // // // // //           </div>
          
// // // // // // //           <input 
// // // // // // //             type="text" 
// // // // // // //             name="username" 
// // // // // // //             placeholder="Username" 
// // // // // // //             value={formData.username}
// // // // // // //             onChange={handleChange} 
// // // // // // //             required 
// // // // // // //             className="w-full p-2 border rounded" 
// // // // // // //           />
// // // // // // //           <input 
// // // // // // //             type="password" 
// // // // // // //             name="password" 
// // // // // // //             placeholder="Password" 
// // // // // // //             value={formData.password}
// // // // // // //             onChange={handleChange} 
// // // // // // //             required 
// // // // // // //             className="w-full p-2 border rounded" 
// // // // // // //           />
// // // // // // //           <input 
// // // // // // //             type="password" 
// // // // // // //             name="confirmPassword" 
// // // // // // //             placeholder="Confirm Password" 
// // // // // // //             value={formData.confirmPassword}
// // // // // // //             onChange={handleChange} 
// // // // // // //             required 
// // // // // // //             className="w-full p-2 border rounded" 
// // // // // // //           />
// // // // // // //           <input 
// // // // // // //             type="text" 
// // // // // // //             name="contact" 
// // // // // // //             placeholder="Contact" 
// // // // // // //             value={formData.contact}
// // // // // // //             onChange={handleChange} 
// // // // // // //             required 
// // // // // // //             className="w-full p-2 border rounded" 
// // // // // // //           />
// // // // // // //           <input 
// // // // // // //             type="date" 
// // // // // // //             name="dob" 
// // // // // // //             value={formData.dob}
// // // // // // //             onChange={handleChange} 
// // // // // // //             required 
// // // // // // //             className="w-full p-2 border rounded" 
// // // // // // //           />
// // // // // // //           <select 
// // // // // // //             name="gender" 
// // // // // // //             value={formData.gender}
// // // // // // //             onChange={handleChange} 
// // // // // // //             required 
// // // // // // //             className="w-full p-2 border rounded"
// // // // // // //           >
// // // // // // //             <option value="">Select Gender</option>
// // // // // // //             <option value="Male">Male</option>
// // // // // // //             <option value="Female">Female</option>
// // // // // // //             <option value="Other">Other</option>
// // // // // // //           </select>
// // // // // // //           <textarea 
// // // // // // //             name="address" 
// // // // // // //             placeholder="Address" 
// // // // // // //             value={formData.address}
// // // // // // //             onChange={handleChange} 
// // // // // // //             required 
// // // // // // //             className="w-full p-2 border rounded"
// // // // // // //           ></textarea>

// // // // // // //           <div className="flex flex-col items-center">
// // // // // // //             {previewUrl && <img src={previewUrl} alt="Profile Preview" className="w-24 h-24 rounded-full mb-2" />}
// // // // // // //             <label className="cursor-pointer bg-gray-200 px-4 py-2 rounded">
// // // // // // //               Upload Profile Picture
// // // // // // //               <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
// // // // // // //             </label>
// // // // // // //           </div>
          
// // // // // // //           <button 
// // // // // // //             type="submit" 
// // // // // // //             className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600" 
// // // // // // //             disabled={loading || emailExists}
// // // // // // //           >
// // // // // // //             {loading ? "Registering..." : "Register"}
// // // // // // //           </button>
// // // // // // //         </form>
        
// // // // // // //         <button 
// // // // // // //           onClick={handleGoogleSignIn} 
// // // // // // //           className="mt-4 w-full bg-red-500 text-white p-2 rounded hover:bg-red-600"
// // // // // // //         >
// // // // // // //           Sign in with Google
// // // // // // //         </button>
        
// // // // // // //         <p className="mt-4 text-center text-gray-600">
// // // // // // //           Already have an account? <span className="text-blue-500 cursor-pointer" onClick={() => navigate("/login")}>Login</span>
// // // // // // //         </p>
// // // // // // //       </div>
// // // // // // //     </div>
// // // // // // //   );
// // // // // // // };

// // // // // // // export default Register;


