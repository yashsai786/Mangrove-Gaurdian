import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, googleProvider, db } from "./config/firebase";
import { signInWithEmailAndPassword, signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const img = 'https://plus.unsplash.com/premium_photo-1661854901998-bcc2d0212780?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (!userDoc.exists()) {
            navigate("/complete-profile");
            setInitializing(false);
            return;
          }
          const userData = userDoc.data();
          if (!userData.contact) {
            navigate("/complete-profile");
          } else if (userData.status === "enabled") {
            if (userData.role === "admin") {
              navigate("/admin");
            } else {
              navigate("/home");
            }
          } else if (userData.status === "new") {
            navigate("/pending-approval");
          } else if (userData.status === "disabled") {
            setError("Your account has been temporarily blocked. Please contact support for assistance.");
            await auth.signOut();
          } else {
            setError("Unable to verify account status. Please contact support.");
            await auth.signOut();
          }
        } catch (error) {
          console.error("Error checking user status:", error);
          setError("Error verifying your account. Please try logging in again.");
        }
      }
      setInitializing(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!formData.password) {
      setError("Password is required");
      return false;
    }
    return true;
  };

  const checkUserStatusAndRedirect = async (user) => {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      navigate("/complete-profile");
      return;
    }
    const userData = userDoc.data();
    if (!userData.contact) {
      navigate("/complete-profile");
      return;
    }
    if (userData.status === "enabled") {
      if (userData.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/home");
      }
    } else if (userData.status === "new") {
      navigate("/pending-approval");
    } else if (userData.status === "disabled") {
      setError("Your account has been temporarily blocked. Please contact support for assistance.");
      auth.signOut();
    } else {
      setError("Unable to verify account status. Please contact support.");
      auth.signOut();
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setError("");
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      await checkUserStatusAndRedirect(userCredential.user);
    } catch (error) {
      console.error("Login error", error);
      switch (error.code) {
        case "auth/user-not-found":
          setError("No account found with this email. Please register first.");
          break;
        case "auth/wrong-password":
          setError("Incorrect password. Please try again.");
          break;
        case "auth/invalid-email":
          setError("Invalid email address format.");
          break;
        case "auth/user-disabled":
          setError("This account has been disabled. Please contact support.");
          break;
        case "auth/too-many-requests":
          setError("Too many failed login attempts. Please try again later.");
          break;
        case "auth/invalid-credential":
          setError("Invalid login credentials. Please check and try again.");
          break;
        default:
          setError("Login failed. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await checkUserStatusAndRedirect(result.user);
    } catch (error) {
      console.error("Google sign-in error", error);
      switch (error.code) {
        case "auth/popup-closed-by-user":
          setError("Sign-in cancelled. Please try again.");
          break;
        case "auth/popup-blocked":
          setError("Pop-up blocked by browser. Please allow pop-ups for this site.");
          break;
        case "auth/account-exists-with-different-credential":
          setError("An account already exists with the same email but different sign-in credentials.");
          break;
        default:
          setError("Google sign-in failed. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="h-screen w-full flex justify-center items-center bg-gray-100">
        <div className="text-green-600 font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <div 
      style={{ 
        backgroundImage: `url(${img})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        height: '100vh',
        width: '100%',
        position: 'relative'
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
          padding: '1rem'
        }}
      >
        <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg w-full max-w-md">
          <h2 className="text-2xl font-bold text-center mb-6 text-green-600">Login to Mangrove Guardian</h2>
          
          {error && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              <p>{error}</p>
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input 
                type="email" 
                id="email"
                name="email" 
                placeholder="Enter your email" 
                value={formData.email}
                onChange={handleChange} 
                className="w-full p-2 border rounded focus:ring-green-500 focus:border-green-500" 
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input 
                type="password" 
                id="password"
                name="password" 
                placeholder="Enter your password" 
                value={formData.password}
                onChange={handleChange} 
                className="w-full p-2 border rounded focus:ring-green-500 focus:border-green-500" 
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className={`w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          
          <div className="my-4 flex items-center justify-center">
            <div className="border-t border-gray-300 flex-grow mr-3"></div>
            <span className="text-gray-500 text-sm">OR</span>
            <div className="border-t border-gray-300 flex-grow ml-3"></div>
          </div>
          
          <button 
            onClick={handleGoogleSignIn} 
            disabled={loading}
            className={`flex items-center justify-center w-full bg-white text-gray-700 border border-gray-300 p-2 rounded hover:bg-gray-50 transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
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
          
          <div className="text-center mt-6">
            <p className="text-sm md:text-base">Don't have an account? <span className="text-green-600 cursor-pointer font-semibold" onClick={() => navigate("/register")}>Register here</span></p>
            <p className="mt-2 text-sm text-gray-600">
              <span className="cursor-pointer hover:text-green-400" onClick={() => navigate("/forgot-password")}>Forgot password?</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;



// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { auth, googleProvider, db } from "./config/firebase";
// import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
// import { doc, getDoc } from "firebase/firestore";

// const Login = () => {
//   const navigate = useNavigate();
//   const [formData, setFormData] = useState({
//     email: "",
//     password: "",
//   });
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);
//   const img = 'https://od.lk/s/OV8yNDk0MzM4ODVf/login.jpg';

//   const handleChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//     if (error) setError("");
//   };

//   const validateForm = () => {
//     if (!formData.email.trim()) {
//       setError("Email is required");
//       return false;
//     }
//     if (!formData.password) {
//       setError("Password is required");
//       return false;
//     }
//     return true;
//   };

//   const checkUserStatusAndRedirect = async (user) => {
//     const userDoc = await getDoc(doc(db, "users", user.uid));
    
//     if (!userDoc.exists()) {
//       navigate("/complete-profile");
//       return;
//     }
    
//     const userData = userDoc.data();
    
//     if (!userData.contact) {
//       navigate("/complete-profile");
//       return;
//     }
    
//     if (userData.status === "enabled") {
//       if (userData.role === "admin") {
//         navigate("/admin");
//       } else {
//         navigate("/home");
//       }
//     } else if (userData.status === "new") {
//       navigate("/pending-approval");
//     } else if (userData.status === "disabled") {
//       setError("Your account has been temporarily blocked. Please contact support for assistance.");
//       auth.signOut();
//     } else {
//       setError("Unable to verify account status. Please contact support.");
//       auth.signOut();
//     }
//   };

//   const handleLogin = async (e) => {
//     e.preventDefault();
//     if (!validateForm()) return;
    
//     setLoading(true);
//     setError("");
    
//     try {
//       const userCredential = await signInWithEmailAndPassword(
//         auth, 
//         formData.email, 
//         formData.password
//       );
//       await checkUserStatusAndRedirect(userCredential.user);
//     } catch (error) {
//       console.error("Login error", error);
      
//       switch (error.code) {
//         case "auth/user-not-found":
//           setError("No account found with this email. Please register first.");
//           break;
//         case "auth/wrong-password":
//           setError("Incorrect password. Please try again.");
//           break;
//         case "auth/invalid-email":
//           setError("Invalid email address format.");
//           break;
//         case "auth/user-disabled":
//           setError("This account has been disabled. Please contact support.");
//           break;
//         case "auth/too-many-requests":
//           setError("Too many failed login attempts. Please try again later.");
//           break;
//         case "auth/invalid-credential":
//           setError("Invalid login credentials. Please check and try again.");
//           break;
//         default:
//           setError("Login failed. Please try again later.");
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleGoogleSignIn = async () => {
//     setLoading(true);
//     setError("");
    
//     try {
//       const result = await signInWithPopup(auth, googleProvider);
//       await checkUserStatusAndRedirect(result.user);
//     } catch (error) {
//       console.error("Google sign-in error", error);
      
//       switch (error.code) {
//         case "auth/popup-closed-by-user":
//           setError("Sign-in cancelled. Please try again.");
//           break;
//         case "auth/popup-blocked":
//           setError("Pop-up blocked by browser. Please allow pop-ups for this site.");
//           break;
//         case "auth/account-exists-with-different-credential":
//           setError("An account already exists with the same email but different sign-in credentials.");
//           break;
//         default:
//           setError("Google sign-in failed. Please try again later.");
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div 
//       style={{ 
//         backgroundImage: `url(${img})`,
//         backgroundSize: 'cover',
//         backgroundPosition: 'center',
//         backgroundRepeat: 'no-repeat',
//         height: '100vh',
//         width: '100%',
//         position: 'relative'
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
//           padding: '1rem'
//         }}
//       >
//         <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg w-full max-w-md">
//           <h2 className="text-2xl font-bold text-center mb-6 text-red-600">Login to Crime Alert</h2>
          
//           {error && (
//             <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
//               <p>{error}</p>
//             </div>
//           )}
          
//           <form onSubmit={handleLogin} className="space-y-4">
//             <div>
//               <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
//               <input 
//                 type="email" 
//                 id="email"
//                 name="email" 
//                 placeholder="Enter your email" 
//                 value={formData.email}
//                 onChange={handleChange} 
//                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
//               />
//             </div>
            
//             <div>
//               <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
//               <input 
//                 type="password" 
//                 id="password"
//                 name="password" 
//                 placeholder="Enter your password" 
//                 value={formData.password}
//                 onChange={handleChange} 
//                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
//               />
//             </div>
            
//             <button 
//               type="submit" 
//               disabled={loading}
//               className={`w-full bg-red-600 text-white p-2 rounded hover:bg-red-700 transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
//             >
//               {loading ? 'Logging in...' : 'Login'}
//             </button>
//           </form>
          
//           <div className="my-4 flex items-center justify-center">
//             <div className="border-t border-gray-300 flex-grow mr-3"></div>
//             <span className="text-gray-500 text-sm">OR</span>
//             <div className="border-t border-gray-300 flex-grow ml-3"></div>
//           </div>
          
//           <button 
//             onClick={handleGoogleSignIn} 
//             disabled={loading}
//             className={`flex items-center justify-center w-full bg-white text-gray-700 border border-gray-300 p-2 rounded hover:bg-gray-50 transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
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
          
//           <div className="text-center mt-6">
//             <p className="text-sm md:text-base">Don't have an account? <span className="text-red-600 cursor-pointer font-semibold" onClick={() => navigate("/register")}>Register here</span></p>
//             <p className="mt-2 text-sm text-gray-600">
//               <span className="cursor-pointer hover:text-red-600" onClick={() => navigate("/forgot-password")}>Forgot password?</span>
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Login;


// // import React, { useState } from "react";
// // import { useNavigate } from "react-router-dom";
// // import { auth, googleProvider, db } from "./config/firebase";
// // import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
// // import { doc, getDoc } from "firebase/firestore";

// // const Login = () => {
// //   const navigate = useNavigate();
// //   const [formData, setFormData] = useState({
// //     email: "",
// //     password: "",
// //   });
// //   const [error, setError] = useState("");
// //   const [loading, setLoading] = useState(false);

// //   const handleChange = (e) => {
// //     setFormData({ ...formData, [e.target.name]: e.target.value });
// //     // Clear error when user starts typing
// //     if (error) setError("");
// //   };

// //   const validateForm = () => {
// //     if (!formData.email.trim()) {
// //       setError("Email is required");
// //       return false;
// //     }
// //     if (!formData.password) {
// //       setError("Password is required");
// //       return false;
// //     }
// //     return true;
// //   };

// //   // Function to check user status and redirect accordingly
// //   const checkUserStatusAndRedirect = async (user) => {
// //     // Check user's role, profile completion status, and account status
// //     const userDoc = await getDoc(doc(db, "users", user.uid));
    
// //     if (!userDoc.exists()) {
// //       navigate("/complete-profile");
// //       return;
// //     }
    
// //     const userData = userDoc.data();
    
// //     // Check if profile is incomplete
// //     if (!userData.contact) {
// //       navigate("/complete-profile");
// //       return;
// //     }
    
// //     // Check user status
// //     if (userData.status === "enabled") {
// //       // User is approved and active
// //       if (userData.role === "admin") {
// //         navigate("/admin");
// //       } else {
// //         navigate("/home"); // Regular user dashboard
// //       }
// //     } else if (userData.status === "new") {
// //       // User is new and not yet approved
// //       navigate("/pending-approval");
// //     } else if (userData.status === "disabled") {
// //       // User account is blocked/disabled
// //       setError("Your account has been temporarily blocked. Please contact support for assistance.");
// //       // Sign out the user since they shouldn't remain logged in
// //       auth.signOut();
// //     } else {
// //       // Fallback for any other status
// //       setError("Unable to verify account status. Please contact support.");
// //       auth.signOut();
// //     }
// //   };

// //   const handleLogin = async (e) => {
// //     e.preventDefault();
// //     if (!validateForm()) return;
    
// //     setLoading(true);
// //     setError("");
    
// //     try {
// //       const userCredential = await signInWithEmailAndPassword(
// //         auth, 
// //         formData.email, 
// //         formData.password
// //       );
// //       const user = userCredential.user;

// //       await checkUserStatusAndRedirect(user);
      
// //     } catch (error) {
// //       console.error("Login error", error);
      
// //       // Handle specific Firebase Auth errors
// //       switch (error.code) {
// //         case "auth/user-not-found":
// //           setError("No account found with this email. Please register first.");
// //           break;
// //         case "auth/wrong-password":
// //           setError("Incorrect password. Please try again.");
// //           break;
// //         case "auth/invalid-email":
// //           setError("Invalid email address format.");
// //           break;
// //         case "auth/user-disabled":
// //           setError("This account has been disabled. Please contact support.");
// //           break;
// //         case "auth/too-many-requests":
// //           setError("Too many failed login attempts. Please try again later.");
// //           break;
// //         case "auth/invalid-credential":
// //           setError("Invalid login credentials. Please check and try again.");
// //           break;
// //         default:
// //           setError("Login failed. Please try again later.");
// //       }
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const handleGoogleSignIn = async () => {
// //     setLoading(true);
// //     setError("");
    
// //     try {
// //       const result = await signInWithPopup(auth, googleProvider);
// //       const user = result.user;

// //       await checkUserStatusAndRedirect(user);
      
// //     } catch (error) {
// //       console.error("Google sign-in error", error);
      
// //       // Handle specific Google sign-in errors
// //       switch (error.code) {
// //         case "auth/popup-closed-by-user":
// //           setError("Sign-in cancelled. Please try again.");
// //           break;
// //         case "auth/popup-blocked":
// //           setError("Pop-up blocked by browser. Please allow pop-ups for this site.");
// //           break;
// //         case "auth/account-exists-with-different-credential":
// //           setError("An account already exists with the same email but different sign-in credentials.");
// //           break;
// //         default:
// //           setError("Google sign-in failed. Please try again later.");
// //       }
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   return (
// //     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 pt-16">
// //       <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
// //         <h2 className="text-2xl font-bold text-center mb-4 text-red-600">Login to Crime Alert</h2>
        
// //         {error && (
// //           <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
// //             <p>{error}</p>
// //           </div>
// //         )}
        
// //         <form onSubmit={handleLogin} className="space-y-4">
// //           <div>
// //             <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
// //             <input 
// //               type="email" 
// //               id="email"
// //               name="email" 
// //               placeholder="Enter your email" 
// //               value={formData.email}
// //               onChange={handleChange} 
// //               className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// //             />
// //           </div>
          
// //           <div>
// //             <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
// //             <input 
// //               type="password" 
// //               id="password"
// //               name="password" 
// //               placeholder="Enter your password" 
// //               value={formData.password}
// //               onChange={handleChange} 
// //               className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// //             />
// //           </div>
          
// //           <button 
// //             type="submit" 
// //             disabled={loading}
// //             className={`w-full bg-red-600 text-white p-2 rounded hover:bg-red-700 transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
// //           >
// //             {loading ? 'Logging in...' : 'Login'}
// //           </button>
// //         </form>
        
// //         <div className="my-4 flex items-center justify-center">
// //           <div className="border-t border-gray-300 flex-grow mr-3"></div>
// //           <span className="text-gray-500 text-sm">OR</span>
// //           <div className="border-t border-gray-300 flex-grow ml-3"></div>
// //         </div>
        
// //         <button 
// //           onClick={handleGoogleSignIn} 
// //           disabled={loading}
// //           className={`flex items-center justify-center w-full bg-white text-gray-700 border border-gray-300 p-2 rounded hover:bg-gray-50 transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
// //         >
// //           <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
// //             <path
// //               fill="#4285F4"
// //               d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
// //             />
// //             <path
// //               fill="#34A853"
// //               d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
// //             />
// //             <path
// //               fill="#FBBC05"
// //               d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
// //             />
// //             <path
// //               fill="#EA4335"
// //               d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
// //             />
// //           </svg>
// //           Sign in with Google
// //         </button>
        
// //         <div className="text-center mt-6">
// //           <p>Don't have an account? <span className="text-red-600 cursor-pointer font-semibold" onClick={() => navigate("/register")}>Register here</span></p>
// //           <p className="mt-2 text-sm text-gray-600">
// //             <span className="cursor-pointer hover:text-red-600" onClick={() => navigate("/forgot-password")}>Forgot password?</span>
// //           </p>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // };

// // export default Login;



// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { auth, googleProvider, db } from "./config/firebase";
// import { signInWithEmailAndPassword, signInWithPopup, onAuthStateChanged } from "firebase/auth";
// import { doc, getDoc } from "firebase/firestore";

// const Login = () => {
//   const navigate = useNavigate();
//   const [formData, setFormData] = useState({
//     email: "",
//     password: "",
//   });
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [initializing, setInitializing] = useState(true);
//   const img = 'https://od.lk/s/OV8yNDk0MzM4ODVf/login.jpg';

//   // Check if user is already logged in when component mounts
//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, async (user) => {
//       if (user) {
//         // User is already signed in, check their status and redirect
//         try {
//           const userDoc = await getDoc(doc(db, "users", user.uid));
          
//           if (!userDoc.exists()) {
//             // User exists in Firebase Auth but not in Firestore
//             navigate("/complete-profile");
//             setInitializing(false);
//             return;
//           }
          
//           const userData = userDoc.data();
          
//           // Check if profile is complete
//           if (!userData.contact) {
//             navigate("/complete-profile");
//           } 
//           // Check user status
//           else if (userData.status === "enabled") {
//             // Only redirect enabled users
//             if (userData.role === "admin") {
//               navigate("/admin");
//             } else {
//               navigate("/home");
//             }
//           } 
//           else if (userData.status === "new") {
//             navigate("/pending-approval");
//           }
//           else if (userData.status === "disabled") {
//             // For disabled users, sign them out and show error message
//             setError("Your account has been temporarily blocked. Please contact support for assistance.");
//             await auth.signOut();
//           }
//           else {
//             // For unknown status, sign them out
//             setError("Unable to verify account status. Please contact support.");
//             await auth.signOut();
//           }
//         } catch (error) {
//           console.error("Error checking user status:", error);
//           setError("Error verifying your account. Please try logging in again.");
//         }
//       }
//       setInitializing(false);
//     });

//     // Cleanup subscription on unmount
//     return () => unsubscribe();
//   }, [navigate]);

//   const handleChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//     if (error) setError("");
//   };

//   const validateForm = () => {
//     if (!formData.email.trim()) {
//       setError("Email is required");
//       return false;
//     }
//     if (!formData.password) {
//       setError("Password is required");
//       return false;
//     }
//     return true;
//   };

//   const checkUserStatusAndRedirect = async (user) => {
//     const userDoc = await getDoc(doc(db, "users", user.uid));
    
//     if (!userDoc.exists()) {
//       navigate("/complete-profile");
//       return;
//     }
    
//     const userData = userDoc.data();
    
//     if (!userData.contact) {
//       navigate("/complete-profile");
//       return;
//     }
    
//     if (userData.status === "enabled") {
//       if (userData.role === "admin") {
//         navigate("/admin");
//       } else {
//         navigate("/home");
//       }
//     } else if (userData.status === "new") {
//       navigate("/pending-approval");
//     } else if (userData.status === "disabled") {
//       setError("Your account has been temporarily blocked. Please contact support for assistance.");
//       auth.signOut();
//     } else {
//       setError("Unable to verify account status. Please contact support.");
//       auth.signOut();
//     }
//   };

//   const handleLogin = async (e) => {
//     e.preventDefault();
//     if (!validateForm()) return;
    
//     setLoading(true);
//     setError("");
    
//     try {
//       const userCredential = await signInWithEmailAndPassword(
//         auth, 
//         formData.email, 
//         formData.password
//       );
//       await checkUserStatusAndRedirect(userCredential.user);
//     } catch (error) {
//       console.error("Login error", error);
      
//       switch (error.code) {
//         case "auth/user-not-found":
//           setError("No account found with this email. Please register first.");
//           break;
//         case "auth/wrong-password":
//           setError("Incorrect password. Please try again.");
//           break;
//         case "auth/invalid-email":
//           setError("Invalid email address format.");
//           break;
//         case "auth/user-disabled":
//           setError("This account has been disabled. Please contact support.");
//           break;
//         case "auth/too-many-requests":
//           setError("Too many failed login attempts. Please try again later.");
//           break;
//         case "auth/invalid-credential":
//           setError("Invalid login credentials. Please check and try again.");
//           break;
//         default:
//           setError("Login failed. Please try again later.");
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleGoogleSignIn = async () => {
//     setLoading(true);
//     setError("");
    
//     try {
//       const result = await signInWithPopup(auth, googleProvider);
//       await checkUserStatusAndRedirect(result.user);
//     } catch (error) {
//       console.error("Google sign-in error", error);
      
//       switch (error.code) {
//         case "auth/popup-closed-by-user":
//           setError("Sign-in cancelled. Please try again.");
//           break;
//         case "auth/popup-blocked":
//           setError("Pop-up blocked by browser. Please allow pop-ups for this site.");
//           break;
//         case "auth/account-exists-with-different-credential":
//           setError("An account already exists with the same email but different sign-in credentials.");
//           break;
//         default:
//           setError("Google sign-in failed. Please try again later.");
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Show loading indicator while checking authentication state
//   if (initializing) {
//     return (
//       <div className="h-screen w-full flex justify-center items-center bg-gray-100">
//         <div className="text-red-600 font-semibold">Loading...</div>
//       </div>
//     );
//   }

//   return (
//     <div 
//       style={{ 
//         backgroundImage: `url(${img})`,
//         backgroundSize: 'cover',
//         backgroundPosition: 'center',
//         backgroundRepeat: 'no-repeat',
//         height: '100vh',
//         width: '100%',
//         position: 'relative'
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
//           padding: '1rem'
//         }}
//       >
//         <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg w-full max-w-md">
//           <h2 className="text-2xl font-bold text-center mb-6 text-red-600">Login to Crime Alert</h2>
          
//           {error && (
//             <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
//               <p>{error}</p>
//             </div>
//           )}
          
//           <form onSubmit={handleLogin} className="space-y-4">
//             <div>
//               <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
//               <input 
//                 type="email" 
//                 id="email"
//                 name="email" 
//                 placeholder="Enter your email" 
//                 value={formData.email}
//                 onChange={handleChange} 
//                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
//               />
//             </div>
            
//             <div>
//               <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
//               <input 
//                 type="password" 
//                 id="password"
//                 name="password" 
//                 placeholder="Enter your password" 
//                 value={formData.password}
//                 onChange={handleChange} 
//                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
//               />
//             </div>
            
//             <button 
//               type="submit" 
//               disabled={loading}
//               className={`w-full bg-red-600 text-white p-2 rounded hover:bg-red-700 transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
//             >
//               {loading ? 'Logging in...' : 'Login'}
//             </button>
//           </form>
          
//           <div className="my-4 flex items-center justify-center">
//             <div className="border-t border-gray-300 flex-grow mr-3"></div>
//             <span className="text-gray-500 text-sm">OR</span>
//             <div className="border-t border-gray-300 flex-grow ml-3"></div>
//           </div>
          
//           <button 
//             onClick={handleGoogleSignIn} 
//             disabled={loading}
//             className={`flex items-center justify-center w-full bg-white text-gray-700 border border-gray-300 p-2 rounded hover:bg-gray-50 transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
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
          
//           <div className="text-center mt-6">
//             <p className="text-sm md:text-base">Don't have an account? <span className="text-red-600 cursor-pointer font-semibold" onClick={() => navigate("/register")}>Register here</span></p>
//             <p className="mt-2 text-sm text-gray-600">
//               <span className="cursor-pointer hover:text-red-600" onClick={() => navigate("/forgot-password")}>Forgot password?</span>
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Login;



// // import React, { useState } from "react";
// // import { useNavigate } from "react-router-dom";
// // import { auth, googleProvider, db } from "./config/firebase";
// // import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
// // import { doc, getDoc } from "firebase/firestore";

// // const Login = () => {
// //   const navigate = useNavigate();
// //   const [formData, setFormData] = useState({
// //     email: "",
// //     password: "",
// //   });
// //   const [error, setError] = useState("");
// //   const [loading, setLoading] = useState(false);
// //   const img = 'https://od.lk/s/OV8yNDk0MzM4ODVf/login.jpg';

// //   const handleChange = (e) => {
// //     setFormData({ ...formData, [e.target.name]: e.target.value });
// //     if (error) setError("");
// //   };

// //   const validateForm = () => {
// //     if (!formData.email.trim()) {
// //       setError("Email is required");
// //       return false;
// //     }
// //     if (!formData.password) {
// //       setError("Password is required");
// //       return false;
// //     }
// //     return true;
// //   };

// //   const checkUserStatusAndRedirect = async (user) => {
// //     const userDoc = await getDoc(doc(db, "users", user.uid));
    
// //     if (!userDoc.exists()) {
// //       navigate("/complete-profile");
// //       return;
// //     }
    
// //     const userData = userDoc.data();
    
// //     if (!userData.contact) {
// //       navigate("/complete-profile");
// //       return;
// //     }
    
// //     if (userData.status === "enabled") {
// //       if (userData.role === "admin") {
// //         navigate("/admin");
// //       } else {
// //         navigate("/home");
// //       }
// //     } else if (userData.status === "new") {
// //       navigate("/pending-approval");
// //     } else if (userData.status === "disabled") {
// //       setError("Your account has been temporarily blocked. Please contact support for assistance.");
// //       auth.signOut();
// //     } else {
// //       setError("Unable to verify account status. Please contact support.");
// //       auth.signOut();
// //     }
// //   };

// //   const handleLogin = async (e) => {
// //     e.preventDefault();
// //     if (!validateForm()) return;
    
// //     setLoading(true);
// //     setError("");
    
// //     try {
// //       const userCredential = await signInWithEmailAndPassword(
// //         auth, 
// //         formData.email, 
// //         formData.password
// //       );
// //       await checkUserStatusAndRedirect(userCredential.user);
// //     } catch (error) {
// //       console.error("Login error", error);
      
// //       switch (error.code) {
// //         case "auth/user-not-found":
// //           setError("No account found with this email. Please register first.");
// //           break;
// //         case "auth/wrong-password":
// //           setError("Incorrect password. Please try again.");
// //           break;
// //         case "auth/invalid-email":
// //           setError("Invalid email address format.");
// //           break;
// //         case "auth/user-disabled":
// //           setError("This account has been disabled. Please contact support.");
// //           break;
// //         case "auth/too-many-requests":
// //           setError("Too many failed login attempts. Please try again later.");
// //           break;
// //         case "auth/invalid-credential":
// //           setError("Invalid login credentials. Please check and try again.");
// //           break;
// //         default:
// //           setError("Login failed. Please try again later.");
// //       }
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const handleGoogleSignIn = async () => {
// //     setLoading(true);
// //     setError("");
    
// //     try {
// //       const result = await signInWithPopup(auth, googleProvider);
// //       await checkUserStatusAndRedirect(result.user);
// //     } catch (error) {
// //       console.error("Google sign-in error", error);
      
// //       switch (error.code) {
// //         case "auth/popup-closed-by-user":
// //           setError("Sign-in cancelled. Please try again.");
// //           break;
// //         case "auth/popup-blocked":
// //           setError("Pop-up blocked by browser. Please allow pop-ups for this site.");
// //           break;
// //         case "auth/account-exists-with-different-credential":
// //           setError("An account already exists with the same email but different sign-in credentials.");
// //           break;
// //         default:
// //           setError("Google sign-in failed. Please try again later.");
// //       }
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   return (
// //     <div 
// //       style={{ 
// //         backgroundImage: `url(${img})`,
// //         backgroundSize: 'cover',
// //         backgroundPosition: 'center',
// //         backgroundRepeat: 'no-repeat',
// //         height: '100vh',
// //         width: '100%',
// //         position: 'relative'
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
// //           padding: '1rem'
// //         }}
// //       >
// //         <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg w-full max-w-md">
// //           <h2 className="text-2xl font-bold text-center mb-6 text-red-600">Login to Crime Alert</h2>
          
// //           {error && (
// //             <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
// //               <p>{error}</p>
// //             </div>
// //           )}
          
// //           <form onSubmit={handleLogin} className="space-y-4">
// //             <div>
// //               <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
// //               <input 
// //                 type="email" 
// //                 id="email"
// //                 name="email" 
// //                 placeholder="Enter your email" 
// //                 value={formData.email}
// //                 onChange={handleChange} 
// //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// //               />
// //             </div>
            
// //             <div>
// //               <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
// //               <input 
// //                 type="password" 
// //                 id="password"
// //                 name="password" 
// //                 placeholder="Enter your password" 
// //                 value={formData.password}
// //                 onChange={handleChange} 
// //                 className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// //               />
// //             </div>
            
// //             <button 
// //               type="submit" 
// //               disabled={loading}
// //               className={`w-full bg-red-600 text-white p-2 rounded hover:bg-red-700 transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
// //             >
// //               {loading ? 'Logging in...' : 'Login'}
// //             </button>
// //           </form>
          
// //           <div className="my-4 flex items-center justify-center">
// //             <div className="border-t border-gray-300 flex-grow mr-3"></div>
// //             <span className="text-gray-500 text-sm">OR</span>
// //             <div className="border-t border-gray-300 flex-grow ml-3"></div>
// //           </div>
          
// //           <button 
// //             onClick={handleGoogleSignIn} 
// //             disabled={loading}
// //             className={`flex items-center justify-center w-full bg-white text-gray-700 border border-gray-300 p-2 rounded hover:bg-gray-50 transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
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
          
// //           <div className="text-center mt-6">
// //             <p className="text-sm md:text-base">Don't have an account? <span className="text-red-600 cursor-pointer font-semibold" onClick={() => navigate("/register")}>Register here</span></p>
// //             <p className="mt-2 text-sm text-gray-600">
// //               <span className="cursor-pointer hover:text-red-600" onClick={() => navigate("/forgot-password")}>Forgot password?</span>
// //             </p>
// //           </div>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // };

// // export default Login;


// // // import React, { useState } from "react";
// // // import { useNavigate } from "react-router-dom";
// // // import { auth, googleProvider, db } from "./config/firebase";
// // // import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
// // // import { doc, getDoc } from "firebase/firestore";

// // // const Login = () => {
// // //   const navigate = useNavigate();
// // //   const [formData, setFormData] = useState({
// // //     email: "",
// // //     password: "",
// // //   });
// // //   const [error, setError] = useState("");
// // //   const [loading, setLoading] = useState(false);

// // //   const handleChange = (e) => {
// // //     setFormData({ ...formData, [e.target.name]: e.target.value });
// // //     // Clear error when user starts typing
// // //     if (error) setError("");
// // //   };

// // //   const validateForm = () => {
// // //     if (!formData.email.trim()) {
// // //       setError("Email is required");
// // //       return false;
// // //     }
// // //     if (!formData.password) {
// // //       setError("Password is required");
// // //       return false;
// // //     }
// // //     return true;
// // //   };

// // //   // Function to check user status and redirect accordingly
// // //   const checkUserStatusAndRedirect = async (user) => {
// // //     // Check user's role, profile completion status, and account status
// // //     const userDoc = await getDoc(doc(db, "users", user.uid));
    
// // //     if (!userDoc.exists()) {
// // //       navigate("/complete-profile");
// // //       return;
// // //     }
    
// // //     const userData = userDoc.data();
    
// // //     // Check if profile is incomplete
// // //     if (!userData.contact) {
// // //       navigate("/complete-profile");
// // //       return;
// // //     }
    
// // //     // Check user status
// // //     if (userData.status === "enabled") {
// // //       // User is approved and active
// // //       if (userData.role === "admin") {
// // //         navigate("/admin");
// // //       } else {
// // //         navigate("/home"); // Regular user dashboard
// // //       }
// // //     } else if (userData.status === "new") {
// // //       // User is new and not yet approved
// // //       navigate("/pending-approval");
// // //     } else if (userData.status === "disabled") {
// // //       // User account is blocked/disabled
// // //       setError("Your account has been temporarily blocked. Please contact support for assistance.");
// // //       // Sign out the user since they shouldn't remain logged in
// // //       auth.signOut();
// // //     } else {
// // //       // Fallback for any other status
// // //       setError("Unable to verify account status. Please contact support.");
// // //       auth.signOut();
// // //     }
// // //   };

// // //   const handleLogin = async (e) => {
// // //     e.preventDefault();
// // //     if (!validateForm()) return;
    
// // //     setLoading(true);
// // //     setError("");
    
// // //     try {
// // //       const userCredential = await signInWithEmailAndPassword(
// // //         auth, 
// // //         formData.email, 
// // //         formData.password
// // //       );
// // //       const user = userCredential.user;

// // //       await checkUserStatusAndRedirect(user);
      
// // //     } catch (error) {
// // //       console.error("Login error", error);
      
// // //       // Handle specific Firebase Auth errors
// // //       switch (error.code) {
// // //         case "auth/user-not-found":
// // //           setError("No account found with this email. Please register first.");
// // //           break;
// // //         case "auth/wrong-password":
// // //           setError("Incorrect password. Please try again.");
// // //           break;
// // //         case "auth/invalid-email":
// // //           setError("Invalid email address format.");
// // //           break;
// // //         case "auth/user-disabled":
// // //           setError("This account has been disabled. Please contact support.");
// // //           break;
// // //         case "auth/too-many-requests":
// // //           setError("Too many failed login attempts. Please try again later.");
// // //           break;
// // //         case "auth/invalid-credential":
// // //           setError("Invalid login credentials. Please check and try again.");
// // //           break;
// // //         default:
// // //           setError("Login failed. Please try again later.");
// // //       }
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   };

// // //   const handleGoogleSignIn = async () => {
// // //     setLoading(true);
// // //     setError("");
    
// // //     try {
// // //       const result = await signInWithPopup(auth, googleProvider);
// // //       const user = result.user;

// // //       await checkUserStatusAndRedirect(user);
      
// // //     } catch (error) {
// // //       console.error("Google sign-in error", error);
      
// // //       // Handle specific Google sign-in errors
// // //       switch (error.code) {
// // //         case "auth/popup-closed-by-user":
// // //           setError("Sign-in cancelled. Please try again.");
// // //           break;
// // //         case "auth/popup-blocked":
// // //           setError("Pop-up blocked by browser. Please allow pop-ups for this site.");
// // //           break;
// // //         case "auth/account-exists-with-different-credential":
// // //           setError("An account already exists with the same email but different sign-in credentials.");
// // //           break;
// // //         default:
// // //           setError("Google sign-in failed. Please try again later.");
// // //       }
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   };

// // //   return (
// // //     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 pt-16">
// // //       <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
// // //         <h2 className="text-2xl font-bold text-center mb-4 text-red-600">Login to Crime Alert</h2>
        
// // //         {error && (
// // //           <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
// // //             <p>{error}</p>
// // //           </div>
// // //         )}
        
// // //         <form onSubmit={handleLogin} className="space-y-4">
// // //           <div>
// // //             <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
// // //             <input 
// // //               type="email" 
// // //               id="email"
// // //               name="email" 
// // //               placeholder="Enter your email" 
// // //               value={formData.email}
// // //               onChange={handleChange} 
// // //               className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// // //             />
// // //           </div>
          
// // //           <div>
// // //             <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
// // //             <input 
// // //               type="password" 
// // //               id="password"
// // //               name="password" 
// // //               placeholder="Enter your password" 
// // //               value={formData.password}
// // //               onChange={handleChange} 
// // //               className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500" 
// // //             />
// // //           </div>
          
// // //           <button 
// // //             type="submit" 
// // //             disabled={loading}
// // //             className={`w-full bg-red-600 text-white p-2 rounded hover:bg-red-700 transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
// // //           >
// // //             {loading ? 'Logging in...' : 'Login'}
// // //           </button>
// // //         </form>
        
// // //         <div className="my-4 flex items-center justify-center">
// // //           <div className="border-t border-gray-300 flex-grow mr-3"></div>
// // //           <span className="text-gray-500 text-sm">OR</span>
// // //           <div className="border-t border-gray-300 flex-grow ml-3"></div>
// // //         </div>
        
// // //         <button 
// // //           onClick={handleGoogleSignIn} 
// // //           disabled={loading}
// // //           className={`flex items-center justify-center w-full bg-white text-gray-700 border border-gray-300 p-2 rounded hover:bg-gray-50 transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
// // //         >
// // //           <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
// // //             <path
// // //               fill="#4285F4"
// // //               d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
// // //             />
// // //             <path
// // //               fill="#34A853"
// // //               d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
// // //             />
// // //             <path
// // //               fill="#FBBC05"
// // //               d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
// // //             />
// // //             <path
// // //               fill="#EA4335"
// // //               d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
// // //             />
// // //           </svg>
// // //           Sign in with Google
// // //         </button>
        
// // //         <div className="text-center mt-6">
// // //           <p>Don't have an account? <span className="text-red-600 cursor-pointer font-semibold" onClick={() => navigate("/register")}>Register here</span></p>
// // //           <p className="mt-2 text-sm text-gray-600">
// // //             <span className="cursor-pointer hover:text-red-600" onClick={() => navigate("/forgot-password")}>Forgot password?</span>
// // //           </p>
// // //         </div>
// // //       </div>
// // //     </div>
// // //   );
// // // };

// // // export default Login;

