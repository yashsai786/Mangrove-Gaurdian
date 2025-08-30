import { useEffect, useState } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./config/firebase";
import { doc, getDoc } from "firebase/firestore";

const PrivateRoute = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDisabledPopup, setShowDisabledPopup] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
        
        try {
          // Check user status in Firestore
          const userDoc = await getDoc(doc(db, "users", authUser.uid));
          
          if (!userDoc.exists()) {
            // User exists in Firebase Auth but not in Firestore
            navigate("/complete-profile");
            setLoading(false);
            return;
          }
          
          const userData = userDoc.data();
          
          // Check if profile is complete
          if (!userData.contact) {
            navigate("/complete-profile");
          } 
          // Check user status
          else if (userData.status === "new") {
            navigate("/pending-approval");
          }
          else if (userData.status === "disabled") {
            // Show popup for disabled accounts
            setShowDisabledPopup(true);
            // We'll handle the sign out and redirect after popup in separate effect
          }
          // For enabled users, continue to the protected route
          // (This happens implicitly by not redirecting)
        } catch (error) {
          console.error("Error checking user status:", error);
          // In case of error, sign out and redirect to login
          await auth.signOut();
          navigate("/login");
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  // Handle disabled account popup
  useEffect(() => {
    if (showDisabledPopup) {
      // After 3 seconds, close popup and redirect
      const timer = setTimeout(async () => {
        await auth.signOut();
        setShowDisabledPopup(false);
        navigate("/login");
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [showDisabledPopup, navigate]);

  if (loading) return <div>Loading...</div>;
  
  if (showDisabledPopup) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-center mb-4 text-red-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-center mb-2">Account Disabled</h3>
          <p className="text-center text-gray-700 mb-4">
            Your account has been temporarily blocked. Please contact support for assistance.
          </p>
          <p className="text-center text-sm text-gray-500">
            Redirecting to login page...
          </p>
        </div>
      </div>
    );
  }
  
  return user ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;

// import { useEffect, useState } from "react";
// import { Navigate, Outlet } from "react-router-dom";
// import { onAuthStateChanged } from "firebase/auth";
// import { auth } from "./config/firebase";

// const PrivateRoute = () => {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, (authUser) => {
//       setUser(authUser);
//       setLoading(false);
//     });

//     return () => unsubscribe();
//   }, []);

//   if (loading) return <div>Loading...</div>;

//   return user ? <Outlet /> : <Navigate to="/login" />;
// };

// export default PrivateRoute;
