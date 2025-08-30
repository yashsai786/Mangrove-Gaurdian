import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";

const Layout = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(true); // Start with sidebar open on desktop
  
  // Check if we're on mobile and adjust sidebar state
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // On initial load, close sidebar on mobile, keep open on desktop
      setIsOpen(!mobile);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar 
        isOpen={isOpen} 
        setIsOpen={setIsOpen} 
        isMobile={isMobile} 
      />
      
      {/* Main Content */}
      <div className={`
        flex-1 transition-all duration-300
        ${!isMobile && isOpen ? 'ml-64' : 'ml-0'}
      `}>
        {/* Header with toggle button for both mobile and desktop */}
        <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center shadow-sm">
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none"
            aria-label="Toggle sidebar"
          >
            <Menu size={24} />
          </button>
{/*           <h1 className="ml-2 text-xl font-semibold text-gray-800">Mangrove Guardian</h1>
          <div className="ml-auto text-sm text-gray-500">
            Last updated: {new Date().toLocaleDateString()}
          </div>
        */}
        </header>
        
        <div className="p-4">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
