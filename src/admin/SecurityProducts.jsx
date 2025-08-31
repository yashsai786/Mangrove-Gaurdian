import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { db } from "../config/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import CreateSecurityProduct from "./CreateSecurityProduct";

const SecurityProducts = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [securityProducts, setSecurityProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Fetch security products
  const fetchSecurityProducts = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "securityProducts"));
      const products = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setSecurityProducts(products);
    } catch (error) {
      console.error("Error fetching security products:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load products on component mount
  useEffect(() => {
    fetchSecurityProducts();
  }, []);

  // Delete a security product
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteDoc(doc(db, "securityProducts", id));
        // Refresh the list
        fetchSecurityProducts();
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("Failed to delete the product. Please try again.");
      }
    }
  };

  // Toggle sidebar for mobile
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Always visible on desktop, toggleable on mobile */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block md:w-64 shadow-lg fixed h-full z-10`}>
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className={`flex-1 overflow-auto ${sidebarOpen ? 'md:ml-64' : ''}`}>
        {/* Mobile hamburger menu */}
        <div className="md:hidden bg-white p-4 shadow-md flex justify-between items-center">
          <button 
            onClick={toggleSidebar}
            className="p-2 rounded-md text-gray-700 hover:text-red-600 hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">Admin Security Products</h1>
        </div>

        {/* Desktop header */}
        <header className="hidden md:block bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Security Products</h1>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Security Products Section */}
          <div className="px-4 py-6 sm:px-0">
            <div className="border-4 border-dashed border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Security Products</h2>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Add New Product
                </button>
              </div>
              
              {loading ? (
                <p className="text-center py-4">Loading products...</p>
              ) : securityProducts.length === 0 ? (
                <p className="text-center py-4">No security products found. Add your first one!</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {securityProducts.map((product) => (
                    <div key={product.id} className="bg-white rounded-lg shadow overflow-hidden">
                      <img 
                        src={product.imageUrl} 
                        alt={product.title} 
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-4">
                        <h3 className="font-bold">{product.title}</h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{product.description}</p>
                        <div className="flex justify-between items-center mt-4">
                          <a 
                            href={product.link}
                            target="_blank"
                            rel="noopener noreferrer" 
                            className="text-red-600 hover:text-red-800"
                          >
                            View Product
                          </a>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-gray-600 hover:text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      
      {/* Create Security Product Modal */}
      {showCreateModal && (
        <CreateSecurityProduct 
          onClose={() => {
            setShowCreateModal(false);
            fetchSecurityProducts(); // Refresh the list after adding a new product
          }} 
        />
      )}
    </div>
  );
};

export default SecurityProducts;