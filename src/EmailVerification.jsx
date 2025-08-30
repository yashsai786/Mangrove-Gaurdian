import React, { useState, useEffect } from "react";

const EmailVerification = ({ email, isEmailExists, onVerificationComplete, apiUrl }) => {
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [timer, setTimer] = useState(0);

  // Timer for OTP resend
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    } else {
      setResendDisabled(false);
    }
    
    return () => clearInterval(interval);
  }, [timer]);

  // Update parent component when verification status changes
  useEffect(() => {
    if (onVerificationComplete) {
      onVerificationComplete(otpVerified);
    }
  }, [otpVerified, onVerificationComplete]);

  const sendOTP = async () => {
    setOtpError("");
    setOtpLoading(true);
    
    try {
      console.log(`Sending OTP request to ${apiUrl}/api/send-otp`);
      
      const response = await fetch(`${apiUrl}/api/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      console.log("OTP response:", data);
      
      if (data.success) {
        setOtpSent(true);
        setResendDisabled(true);
        setTimer(60); // 60 seconds cooldown
      } else {
        setOtpError(data.message || "Failed to send OTP. Please try again.");
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      setOtpError("Network error. Please check your connection and try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp) {
      setOtpError("Please enter the OTP");
      return;
    }
    
    setOtpLoading(true);
    setOtpError("");
    
    try {
      const response = await fetch(`${apiUrl}/api/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otp }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setOtpVerified(true);
        setOtpError("");
      } else {
        setOtpError(data.message || "Invalid OTP. Please try again.");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setOtpError("Network error. Please check your connection and try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  // Don't render anything if email already exists
  if (isEmailExists) {
    return null;
  }

  return (
    <div className="bg-blue-50 p-4 rounded border border-blue-200">
      <h3 className="font-semibold text-blue-800 mb-2">Email Verification</h3>
      
      {otpVerified ? (
        <div className="bg-green-100 text-green-700 p-2 rounded text-center">
          Email verified successfully ✓
        </div>
      ) : (
        <>
          {otpSent ? (
            <div className="space-y-3">
              <p className="text-sm">We've sent a verification code to {email}</p>
              <div className="flex space-x-2">
                <input 
                  type="text" 
                  placeholder="Enter 6-digit OTP" 
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  className="w-full p-2 border rounded" 
                />
                <button 
                  type="button" 
                  onClick={verifyOTP}
                  disabled={otpLoading}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 whitespace-nowrap"
                >
                  {otpLoading ? "Verifying..." : "Verify"}
                </button>
              </div>
              <div className="flex justify-between items-center text-sm">
                <button
                  type="button"
                  onClick={sendOTP}
                  disabled={resendDisabled}
                  className="text-red-600 hover:underline disabled:text-gray-400"
                >
                  Resend OTP {timer > 0 ? `(${timer}s)` : ''}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex space-x-2">
              <button 
                type="button" 
                onClick={sendOTP}
                disabled={otpLoading}
                className="w-full bg-red-600 text-white p-2 rounded hover:bg-red-700"
              >
                {otpLoading ? "Sending..." : "Send Verification Code"}
              </button>
            </div>
          )}
        </>
      )}
      
      {otpError && <p className="text-red-500 text-sm mt-2">{otpError}</p>}
    </div>
  );
};

export default EmailVerification;