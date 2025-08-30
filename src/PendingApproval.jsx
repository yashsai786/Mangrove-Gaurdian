import React from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "./config/firebase";

const PendingApproval = () => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <div className="mb-6 text-yellow-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Account Pending Approval</h2>
        
        <p className="text-gray-600 mb-6">
          Your account is currently awaiting approval from an administrator. This process may take up to 24 hours.
        </p>
        
        <p className="text-gray-600 mb-6">
          You will be notified via email once your account has been approved.
        </p>
        
        <button
          onClick={handleSignOut}
          className="w-full bg-red-600 text-white p-2 rounded hover:bg-red-700 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default PendingApproval;