import React, { useEffect, useState } from "react";
import { auth, db } from "./config/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import CreatePost from "./CreatePost";
import Post from "./Post";
import Navbar from "./Navbar";
import CrimeAIChatbot from "./CrimeAIChatbot";

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPosts = async () => {
      const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      setPosts(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };
    fetchPosts();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      
      <div className="container mx-auto p-6 pt-16">
        <div>
          <Post />
        </div>
      </div>
      
      {/* Crime Prevention Image */}
      {/* <div className="fixed bottom-24 right-6 z-30">
        <img 
          src="/crime-prevention.png" 
          alt="Crime Prevention" 
          className="w-12 h-12 mb-2 rounded-full shadow-md"
        />
      </div> */}

      {/* Create Post Button - Moved to left side */}
{/*       <button
        className="fixed bottom-6 left-6 bg-red-600 text-white p-4 rounded-full shadow-lg text-2xl z-30"
        onClick={() => setShowModal(true)}
      >
        +
      </button>
       */}

        {/* Create Post Button - Now positioned to the left of the chatbot */}
<button
  className="fixed bottom-8 right-8 bg-gradient-to-r from-green-600 to-blue-500 text-white p-0 rounded-full shadow-2xl z-40 flex items-center justify-center w-16 h-16 hover:scale-105 transition-all border-4 border-green-700"
  onClick={() => setShowModal(true)}
  aria-label="Create Report"
>
  <span className="text-3xl font-bold">+</span>
  <span className="absolute bottom-20 right-0 bg-green-700 text-white text-xs px-3 py-1 rounded-lg shadow-lg font-semibold hidden md:block">
    Report Incident
  </span>
</button>

      {/* Post Modal */}
      {showModal && <CreatePost onClose={() => setShowModal(false)} />}
      
      {/* AI Chatbot - Position stays on right */}
      {/* <CrimeAIChatbot /> */}
    </div>
  );
};

export default Home;

// import React, { useEffect, useState } from "react";
// import { auth, db } from "./config/firebase";
// import { collection, query, orderBy, getDocs } from "firebase/firestore";
// import { useNavigate } from "react-router-dom";
// import CreatePost from "./CreatePost";
// import Post from "./Post";
// import Navbar from "./Navbar";
// import CrimeAIChatbot from "./CrimeAIChatbot";

// const Home = () => {
//   const [posts, setPosts] = useState([]);
//   const [showModal, setShowModal] = useState(false);
//   const navigate = useNavigate();

//   useEffect(() => {
//     const fetchPosts = async () => {
//       const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
//       const querySnapshot = await getDocs(q);
//       setPosts(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
//     };

//     fetchPosts();
//   }, []);

//   return (
//     <div className="min-h-screen bg-gray-100">
//       <Navbar/>
      
//       <div className="container mx-auto p-6 pt-16">
//         <div>
//         <Post/>
//         </div>
//         </div>
         
//       <button
//         className="fixed bottom-6 right-6 bg-red-600 text-white p-4 rounded-full shadow-lg text-2xl"
//         onClick={() => setShowModal(true)}
//       >
//         +
//       </button>

//       {/* Post Modal */}
//       {showModal && <CreatePost onClose={() => setShowModal(false)} />}

//       <CrimeAIChatbot/>
//     </div>
//   );
// };

// export default Home;


// import React, { useEffect, useState } from "react";
// import { auth, db } from "./config/firebase";
// import { collection, query, orderBy, getDocs } from "firebase/firestore";
// import { useNavigate } from "react-router-dom";
// import CreatePost from "./CreatePost";
// import Post from "./Post";
// import Navbar from "./Navbar";
// import CrimeAIChatbot from "./CrimeAIChatbot";

// const Home = () => {
//   const [posts, setPosts] = useState([]);
//   const [showModal, setShowModal] = useState(false);
//   const navigate = useNavigate();

//   useEffect(() => {
//     const fetchPosts = async () => {
//       const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
//       const querySnapshot = await getDocs(q);
//       setPosts(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
//     };
//     fetchPosts();
//   }, []);

//   return (
//     <div className="min-h-screen bg-gray-100">
//       <Navbar />
      
//       <div className="container mx-auto p-6 pt-16">
//         <div>
//           <Post />
//         </div>
//       </div>
      
//       {/* Crime Prevention Image */}
//       <div className="fixed bottom-24 right-6 z-30">
//         <img 
//           src="/crime-prevention.png" 
//           alt="Crime Prevention" 
//           className="w-12 h-12 mb-2 rounded-full shadow-md"
//         />
//       </div>

//       {/* Create Post Button - Moved to left side */}
// {/*       <button
//         className="fixed bottom-6 left-6 bg-red-600 text-white p-4 rounded-full shadow-lg text-2xl z-30"
//         onClick={() => setShowModal(true)}
//       >
//         +
//       </button>
//        */}

//         {/* Create Post Button - Now positioned to the left of the chatbot */}
// <button
//   className="fixed bottom-6 right-24 bg-red-600 text-white p-4 rounded-full shadow-lg text-2xl z-30"
//   onClick={() => setShowModal(true)}
// >
//   +
// </button>
//       {/* Post Modal */}
//       {showModal && <CreatePost onClose={() => setShowModal(false)} />}
      
//       {/* AI Chatbot - Position stays on right */}
//       <CrimeAIChatbot />
//     </div>
//   );
// };

// export default Home;

// // import React, { useEffect, useState } from "react";
// // import { auth, db } from "./config/firebase";
// // import { collection, query, orderBy, getDocs } from "firebase/firestore";
// // import { useNavigate } from "react-router-dom";
// // import CreatePost from "./CreatePost";
// // import Post from "./Post";
// // import Navbar from "./Navbar";
// // import CrimeAIChatbot from "./CrimeAIChatbot";

// // const Home = () => {
// //   const [posts, setPosts] = useState([]);
// //   const [showModal, setShowModal] = useState(false);
// //   const navigate = useNavigate();

// //   useEffect(() => {
// //     const fetchPosts = async () => {
// //       const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
// //       const querySnapshot = await getDocs(q);
// //       setPosts(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
// //     };

// //     fetchPosts();
// //   }, []);

// //   return (
// //     <div className="min-h-screen bg-gray-100">
// //       <Navbar/>
      
// //       <div className="container mx-auto p-6 pt-16">
// //         <div>
// //         <Post/>
// //         </div>
// //         </div>
         
// //       <button
// //         className="fixed bottom-6 right-6 bg-red-600 text-white p-4 rounded-full shadow-lg text-2xl"
// //         onClick={() => setShowModal(true)}
// //       >
// //         +
// //       </button>

// //       {/* Post Modal */}
// //       {showModal && <CreatePost onClose={() => setShowModal(false)} />}

// //       <CrimeAIChatbot/>
// //     </div>
// //   );
// // };

// // export default Home;
