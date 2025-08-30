import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { auth, db } from "./config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AdminRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [timer, setTimer] = useState(10);
  const [isMobile, setIsMobile] = useState(false);
  const [redirect, setRedirect] = useState(false);
  
  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      setIsMobile(mobileRegex.test(userAgent) || window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  useEffect(() => {
    // Skip auth check if on mobile
    if (isMobile) {
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      // User is authenticated
      setIsAuthenticated(true);

      try {
        // Check if user has admin role
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        
        if (userData && userData.role === "admin") {
          setIsAdmin(true);
        } else {
          setShowAccessDenied(true);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setShowAccessDenied(true);
      } finally {
        setLoading(false);
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [isMobile]);
  
  // Timer effect for access denied and mobile views
  useEffect(() => {
    let interval;
    
    if ((showAccessDenied || isMobile) && timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    } else if ((showAccessDenied || isMobile) && timer === 0) {
      // Just set redirect flag without signing out
      setRedirect(true);
    }
    
    return () => clearInterval(interval);
  }, [showAccessDenied, isMobile, timer]);
  
  // Redirect when not authenticated
  if (!loading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirect after timer expires for non-admin or mobile users
  if (redirect) {
    return <Navigate to="/home" replace />;
  }
  
  // Render mobile restriction message
  if (isMobile) {
    const circumference = 2 * Math.PI * 45; // 45 is the radius
    const strokeDashoffset = circumference * (1 - timer / 10);
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-blue-600 text-6xl mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold mb-4">Desktop Only</h2>
          <p className="text-gray-700 mb-6">Admin panel can only be accessed from a laptop or desktop computer.</p>
          
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              {/* Timer progress */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 50 50)"
              />
              {/* Timer text */}
              <text
                x="50"
                y="55"
                fontSize="24"
                textAnchor="middle"
                fill="#3b82f6"
                fontWeight="bold"
              >
                {timer}
              </text>
            </svg>
          </div>
          
          <p className="text-gray-600">Redirecting to home page in {timer} seconds...</p>
        </div>
      </div>
    );
  }
  
  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 text-xl">Loading...</div>
      </div>
    );
  }
  
  // Render admin content
  if (isAdmin) {
    return children;
  }
  
  // Render access denied with timer
  if (showAccessDenied) {
    const circumference = 2 * Math.PI * 45; // 45 is the radius
    const strokeDashoffset = circumference * (1 - timer / 10);
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-red-600 text-6xl mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-gray-700 mb-6">You don't have admin privileges to access this page.</p>
          
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              {/* Timer progress */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#ef4444"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 50 50)"
              />
              {/* Timer text */}
              <text
                x="50"
                y="55"
                fontSize="24"
                textAnchor="middle"
                fill="#ef4444"
                fontWeight="bold"
              >
                {timer}
              </text>
            </svg>
          </div>
          
          <p className="text-gray-600">Redirecting to home page in {timer} seconds...</p>
        </div>
      </div>
    );
  }
  
  // Fallback redirect - should not normally reach this point
  return <Navigate to="/home" replace />;
};

export default AdminRoute;

// import React, { useState, useEffect } from "react";
// import { Navigate } from "react-router-dom";
// import { auth, db } from "./config/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { doc, getDoc } from "firebase/firestore";

// const AdminRoute = ({ children }) => {
//   const [loading, setLoading] = useState(true);
//   const [isAdmin, setIsAdmin] = useState(false);
//   const [showAccessDenied, setShowAccessDenied] = useState(false);
//   const [timer, setTimer] = useState(10);
//   const [isMobile, setIsMobile] = useState(false);
//   const [redirect, setRedirect] = useState(false);
  
//   // Check if device is mobile
//   useEffect(() => {
//     const checkMobile = () => {
//       const userAgent = navigator.userAgent.toLowerCase();
//       const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
//       setIsMobile(mobileRegex.test(userAgent) || window.innerWidth < 768);
//     };
    
//     checkMobile();
//     window.addEventListener('resize', checkMobile);
    
//     return () => window.removeEventListener('resize', checkMobile);
//   }, []);
  
//   useEffect(() => {
//     // Skip auth check if on mobile
//     if (isMobile) {
//       setLoading(false);
//       return;
//     }
    
//     const unsubscribe = onAuthStateChanged(auth, async (user) => {
//       if (!user) {
//         setLoading(false);
//         return;
//       }

//       try {
//         // Check if user has admin role
//         const userDoc = await getDoc(doc(db, "users", user.uid));
//         const userData = userDoc.data();
        
//         if (userData && userData.role === "admin") {
//           setIsAdmin(true);
//         } else {
//           setShowAccessDenied(true);
//         }
//       } catch (error) {
//         console.error("Error checking admin status:", error);
//         setShowAccessDenied(true);
//       } finally {
//         setLoading(false);
//       }
//     });

//     // Cleanup subscription
//     return () => unsubscribe();
//   }, [isMobile]);
  
//   // Timer effect
//   useEffect(() => {
//     let interval;
    
//     if ((showAccessDenied || isMobile) && timer > 0) {
//       interval = setInterval(() => {
//         setTimer((prevTimer) => prevTimer - 1);
//       }, 1000);
//     } else if ((showAccessDenied || isMobile) && timer === 0) {
//       handleSignOutAndRedirect();
//     }
    
//     return () => clearInterval(interval);
//   }, [showAccessDenied, isMobile, timer]);
  
//   // Handle sign out and redirection
//   const handleSignOutAndRedirect = async () => {
//     try {
//       // Only sign out if actually authenticated
//       if (auth.currentUser) {
//         //await signOut(auth);
//       }
//       // Set redirect flag
//       setRedirect(true);
//     } catch (error) {
//       console.error("Error signing out:", error);
//       // Still redirect even if sign out fails
//       setRedirect(true);
//     }
//   };
  
//   // Redirect after timer expires
//   if (redirect) {
//     return <Navigate to="/home" replace />;
//   }
  
//   // Render mobile restriction message
//   if (isMobile) {
//     const circumference = 2 * Math.PI * 45; // 45 is the radius
//     const strokeDashoffset = circumference * (1 - timer / 10);
    
//     return (
//       <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
//         <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
//           <div className="text-blue-600 text-6xl mb-4">
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
//             </svg>
//           </div>
          
//           <h2 className="text-2xl font-bold mb-4">Desktop Only</h2>
//           <p className="text-gray-700 mb-6">Admin panel can only be accessed from a laptop or desktop computer.</p>
          
//           <div className="relative w-32 h-32 mx-auto mb-4">
//             <svg className="w-full h-full" viewBox="0 0 100 100">
//               {/* Background circle */}
//               <circle
//                 cx="50"
//                 cy="50"
//                 r="45"
//                 fill="none"
//                 stroke="#e5e7eb"
//                 strokeWidth="8"
//               />
//               {/* Timer progress */}
//               <circle
//                 cx="50"
//                 cy="50"
//                 r="45"
//                 fill="none"
//                 stroke="#3b82f6"
//                 strokeWidth="8"
//                 strokeLinecap="round"
//                 strokeDasharray={circumference}
//                 strokeDashoffset={strokeDashoffset}
//                 transform="rotate(-90 50 50)"
//               />
//               {/* Timer text */}
//               <text
//                 x="50"
//                 y="55"
//                 fontSize="24"
//                 textAnchor="middle"
//                 fill="#3b82f6"
//                 fontWeight="bold"
//               >
//                 {timer}
//               </text>
//             </svg>
//           </div>
          
//           <p className="text-gray-600">Redirecting to home page in {timer} seconds...</p>
//         </div>
//       </div>
//     );
//   }
  
//   // Render loading state
//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <div className="text-red-600 text-xl">Loading...</div>
//       </div>
//     );
//   }
  
//   // Render admin content
//   if (isAdmin) {
//     return children;
//   }
  
//   // Render access denied with timer
//   if (showAccessDenied) {
//     const circumference = 2 * Math.PI * 45; // 45 is the radius
//     const strokeDashoffset = circumference * (1 - timer / 10);
    
//     return (
//       <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
//         <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
//           <div className="text-red-600 text-6xl mb-4">
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
//             </svg>
//           </div>
          
//           <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
//           <p className="text-gray-700 mb-6">You don't have admin privileges to access this page.</p>
          
//           <div className="relative w-32 h-32 mx-auto mb-4">
//             <svg className="w-full h-full" viewBox="0 0 100 100">
//               {/* Background circle */}
//               <circle
//                 cx="50"
//                 cy="50"
//                 r="45"
//                 fill="none"
//                 stroke="#e5e7eb"
//                 strokeWidth="8"
//               />
//               {/* Timer progress */}
//               <circle
//                 cx="50"
//                 cy="50"
//                 r="45"
//                 fill="none"
//                 stroke="#ef4444"
//                 strokeWidth="8"
//                 strokeLinecap="round"
//                 strokeDasharray={circumference}
//                 strokeDashoffset={strokeDashoffset}
//                 transform="rotate(-90 50 50)"
//               />
//               {/* Timer text */}
//               <text
//                 x="50"
//                 y="55"
//                 fontSize="24"
//                 textAnchor="middle"
//                 fill="#ef4444"
//                 fontWeight="bold"
//               >
//                 {timer}
//               </text>
//             </svg>
//           </div>
          
//           <p className="text-gray-600">Redirecting to home page in {timer} seconds...</p>
//         </div>
//       </div>
//     );
//   }
  
//   // Fallback redirect
//   return <Navigate to="/home" replace />;
// };

// export default AdminRoute;
// import React, { useState, useEffect } from "react";
// import { Navigate } from "react-router-dom";
// import { auth, db } from "./config/firebase";
// import { onAuthStateChanged } from "firebase/auth";
// import { doc, getDoc } from "firebase/firestore";

// const AdminRoute = ({ children }) => {
//   const [loading, setLoading] = useState(true);
//   const [isAdmin, setIsAdmin] = useState(false);

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, async (user) => {
//       if (!user) {
//         setLoading(false);
//         return;
//       }

//       try {
//         // Check if user has admin role
//         const userDoc = await getDoc(doc(db, "users", user.uid));
//         const userData = userDoc.data();
        
//         if (userData && userData.role === "admin") {
//           setIsAdmin(true);
//         }
//       } catch (error) {
//         console.error("Error checking admin status:", error);
//       } finally {
//         setLoading(false);
//       }
//     });

//     // Cleanup subscription
//     return () => unsubscribe();
//   }, []);

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <div className="text-red-600 text-xl">Loading...</div>
//       </div>
//     );
//   }

//   return isAdmin ? children : <Navigate to="/home" />;
// };

// export default AdminRoute;


// import React, { useState, useEffect } from "react";
// import { Navigate } from "react-router-dom";
// import { auth, db } from "./config/firebase";
// import { onAuthStateChanged } from "firebase/auth";
// import { doc, getDoc } from "firebase/firestore";

// const AdminRoute = ({ children }) => {
//   const [loading, setLoading] = useState(true);
//   const [isAdmin, setIsAdmin] = useState(false);
//   const [showAccessDenied, setShowAccessDenied] = useState(false);
//   const [timer, setTimer] = useState(10);
  
//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, async (user) => {
//       if (!user) {
//         setLoading(false);
//         return;
//       }

//       try {
//         // Check if user has admin role
//         const userDoc = await getDoc(doc(db, "users", user.uid));
//         const userData = userDoc.data();
        
//         if (userData && userData.role === "admin") {
//           setIsAdmin(true);
//         } else {
//           setShowAccessDenied(true);
//         }
//       } catch (error) {
//         console.error("Error checking admin status:", error);
//         setShowAccessDenied(true);
//       } finally {
//         setLoading(false);
//       }
//     });

//     // Cleanup subscription
//     return () => unsubscribe();
//   }, []);
  
//   // Timer effect
//   useEffect(() => {
//     let interval;
    
//     if (showAccessDenied && timer > 0) {
//       interval = setInterval(() => {
//         setTimer((prevTimer) => prevTimer - 1);
//       }, 1000);
//     }
    
//     return () => clearInterval(interval);
//   }, [showAccessDenied, timer]);
  
//   // Render loading state
//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <div className="text-red-600 text-xl">Loading...</div>
//       </div>
//     );
//   }
  
//   // Render admin content
//   if (isAdmin) {
//     return children;
//   }
  
//   // Render access denied with timer
//   if (showAccessDenied && timer > 0) {
//     const circumference = 2 * Math.PI * 45; // 45 is the radius
//     const strokeDashoffset = circumference * (1 - timer / 10);
    
//     return (
//       <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
//         <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
//           <div className="text-red-600 text-6xl mb-4">
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
//             </svg>
//           </div>
          
//           <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
//           <p className="text-gray-700 mb-6">You don't have admin privileges to access this page.</p>
          
//           <div className="relative w-32 h-32 mx-auto mb-4">
//             <svg className="w-full h-full" viewBox="0 0 100 100">
//               {/* Background circle */}
//               <circle
//                 cx="50"
//                 cy="50"
//                 r="45"
//                 fill="none"
//                 stroke="#e5e7eb"
//                 strokeWidth="8"
//               />
//               {/* Timer progress */}
//               <circle
//                 cx="50"
//                 cy="50"
//                 r="45"
//                 fill="none"
//                 stroke="#ef4444"
//                 strokeWidth="8"
//                 strokeLinecap="round"
//                 strokeDasharray={circumference}
//                 strokeDashoffset={strokeDashoffset}
//                 transform="rotate(-90 50 50)"
//               />
//               {/* Timer text */}
//               <text
//                 x="50"
//                 y="55"
//                 fontSize="24"
//                 textAnchor="middle"
//                 fill="#ef4444"
//                 fontWeight="bold"
//               >
//                 {timer}
//               </text>
//             </svg>
//           </div>
          
//           <p className="text-gray-600">Redirecting to home page in {timer} seconds...</p>
//         </div>
//       </div>
//     );
//   }
  
//   // Redirect after timer expires
//   return <Navigate to="/home" />;
// };

// export default AdminRoute;


// import React, { useState, useEffect } from "react";
// import { Navigate } from "react-router-dom";
// import { auth, db } from "./config/firebase";
// import { onAuthStateChanged } from "firebase/auth";
// import { doc, getDoc } from "firebase/firestore";

// const AdminRoute = ({ children }) => {
//   const [loading, setLoading] = useState(true);
//   const [isAdmin, setIsAdmin] = useState(false);
//   const [showAccessDenied, setShowAccessDenied] = useState(false);
//   const [timer, setTimer] = useState(10);
//   const [isMobile, setIsMobile] = useState(false);
  
//   // Check if device is mobile
//   useEffect(() => {
//     const checkMobile = () => {
//       const userAgent = navigator.userAgent.toLowerCase();
//       const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
//       setIsMobile(mobileRegex.test(userAgent) || window.innerWidth < 768);
//     };
    
//     checkMobile();
//     window.addEventListener('resize', checkMobile);
    
//     return () => window.removeEventListener('resize', checkMobile);
//   }, []);
  
//   useEffect(() => {
//     if (isMobile) {
//       setLoading(false);
//       return;
//     }
    
//     const unsubscribe = onAuthStateChanged(auth, async (user) => {
//       if (!user) {
//         setLoading(false);
//         return;
//       }

//       try {
//         // Check if user has admin role
//         const userDoc = await getDoc(doc(db, "users", user.uid));
//         const userData = userDoc.data();
        
//         if (userData && userData.role === "admin") {
//           setIsAdmin(true);
//         } else {
//           setShowAccessDenied(true);
//         }
//       } catch (error) {
//         console.error("Error checking admin status:", error);
//         setShowAccessDenied(true);
//       } finally {
//         setLoading(false);
//       }
//     });

//     // Cleanup subscription
//     return () => unsubscribe();
//   }, [isMobile]);
  
//   // Timer effect
//   useEffect(() => {
//     let interval;
    
//     if ((showAccessDenied || isMobile) && timer > 0) {
//       interval = setInterval(() => {
//         setTimer((prevTimer) => prevTimer - 1);
//       }, 1000);
//     }
    
//     return () => clearInterval(interval);
//   }, [showAccessDenied, isMobile, timer]);
  
//   // Render mobile restriction message
//   if (isMobile) {
//     const circumference = 2 * Math.PI * 45; // 45 is the radius
//     const strokeDashoffset = circumference * (1 - timer / 10);
    
//     return (
//       <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
//         <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
//           <div className="text-blue-600 text-6xl mb-4">
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
//             </svg>
//           </div>
          
//           <h2 className="text-2xl font-bold mb-4">Desktop Only</h2>
//           <p className="text-gray-700 mb-6">Admin panel can only be accessed from a laptop or desktop computer.</p>
          
//           <div className="relative w-32 h-32 mx-auto mb-4">
//             <svg className="w-full h-full" viewBox="0 0 100 100">
//               {/* Background circle */}
//               <circle
//                 cx="50"
//                 cy="50"
//                 r="45"
//                 fill="none"
//                 stroke="#e5e7eb"
//                 strokeWidth="8"
//               />
//               {/* Timer progress */}
//               <circle
//                 cx="50"
//                 cy="50"
//                 r="45"
//                 fill="none"
//                 stroke="#3b82f6"
//                 strokeWidth="8"
//                 strokeLinecap="round"
//                 strokeDasharray={circumference}
//                 strokeDashoffset={strokeDashoffset}
//                 transform="rotate(-90 50 50)"
//               />
//               {/* Timer text */}
//               <text
//                 x="50"
//                 y="55"
//                 fontSize="24"
//                 textAnchor="middle"
//                 fill="#3b82f6"
//                 fontWeight="bold"
//               >
//                 {timer}
//               </text>
//             </svg>
//           </div>
          
//           <p className="text-gray-600">Redirecting to home page in {timer} seconds...</p>
//         </div>
//       </div>
//     );
//   }
  
//   // Render loading state
//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <div className="text-red-600 text-xl">Loading...</div>
//       </div>
//     );
//   }
  
//   // Render admin content
//   if (isAdmin) {
//     return children;
//   }
  
//   // Render access denied with timer
//   if (showAccessDenied && timer > 0) {
//     const circumference = 2 * Math.PI * 45; // 45 is the radius
//     const strokeDashoffset = circumference * (1 - timer / 10);
    
//     return (
//       <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
//         <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
//           <div className="text-red-600 text-6xl mb-4">
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
//             </svg>
//           </div>
          
//           <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
//           <p className="text-gray-700 mb-6">You don't have admin privileges to access this page.</p>
          
//           <div className="relative w-32 h-32 mx-auto mb-4">
//             <svg className="w-full h-full" viewBox="0 0 100 100">
//               {/* Background circle */}
//               <circle
//                 cx="50"
//                 cy="50"
//                 r="45"
//                 fill="none"
//                 stroke="#e5e7eb"
//                 strokeWidth="8"
//               />
//               {/* Timer progress */}
//               <circle
//                 cx="50"
//                 cy="50"
//                 r="45"
//                 fill="none"
//                 stroke="#ef4444"
//                 strokeWidth="8"
//                 strokeLinecap="round"
//                 strokeDasharray={circumference}
//                 strokeDashoffset={strokeDashoffset}
//                 transform="rotate(-90 50 50)"
//               />
//               {/* Timer text */}
//               <text
//                 x="50"
//                 y="55"
//                 fontSize="24"
//                 textAnchor="middle"
//                 fill="#ef4444"
//                 fontWeight="bold"
//               >
//                 {timer}
//               </text>
//             </svg>
//           </div>
          
//           <p className="text-gray-600">Redirecting to home page in {timer} seconds...</p>
//         </div>
//       </div>
//     );
//   }
  
//   // Redirect after timer expires
//   return <Navigate to="/home" />;
// };

// export default AdminRoute;

