import React, { useState } from 'react';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setStatus({
        type: 'error',
        message: 'Please enter your email address'
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      setStatus({ type: '', message: '' });
      
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email);
      
      setStatus({
        type: 'success',
        message: 'Password reset email sent! Please check your inbox.'
      });
      setEmail('');
    } catch (error) {
      let errorMessage = 'Failed to send password reset email';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts. Please try again later';
          break;
        default:
          errorMessage = `Error: ${error.message}`;
      }
      
      setStatus({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-center mb-6">Reset Your Password</h2>
        
        {status.message && (
          <div className={`mb-4 p-3 rounded ${
            status.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {status.message}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email"
              disabled={isSubmitting}
            />
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-2 px-4 rounded-md text-white font-medium 
              ${isSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} 
              transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
          >
            {isSubmitting ? 'Sending...' : 'Reset Password'}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <a href="/login" className="text-sm text-blue-600 hover:text-blue-800">
            Back to Login
          </a>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;