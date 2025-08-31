import React, { useState } from "react";

const PhoneVerification = ({ phone, isPhoneExists, onVerificationComplete }) => {
  const [verificationId, setVerificationId] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // API URL should be determined by environment
  const API_URL = "https://transgression-vigilance.vercel.app";
  
  const handleSendOTP = async () => {
    if (!phone) {
      setError("Please enter a valid phone number");
      return;
    }
    
    if (isPhoneExists) {
      setError("This phone number is already registered");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      // We're no longer passing API credentials directly - they should be handled server-side
      const response = await fetch(`${API_URL}/api/send-phone-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          phone_number: phone,
          channel: "sms"
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send OTP");
      }
      
      const data = await response.json();
      setVerificationId(data.id);
      setOtpSent(true);
    } catch (error) {
      console.error("Error sending OTP:", error);
      setError(error.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleVerifyOTP = async () => {
    if (!otp) {
      setError("Please enter the OTP");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch(`${API_URL}/api/verify-phone-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          verificationId,
          code: otp
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "OTP verification failed");
      }
      
      const data = await response.json();
      
      if (data.status === "approved") {
        setOtpVerified(true);
        onVerificationComplete(true);
      } else {
        throw new Error("Invalid OTP. Please try again.");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setError(error.message || "OTP verification failed. Please try again.");
      onVerificationComplete(false);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-gray-50 p-4 rounded-lg border mb-4">
      <h3 className="text-gray-700 font-medium mb-2">Phone Verification</h3>
      
      {!otpSent ? (
        <div>
          <p className="text-sm text-gray-600 mb-3">
            We'll send a verification code to your phone number.
          </p>
          <button
            onClick={handleSendOTP}
            disabled={loading || !phone || isPhoneExists}
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? "Sending..." : "Send OTP"}
          </button>
        </div>
      ) : !otpVerified ? (
        <div>
          <p className="text-sm text-gray-600 mb-3">
            Enter the OTP sent to {phone}
          </p>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleVerifyOTP}
              disabled={loading || !otp}
              className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </div>
          <button 
            onClick={handleSendOTP} 
            disabled={loading}
            className="text-blue-600 text-sm mt-2 hover:underline"
          >
            Resend OTP
          </button>
        </div>
      ) : (
        <div className="bg-green-50 text-green-700 p-3 rounded">
          <svg className="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          Phone number verified successfully
        </div>
      )}
      
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
};

export default PhoneVerification;

// import React, { useState } from "react";

// const PhoneVerification = ({ phone, isPhoneExists, onVerificationComplete, apiKey, apiToken }) => {
//   const [verificationId, setVerificationId] = useState("");
//   const [otp, setOtp] = useState("");
//   const [otpSent, setOtpSent] = useState(false);
//   const [otpVerified, setOtpVerified] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
  
//   // Updated to use your proxy endpoints
//   const handleSendOTP = async () => {
//     if (!phone) {
//       setError("Please enter a valid phone number");
//       return;
//     }
    
//     if (isPhoneExists) {
//       setError("This phone number is already registered");
//       return;
//     }
    
//     setLoading(true);
//     setError("");
    
//     try {
//       // Call your proxy endpoint instead
//       const response = await fetch("https://transgression-vigilance.vercel.app/api/send-phone-otp", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json"
//         },
//         body: JSON.stringify({
//           phone_number: phone,
//           channel: "sms",
//           apiKey,
//           apiToken
//         })
//       });
      
//       const data = await response.json();
      
//       if (!response.ok) {
//         throw new Error(data.message || "Failed to send OTP");
//       }
      
//       setVerificationId(data.id);
//       setOtpSent(true);
//     } catch (error) {
//       console.error("Error sending OTP:", error);
//       setError(error.message || "Failed to send OTP. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };
  
//   const handleVerifyOTP = async () => {
//     if (!otp) {
//       setError("Please enter the OTP");
//       return;
//     }
    
//     setLoading(true);
//     setError("");
    
//     try {
//       // Call your proxy endpoint for verification
//       const response = await fetch("https://transgression-vigilance.vercel.app/api/verify-phone-otp", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json"
//         },
//         body: JSON.stringify({
//           verificationId,
//           code: otp,
//           apiKey,
//           apiToken
//         })
//       });
      
//       const data = await response.json();
      
//       if (!response.ok) {
//         throw new Error(data.message || "OTP verification failed");
//       }
      
//       if (data.status === "approved") {
//         setOtpVerified(true);
//         onVerificationComplete(true);
//       } else {
//         throw new Error("Invalid OTP. Please try again.");
//       }
//     } catch (error) {
//       console.error("Error verifying OTP:", error);
//       setError(error.message || "OTP verification failed. Please try again.");
//       onVerificationComplete(false);
//     } finally {
//       setLoading(false);
//     }
//   };
  
//   return (
//     <div className="bg-gray-50 p-4 rounded-lg border mb-4">
//       <h3 className="text-gray-700 font-medium mb-2">Phone Verification</h3>
      
//       {!otpSent ? (
//         <div>
//           <p className="text-sm text-gray-600 mb-3">
//             We'll send a verification code to your phone number.
//           </p>
//           <button
//             onClick={handleSendOTP}
//             disabled={loading || !phone || isPhoneExists}
//             className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
//           >
//             {loading ? "Sending..." : "Send OTP"}
//           </button>
//         </div>
//       ) : !otpVerified ? (
//         <div>
//           <p className="text-sm text-gray-600 mb-3">
//             Enter the OTP sent to {phone}
//           </p>
//           <div className="flex space-x-2">
//             <input
//               type="text"
//               placeholder="Enter OTP"
//               value={otp}
//               onChange={(e) => setOtp(e.target.value)}
//               className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
//             />
//             <button
//               onClick={handleVerifyOTP}
//               disabled={loading || !otp}
//               className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
//             >
//               {loading ? "Verifying..." : "Verify"}
//             </button>
//           </div>
//           <button 
//             onClick={handleSendOTP} 
//             disabled={loading}
//             className="text-blue-600 text-sm mt-2 hover:underline"
//           >
//             Resend OTP
//           </button>
//         </div>
//       ) : (
//         <div className="bg-green-50 text-green-700 p-3 rounded">
//           <svg className="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
//           </svg>
//           Phone number verified successfully
//         </div>
//       )}
      
//       {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
//     </div>
//   );
// };

// export default PhoneVerification;

// // import React, { useState } from "react";

// // const PhoneVerification = ({ phone, isPhoneExists, onVerificationComplete, apiKey, apiToken }) => {
// //   const [verificationId, setVerificationId] = useState("");
// //   const [otp, setOtp] = useState("");
// //   const [otpSent, setOtpSent] = useState(false);
// //   const [otpVerified, setOtpVerified] = useState(false);
// //   const [loading, setLoading] = useState(false);
// //   const [error, setError] = useState("");
  
// //   const handleSendOTP = async () => {
// //     if (!phone) {
// //       setError("Please enter a valid phone number");
// //       return;
// //     }
    
// //     if (isPhoneExists) {
// //       setError("This phone number is already registered");
// //       return;
// //     }
    
// //     setLoading(true);
// //     setError("");
    
// //     try {
// //       // Modified fetch request to handle CORS
// //       const response = await fetch("https://otp.dev/api/verify/", {
// //         method: "POST",
// //         headers: {
// //           "Content-Type": "application/json",
// //           "Authorization": `Bearer ${apiToken}`,
// //           "x-api-key": apiKey,
// //           // Adding CORS-related headers
// //           "Origin": window.location.origin,
// //         },
// //         mode: "cors", // Explicitly set CORS mode
// //         credentials: "same-origin", // Handle cookies appropriately
// //         body: JSON.stringify({
// //           phone_number: phone,
// //           channel: "sms"
// //         })
// //       });
      
// //       const data = await response.json();
      
// //       if (!response.ok) {
// //         throw new Error(data.message || "Failed to send OTP");
// //       }
      
// //       setVerificationId(data.id);
// //       setOtpSent(true);
// //     } catch (error) {
// //       console.error("Error sending OTP:", error);
// //       setError(error.message || "Failed to send OTP. Please try again.");
// //     } finally {
// //       setLoading(false);
// //     }
// //   };
  
// //   const handleVerifyOTP = async () => {
// //     if (!otp) {
// //       setError("Please enter the OTP");
// //       return;
// //     }
    
// //     setLoading(true);
// //     setError("");
    
// //     try {
// //       // Modified fetch request to handle CORS for verification
// //       const response = await fetch(`https://otp.dev/api/verify/${verificationId}/check`, {
// //         method: "POST",
// //         headers: {
// //           "Content-Type": "application/json",
// //           "Authorization": `Bearer ${apiToken}`,
// //           "x-api-key": apiKey,
// //           // Adding CORS-related headers
// //           "Origin": window.location.origin,
// //         },
// //         mode: "cors", // Explicitly set CORS mode
// //         credentials: "same-origin", // Handle cookies appropriately
// //         body: JSON.stringify({
// //           code: otp
// //         })
// //       });
      
// //       const data = await response.json();
      
// //       if (!response.ok) {
// //         throw new Error(data.message || "OTP verification failed");
// //       }
      
// //       if (data.status === "approved") {
// //         setOtpVerified(true);
// //         onVerificationComplete(true);
// //       } else {
// //         throw new Error("Invalid OTP. Please try again.");
// //       }
// //     } catch (error) {
// //       console.error("Error verifying OTP:", error);
// //       setError(error.message || "OTP verification failed. Please try again.");
// //       onVerificationComplete(false);
// //     } finally {
// //       setLoading(false);
// //     }
// //   };
  
// //   return (
// //     <div className="bg-gray-50 p-4 rounded-lg border mb-4">
// //       <h3 className="text-gray-700 font-medium mb-2">Phone Verification</h3>
      
// //       {!otpSent ? (
// //         <div>
// //           <p className="text-sm text-gray-600 mb-3">
// //             We'll send a verification code to your phone number.
// //           </p>
// //           <button
// //             onClick={handleSendOTP}
// //             disabled={loading || !phone || isPhoneExists}
// //             className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
// //           >
// //             {loading ? "Sending..." : "Send OTP"}
// //           </button>
// //         </div>
// //       ) : !otpVerified ? (
// //         <div>
// //           <p className="text-sm text-gray-600 mb-3">
// //             Enter the OTP sent to {phone}
// //           </p>
// //           <div className="flex space-x-2">
// //             <input
// //               type="text"
// //               placeholder="Enter OTP"
// //               value={otp}
// //               onChange={(e) => setOtp(e.target.value)}
// //               className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
// //             />
// //             <button
// //               onClick={handleVerifyOTP}
// //               disabled={loading || !otp}
// //               className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
// //             >
// //               {loading ? "Verifying..." : "Verify"}
// //             </button>
// //           </div>
// //           <button 
// //             onClick={handleSendOTP} 
// //             disabled={loading}
// //             className="text-blue-600 text-sm mt-2 hover:underline"
// //           >
// //             Resend OTP
// //           </button>
// //         </div>
// //       ) : (
// //         <div className="bg-green-50 text-green-700 p-3 rounded">
// //           <svg className="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
// //             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
// //           </svg>
// //           Phone number verified successfully
// //         </div>
// //       )}
      
// //       {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
// //     </div>
// //   );
// // };

// // export default PhoneVerification;


// // // import React, { useState } from "react";

// // // const PhoneVerification = ({ phone, isPhoneExists, onVerificationComplete, apiKey, apiToken }) => {
// // //   const [verificationId, setVerificationId] = useState("");
// // //   const [otp, setOtp] = useState("");
// // //   const [otpSent, setOtpSent] = useState(false);
// // //   const [otpVerified, setOtpVerified] = useState(false);
// // //   const [loading, setLoading] = useState(false);
// // //   const [error, setError] = useState("");
  
// // //   const handleSendOTP = async () => {
// // //     if (!phone) {
// // //       setError("Please enter a valid phone number");
// // //       return;
// // //     }
    
// // //     if (isPhoneExists) {
// // //       setError("This phone number is already registered");
// // //       return;
// // //     }
    
// // //     setLoading(true);
// // //     setError("");
    
// // //     try {
// // //       const response = await fetch("https://otp.dev/api/verify/", {
// // //         method: "POST",
// // //         headers: {
// // //           "Content-Type": "application/json",
// // //           "Authorization": `Bearer ${apiToken}`,
// // //           "x-api-key": apiKey
// // //         },
// // //         body: JSON.stringify({
// // //           phone_number: phone,
// // //           channel: "sms"
// // //         })
// // //       });
      
// // //       const data = await response.json();
      
// // //       if (!response.ok) {
// // //         throw new Error(data.message || "Failed to send OTP");
// // //       }
      
// // //       setVerificationId(data.id);
// // //       setOtpSent(true);
// // //     } catch (error) {
// // //       console.error("Error sending OTP:", error);
// // //       setError(error.message || "Failed to send OTP. Please try again.");
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   };
  
// // //   const handleVerifyOTP = async () => {
// // //     if (!otp) {
// // //       setError("Please enter the OTP");
// // //       return;
// // //     }
    
// // //     setLoading(true);
// // //     setError("");
    
// // //     try {
// // //       const response = await fetch(`https://otp.dev/api/verify/${verificationId}/check`, {
// // //         method: "POST",
// // //         headers: {
// // //           "Content-Type": "application/json",
// // //           "Authorization": `Bearer ${apiToken}`,
// // //           "x-api-key": apiKey
// // //         },
// // //         body: JSON.stringify({
// // //           code: otp
// // //         })
// // //       });
      
// // //       const data = await response.json();
      
// // //       if (!response.ok) {
// // //         throw new Error(data.message || "OTP verification failed");
// // //       }
      
// // //       if (data.status === "approved") {
// // //         setOtpVerified(true);
// // //         onVerificationComplete(true);
// // //       } else {
// // //         throw new Error("Invalid OTP. Please try again.");
// // //       }
// // //     } catch (error) {
// // //       console.error("Error verifying OTP:", error);
// // //       setError(error.message || "OTP verification failed. Please try again.");
// // //       onVerificationComplete(false);
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   };
  
// // //   return (
// // //     <div className="bg-gray-50 p-4 rounded-lg border mb-4">
// // //       <h3 className="text-gray-700 font-medium mb-2">Phone Verification</h3>
      
// // //       {!otpSent ? (
// // //         <div>
// // //           <p className="text-sm text-gray-600 mb-3">
// // //             We'll send a verification code to your phone number.
// // //           </p>
// // //           <button
// // //             onClick={handleSendOTP}
// // //             disabled={loading || !phone || isPhoneExists}
// // //             className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
// // //           >
// // //             {loading ? "Sending..." : "Send OTP"}
// // //           </button>
// // //         </div>
// // //       ) : !otpVerified ? (
// // //         <div>
// // //           <p className="text-sm text-gray-600 mb-3">
// // //             Enter the OTP sent to {phone}
// // //           </p>
// // //           <div className="flex space-x-2">
// // //             <input
// // //               type="text"
// // //               placeholder="Enter OTP"
// // //               value={otp}
// // //               onChange={(e) => setOtp(e.target.value)}
// // //               className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
// // //             />
// // //             <button
// // //               onClick={handleVerifyOTP}
// // //               disabled={loading || !otp}
// // //               className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
// // //             >
// // //               {loading ? "Verifying..." : "Verify"}
// // //             </button>
// // //           </div>
// // //           <button 
// // //             onClick={handleSendOTP} 
// // //             disabled={loading}
// // //             className="text-blue-600 text-sm mt-2 hover:underline"
// // //           >
// // //             Resend OTP
// // //           </button>
// // //         </div>
// // //       ) : (
// // //         <div className="bg-green-50 text-green-700 p-3 rounded">
// // //           <svg className="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
// // //             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
// // //           </svg>
// // //           Phone number verified successfully
// // //         </div>
// // //       )}
      
// // //       {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
// // //     </div>
// // //   );
// // // };

// // // export default PhoneVerification;
