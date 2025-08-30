import React, { useEffect, useState } from "react";
import { auth, db } from "./config/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const NavbarUserSection = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserDetails, setCurrentUserDetails] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setCurrentUserDetails(userDocSnap.data());
          } else {
            console.log("No user document found in Firestore");
          }
        } catch (error) {
          console.error("Error fetching user details:", error);
        }
      } else {
        setCurrentUser(null);
        setCurrentUserDetails(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setDropdownOpen(false);
      setCurrentUser(null);
      setCurrentUserDetails(null);
      navigate("/"); // Redirect to home after logout
      console.log("User logged out");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };
  
  const navigateToAdmin = () => {
    navigate("/admin");
    setDropdownOpen(false);
  };

  if (!currentUserDetails) {
    return null; // Return a login button if needed
  }

  return (
    <div className="relative inline-block">
      {/* Profile Button */}
      <button
        className="flex items-center space-x-2 focus:outline-none"
        onClick={() => setDropdownOpen(!dropdownOpen)}
      >
        <img
          src={currentUserDetails.profilePic || "https://via.placeholder.com/40"}
          alt="Profile"
          className="rounded-full w-8 h-8 border border-gray-300"
        />
        <span className="font-medium">{currentUserDetails.username}</span>
      </button>
      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 shadow-md rounded-lg">
          <ul className="py-2">
            {currentUserDetails.role === "admin" && (
              <li>
                <button
                  onClick={navigateToAdmin}
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  Admin Panel
                </button>
              </li>
            )}
            <li>
              <a
                href="/change-password"
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
              >
                Change Password
              </a>
            </li>
            <li>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
              >
                Log Out
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default NavbarUserSection;

// import React, { useEffect, useState } from "react";
// import { auth, db } from "./config/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { doc, getDoc } from "firebase/firestore";
// import { useNavigate } from "react-router-dom";

// // const navigate = useNavigate();

// const NavbarUserSection = () => {
//   const [currentUser, setCurrentUser] = useState(null);
//   const [currentUserDetails, setCurrentUserDetails] = useState(null);
//   const [dropdownOpen, setDropdownOpen] = useState(false);
//   const navigate = useNavigate();

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, async (user) => {
//       if (user) {
//         setCurrentUser(user);

//         try {
//           const userDocRef = doc(db, "users", user.uid);
//           const userDocSnap = await getDoc(userDocRef);

//           if (userDocSnap.exists()) {
//             setCurrentUserDetails(userDocSnap.data());
//           } else {
//             console.log("No user document found in Firestore");
//           }
//         } catch (error) {
//           console.error("Error fetching user details:", error);
//         }
//       } else {
//         setCurrentUser(null);
//         setCurrentUserDetails(null);
//       }
//     });

//     return () => unsubscribe();
//   }, []);

//   const handleLogout = async () => {
//     try {
//       await signOut(auth);
//       setDropdownOpen(false);
//       setCurrentUser(null);
//       setCurrentUserDetails(null);
//       navigate("/"); // Redirect to home after logout
//       console.log("User logged out");
//     } catch (error) {
//       console.error("Error logging out:", error);
//     }
//   };
  

//   if (!currentUserDetails) {
//     return null; // Return a login button if needed
//   }

//   return (
//     <div className="relative inline-block">
//       {/* Profile Button */}
//       <button
//         className="flex items-center space-x-2 focus:outline-none"
//         onClick={() => setDropdownOpen(!dropdownOpen)}
//       >
//         <img
//           src={currentUserDetails.profilePic || "https://via.placeholder.com/40"}
//           alt="Profile"
//           className="rounded-full w-8 h-8 border border-gray-300"
//         />
//         <span className="font-medium">{currentUserDetails.username}</span>
//       </button>

//       {/* Dropdown Menu */}
//       {dropdownOpen && (
//         <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 shadow-md rounded-lg">
//           <ul className="py-2">
//             <li>
//               <a
//                 href="/change-password"
//                 className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
//               >
//                 Change Password
//               </a>
//             </li>
//             <li>
//               <button
//                 onClick={handleLogout}
//                 className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
//               >
//                 Log Out
//               </button>
//             </li>
//           </ul>
//         </div>
//       )}
//     </div>
//   );
// };

// export default NavbarUserSection;
