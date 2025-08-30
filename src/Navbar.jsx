import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import NavbarUserSection from "./NavbarUserSection";
import PinCodeModalWithCombobox from "./PinCodeModalWithCombobox";
import logoImage from "./assets/logoabout.png"; // Adjust path as needed

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);
  const [currentPinCode, setCurrentPinCode] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        // Fetch user's PIN code from Firestore
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists() && userSnap.data().pinCode) {
            setCurrentPinCode(userSnap.data().pinCode);
          }
        } catch (error) {
          console.error("Error fetching user PIN code:", error);
        }
      }
    });

    return () => unsubscribe();
  }, [auth, db]);

  // Close mobile menu when location changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  const getLinkClass = (path) =>
    `hover:underline ${
      location.pathname === path ? "font-bold underline" : ""
    }`;

  const handleLoginClick = () => {
    navigate("/login");
  };

  const handlePinCodeSubmit = async (selectedPinCode) => {
    try {
      // Only perform the update if the PIN code has actually changed
      if (selectedPinCode !== currentPinCode) {
        if (user) {
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, {
            pinCode: selectedPinCode,
          });
        } else {
          // For non-logged in users, consider storing in localStorage
          localStorage.setItem("userPinCode", selectedPinCode);
        }

        // Update the state and reload the page
        setCurrentPinCode(selectedPinCode);
        setShowPinModal(false);

        // Reload the current page to refresh data based on new PIN code
        window.location.reload();
      } else {
        // Close the modal if PIN code hasn't changed
        setShowPinModal(false);
      }
    } catch (error) {
      console.error("Error updating PIN code:", error);
    }
  };

  // Mobile menu hamburger icon
  const HamburgerIcon = () => (
    <button
      className="block lg:hidden"
      onClick={() => setMenuOpen(!menuOpen)}
      aria-label="Toggle menu"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={
            menuOpen
              ? "M6 18L18 6M6 6l12 12"
              : "M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
          }
        />
      </svg>
    </button>
  );

  const LocationButton = () => (
    <button
      onClick={() => setShowPinModal(true)}
      className="flex items-center text-white hover:underline whitespace-nowrap"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-5 h-5 mr-1"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
        />
      </svg>
      {currentPinCode ? (
        <span className="hidden sm:inline">Area: {currentPinCode}</span>
      ) : (
        <span className="hidden sm:inline">Set Location</span>
      )}
      <span className="inline sm:hidden">{currentPinCode || "Location"}</span>
    </button>
  );

  return (
    <>
      <nav className="w-full bg-green-700 p-3 sm:p-4 text-white flex justify-between items-center fixed top-0 left-0 right-0 z-50 shadow-lg">
        <div className="flex items-center">
          {/* Logo added here */}
          <div className="mr-2">
            <img
              src={logoImage}
              alt="Mangrove Guardian Logo"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white object-cover"
            />
          </div>
          <h1 className="text-lg font-bold mr-4">
            <NavLink
              to="/home"
              className="flex items-center hover:text-green-200 transition-colors"
            ></NavLink>
          </h1>
          <LocationButton />
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center space-x-4 xl:space-x-6">
          <NavLink to="/about" className={getLinkClass("/about")}>
            About Us
          </NavLink>
          <NavLink to="/profile" className={getLinkClass("/profile")}>
            Profile
          </NavLink>
          {/* <NavLink to="/security" className={getLinkClass("/security")}>Security</NavLink> */}
          <NavLink to="/contact" className={getLinkClass("/contact")}>
            Contact Us
          </NavLink>

          {loading ? (
            <div className="w-16 h-6 bg-red-700 rounded animate-pulse"></div>
          ) : user ? (
            <NavbarUserSection />
          ) : (
            <button
              onClick={handleLoginClick}
              className="px-4 py-2 bg-white text-red-600 font-medium rounded hover:bg-gray-100 transition-colors"
            >
              Login
            </button>
          )}
        </div>

        {/* Mobile Navigation Toggle */}
        <div className="flex items-center lg:hidden">
          {!loading && user && (
            <div className="mr-4">
              <NavbarUserSection />
            </div>
          )}
          {!loading && !user && (
            <button
              onClick={handleLoginClick}
              className="mr-4 px-3 py-1 text-sm bg-white text-red-600 font-medium rounded hover:bg-gray-100 transition-colors"
            >
              Login
            </button>
          )}
          <HamburgerIcon />
        </div>
      </nav>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-x-0 top-[3.5rem] sm:top-16 bg-red-600 shadow-lg transition-transform duration-300 ease-in-out z-40 lg:hidden ${
          menuOpen ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="flex flex-col p-4 space-y-4">
          <NavLink
            to="/about"
            className={`${getLinkClass("/about")} text-white`}
          >
            About Us
          </NavLink>
          <NavLink
            to="/profile"
            className={`${getLinkClass("/profile")} text-white`}
          >
            Profile
          </NavLink>
          <NavLink
            to="/security"
            className={`${getLinkClass("/security")} text-white`}
          >
            Security
          </NavLink>
          <NavLink
            to="/contact"
            className={`${getLinkClass("/contact")} text-white`}
          >
            Contact Us
          </NavLink>
        </div>
      </div>

      {/* Location Search Modal */}
      {showPinModal && (
        <PinCodeModalWithCombobox
          onClose={() => setShowPinModal(false)}
          onSubmit={handlePinCodeSubmit}
          initialValue={currentPinCode}
        />
      )}
    </>
  );
};

export default Navbar;

// import { NavLink, useLocation, useNavigate } from "react-router-dom";
// import { useState, useEffect } from "react";
// import { getAuth, onAuthStateChanged } from "firebase/auth";
// import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
// import NavbarUserSection from "./NavbarUserSection";
// import PinCodeModalWithCombobox from "./PinCodeModalWithCombobox";

// const Navbar = () => {
//   const location = useLocation();
//   const navigate = useNavigate();
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [showPinModal, setShowPinModal] = useState(false);
//   const [currentPinCode, setCurrentPinCode] = useState("");
//   const [menuOpen, setMenuOpen] = useState(false);
//   const auth = getAuth();
//   const db = getFirestore();

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
//       setUser(currentUser);
//       setLoading(false);

//       if (currentUser) {
//         // Fetch user's PIN code from Firestore
//         try {
//           const userRef = doc(db, "users", currentUser.uid);
//           const userSnap = await getDoc(userRef);

//           if (userSnap.exists() && userSnap.data().pinCode) {
//             setCurrentPinCode(userSnap.data().pinCode);
//           }
//         } catch (error) {
//           console.error("Error fetching user PIN code:", error);
//         }
//       }
//     });

//     return () => unsubscribe();
//   }, [auth, db]);

//   // Close mobile menu when location changes
//   useEffect(() => {
//     setMenuOpen(false);
//   }, [location]);

//   const getLinkClass = (path) =>
//     `hover:underline ${location.pathname === path ? "font-bold underline" : ""}`;

//   const handleLoginClick = () => {
//     navigate("/login");
//   };

//   const handlePinCodeSubmit = async (selectedPinCode) => {
//     try {
//       // Only perform the update if the PIN code has actually changed
//       if (selectedPinCode !== currentPinCode) {
//         if (user) {
//           const userRef = doc(db, "users", user.uid);
//           await updateDoc(userRef, {
//             pinCode: selectedPinCode
//           });
//         } else {
//           // For non-logged in users, consider storing in localStorage
//           localStorage.setItem("userPinCode", selectedPinCode);
//         }

//         // Update the state and reload the page
//         setCurrentPinCode(selectedPinCode);
//         setShowPinModal(false);

//         // Reload the current page to refresh data based on new PIN code
//         window.location.reload();
//       } else {
//         // Close the modal if PIN code hasn't changed
//         setShowPinModal(false);
//       }
//     } catch (error) {
//       console.error("Error updating PIN code:", error);
//     }
//   };

//   // Mobile menu hamburger icon
//   const HamburgerIcon = () => (
//     <button
//       className="block lg:hidden"
//       onClick={() => setMenuOpen(!menuOpen)}
//       aria-label="Toggle menu"
//     >
//       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
//         <path strokeLinecap="round" strokeLinejoin="round" d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"} />
//       </svg>
//     </button>
//   );

//   const LocationButton = () => (
//     <button
//       onClick={() => setShowPinModal(true)}
//       className="flex items-center text-white hover:underline whitespace-nowrap"
//     >
//       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
//         <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
//         <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
//       </svg>
//       {currentPinCode ? (
//         <span className="hidden sm:inline">Area: {currentPinCode}</span>
//       ) : (
//         <span className="hidden sm:inline">Set Location</span>
//       )}
//       <span className="inline sm:hidden">{currentPinCode || "Location"}</span>
//     </button>
//   );

//   return (
//     <>
//       <nav className="w-full bg-red-600 p-3 sm:p-4 text-white flex justify-between items-center fixed top-0 left-0 right-0 z-50">
//         <div className="flex items-center">
//           <h1 className="text-lg font-bold mr-4">
//             <NavLink to="/home">Transgression Vigilance</NavLink>
//           </h1>
//           <LocationButton />
//         </div>

//         {/* Desktop Navigation */}
//         <div className="hidden lg:flex items-center space-x-4 xl:space-x-6">
//           <NavLink to="/about" className={getLinkClass("/about")}>About Us</NavLink>
//           <NavLink to="/profile" className={getLinkClass("/profile")}>Profile</NavLink>
//           <NavLink to="/security" className={getLinkClass("/security")}>Security</NavLink>
//           <NavLink to="/contact" className={getLinkClass("/contact")}>Contact Us</NavLink>

//           {loading ? (
//             <div className="w-16 h-6 bg-red-700 rounded animate-pulse"></div>
//           ) : user ? (
//             <NavbarUserSection />
//           ) : (
//             <button
//               onClick={handleLoginClick}
//               className="px-4 py-2 bg-white text-red-600 font-medium rounded hover:bg-gray-100 transition-colors"
//             >
//               Login
//             </button>
//           )}
//         </div>

//         {/* Mobile Navigation Toggle */}
//         <div className="flex items-center lg:hidden">
//           {!loading && user && <div className="mr-4"><NavbarUserSection /></div>}
//           {!loading && !user && (
//             <button
//               onClick={handleLoginClick}
//               className="mr-4 px-3 py-1 text-sm bg-white text-red-600 font-medium rounded hover:bg-gray-100 transition-colors"
//             >
//               Login
//             </button>
//           )}
//           <HamburgerIcon />
//         </div>
//       </nav>

//       {/* Mobile Menu */}
//       <div
//         className={`fixed inset-x-0 top-[3.5rem] sm:top-16 bg-red-600 shadow-lg transition-transform duration-300 ease-in-out z-40 lg:hidden ${
//           menuOpen ? 'translate-y-0' : '-translate-y-full'
//         }`}
//       >
//         <div className="flex flex-col p-4 space-y-4">
//           <NavLink to="/about" className={`${getLinkClass("/about")} text-white`}>About Us</NavLink>
//           <NavLink to="/profile" className={`${getLinkClass("/profile")} text-white`}>Profile</NavLink>
//           <NavLink to="/security" className={`${getLinkClass("/security")} text-white`}>Security</NavLink>
//           <NavLink to="/contact" className={`${getLinkClass("/contact")} text-white`}>Contact Us</NavLink>
//         </div>
//       </div>

//       {/* Location Search Modal */}
//       {showPinModal && (
//         <PinCodeModalWithCombobox
//           onClose={() => setShowPinModal(false)}
//           onSubmit={handlePinCodeSubmit}
//           initialValue={currentPinCode}
//         />
//       )}
//     </>
//   );
// };

// export default Navbar;

//extra other past codes

// import { NavLink, useLocation, useNavigate } from "react-router-dom";
// import { useState, useEffect, useRef } from "react";
// import { getAuth, onAuthStateChanged } from "firebase/auth";
// import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
// import NavbarUserSection from "./NavbarUserSection";

// const Navbar = () => {
//   const location = useLocation();
//   const navigate = useNavigate();
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [showPinModal, setShowPinModal] = useState(false);
//   const [pinCode, setPinCode] = useState("");
//   const [pinError, setPinError] = useState("");
//   const [currentPinCode, setCurrentPinCode] = useState("");
//   const [menuOpen, setMenuOpen] = useState(false);
//   const pinInputRef = useRef(null);
//   const auth = getAuth();
//   const db = getFirestore();

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
//       setUser(currentUser);
//       setLoading(false);

//       if (currentUser) {
//         // Fetch user's PIN code from Firestore
//         try {
//           const userRef = doc(db, "users", currentUser.uid);
//           const userSnap = await getDoc(userRef);

//           if (userSnap.exists() && userSnap.data().pinCode) {
//             setCurrentPinCode(userSnap.data().pinCode);
//           }
//         } catch (error) {
//           console.error("Error fetching user PIN code:", error);
//         }
//       }
//     });

//     return () => unsubscribe();
//   }, [auth, db]);

//   // Focus input when modal opens
//   useEffect(() => {
//     if (showPinModal && pinInputRef.current) {
//       setTimeout(() => {
//         pinInputRef.current.focus();
//       }, 100);
//     }
//   }, [showPinModal]);

//   // Close mobile menu when location changes
//   useEffect(() => {
//     setMenuOpen(false);
//   }, [location]);

//   const getLinkClass = (path) =>
//     `hover:underline ${location.pathname === path ? "font-bold underline" : ""}`;

//   const handleLoginClick = () => {
//     navigate("/login");
//   };

//   const validatePinCode = (value) => {
//     if (!/^\d*$/.test(value)) {
//       setPinError("PIN code must contain only numbers");
//       return false;
//     } else if (value.length > 6) {
//       setPinError("PIN code must be 6 digits or less");
//       return false;
//     } else {
//       setPinError("");
//       return true;
//     }
//   };

//   const handlePinCodeChange = (e) => {
//     const value = e.target.value;

//     // Only update if it's valid input
//     if (value.length <= 6 && /^\d*$/.test(value)) {
//       setPinCode(value);
//       setPinError("");
//     } else if (value.length > 6) {
//       setPinCode(value.slice(0, 6));
//       setPinError("PIN code must be 6 digits or less");
//     } else if (!/^\d*$/.test(value)) {
//       setPinError("PIN code must contain only numbers");
//     }

//     // Make sure to maintain focus
//     if (pinInputRef.current) {
//       pinInputRef.current.focus();
//     }
//   };

//   const handlePinCodeSubmit = async () => {
//     if (!pinCode.trim()) {
//       setPinError("Please enter a PIN code");
//       return;
//     }

//     if (!validatePinCode(pinCode)) {
//       return;
//     }

//     try {
//       if (user) {
//         const userRef = doc(db, "users", user.uid);
//         await updateDoc(userRef, {
//           pinCode: pinCode.trim()
//         });
//         setCurrentPinCode(pinCode.trim());
//         setPinCode("");
//         setPinError("");
//         setShowPinModal(false);
//       }
//     } catch (error) {
//       console.error("Error updating PIN code:", error);
//     }
//   };

//   const PinCodeModal = () => (
//     <div
//       className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4"
//       onClick={() => setShowPinModal(false)}
//     >
//       <div
//         className="bg-white rounded-lg w-full max-w-md p-4 sm:p-6 text-gray-800 shadow-xl"
//         onClick={(e) => e.stopPropagation()}
//       >
//         <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-4">Enter PIN Code</h2>
//         <p className="text-gray-600 text-sm sm:text-base mb-4">
//           Enter PIN code to see the crime cases around you.
//         </p>

//         <div className="mb-4 sm:mb-6">
//           <label className="block text-gray-700 text-sm sm:text-base mb-2">PIN Code</label>
//           <div className="flex relative">
//             <div className="flex items-center absolute left-0 top-0 bottom-0 ml-2">
//               <span className="text-gray-500">
//                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
//                   <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
//                   <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
//                 </svg>
//               </span>
//             </div>
//             <input
//               ref={pinInputRef}
//               type="text"
//               value={pinCode}
//               onChange={handlePinCodeChange}
//               placeholder="Enter your Pincode"
//               className="w-full border-b border-gray-300 focus:outline-none focus:border-blue-500 py-2 pl-10"
//               maxLength={6}
//               inputMode="numeric"
//               onFocus={(e) => {
//                 // Ensure cursor is at the end
//                 const val = e.target.value;
//                 e.target.value = '';
//                 e.target.value = val;
//               }}
//             />
//           </div>
//           {pinError && (
//             <p className="text-red-500 text-sm mt-1">{pinError}</p>
//           )}
//         </div>

//         <div className="flex justify-end">
//           <button
//             onClick={() => {
//               setShowPinModal(false);
//               setPinError("");
//             }}
//             className="mr-2 px-4 sm:px-6 py-2 text-gray-600 hover:text-gray-800 text-sm sm:text-base"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={handlePinCodeSubmit}
//             className="px-4 sm:px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 text-sm sm:text-base"
//           >
//             Apply
//           </button>
//         </div>
//       </div>
//     </div>
//   );

//   // Mobile menu hamburger icon
//   const HamburgerIcon = () => (
//     <button
//       className="block lg:hidden"
//       onClick={() => setMenuOpen(!menuOpen)}
//       aria-label="Toggle menu"
//     >
//       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
//         <path strokeLinecap="round" strokeLinejoin="round" d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"} />
//       </svg>
//     </button>
//   );

//   const LocationButton = () => (
//     <button
//       onClick={() => {
//         setShowPinModal(true);
//         // Pre-fill with current pin code if it exists
//         if (currentPinCode) {
//           setPinCode(currentPinCode);
//         }
//       }}
//       className="flex items-center text-white hover:underline whitespace-nowrap"
//     >
//       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
//         <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
//         <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
//       </svg>
//       {currentPinCode ? (
//         <span className="hidden sm:inline">Area: {currentPinCode}</span>
//       ) : (
//         <span className="hidden sm:inline">Set Location</span>
//       )}
//       <span className="inline sm:hidden">{currentPinCode || "Location"}</span>
//     </button>
//   );

//   return (
//     <>
//       <nav className="w-full bg-red-600 p-3 sm:p-4 text-white flex justify-between items-center fixed top-0 left-0 right-0 z-50">
//         <div className="flex items-center">
//           <h1 className="text-lg font-bold mr-4">
//             <NavLink to="/home">Transgression Vigilance</NavLink>
//           </h1>
//           <LocationButton />
//         </div>

//         {/* Desktop Navigation */}
//         <div className="hidden lg:flex items-center space-x-4 xl:space-x-6">
//           <NavLink to="/about" className={getLinkClass("/about")}>About Us</NavLink>
//           <NavLink to="/profile" className={getLinkClass("/profile")}>Profile</NavLink>
//           <NavLink to="/security" className={getLinkClass("/security")}>Security</NavLink>
//           <NavLink to="/contact" className={getLinkClass("/contact")}>Contact Us</NavLink>

//           {loading ? (
//             <div className="w-16 h-6 bg-red-700 rounded animate-pulse"></div>
//           ) : user ? (
//             <NavbarUserSection />
//           ) : (
//             <button
//               onClick={handleLoginClick}
//               className="px-4 py-2 bg-white text-red-600 font-medium rounded hover:bg-gray-100 transition-colors"
//             >
//               Login
//             </button>
//           )}
//         </div>

//         {/* Mobile Navigation Toggle */}
//         <div className="flex items-center lg:hidden">
//           {!loading && user && <div className="mr-4"><NavbarUserSection /></div>}
//           {!loading && !user && (
//             <button
//               onClick={handleLoginClick}
//               className="mr-4 px-3 py-1 text-sm bg-white text-red-600 font-medium rounded hover:bg-gray-100 transition-colors"
//             >
//               Login
//             </button>
//           )}
//           <HamburgerIcon />
//         </div>
//       </nav>

//       {/* Mobile Menu */}
//       <div
//         className={`fixed inset-x-0 top-[3.5rem] sm:top-16 bg-red-600 shadow-lg transition-transform duration-300 ease-in-out z-40 lg:hidden ${
//           menuOpen ? 'translate-y-0' : '-translate-y-full'
//         }`}
//       >
//         <div className="flex flex-col p-4 space-y-4">
//           <NavLink to="/about" className={`${getLinkClass("/about")} text-white`}>About Us</NavLink>
//           <NavLink to="/profile" className={`${getLinkClass("/profile")} text-white`}>Profile</NavLink>
//           <NavLink to="/security" className={`${getLinkClass("/security")} text-white`}>Security</NavLink>
//           <NavLink to="/contact" className={`${getLinkClass("/contact")} text-white`}>Contact Us</NavLink>
//         </div>
//       </div>

//       {showPinModal && <PinCodeModal />}
//     </>
//   );
// };

// export default Navbar;

// import { NavLink, useLocation, useNavigate } from "react-router-dom";
// import { useState, useEffect } from "react";
// import { getAuth, onAuthStateChanged } from "firebase/auth";
// import NavbarUserSection from "./NavbarUserSection";

// const Navbar = () => {
//   const location = useLocation();
//   const navigate = useNavigate();
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const auth = getAuth();

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
//       setUser(currentUser);
//       setLoading(false);
//     });

//     // Clean up subscription
//     return () => unsubscribe();
//   }, [auth]);

//   const getLinkClass = (path) =>
//     `mx-2 hover:underline ${location.pathname === path ? "font-bold underline" : ""}`;

//   const handleLoginClick = () => {
//     navigate("/login");
//   };

//   return (
//     <nav className="w-full bg-red-600 p-4 text-white flex justify-between items-center fixed top-0 left-0 right-0 z-50">
//       <h1 className="mx-2 hover:underline text-lg font-bold">
//         <NavLink to="/home">Transgression Vigilance</NavLink>
//       </h1>
//       <div className="flex items-center space-x-6">
//         <NavLink to="/about" className={getLinkClass("/about")}>About Us</NavLink>
//         <NavLink to="/profile" className={getLinkClass("/profile")}>Profile</NavLink>
//         <NavLink to="/security" className={getLinkClass("/security")}>Security</NavLink>
//         <NavLink to="/contact" className={getLinkClass("/contact")}>Contact Us</NavLink>

//         {loading ? (
//           <div className="w-16 h-6 bg-red-700 rounded animate-pulse"></div>
//         ) : user ? (
//           <NavbarUserSection />
//         ) : (
//           <button
//             onClick={handleLoginClick}
//             className="px-4 py-2 bg-white text-red-600 font-medium rounded hover:bg-gray-100 transition-colors"
//           >
//             Login
//           </button>
//         )}
//       </div>
//     </nav>
//   );
// };

// export default Navbar;

// import { NavLink, useLocation, useNavigate } from "react-router-dom";
// import { useState, useEffect } from "react";
// import { getAuth, onAuthStateChanged } from "firebase/auth";
// import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
// import NavbarUserSection from "./NavbarUserSection";
// import PinCodeModalWithCombobox from "./PinCodeModalWithCombobox";

// const Navbar = () => {
//   const location = useLocation();
//   const navigate = useNavigate();
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [showPinModal, setShowPinModal] = useState(false);
//   const [currentPinCode, setCurrentPinCode] = useState("");
//   const [menuOpen, setMenuOpen] = useState(false);
//   const auth = getAuth();
//   const db = getFirestore();

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
//       setUser(currentUser);
//       setLoading(false);

//       if (currentUser) {
//         // Fetch user's PIN code from Firestore
//         try {
//           const userRef = doc(db, "users", currentUser.uid);
//           const userSnap = await getDoc(userRef);

//           if (userSnap.exists() && userSnap.data().pinCode) {
//             setCurrentPinCode(userSnap.data().pinCode);
//           }
//         } catch (error) {
//           console.error("Error fetching user PIN code:", error);
//         }
//       }
//     });

//     return () => unsubscribe();
//   }, [auth, db]);

//   // Close mobile menu when location changes
//   useEffect(() => {
//     setMenuOpen(false);
//   }, [location]);

//   const getLinkClass = (path) =>
//     `hover:underline ${location.pathname === path ? "font-bold underline" : ""}`;

//   const handleLoginClick = () => {
//     navigate("/login");
//   };

//   const handlePinCodeSubmit = async (selectedPinCode) => {
//     try {
//       if (user) {
//         const userRef = doc(db, "users", user.uid);
//         await updateDoc(userRef, {
//           pinCode: selectedPinCode
//         });
//         setCurrentPinCode(selectedPinCode);
//         setShowPinModal(false);
//       } else {
//         // For non-logged in users, just set the pincode in local state
//         // You might want to store this in localStorage for persistence
//         setCurrentPinCode(selectedPinCode);
//         setShowPinModal(false);
//       }
//     } catch (error) {
//       console.error("Error updating PIN code:", error);
//     }
//   };

//   // Mobile menu hamburger icon
//   const HamburgerIcon = () => (
//     <button
//       className="block lg:hidden"
//       onClick={() => setMenuOpen(!menuOpen)}
//       aria-label="Toggle menu"
//     >
//       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
//         <path strokeLinecap="round" strokeLinejoin="round" d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"} />
//       </svg>
//     </button>
//   );

//   const LocationButton = () => (
//     <button
//       onClick={() => setShowPinModal(true)}
//       className="flex items-center text-white hover:underline whitespace-nowrap"
//     >
//       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
//         <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
//         <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
//       </svg>
//       {currentPinCode ? (
//         <span className="hidden sm:inline">Area: {currentPinCode}</span>
//       ) : (
//         <span className="hidden sm:inline">Set Location</span>
//       )}
//       <span className="inline sm:hidden">{currentPinCode || "Location"}</span>
//     </button>
//   );

//   return (
//     <>
//       <nav className="w-full bg-red-600 p-3 sm:p-4 text-white flex justify-between items-center fixed top-0 left-0 right-0 z-50">
//         <div className="flex items-center">
//           <h1 className="text-lg font-bold mr-4">
//             <NavLink to="/home">Transgression Vigilance</NavLink>
//           </h1>
//           <LocationButton />
//         </div>

//         {/* Desktop Navigation */}
//         <div className="hidden lg:flex items-center space-x-4 xl:space-x-6">
//           <NavLink to="/about" className={getLinkClass("/about")}>About Us</NavLink>
//           <NavLink to="/profile" className={getLinkClass("/profile")}>Profile</NavLink>
//           <NavLink to="/security" className={getLinkClass("/security")}>Security</NavLink>
//           <NavLink to="/contact" className={getLinkClass("/contact")}>Contact Us</NavLink>

//           {loading ? (
//             <div className="w-16 h-6 bg-red-700 rounded animate-pulse"></div>
//           ) : user ? (
//             <NavbarUserSection />
//           ) : (
//             <button
//               onClick={handleLoginClick}
//               className="px-4 py-2 bg-white text-red-600 font-medium rounded hover:bg-gray-100 transition-colors"
//             >
//               Login
//             </button>
//           )}
//         </div>

//         {/* Mobile Navigation Toggle */}
//         <div className="flex items-center lg:hidden">
//           {!loading && user && <div className="mr-4"><NavbarUserSection /></div>}
//           {!loading && !user && (
//             <button
//               onClick={handleLoginClick}
//               className="mr-4 px-3 py-1 text-sm bg-white text-red-600 font-medium rounded hover:bg-gray-100 transition-colors"
//             >
//               Login
//             </button>
//           )}
//           <HamburgerIcon />
//         </div>
//       </nav>

//       {/* Mobile Menu */}
//       <div
//         className={`fixed inset-x-0 top-[3.5rem] sm:top-16 bg-red-600 shadow-lg transition-transform duration-300 ease-in-out z-40 lg:hidden ${
//           menuOpen ? 'translate-y-0' : '-translate-y-full'
//         }`}
//       >
//         <div className="flex flex-col p-4 space-y-4">
//           <NavLink to="/about" className={`${getLinkClass("/about")} text-white`}>About Us</NavLink>
//           <NavLink to="/profile" className={`${getLinkClass("/profile")} text-white`}>Profile</NavLink>
//           <NavLink to="/security" className={`${getLinkClass("/security")} text-white`}>Security</NavLink>
//           <NavLink to="/contact" className={`${getLinkClass("/contact")} text-white`}>Contact Us</NavLink>
//         </div>
//       </div>

//       {/* Location Search Modal */}
//       {showPinModal && (
//         <PinCodeModalWithCombobox
//           onClose={() => setShowPinModal(false)}
//           onSubmit={handlePinCodeSubmit}
//           initialValue={currentPinCode}
//         />
//       )}
//     </>
//   );
// };

// export default Navbar;

// import { NavLink, useLocation, useNavigate } from "react-router-dom";
// import { useState, useEffect } from "react";
// import { getAuth, onAuthStateChanged } from "firebase/auth";
// import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
// import NavbarUserSection from "./NavbarUserSection";
// import PinCodeModalWithCombobox from "./PinCodeModalWithCombobox";
// import logoImage from "./assets/logoabout.png"; // Adjust path as needed

// const Navbar = () => {
//   const location = useLocation();
//   const navigate = useNavigate();
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [showPinModal, setShowPinModal] = useState(false);
//   const [currentPinCode, setCurrentPinCode] = useState("");
//   const [menuOpen, setMenuOpen] = useState(false);
//   const auth = getAuth();
//   const db = getFirestore();

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
//       setUser(currentUser);
//       setLoading(false);
      
//       if (currentUser) {
//         // Fetch user's PIN code from Firestore
//         try {
//           const userRef = doc(db, "users", currentUser.uid);
//           const userSnap = await getDoc(userRef);
          
//           if (userSnap.exists() && userSnap.data().pinCode) {
//             setCurrentPinCode(userSnap.data().pinCode);
//           }
//         } catch (error) {
//           console.error("Error fetching user PIN code:", error);
//         }
//       }
//     });

//     return () => unsubscribe();
//   }, [auth, db]);

//   // Close mobile menu when location changes
//   useEffect(() => {
//     setMenuOpen(false);
//   }, [location]);

//   const getLinkClass = (path) =>
//     `hover:underline ${location.pathname === path ? "font-bold underline" : ""}`;

//   const handleLoginClick = () => {
//     navigate("/login");
//   };

//   const handlePinCodeSubmit = async (selectedPinCode) => {
//     try {
//       // Only perform the update if the PIN code has actually changed
//       if (selectedPinCode !== currentPinCode) {
//         if (user) {
//           const userRef = doc(db, "users", user.uid);
//           await updateDoc(userRef, {
//             pinCode: selectedPinCode
//           });
//         } else {
//           // For non-logged in users, consider storing in localStorage
//           localStorage.setItem("userPinCode", selectedPinCode);
//         }
        
//         // Update the state and reload the page
//         setCurrentPinCode(selectedPinCode);
//         setShowPinModal(false);
        
//         // Reload the current page to refresh data based on new PIN code
//         window.location.reload();
//       } else {
//         // Close the modal if PIN code hasn't changed
//         setShowPinModal(false);
//       }
//     } catch (error) {
//       console.error("Error updating PIN code:", error);
//     }
//   };
  
//   // Mobile menu hamburger icon
//   const HamburgerIcon = () => (
//     <button 
//       className="block lg:hidden"
//       onClick={() => setMenuOpen(!menuOpen)}
//       aria-label="Toggle menu"
//     >
//       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
//         <path strokeLinecap="round" strokeLinejoin="round" d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"} />
//       </svg>
//     </button>
//   );

//   const LocationButton = () => (
//     <button 
//       onClick={() => setShowPinModal(true)}
//       className="flex items-center text-white hover:underline whitespace-nowrap" 
//     >
//       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
//         <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
//         <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
//       </svg>
//       {currentPinCode ? (
//         <span className="hidden sm:inline">Area: {currentPinCode}</span>
//       ) : (
//         <span className="hidden sm:inline">Set Location</span>
//       )}
//       <span className="inline sm:hidden">{currentPinCode || "Location"}</span>
//     </button>
//   );

//   return (
//     <>
//       <nav className="w-full bg-red-600 p-3 sm:p-4 text-white flex justify-between items-center fixed top-0 left-0 right-0 z-50">
//         <div className="flex items-center">
//           {/* Logo added here */}
//           <div className="mr-2">
//             <img 
//               src={logoImage} 
//               alt="Transgression Vigilance Logo" 
//               className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white object-cover"
//             />
//           </div>
//           <h1 className="text-lg font-bold mr-4">
//             <NavLink to="/home" className="flex items-center">
//               Transgression Vigilance
//             </NavLink>
//           </h1>
//           <LocationButton />
//         </div>

//         {/* Desktop Navigation */}
//         <div className="hidden lg:flex items-center space-x-4 xl:space-x-6">
//           <NavLink to="/about" className={getLinkClass("/about")}>About Us</NavLink>
//           <NavLink to="/profile" className={getLinkClass("/profile")}>Profile</NavLink>
//           <NavLink to="/security" className={getLinkClass("/security")}>Security</NavLink>
//           <NavLink to="/contact" className={getLinkClass("/contact")}>Contact Us</NavLink>
          
//           {loading ? (
//             <div className="w-16 h-6 bg-red-700 rounded animate-pulse"></div>
//           ) : user ? (
//             <NavbarUserSection />
//           ) : (
//             <button 
//               onClick={handleLoginClick}
//               className="px-4 py-2 bg-white text-red-600 font-medium rounded hover:bg-gray-100 transition-colors"
//             >
//               Login
//             </button>
//           )}
//         </div>

//         {/* Mobile Navigation Toggle */}
//         <div className="flex items-center lg:hidden">
//           {!loading && user && <div className="mr-4"><NavbarUserSection /></div>}
//           {!loading && !user && (
//             <button 
//               onClick={handleLoginClick}
//               className="mr-4 px-3 py-1 text-sm bg-white text-red-600 font-medium rounded hover:bg-gray-100 transition-colors"
//             >
//               Login
//             </button>
//           )}
//           <HamburgerIcon />
//         </div>
//       </nav>

//       {/* Mobile Menu */}
//       <div 
//         className={`fixed inset-x-0 top-[3.5rem] sm:top-16 bg-red-600 shadow-lg transition-transform duration-300 ease-in-out z-40 lg:hidden ${
//           menuOpen ? 'translate-y-0' : '-translate-y-full'
//         }`}
//       >
//         <div className="flex flex-col p-4 space-y-4">
//           <NavLink to="/about" className={`${getLinkClass("/about")} text-white`}>About Us</NavLink>
//           <NavLink to="/profile" className={`${getLinkClass("/profile")} text-white`}>Profile</NavLink>
//           <NavLink to="/security" className={`${getLinkClass("/security")} text-white`}>Security</NavLink>
//           <NavLink to="/contact" className={`${getLinkClass("/contact")} text-white`}>Contact Us</NavLink>
//         </div>
//       </div>
      
//       {/* Location Search Modal */}
//       {showPinModal && (
//         <PinCodeModalWithCombobox 
//           onClose={() => setShowPinModal(false)}
//           onSubmit={handlePinCodeSubmit}
//           initialValue={currentPinCode}
//         />
//       )}
//     </>
//   );
// };

// export default Navbar;





// // import { NavLink, useLocation, useNavigate } from "react-router-dom";
// // import { useState, useEffect } from "react";
// // import { getAuth, onAuthStateChanged } from "firebase/auth";
// // import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
// // import NavbarUserSection from "./NavbarUserSection";
// // import PinCodeModalWithCombobox from "./PinCodeModalWithCombobox";

// // const Navbar = () => {
// //   const location = useLocation();
// //   const navigate = useNavigate();
// //   const [user, setUser] = useState(null);
// //   const [loading, setLoading] = useState(true);
// //   const [showPinModal, setShowPinModal] = useState(false);
// //   const [currentPinCode, setCurrentPinCode] = useState("");
// //   const [menuOpen, setMenuOpen] = useState(false);
// //   const auth = getAuth();
// //   const db = getFirestore();

// //   useEffect(() => {
// //     const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
// //       setUser(currentUser);
// //       setLoading(false);
      
// //       if (currentUser) {
// //         // Fetch user's PIN code from Firestore
// //         try {
// //           const userRef = doc(db, "users", currentUser.uid);
// //           const userSnap = await getDoc(userRef);
          
// //           if (userSnap.exists() && userSnap.data().pinCode) {
// //             setCurrentPinCode(userSnap.data().pinCode);
// //           }
// //         } catch (error) {
// //           console.error("Error fetching user PIN code:", error);
// //         }
// //       }
// //     });

// //     return () => unsubscribe();
// //   }, [auth, db]);

// //   // Close mobile menu when location changes
// //   useEffect(() => {
// //     setMenuOpen(false);
// //   }, [location]);

// //   const getLinkClass = (path) =>
// //     `hover:underline ${location.pathname === path ? "font-bold underline" : ""}`;

// //   const handleLoginClick = () => {
// //     navigate("/login");
// //   };

// //   const handlePinCodeSubmit = async (selectedPinCode) => {
// //     try {
// //       // Only perform the update if the PIN code has actually changed
// //       if (selectedPinCode !== currentPinCode) {
// //         if (user) {
// //           const userRef = doc(db, "users", user.uid);
// //           await updateDoc(userRef, {
// //             pinCode: selectedPinCode
// //           });
// //         } else {
// //           // For non-logged in users, consider storing in localStorage
// //           localStorage.setItem("userPinCode", selectedPinCode);
// //         }
        
// //         // Update the state and reload the page
// //         setCurrentPinCode(selectedPinCode);
// //         setShowPinModal(false);
        
// //         // Reload the current page to refresh data based on new PIN code
// //         window.location.reload();
// //       } else {
// //         // Close the modal if PIN code hasn't changed
// //         setShowPinModal(false);
// //       }
// //     } catch (error) {
// //       console.error("Error updating PIN code:", error);
// //     }
// //   };
  
// //   // Mobile menu hamburger icon
// //   const HamburgerIcon = () => (
// //     <button 
// //       className="block lg:hidden"
// //       onClick={() => setMenuOpen(!menuOpen)}
// //       aria-label="Toggle menu"
// //     >
// //       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
// //         <path strokeLinecap="round" strokeLinejoin="round" d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"} />
// //       </svg>
// //     </button>
// //   );

// //   const LocationButton = () => (
// //     <button 
// //       onClick={() => setShowPinModal(true)}
// //       className="flex items-center text-white hover:underline whitespace-nowrap" 
// //     >
// //       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
// //         <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
// //         <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
// //       </svg>
// //       {currentPinCode ? (
// //         <span className="hidden sm:inline">Area: {currentPinCode}</span>
// //       ) : (
// //         <span className="hidden sm:inline">Set Location</span>
// //       )}
// //       <span className="inline sm:hidden">{currentPinCode || "Location"}</span>
// //     </button>
// //   );

// //   return (
// //     <>
// //       <nav className="w-full bg-red-600 p-3 sm:p-4 text-white flex justify-between items-center fixed top-0 left-0 right-0 z-50">
// //         <div className="flex items-center">
// //           <h1 className="text-lg font-bold mr-4">
// //             <NavLink to="/home">Transgression Vigilance</NavLink>
// //           </h1>
// //           <LocationButton />
// //         </div>

// //         {/* Desktop Navigation */}
// //         <div className="hidden lg:flex items-center space-x-4 xl:space-x-6">
// //           <NavLink to="/about" className={getLinkClass("/about")}>About Us</NavLink>
// //           <NavLink to="/profile" className={getLinkClass("/profile")}>Profile</NavLink>
// //           <NavLink to="/security" className={getLinkClass("/security")}>Security</NavLink>
// //           <NavLink to="/contact" className={getLinkClass("/contact")}>Contact Us</NavLink>
          
// //           {loading ? (
// //             <div className="w-16 h-6 bg-red-700 rounded animate-pulse"></div>
// //           ) : user ? (
// //             <NavbarUserSection />
// //           ) : (
// //             <button 
// //               onClick={handleLoginClick}
// //               className="px-4 py-2 bg-white text-red-600 font-medium rounded hover:bg-gray-100 transition-colors"
// //             >
// //               Login
// //             </button>
// //           )}
// //         </div>

// //         {/* Mobile Navigation Toggle */}
// //         <div className="flex items-center lg:hidden">
// //           {!loading && user && <div className="mr-4"><NavbarUserSection /></div>}
// //           {!loading && !user && (
// //             <button 
// //               onClick={handleLoginClick}
// //               className="mr-4 px-3 py-1 text-sm bg-white text-red-600 font-medium rounded hover:bg-gray-100 transition-colors"
// //             >
// //               Login
// //             </button>
// //           )}
// //           <HamburgerIcon />
// //         </div>
// //       </nav>

// //       {/* Mobile Menu */}
// //       <div 
// //         className={`fixed inset-x-0 top-[3.5rem] sm:top-16 bg-red-600 shadow-lg transition-transform duration-300 ease-in-out z-40 lg:hidden ${
// //           menuOpen ? 'translate-y-0' : '-translate-y-full'
// //         }`}
// //       >
// //         <div className="flex flex-col p-4 space-y-4">
// //           <NavLink to="/about" className={`${getLinkClass("/about")} text-white`}>About Us</NavLink>
// //           <NavLink to="/profile" className={`${getLinkClass("/profile")} text-white`}>Profile</NavLink>
// //           <NavLink to="/security" className={`${getLinkClass("/security")} text-white`}>Security</NavLink>
// //           <NavLink to="/contact" className={`${getLinkClass("/contact")} text-white`}>Contact Us</NavLink>
// //         </div>
// //       </div>
      
// //       {/* Location Search Modal */}
// //       {showPinModal && (
// //         <PinCodeModalWithCombobox 
// //           onClose={() => setShowPinModal(false)}
// //           onSubmit={handlePinCodeSubmit}
// //           initialValue={currentPinCode}
// //         />
// //       )}
// //     </>
// //   );
// // };

// // export default Navbar;




// //extra other past codes 


// // import { NavLink, useLocation, useNavigate } from "react-router-dom";
// // import { useState, useEffect, useRef } from "react";
// // import { getAuth, onAuthStateChanged } from "firebase/auth";
// // import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
// // import NavbarUserSection from "./NavbarUserSection";

// // const Navbar = () => {
// //   const location = useLocation();
// //   const navigate = useNavigate();
// //   const [user, setUser] = useState(null);
// //   const [loading, setLoading] = useState(true);
// //   const [showPinModal, setShowPinModal] = useState(false);
// //   const [pinCode, setPinCode] = useState("");
// //   const [pinError, setPinError] = useState("");
// //   const [currentPinCode, setCurrentPinCode] = useState("");
// //   const [menuOpen, setMenuOpen] = useState(false);
// //   const pinInputRef = useRef(null);
// //   const auth = getAuth();
// //   const db = getFirestore();

// //   useEffect(() => {
// //     const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
// //       setUser(currentUser);
// //       setLoading(false);
      
// //       if (currentUser) {
// //         // Fetch user's PIN code from Firestore
// //         try {
// //           const userRef = doc(db, "users", currentUser.uid);
// //           const userSnap = await getDoc(userRef);
          
// //           if (userSnap.exists() && userSnap.data().pinCode) {
// //             setCurrentPinCode(userSnap.data().pinCode);
// //           }
// //         } catch (error) {
// //           console.error("Error fetching user PIN code:", error);
// //         }
// //       }
// //     });

// //     return () => unsubscribe();
// //   }, [auth, db]);

// //   // Focus input when modal opens
// //   useEffect(() => {
// //     if (showPinModal && pinInputRef.current) {
// //       setTimeout(() => {
// //         pinInputRef.current.focus();
// //       }, 100);
// //     }
// //   }, [showPinModal]);

// //   // Close mobile menu when location changes
// //   useEffect(() => {
// //     setMenuOpen(false);
// //   }, [location]);

// //   const getLinkClass = (path) =>
// //     `hover:underline ${location.pathname === path ? "font-bold underline" : ""}`;

// //   const handleLoginClick = () => {
// //     navigate("/login");
// //   };

// //   const validatePinCode = (value) => {
// //     if (!/^\d*$/.test(value)) {
// //       setPinError("PIN code must contain only numbers");
// //       return false;
// //     } else if (value.length > 6) {
// //       setPinError("PIN code must be 6 digits or less");
// //       return false;
// //     } else {
// //       setPinError("");
// //       return true;
// //     }
// //   };

// //   const handlePinCodeChange = (e) => {
// //     const value = e.target.value;
    
// //     // Only update if it's valid input
// //     if (value.length <= 6 && /^\d*$/.test(value)) {
// //       setPinCode(value);
// //       setPinError("");
// //     } else if (value.length > 6) {
// //       setPinCode(value.slice(0, 6));
// //       setPinError("PIN code must be 6 digits or less");
// //     } else if (!/^\d*$/.test(value)) {
// //       setPinError("PIN code must contain only numbers");
// //     }
    
// //     // Make sure to maintain focus
// //     if (pinInputRef.current) {
// //       pinInputRef.current.focus();
// //     }
// //   };

// //   const handlePinCodeSubmit = async () => {
// //     if (!pinCode.trim()) {
// //       setPinError("Please enter a PIN code");
// //       return;
// //     }
    
// //     if (!validatePinCode(pinCode)) {
// //       return;
// //     }
    
// //     try {
// //       if (user) {
// //         const userRef = doc(db, "users", user.uid);
// //         await updateDoc(userRef, {
// //           pinCode: pinCode.trim()
// //         });
// //         setCurrentPinCode(pinCode.trim());
// //         setPinCode("");
// //         setPinError("");
// //         setShowPinModal(false);
// //       }
// //     } catch (error) {
// //       console.error("Error updating PIN code:", error);
// //     }
// //   };

// //   const PinCodeModal = () => (
// //     <div 
// //       className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4" 
// //       onClick={() => setShowPinModal(false)}
// //     >
// //       <div 
// //         className="bg-white rounded-lg w-full max-w-md p-4 sm:p-6 text-gray-800 shadow-xl" 
// //         onClick={(e) => e.stopPropagation()}
// //       >
// //         <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-4">Enter PIN Code</h2>
// //         <p className="text-gray-600 text-sm sm:text-base mb-4">
// //           Enter PIN code to see the crime cases around you.
// //         </p>
        
// //         <div className="mb-4 sm:mb-6">
// //           <label className="block text-gray-700 text-sm sm:text-base mb-2">PIN Code</label>
// //           <div className="flex relative">
// //             <div className="flex items-center absolute left-0 top-0 bottom-0 ml-2">
// //               <span className="text-gray-500">
// //                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
// //                   <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
// //                   <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
// //                 </svg>
// //               </span>
// //             </div>
// //             <input
// //               ref={pinInputRef}
// //               type="text"
// //               value={pinCode}
// //               onChange={handlePinCodeChange}
// //               placeholder="Enter your Pincode"
// //               className="w-full border-b border-gray-300 focus:outline-none focus:border-blue-500 py-2 pl-10"
// //               maxLength={6}
// //               inputMode="numeric"
// //               onFocus={(e) => {
// //                 // Ensure cursor is at the end
// //                 const val = e.target.value;
// //                 e.target.value = '';
// //                 e.target.value = val;
// //               }}
// //             />
// //           </div>
// //           {pinError && (
// //             <p className="text-red-500 text-sm mt-1">{pinError}</p>
// //           )}
// //         </div>
        
// //         <div className="flex justify-end">
// //           <button
// //             onClick={() => {
// //               setShowPinModal(false);
// //               setPinError("");
// //             }}
// //             className="mr-2 px-4 sm:px-6 py-2 text-gray-600 hover:text-gray-800 text-sm sm:text-base"
// //           >
// //             Cancel
// //           </button>
// //           <button
// //             onClick={handlePinCodeSubmit}
// //             className="px-4 sm:px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 text-sm sm:text-base"
// //           >
// //             Apply
// //           </button>
// //         </div>
// //       </div>
// //     </div>
// //   );

// //   // Mobile menu hamburger icon
// //   const HamburgerIcon = () => (
// //     <button 
// //       className="block lg:hidden"
// //       onClick={() => setMenuOpen(!menuOpen)}
// //       aria-label="Toggle menu"
// //     >
// //       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
// //         <path strokeLinecap="round" strokeLinejoin="round" d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"} />
// //       </svg>
// //     </button>
// //   );

// //   const LocationButton = () => (
// //     <button 
// //       onClick={() => {
// //         setShowPinModal(true);
// //         // Pre-fill with current pin code if it exists
// //         if (currentPinCode) {
// //           setPinCode(currentPinCode);
// //         }
// //       }}
// //       className="flex items-center text-white hover:underline whitespace-nowrap"
// //     >
// //       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
// //         <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
// //         <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
// //       </svg>
// //       {currentPinCode ? (
// //         <span className="hidden sm:inline">Area: {currentPinCode}</span>
// //       ) : (
// //         <span className="hidden sm:inline">Set Location</span>
// //       )}
// //       <span className="inline sm:hidden">{currentPinCode || "Location"}</span>
// //     </button>
// //   );

// //   return (
// //     <>
// //       <nav className="w-full bg-red-600 p-3 sm:p-4 text-white flex justify-between items-center fixed top-0 left-0 right-0 z-50">
// //         <div className="flex items-center">
// //           <h1 className="text-lg font-bold mr-4">
// //             <NavLink to="/home">Transgression Vigilance</NavLink>
// //           </h1>
// //           <LocationButton />
// //         </div>

// //         {/* Desktop Navigation */}
// //         <div className="hidden lg:flex items-center space-x-4 xl:space-x-6">
// //           <NavLink to="/about" className={getLinkClass("/about")}>About Us</NavLink>
// //           <NavLink to="/profile" className={getLinkClass("/profile")}>Profile</NavLink>
// //           <NavLink to="/security" className={getLinkClass("/security")}>Security</NavLink>
// //           <NavLink to="/contact" className={getLinkClass("/contact")}>Contact Us</NavLink>
          
// //           {loading ? (
// //             <div className="w-16 h-6 bg-red-700 rounded animate-pulse"></div>
// //           ) : user ? (
// //             <NavbarUserSection />
// //           ) : (
// //             <button 
// //               onClick={handleLoginClick}
// //               className="px-4 py-2 bg-white text-red-600 font-medium rounded hover:bg-gray-100 transition-colors"
// //             >
// //               Login
// //             </button>
// //           )}
// //         </div>

// //         {/* Mobile Navigation Toggle */}
// //         <div className="flex items-center lg:hidden">
// //           {!loading && user && <div className="mr-4"><NavbarUserSection /></div>}
// //           {!loading && !user && (
// //             <button 
// //               onClick={handleLoginClick}
// //               className="mr-4 px-3 py-1 text-sm bg-white text-red-600 font-medium rounded hover:bg-gray-100 transition-colors"
// //             >
// //               Login
// //             </button>
// //           )}
// //           <HamburgerIcon />
// //         </div>
// //       </nav>

// //       {/* Mobile Menu */}
// //       <div 
// //         className={`fixed inset-x-0 top-[3.5rem] sm:top-16 bg-red-600 shadow-lg transition-transform duration-300 ease-in-out z-40 lg:hidden ${
// //           menuOpen ? 'translate-y-0' : '-translate-y-full'
// //         }`}
// //       >
// //         <div className="flex flex-col p-4 space-y-4">
// //           <NavLink to="/about" className={`${getLinkClass("/about")} text-white`}>About Us</NavLink>
// //           <NavLink to="/profile" className={`${getLinkClass("/profile")} text-white`}>Profile</NavLink>
// //           <NavLink to="/security" className={`${getLinkClass("/security")} text-white`}>Security</NavLink>
// //           <NavLink to="/contact" className={`${getLinkClass("/contact")} text-white`}>Contact Us</NavLink>
// //         </div>
// //       </div>
      
// //       {showPinModal && <PinCodeModal />}
// //     </>
// //   );
// // };

// // export default Navbar;


// // import { NavLink, useLocation, useNavigate } from "react-router-dom";
// // import { useState, useEffect } from "react";
// // import { getAuth, onAuthStateChanged } from "firebase/auth";
// // import NavbarUserSection from "./NavbarUserSection";

// // const Navbar = () => {
// //   const location = useLocation();
// //   const navigate = useNavigate();
// //   const [user, setUser] = useState(null);
// //   const [loading, setLoading] = useState(true);
// //   const auth = getAuth();

// //   useEffect(() => {
// //     const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
// //       setUser(currentUser);
// //       setLoading(false);
// //     });

// //     // Clean up subscription
// //     return () => unsubscribe();
// //   }, [auth]);

// //   const getLinkClass = (path) =>
// //     `mx-2 hover:underline ${location.pathname === path ? "font-bold underline" : ""}`;

// //   const handleLoginClick = () => {
// //     navigate("/login");
// //   };

// //   return (
// //     <nav className="w-full bg-red-600 p-4 text-white flex justify-between items-center fixed top-0 left-0 right-0 z-50">
// //       <h1 className="mx-2 hover:underline text-lg font-bold">
// //         <NavLink to="/home">Transgression Vigilance</NavLink>
// //       </h1>
// //       <div className="flex items-center space-x-6">
// //         <NavLink to="/about" className={getLinkClass("/about")}>About Us</NavLink>
// //         <NavLink to="/profile" className={getLinkClass("/profile")}>Profile</NavLink>
// //         <NavLink to="/security" className={getLinkClass("/security")}>Security</NavLink>
// //         <NavLink to="/contact" className={getLinkClass("/contact")}>Contact Us</NavLink>
        
// //         {loading ? (
// //           <div className="w-16 h-6 bg-red-700 rounded animate-pulse"></div>
// //         ) : user ? (
// //           <NavbarUserSection />
// //         ) : (
// //           <button 
// //             onClick={handleLoginClick}
// //             className="px-4 py-2 bg-white text-red-600 font-medium rounded hover:bg-gray-100 transition-colors"
// //           >
// //             Login
// //           </button>
// //         )}
// //       </div>
// //     </nav>
// //   );
// // };

// // export default Navbar;

// // import { NavLink, useLocation, useNavigate } from "react-router-dom";
// // import { useState, useEffect } from "react";
// // import { getAuth, onAuthStateChanged } from "firebase/auth";
// // import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
// // import NavbarUserSection from "./NavbarUserSection";
// // import PinCodeModalWithCombobox from "./PinCodeModalWithCombobox";

// // const Navbar = () => {
// //   const location = useLocation();
// //   const navigate = useNavigate();
// //   const [user, setUser] = useState(null);
// //   const [loading, setLoading] = useState(true);
// //   const [showPinModal, setShowPinModal] = useState(false);
// //   const [currentPinCode, setCurrentPinCode] = useState("");
// //   const [menuOpen, setMenuOpen] = useState(false);
// //   const auth = getAuth();
// //   const db = getFirestore();

// //   useEffect(() => {
// //     const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
// //       setUser(currentUser);
// //       setLoading(false);
      
// //       if (currentUser) {
// //         // Fetch user's PIN code from Firestore
// //         try {
// //           const userRef = doc(db, "users", currentUser.uid);
// //           const userSnap = await getDoc(userRef);
          
// //           if (userSnap.exists() && userSnap.data().pinCode) {
// //             setCurrentPinCode(userSnap.data().pinCode);
// //           }
// //         } catch (error) {
// //           console.error("Error fetching user PIN code:", error);
// //         }
// //       }
// //     });

// //     return () => unsubscribe();
// //   }, [auth, db]);

// //   // Close mobile menu when location changes
// //   useEffect(() => {
// //     setMenuOpen(false);
// //   }, [location]);

// //   const getLinkClass = (path) =>
// //     `hover:underline ${location.pathname === path ? "font-bold underline" : ""}`;

// //   const handleLoginClick = () => {
// //     navigate("/login");
// //   };

// //   const handlePinCodeSubmit = async (selectedPinCode) => {
// //     try {
// //       if (user) {
// //         const userRef = doc(db, "users", user.uid);
// //         await updateDoc(userRef, {
// //           pinCode: selectedPinCode
// //         });
// //         setCurrentPinCode(selectedPinCode);
// //         setShowPinModal(false);
// //       } else {
// //         // For non-logged in users, just set the pincode in local state
// //         // You might want to store this in localStorage for persistence
// //         setCurrentPinCode(selectedPinCode);
// //         setShowPinModal(false);
// //       }
// //     } catch (error) {
// //       console.error("Error updating PIN code:", error);
// //     }
// //   };
  
// //   // Mobile menu hamburger icon
// //   const HamburgerIcon = () => (
// //     <button 
// //       className="block lg:hidden"
// //       onClick={() => setMenuOpen(!menuOpen)}
// //       aria-label="Toggle menu"
// //     >
// //       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
// //         <path strokeLinecap="round" strokeLinejoin="round" d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"} />
// //       </svg>
// //     </button>
// //   );

// //   const LocationButton = () => (
// //     <button 
// //       onClick={() => setShowPinModal(true)}
// //       className="flex items-center text-white hover:underline whitespace-nowrap" 
// //     >
// //       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
// //         <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
// //         <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
// //       </svg>
// //       {currentPinCode ? (
// //         <span className="hidden sm:inline">Area: {currentPinCode}</span>
// //       ) : (
// //         <span className="hidden sm:inline">Set Location</span>
// //       )}
// //       <span className="inline sm:hidden">{currentPinCode || "Location"}</span>
// //     </button>
// //   );

// //   return (
// //     <>
// //       <nav className="w-full bg-red-600 p-3 sm:p-4 text-white flex justify-between items-center fixed top-0 left-0 right-0 z-50">
// //         <div className="flex items-center">
// //           <h1 className="text-lg font-bold mr-4">
// //             <NavLink to="/home">Transgression Vigilance</NavLink>
// //           </h1>
// //           <LocationButton />
// //         </div>

// //         {/* Desktop Navigation */}
// //         <div className="hidden lg:flex items-center space-x-4 xl:space-x-6">
// //           <NavLink to="/about" className={getLinkClass("/about")}>About Us</NavLink>
// //           <NavLink to="/profile" className={getLinkClass("/profile")}>Profile</NavLink>
// //           <NavLink to="/security" className={getLinkClass("/security")}>Security</NavLink>
// //           <NavLink to="/contact" className={getLinkClass("/contact")}>Contact Us</NavLink>
          
// //           {loading ? (
// //             <div className="w-16 h-6 bg-red-700 rounded animate-pulse"></div>
// //           ) : user ? (
// //             <NavbarUserSection />
// //           ) : (
// //             <button 
// //               onClick={handleLoginClick}
// //               className="px-4 py-2 bg-white text-red-600 font-medium rounded hover:bg-gray-100 transition-colors"
// //             >
// //               Login
// //             </button>
// //           )}
// //         </div>

// //         {/* Mobile Navigation Toggle */}
// //         <div className="flex items-center lg:hidden">
// //           {!loading && user && <div className="mr-4"><NavbarUserSection /></div>}
// //           {!loading && !user && (
// //             <button 
// //               onClick={handleLoginClick}
// //               className="mr-4 px-3 py-1 text-sm bg-white text-red-600 font-medium rounded hover:bg-gray-100 transition-colors"
// //             >
// //               Login
// //             </button>
// //           )}
// //           <HamburgerIcon />
// //         </div>
// //       </nav>

// //       {/* Mobile Menu */}
// //       <div 
// //         className={`fixed inset-x-0 top-[3.5rem] sm:top-16 bg-red-600 shadow-lg transition-transform duration-300 ease-in-out z-40 lg:hidden ${
// //           menuOpen ? 'translate-y-0' : '-translate-y-full'
// //         }`}
// //       >
// //         <div className="flex flex-col p-4 space-y-4">
// //           <NavLink to="/about" className={`${getLinkClass("/about")} text-white`}>About Us</NavLink>
// //           <NavLink to="/profile" className={`${getLinkClass("/profile")} text-white`}>Profile</NavLink>
// //           <NavLink to="/security" className={`${getLinkClass("/security")} text-white`}>Security</NavLink>
// //           <NavLink to="/contact" className={`${getLinkClass("/contact")} text-white`}>Contact Us</NavLink>
// //         </div>
// //       </div>
      
// //       {/* Location Search Modal */}
// //       {showPinModal && (
// //         <PinCodeModalWithCombobox 
// //           onClose={() => setShowPinModal(false)}
// //           onSubmit={handlePinCodeSubmit}
// //           initialValue={currentPinCode}
// //         />
// //       )}
// //     </>
// //   );
// // };

// // export default Navbar;

