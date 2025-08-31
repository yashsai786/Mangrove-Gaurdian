// import React, { useEffect, useState } from "react";
// import { auth, db } from "./config/firebase";
// import { doc, getDoc } from "firebase/firestore";
// import { useNavigate } from "react-router-dom";
// import SelfPosts from "./selfposts";
// import CreatePost from "./CreatePost";
// import Navbar from "./Navbar";

// const Profile = () => {
//   const [userData, setUserData] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const navigate = useNavigate();
//   const [showModal, setShowModal] = useState(false);
    
//   useEffect(() => {
//     const unsubscribe = auth.onAuthStateChanged(async (user) => {
//       if (user) {
//         try {
//           const userDoc = await getDoc(doc(db, "users", user.uid));
//           if (userDoc.exists()) {
//             setUserData(userDoc.data());
//           } else {
//             console.error("No user data found");
//           }
//         } catch (error) {
//           console.error("Error fetching user data:", error);
//         }
//       } else {
//         navigate("/"); // Redirect only if user is not authenticated
//       }
//       setLoading(false); // Stop loading once we get auth state
//     });

//     return () => unsubscribe(); // Cleanup on unmount
//   }, [navigate]);

//   const handleLogout = async () => {
//     try {
//       await auth.signOut();
//       navigate("/");
//     } catch (error) {
//       console.error("Logout error", error);
//     }
//   };

//   if (loading) {
//     return <div className="text-center mt-10">Loading...</div>;
//   }

//   if (!userData) {
//     return <div className="text-center mt-10">No user data found</div>;
//   }

//   return (
//     <div className="min-h-screen bg-gray-100">
//       <Navbar/>
      
//       <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md relative mt-20 mx-auto">
//         <h2 className="text-2xl font-bold text-center mb-4">User Details</h2>
//         <p><strong>Username:</strong> {userData.username}</p>
//         <p><strong>Email:</strong> {userData.email}</p>
//         <p><strong>Contact:</strong> {userData.contact}</p>
//         <p><strong>DOB:</strong> {userData.dob}</p>
//         <p><strong>Gender:</strong> {userData.gender}</p>
//         <p><strong>Address:</strong> {userData.address}</p>
//         <p><strong>Registration Date:</strong> {new Date(userData.reg_date?.seconds * 1000).toLocaleString()}</p>
//       </div>
//       <button
//         className="fixed bottom-6 right-6 bg-red-600 text-white p-4 rounded-full shadow-lg text-2xl"
//         onClick={() => setShowModal(true)}
//       >
//         +
//       </button>

//       {/* Post Modal */}
//       {showModal && <CreatePost onClose={() => setShowModal(false)} />}
//       {/* User Posts Section */}
//       {/* <UserPosts userId={auth.currentUser?.uid} /> */}
//       <SelfPosts/>
//     </div>
//   );
// };

// export default Profile;

import React, { useEffect, useState } from "react";
import { auth, db } from "./config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import SelfPosts from "./selfposts";
import CreatePost from "./CreatePost";
import CompleteProfile from "./CompleteProfile"; // Import your existing component
import Navbar from "./Navbar";
import UpdateProfile from "./UpdateProfile";
import { Suspense } from "react";
const Leaderboard = React.lazy(() => import("./admin/Leaderboard.jsx"));

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const [showEditProfile, setShowEditProfile] = useState(false);
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
    
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          } else {
            console.error("No user data found");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        navigate("/"); // Redirect only if user is not authenticated
      }
      setLoading(false); // Stop loading once we get auth state
    });

    return () => unsubscribe(); // Cleanup on unmount
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl font-medium text-gray-700">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold mb-2">No User Data Found</h2>
          <p className="text-gray-600 mb-4">We couldn't find your profile information.</p>
          <button 
            onClick={() => navigate("/")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  // Get first letter of username for fallback avatar
  const userInitial = userData.username ? userData.username.charAt(0).toUpperCase() : "U";
  const regDate = userData.reg_date ? new Date(userData.reg_date.seconds * 1000).toLocaleDateString() : "N/A";
  const userPoints = userData.points || 0;
  const userBadges = userData.badges || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar />
      
      {showEditProfile ? (
        <UpdateProfile onClose={() => setShowEditProfile(false)} />
      ) : (
        <div className="container mx-auto px-4 py-8 mt-16">
          {/* Profile Header */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-16"></div>
            <div className="px-6 py-4 flex flex-col md:flex-row items-center md:items-end relative">
              {/* User Avatar */}
              <div className="absolute transform -translate-y-1/2 left-1/2 md:left-6 -translate-x-1/2 md:translate-x-0">
                {userData.profilePic ? (
                  <div className="w-24 h-24 rounded-full border-4 border-white overflow-hidden">
                    <img 
                      src={userData.profilePic} 
                      alt={`${userData.username}'s profile`} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-4xl font-bold border-4 border-white">
                    {userInitial}
                  </div>
                )}
              </div>
              
              {/* Username and Member Since */}
              <div className="mt-12 md:mt-0 md:ml-32 text-center md:text-left">
                <h1 className="text-3xl font-bold text-gray-800">{userData.username}</h1>
                <p className="text-gray-500">Member since {regDate}</p>
                <div className="mt-2 flex flex-wrap gap-3 items-center">
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-semibold text-sm">Points: {userPoints}</span>
                  {userBadges.length > 0 && (
                    <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-semibold text-sm">Badges: {userBadges.join(", ")}</span>
                  )}
                </div>
              </div>
              
              {/* Logout Button */}
              <div className="ml-auto mt-4 md:mt-0">
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="border-t border-gray-200">
              <div className="flex">
                <button 
                  onClick={() => setActiveTab("profile")}
                  className={`py-4 px-6 font-medium text-sm ${activeTab === "profile" 
                    ? "border-b-2 border-blue-600 text-blue-600" 
                    : "text-gray-500 hover:text-gray-700"}`}
                >
                  PROFILE
                </button>
                <button 
                  onClick={() => setActiveTab("posts")}
                  className={`py-4 px-6 font-medium text-sm ${activeTab === "posts" 
                    ? "border-b-2 border-blue-600 text-blue-600" 
                    : "text-gray-500 hover:text-gray-700"}`}
                >
                  MY POSTS
                </button>
              </div>
            </div>
          </div>
          
          {/* Tab Content */}
          <div className="mb-16">
            {activeTab === "profile" ? (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-200">Personal Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Profile Info Cards */}
                  <div className="bg-blue-50 rounded-lg p-4 flex items-start">
                    <div className="bg-blue-100 p-2 rounded-lg mr-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Username</p>
                      <p className="font-medium text-gray-800">{userData.username}</p>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-4 flex items-start">
                    <div className="bg-blue-100 p-2 rounded-lg mr-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium text-gray-800">{userData.email}</p>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-4 flex items-start">
                    <div className="bg-blue-100 p-2 rounded-lg mr-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Contact</p>
                      <p className="font-medium text-gray-800">{userData.contact}</p>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-4 flex items-start">
                    <div className="bg-blue-100 p-2 rounded-lg mr-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date of Birth</p>
                      <p className="font-medium text-gray-800">{userData.dob}</p>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-4 flex items-start">
                    <div className="bg-blue-100 p-2 rounded-lg mr-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Gender</p>
                      <p className="font-medium text-gray-800">{userData.gender}</p>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-4 flex items-start">
                    <div className="bg-blue-100 p-2 rounded-lg mr-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Address</p>
                      <p className="font-medium text-gray-800">{userData.address}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 text-center">
                  <button 
                    onClick={() => setShowEditProfile(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md flex items-center mx-auto"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Profile
                  </button>
                </div>
              </div>
            ) : (
              <>
                <SelfPosts />
                {/* Leaderboard below posts */}
                <div className="mt-8">
                  <Suspense fallback={<div>Loading leaderboard...</div>}>
                    <Leaderboard />
                  </Suspense>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Floating action button - only show when not editing profile */}
      {!showEditProfile && (
        <button
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg flex items-center justify-center transition-all transform hover:scale-110"
          onClick={() => setShowModal(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* Post Modal */}
      {showModal && <CreatePost onClose={() => setShowModal(false)} />}
    </div>
  );
};

export default Profile;