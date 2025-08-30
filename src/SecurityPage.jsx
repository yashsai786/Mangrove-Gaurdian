// import React, { useState, useEffect } from "react";
// import { collection, getDocs } from "firebase/firestore";
// import { db } from "./config/firebase";
// import Navbar from "./Navbar";
// import ImageMagnifier from "./ImageMagnifier"; // Import the component

// const SecurityPage = () => {
//   const [securityProducts, setSecurityProducts] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [isLoggedIn, setIsLoggedIn] = useState(true);

//   useEffect(() => {
//     const fetchSecurityProducts = async () => {
//       try {
//         setLoading(true);
//         const querySnapshot = await getDocs(collection(db, "securityProducts"));
//         const productsData = querySnapshot.docs.map(doc => ({
//           id: doc.id,
//           ...doc.data()
//         }));
//         setSecurityProducts(productsData);
//       } catch (error) {
//         console.error("Error fetching security products:", error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchSecurityProducts();
//   }, []);

//   const handleLogout = () => {
//     setIsLoggedIn(false);
//     alert("Logged out successfully!");
//   };

//   return (
//     <div className="min-h-screen bg-gray-100">
//       <Navbar />
      
//       <div className="container mx-auto pt-16 px-4">
//         <h1 className="text-3xl font-bold text-center mb-8">PRODUCTS FOR SAFETY</h1>
        
//         {loading ? (
//           <div className="flex justify-center items-center h-64">
//             <p className="text-xl">Loading products...</p>
//           </div>
//         ) : (
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//             {securityProducts.map((product) => (
//               <div key={product.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
//                 <div className="md:flex">
//                   {/* Product Image with Advanced Magnification */}
//                   <div className="md:w-1/2">
//                     <ImageMagnifier 
//                       src={product.imageUrl} 
//                       alt={product.title} 
//                     />
//                   </div>
                  
//                   {/* Product Details */}
//                   <div className="p-6 md:w-1/2">
//                     <h2 className="text-xl font-bold mb-2">{product.title}</h2>
//                     <p className="text-gray-700 mb-4">{product.description}</p>
//                     <a 
//                       href={product.link} 
//                       target="_blank" 
//                       rel="noopener noreferrer" 
//                       className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-300"
//                     >
//                       Purchase Now
//                     </a>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default SecurityPage;

import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./config/firebase";
import Navbar from "./Navbar";
import ImageMagnifier from "./ImageMagnifier";

const SecurityPage = () => {
  const [securityProducts, setSecurityProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  useEffect(() => {
    const fetchSecurityProducts = async () => {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, "securityProducts"));
        const productsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSecurityProducts(productsData);
      } catch (error) {
        console.error("Error fetching security products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSecurityProducts();
  }, []);

  const handleLogout = () => {
    setIsLoggedIn(false);
    alert("Logged out successfully!");
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* The Navbar component is assumed to be fixed or absolute positioned */}
      <Navbar isLoggedIn={isLoggedIn} handleLogout={handleLogout} />
      
      {/* Added top padding/margin to prevent content from being hidden behind navbar */}
      <div className="pt-15"> {/* Adjust this value based on your navbar height */}
        {/* Hero Section */}
        <div className="bg-purple-800 text-white py-12">
          <div className="container mx-auto px-6">
            <h1 className="text-4xl font-bold text-center mb-4">PRODUCTS FOR SAFETY</h1>
            <p className="text-center text-lg text-purple-200 max-w-2xl mx-auto">
              Protecting what matters most with premium security solutions
            </p>
          </div>
        </div>
        
        {/* Products Section */}
        <div className="container mx-auto px-6 py-12">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-purple-500"></div>
              <p className="ml-4 text-xl font-medium text-gray-300">Loading products...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {securityProducts.map((product) => (
                <div key={product.id} className="bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-purple-500/30">
                  <div className="relative h-64">
                    {/* <ImageMagnifier> */}
                      {product.imageUrl ? (
                        <ImageMagnifier 
                          src={product.imageUrl} 
                          alt={product.title} 
                          />
                      ) : (
                        <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                          <span className="text-gray-400">Image not available</span>
                        </div>
                      )}
                    {/* </ImageMagnifier> */}
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-100 mb-3">{product.title || "Security Product"}</h3>
                    <p className="text-gray-300 mb-6 leading-relaxed">{product.description || "No description available"}</p>
                    <a 
                      href={product.link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="block w-full text-center bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-300"
                    >
                      Purchase Now
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecurityPage;