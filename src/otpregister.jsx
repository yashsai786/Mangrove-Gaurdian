import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, googleProvider } from "./config/firebase";
import { createUserWithEmailAndPassword, signInWithPopup, fetchSignInMethodsForEmail } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    contact: "",
    dob: "",
    gender: "",
    address: "",
    profilePic: null,
  });

  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // OTP related states
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpMessage, setOtpMessage] = useState("");

  useEffect(() => {
    if (auth.currentUser) {
      navigate("/");
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle profile picture selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, profilePic: file });
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Send OTP to the user's phone
  const sendOTP = async () => {
    if (!formData.contact) {
      setOtpMessage("Please enter a phone number.");
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch("http://localhost:5001/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ phoneNumber: formData.contact })
      });
      const data = await response.json();
      setOtpMessage(data.message || "Failed to send OTP");
      if (response.ok) {
        setOtpSent(true);
      }
    } catch (error) {
      setOtpMessage("Error sending OTP");
    } finally {
      setLoading(false);
    }
  };

  // Verify the OTP entered by the user
  const verifyOTP = async () => {
    if (!otp) {
      setOtpMessage("Please enter the OTP.");
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch("http://localhost:5001/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          phoneNumber: formData.contact,
          otp: otp 
        })
      });
      const data = await response.json();
      setOtpMessage(data.message || "Failed to verify OTP");
      if (response.ok) {
        setOtpVerified(true);
      }
    } catch (error) {
      setOtpMessage("Error verifying OTP");
    } finally {
      setLoading(false);
    }
  };

  // Upload profile picture to ImageKit
  const uploadToImageKit = async (file) => {
    if (!file) return "";

    try {
      const authResponse = await fetch("http://localhost:5000/auth");
      const authData = await authResponse.json();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name);
      formData.append("publicKey", "public_KoLQpUZM3TZfPrc1If4RUVRgHAw=");
      formData.append("signature", authData.signature);
      formData.append("expire", authData.expire);
      formData.append("token", authData.token);
      formData.append("folder", "/profile_pictures");

      const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!result.url) throw new Error("Upload failed: " + (result.error?.message || "Unknown error"));

      return result.url;
    } catch (error) {
      console.error("Image upload failed:", error);
      alert("Image upload failed. Check console for details.");
      return "";
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Check if phone verification is complete
    if (!otpVerified) {
      setError("Please verify your phone number first.");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      setLoading(false);
      return;
    }

    try {
      const methods = await fetchSignInMethodsForEmail(auth, formData.email);
      if (methods.length > 0) {
        alert("User already registered. Redirecting to login page.");
        navigate("/");
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      let profilePicUrl = "";
      if (formData.profilePic) {
        profilePicUrl = await uploadToImageKit(formData.profilePic);
      }

      await setDoc(doc(db, "users", user.uid), {
        username: formData.username,
        email: formData.email,
        contact: formData.contact,
        phoneVerified: true,
        dob: formData.dob,
        gender: formData.gender,
        address: formData.address,
        profilePic: profilePicUrl,
        reg_date: serverTimestamp(),
      });

      alert("User registered successfully!");
      navigate("/");
    } catch (error) {
      console.error("Error registering user", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      await setDoc(doc(db, "users", user.uid), {
        username: user.displayName,
        email: user.email,
        profilePic: user.photoURL,
        contact: "",
        phoneVerified: false,
        dob: "",
        gender: "",
        address: "",
        reg_date: serverTimestamp(),
      }, { merge: true });

      alert("Signed in with Google successfully!");
      navigate("/");
    } catch (error) {
      console.error("Google sign-in error", error);
      setError(error.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-4">Register</h2>

        {error && <p className="text-red-500 text-center">{error}</p>}

        <form onSubmit={handleRegister} className="space-y-4 bg-black-100">
          <input type="text" name="username" placeholder="Username" onChange={handleChange} required className="w-full p-2 border rounded" />
          <input type="email" name="email" placeholder="Email" onChange={handleChange} required className="w-full p-2 border rounded" />
          <input type="password" name="password" placeholder="Password" onChange={handleChange} required className="w-full p-2 border rounded" />
          <input type="password" name="confirmPassword" placeholder="Confirm Password" onChange={handleChange} required className="w-full p-2 border rounded" />
          
          {/* Phone verification section */}
          <div className="space-y-2">
            <div className="flex space-x-2">
              <input 
                type="text" 
                name="contact" 
                placeholder="Phone Number" 
                onChange={handleChange} 
                required 
                className="flex-1 p-2 border rounded" 
                disabled={otpSent}
              />
              <button 
                type="button" 
                onClick={sendOTP} 
                disabled={loading || otpVerified} 
                className={`px-4 py-2 text-white rounded ${otpVerified ? "bg-green-500" : "bg-blue-500"}`}
              >
                {loading ? "Sending..." : otpVerified ? "Verified" : "Send OTP"}
              </button>
            </div>
            
            {otpSent && !otpVerified && (
              <div className="flex space-x-2">
                <input 
                  type="text" 
                  placeholder="Enter OTP" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  className="flex-1 p-2 border rounded" 
                />
                <button 
                  type="button" 
                  onClick={verifyOTP} 
                  disabled={loading} 
                  className="px-4 py-2 bg-blue-500 text-white rounded"
                >
                  {loading ? "Verifying..." : "Verify"}
                </button>
              </div>
            )}
            
            {otpMessage && <p className={`text-sm ${otpVerified ? "text-green-500" : "text-red-500"}`}>{otpMessage}</p>}
          </div>
          
          <input type="date" name="dob" onChange={handleChange} required className="w-full p-2 border rounded" />
          <select name="gender" onChange={handleChange} required className="w-full p-2 border rounded">
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          <textarea name="address" placeholder="Address" onChange={handleChange} required className="w-full p-2 border rounded"></textarea>

          {/* Profile Picture Upload */}
          <div className="flex flex-col items-center">
            {previewUrl && <img src={previewUrl} alt="Profile Preview" className="w-24 h-24 rounded-full mb-2" />}
            <label className="cursor-pointer bg-gray-200 px-4 py-2 rounded">
              Upload Profile Picture
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-500 text-white p-2 rounded" 
            disabled={loading || !otpVerified}
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <button onClick={handleGoogleSignIn} className="mt-4 w-full bg-red-500 text-white p-2 rounded">
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

export default Register;