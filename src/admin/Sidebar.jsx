import React from "react";
import { NavLink, useNavigate } from "react-router-dom"; // Assuming you're using react-router
import { getAuth, signOut } from "firebase/auth";

const Sidebar = () => {
  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert("Successfully logged out");
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div className="h-full bg-green-700 text-white">
      {/* Logo/App Name */}
      <div className="p-4 text-xl font-bold border-b border-green-800">
        Mangrove Guardian Admin Dashboard
      </div>
      
      {/* Navigation Links */}
      <nav className="p-2">
        <ul>
          <li className="mb-2">
            <NavLink 
              to="/admin" 
              className={({isActive}) => 
                `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
              }
            >
              Dashboard
            </NavLink>
          </li>
          {/* <li className="mb-2">
            <NavLink 
              to="/admin/secproducts" 
              className={({isActive}) => 
                `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
              }
            >
              Security Products
            </NavLink>
          </li> */}
          <li className="mb-2">
            <NavLink 
              to="/admin/users" 
              className={({isActive}) => 
                `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
              }
            >
              View Users
            </NavLink>
          </li>
          {/* <li className="mb-2">
            <NavLink 
              to="/admin/newusers" 
              className={({isActive}) => 
                `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
              }
            >
              Approve New Users
            </NavLink>
          </li> */}
          <li className="mb-2">
            <NavLink 
              to="/admin/reportedposts" 
              className={({isActive}) => 
                `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
              }
            >
              View Reported Posts
            </NavLink>
          </li>
          <li className="mb-2">
            <NavLink 
              to="/admin/poststable" 
              className={({isActive}) => 
                `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
              }
            >
              Post Details
            </NavLink>
          </li>
          {/* <li className="mb-2">
            <NavLink 
              to="/admin/inquiry" 
              className={({isActive}) => 
                `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
              }
            >
              View Inquiry
            </NavLink>
          </li> */}
          <li className="mb-2">
            <NavLink 
              to="/admin/feedback" 
              className={({isActive}) => 
                `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
              }
            >
              View Feedback
            </NavLink>
          </li>
          
          <li className="mb-2">
            <NavLink 
              to="/admin/adminregister" 
              className="block p-2 rounded hover:bg-green-800 hover:underline"
            >
              Add Admin
            </NavLink>
          </li>
              <li className="mb-2">
            <NavLink 
              to="/admin/ngo" 
              className="block p-2 rounded hover:bg-green-800 hover:underline"
            >
              NGO List
            </NavLink>
          </li>
          <li className="mb-2">
            <NavLink 
              to="/home" 
              className="block p-2 rounded hover:bg-green-800 hover:underline"
            >
              User Panel
            </NavLink>
          </li>
          <li className="mb-2">
            <button 
              onClick={handleLogout} 
              className="block w-full text-left p-2 rounded hover:bg-green-800 hover:underline"
            >
              Logout
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
// import React from "react";
// import { NavLink, useNavigate } from "react-router-dom"; // Assuming you're using react-router
// import { getAuth, signOut } from "firebase/auth";

// const Sidebar = () => {
//   const navigate = useNavigate();
//   const auth = getAuth();

//   const handleLogout = async () => {
//     try {
//       await signOut(auth);
//       alert("Successfully logged out");
//       navigate("/login");
//     } catch (error) {
//       console.error("Error logging out:", error);
//     }
//   };

//   return (
//     <div className="h-full bg-green-700 text-white">
//       {/* Logo/App Name */}
//       <div className="p-4 text-xl font-bold border-b border-green-800">
//         Mangrove Guardian Admin Dashboard
//       </div>
      
//       {/* Navigation Links */}
//       <nav className="p-2">
//         <ul>
//           <li className="mb-2">
//             <NavLink 
//               to="/admin" 
//               className={({isActive}) => 
//                 `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
//               }
//             >
//               Dashboard
//             </NavLink>
//           </li>
//           <li className="mb-2">
//             <NavLink 
//               to="/admin/secproducts" 
//               className={({isActive}) => 
//                 `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
//               }
//             >
//               Security Products
//             </NavLink>
//           </li>
//           <li className="mb-2">
//             <NavLink 
//               to="/admin/users" 
//               className={({isActive}) => 
//                 `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
//               }
//             >
//               View Users
//             </NavLink>
//           </li>
//           <li className="mb-2">
//             <NavLink 
//               to="/admin/newusers" 
//               className={({isActive}) => 
//                 `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
//               }
//             >
//               Approve New Users
//             </NavLink>
//           </li>
//           <li className="mb-2">
//             <NavLink 
//               to="/admin/reportedposts" 
//               className={({isActive}) => 
//                 `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
//               }
//             >
//               View Reported Posts
//             </NavLink>
//           </li>
//           <li className="mb-2">
//             <NavLink 
//               to="/admin/poststable" 
//               className={({isActive}) => 
//                 `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
//               }
//             >
//               Post Details
//             </NavLink>
//           </li>
//           <li className="mb-2">
//             <NavLink 
//               to="/admin/inquiry" 
//               className={({isActive}) => 
//                 `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
//               }
//             >
//               View Inquiry
//             </NavLink>
//           </li>
//           <li className="mb-2">
//             <NavLink 
//               to="/admin/feedback" 
//               className={({isActive}) => 
//                 `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
//               }
//             >
//               View Feedback
//             </NavLink>
//           </li>
          
//           <li className="mb-2">
//             <NavLink 
//               to="/admin/adminregister" 
//               className="block p-2 rounded hover:bg-green-800 hover:underline"
//             >
//               Add Admin
//             </NavLink>
//           </li>

//           <li className="mb-2">
//             <NavLink 
//               to="/home" 
//               className="block p-2 rounded hover:bg-green-800 hover:underline"
//             >
//               User Panel
//             </NavLink>
//           </li>
//           <li className="mb-2">
//             <button 
//               onClick={handleLogout} 
//               className="block w-full text-left p-2 rounded hover:bg-green-800 hover:underline"
//             >
//               Logout
//             </button>
//           </li>
//         </ul>
//       </nav>
//     </div>
//   );
// };

// export default Sidebar;

// import React from "react";
// import { NavLink, useNavigate } from "react-router-dom"; // Assuming you're using react-router
// import { getAuth, signOut } from "firebase/auth";

// const Sidebar = () => {
//   const navigate = useNavigate();
//   const auth = getAuth();

//   const handleLogout = async () => {
//     try {
//       await signOut(auth);
//       alert("Successfully logged out");
//       navigate("/login");
//     } catch (error) {
//       console.error("Error logging out:", error);
//     }
//   };

//   return (
//     <div className="h-full bg-green-700 text-white">
//       {/* Logo/App Name */}
//       <div className="p-4 text-xl font-bold border-b border-green-800">
//         Mangrove Guardian Admin Dashboard
//       </div>
      
//       {/* Navigation Links */}
//       <nav className="p-2">
//         <ul>
//           <li className="mb-2">
//             <NavLink 
//               to="/admin" 
//               className={({isActive}) => 
//                 `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
//               }
//             >
//               Dashboard
//             </NavLink>
//           </li>
//           {/* <li className="mb-2">
//             <NavLink 
//               to="/admin/secproducts" 
//               className={({isActive}) => 
//                 `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
//               }
//             >
//               Security Products
//             </NavLink>
//           </li> */}
//           <li className="mb-2">
//             <NavLink 
//               to="/admin/users" 
//               className={({isActive}) => 
//                 `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
//               }
//             >
//               View Users
//             </NavLink>
//           </li>
//           <li className="mb-2">
//             <NavLink 
//               to="/admin/newusers" 
//               className={({isActive}) => 
//                 `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
//               }
//             >
//               Approve New Users
//             </NavLink>
//           </li>
//           <li className="mb-2">
//             <NavLink 
//               to="/admin/reportedposts" 
//               className={({isActive}) => 
//                 `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
//               }
//             >
//               View Reported Posts
//             </NavLink>
//           </li>
//           <li className="mb-2">
//             <NavLink 
//               to="/admin/poststable" 
//               className={({isActive}) => 
//                 `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
//               }
//             >
//               Post Details
//             </NavLink>
//           </li>
//           {/* <li className="mb-2">
//             <NavLink 
//               to="/admin/inquiry" 
//               className={({isActive}) => 
//                 `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
//               }
//             >
//               View Inquiry
//             </NavLink>
//           </li> */}
//           <li className="mb-2">
//             <NavLink 
//               to="/admin/feedback" 
//               className={({isActive}) => 
//                 `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
//               }
//             >
//               View Feedback
//             </NavLink>
//           </li>
//           <li className="mb-2">
//             <NavLink 
//               to="/admin/ngo" 
//               className={({isActive}) => 
//                 `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
//               }
//             >
//               NGO List
//             </NavLink>
//           </li>
          
//           <li className="mb-2">
//             <NavLink 
//               to="/admin/adminregister" 
//               className="block p-2 rounded hover:bg-green-800 hover:underline"
//             >
//               Add Admin
//             </NavLink>
//           </li>

//           <li className="mb-2">
//             <NavLink 
//               to="/home" 
//               className="block p-2 rounded hover:bg-green-800 hover:underline"
//             >
//               User Panel
//             </NavLink>
//           </li>
//           <li className="mb-2">
//             <button 
//               onClick={handleLogout} 
//               className="block w-full text-left p-2 rounded hover:bg-green-800 hover:underline"
//             >
//               Logout
//             </button>
//           </li>
//         </ul>
//       </nav>
//     </div>
//   );
// };

// export default Sidebar;
// // import React from "react";
// // import { NavLink, useNavigate } from "react-router-dom"; // Assuming you're using react-router
// // import { getAuth, signOut } from "firebase/auth";

// // const Sidebar = () => {
// //   const navigate = useNavigate();
// //   const auth = getAuth();

// //   const handleLogout = async () => {
// //     try {
// //       await signOut(auth);
// //       alert("Successfully logged out");
// //       navigate("/login");
// //     } catch (error) {
// //       console.error("Error logging out:", error);
// //     }
// //   };

// //   return (
// //     <div className="h-full bg-green-700 text-white">
// //       {/* Logo/App Name */}
// //       <div className="p-4 text-xl font-bold border-b border-green-800">
// //         Mangrove Guardian Admin Dashboard
// //       </div>
      
// //       {/* Navigation Links */}
// //       <nav className="p-2">
// //         <ul>
// //           <li className="mb-2">
// //             <NavLink 
// //               to="/admin" 
// //               className={({isActive}) => 
// //                 `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
// //               }
// //             >
// //               Dashboard
// //             </NavLink>
// //           </li>
// //           <li className="mb-2">
// //             <NavLink 
// //               to="/admin/secproducts" 
// //               className={({isActive}) => 
// //                 `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
// //               }
// //             >
// //               Security Products
// //             </NavLink>
// //           </li>
// //           <li className="mb-2">
// //             <NavLink 
// //               to="/admin/users" 
// //               className={({isActive}) => 
// //                 `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
// //               }
// //             >
// //               View Users
// //             </NavLink>
// //           </li>
// //           <li className="mb-2">
// //             <NavLink 
// //               to="/admin/newusers" 
// //               className={({isActive}) => 
// //                 `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
// //               }
// //             >
// //               Approve New Users
// //             </NavLink>
// //           </li>
// //           <li className="mb-2">
// //             <NavLink 
// //               to="/admin/reportedposts" 
// //               className={({isActive}) => 
// //                 `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
// //               }
// //             >
// //               View Reported Posts
// //             </NavLink>
// //           </li>
// //           <li className="mb-2">
// //             <NavLink 
// //               to="/admin/poststable" 
// //               className={({isActive}) => 
// //                 `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
// //               }
// //             >
// //               Post Details
// //             </NavLink>
// //           </li>
// //           <li className="mb-2">
// //             <NavLink 
// //               to="/admin/inquiry" 
// //               className={({isActive}) => 
// //                 `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
// //               }
// //             >
// //               View Inquiry
// //             </NavLink>
// //           </li>
// //           <li className="mb-2">
// //             <NavLink 
// //               to="/admin/feedback" 
// //               className={({isActive}) => 
// //                 `block p-2 rounded ${isActive ? 'bg-green-800' : 'hover:bg-green-800 hover:underline'}`
// //               }
// //             >
// //               View Feedback
// //             </NavLink>
// //           </li>
          
// //           <li className="mb-2">
// //             <NavLink 
// //               to="/admin/adminregister" 
// //               className="block p-2 rounded hover:bg-green-800 hover:underline"
// //             >
// //               Add Admin
// //             </NavLink>
// //           </li>

// //           <li className="mb-2">
// //             <NavLink 
// //               to="/home" 
// //               className="block p-2 rounded hover:bg-green-800 hover:underline"
// //             >
// //               User Panel
// //             </NavLink>
// //           </li>
// //           <li className="mb-2">
// //             <button 
// //               onClick={handleLogout} 
// //               className="block w-full text-left p-2 rounded hover:bg-green-800 hover:underline"
// //             >
// //               Logout
// //             </button>
// //           </li>
// //         </ul>
// //       </nav>
// //     </div>
// //   );
// // };

// // export default Sidebar;