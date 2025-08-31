import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import { db, auth } from "./config/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const ContactUs = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userName, setUserName] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [rating, setRating] = useState("");
  const [inquiryName, setInquiryName] = useState("");
  const [inquiryEmail, setInquiryEmail] = useState("");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user is logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        setCurrentUser(user);
        
        // Fetch username from users collection
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setUserName(userDoc.data().username || "Anonymous User");
          } else {
            setUserName("Anonymous User");
            console.log("No user document found for this user ID");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserName("Anonymous User");
        }
      } else {
        setIsLoggedIn(false);
        setCurrentUser(null);
        setUserName("");
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle feedback submission
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    
    if (!isLoggedIn) {
      alert("Please log in to submit feedback");
      return;
    }

    if (!rating || !feedbackMessage) {
      alert("Please provide both a rating and feedback message");
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert rating text to number of stars
      const ratingValue = rating.split(" - ")[0].length;
      
      // Add document to feedback collection
      await addDoc(collection(db, "feedback"), {
        userId: currentUser.uid,
        username: userName, // Using the fetched username
        rating: ratingValue,
        ratingText: rating,
        message: feedbackMessage,
        timestamp: serverTimestamp()
      });

      alert("Feedback submitted successfully!");
      setFeedbackMessage("");
      setRating("");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("Error submitting feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle inquiry submission
  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    
    if (!inquiryName || !inquiryEmail || !inquiryMessage) {
      alert("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Add document to inquiries collection
      await addDoc(collection(db, "inquiries"), {
        name: inquiryName,
        email: inquiryEmail,
        message: inquiryMessage,
        userId: currentUser?.uid || null,
        timestamp: serverTimestamp()
      });

      alert("Inquiry submitted successfully!");
      setInquiryName("");
      setInquiryEmail("");
      setInquiryMessage("");
    } catch (error) {
      console.error("Error submitting inquiry:", error);
      alert("Error submitting inquiry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      
      {/* 🔹 Contact Page Content */}
      {/* <div className="container mx-auto p-6"> */}
      <div className="container mx-auto p-6 pt-16">
        <h1 className="text-3xl font-bold text-center mb-6 text-red-700">CONTACT US</h1>
        <p className="text-center text-gray-600 mb-6">Home / Contact Us</p>

        {/* 🔥 Contact Info Section */}
        <div className="bg-white shadow-lg rounded-lg p-6 mb-6 flex flex-col md:flex-row items-center">
          <div className="w-full md:w-1/3">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">📍 CONTACT INFO</h2>
              <p className="text-gray-700">Ahmedabad</p>
            </div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">📞 PHONE</h2>
              <p className="text-gray-700">0123 456 7890</p>
            </div>
            <div>
              <h2 className="text-lg font-semibold">📧 EMAIL</h2>
              <p className="text-gray-700">crimealert@gmail.com</p>
            </div>
          </div>

          {/* 🔥 Contact Image */}
          <div className="w-full md:w-2/3">
            <img 
              src="https://od.lk/s/OV8yNDY4NTAxNjhf/cotact.jpg" 
              alt="Contact Us" 
              className="w-full h-auto object-contain"
            />
          </div>
        </div>

        {/* 🔥 Inquiry & Feedback Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inquiry Form */}
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-xl font-semibold text-center text-red-700 mb-4">Give Your Inquiry</h2>
            <form onSubmit={handleInquirySubmit}>
              <input 
                type="text" 
                placeholder="Full Name" 
                className="w-full p-2 mb-3 border rounded"
                value={inquiryName}
                onChange={(e) => setInquiryName(e.target.value)}
                required
              />
              <input 
                type="email" 
                placeholder="Email Address" 
                className="w-full p-2 mb-3 border rounded"
                value={inquiryEmail}
                onChange={(e) => setInquiryEmail(e.target.value)}
                required
              />
              <textarea 
                placeholder="Your Question?" 
                className="w-full p-2 mb-3 border rounded"
                value={inquiryMessage}
                onChange={(e) => setInquiryMessage(e.target.value)}
                required
              ></textarea>
              <button 
                type="submit"
                className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-red-400"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>

          {/* Feedback Form */}
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-xl font-semibold text-center text-red-700 mb-4">Give Your Feedback Here</h2>
            {!isLoggedIn ? (
              <div className="text-center p-4 bg-yellow-100 rounded">
                <p>Please log in to submit feedback</p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit}>
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-1">Logged in as: {userName}</p>
                </div>
                <select 
                  className="w-full p-2 mb-3 border rounded"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  required
                >
                  <option value="">Select Rating</option>
                  <option value="⭐ - Poor">⭐ - Poor</option>
                  <option value="⭐⭐ - Average">⭐⭐ - Average</option>
                  <option value="⭐⭐⭐ - Good">⭐⭐⭐ - Good</option>
                  <option value="⭐⭐⭐⭐ - Very Good">⭐⭐⭐⭐ - Very Good</option>
                  <option value="⭐⭐⭐⭐⭐ - Excellent">⭐⭐⭐⭐⭐ - Excellent</option>
                </select>
                <textarea 
                  placeholder="Your Feedback?" 
                  className="w-full p-2 mb-3 border rounded"
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  required
                ></textarea>
                <button 
                  type="submit"
                  className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-red-400"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sending..." : "Send Feedback"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ContactUs;