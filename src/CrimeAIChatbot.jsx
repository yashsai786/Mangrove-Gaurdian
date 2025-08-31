import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getFirestore, collection, addDoc, query, where, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const CrimeAIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      text: "Hello! I'm your Crime Information Assistant. How can I help you today?", 
      sender: 'bot' 
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const auth = getAuth();
  const db = getFirestore();
  
  // Initialize Gemini client
  // const genAI = new GoogleGenerativeAI("AIzaSyCO8bbC3GNyxE11wMm_hK6FdYwMTScZmVU");
 
  const genAI = new GoogleGenerativeAI("AIzaSyA5827EEbsxzZ2C-OZZX2tK0sefoD4DoxI");
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  // Load chat history from Firebase when component mounts
  useEffect(() => {
    const loadChatHistory = async () => {
      // Only load history if user is logged in
      if (auth.currentUser) {
        try {
          const userId = auth.currentUser.uid;
          const chatRef = collection(db, "chatMessages");
          const q = query(
            chatRef,
            where("userId", "==", userId),
            orderBy("timestamp", "asc")
          );
          
          const querySnapshot = await getDocs(q);
          const history = [];
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            history.push({
              text: data.message,
              sender: data.sender
            });
          });
          
          // Only replace default message if we have history
          if (history.length > 0) {
            setMessages(history);
          }
        } catch (error) {
          console.error("Error loading chat history:", error);
        }
      }
    };
    
    loadChatHistory();
  }, [auth.currentUser, db]);

  // Save message to Firebase
  const saveMessageToFirebase = async (message) => {
    if (!auth.currentUser) return; // Don't save if not logged in
    
    try {
      const chatRef = collection(db, "chatMessages");
      await addDoc(chatRef, {
        userId: auth.currentUser.uid,
        message: message.text,
        sender: message.sender,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error saving message:", error);
    }
  };

  // Get response from Gemini
  const getAIResponse = async (userQuery) => {
    try {
      // Prepare conversation history
      const recentMessages = messages.slice(-5);
      let conversationContext = recentMessages.map(msg => 
        `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`
      ).join('\n');
      
      // Format the prompt with system instructions and conversation history
      const prompt = `You are a helpful crime information assistant for the Transgression Vigilance app, a platform where users can report and track crimes in their neighborhood.
                  Your role is to:
                  1. Provide information on crime prevention and safety
                  2. Guide users on how to report incidents properly
                  3. Explain legal rights and procedures related to crime reporting
                  4. Suggest safety measures based on specific crimes mentioned
                  5. Offer emergency response guidance
                  
                  Keep your responses focused, factual, and helpful. Emphasize community safety and awareness.
                  For emergency situations, always direct users to contact emergency services immediately.
                  Do not provide advice that could help someone commit crimes.
                  
                  Previous conversation:
                  ${conversationContext}
                  
                  User: ${userQuery}
                  Assistant:`;
      
      // Get response from Gemini
      const result = await model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error("Error with Gemini:", error);
      
      // Handle quota exceeded errors specifically
      if (error.message && error.message.includes("quota")) {
        return "I'm sorry, but our AI service is currently unavailable due to usage limits. Please try again later or contact support for assistance.";
      }
      
      return "I'm sorry, I encountered a technical issue. Please try again in a moment.";
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const userInput = inputValue.trim();
    if (userInput === '') return;
    
    // Add user message to chat
    const userMessage = { text: userInput, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    
    // Save user message to Firebase
    await saveMessageToFirebase(userMessage);
    
    // Show typing indicator
    setIsTyping(true);
    
    // Get AI response
    const aiResponse = await getAIResponse(userInput);
    
    // Add AI response to chat
    const botMessage = { text: aiResponse, sender: 'bot' };
    setMessages(prev => [...prev, botMessage]);
    
    // Save bot message to Firebase
    await saveMessageToFirebase(botMessage);
    
    // Hide typing indicator
    setIsTyping(false);
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat toggle button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 hover:bg-red-700 text-white rounded-full p-4 shadow-lg flex items-center justify-center"
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>
      
      {/* Chat window - only show when open */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 md:w-96 bg-white rounded-lg shadow-xl flex flex-col border border-gray-200 max-h-[80vh]">
          {/* Chat header */}
          <div className="bg-blue-600 text-white px-4 py-3 rounded-t-lg flex justify-between items-center">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
              <h3 className="font-medium">Crime Information Assistant</h3>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200"
              aria-label="Close chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 max-h-96">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`mb-3 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`px-4 py-2 rounded-lg max-w-[80%] ${
                    msg.sender === 'user' 
                      ? 'bg-blue-500 text-white rounded-br-none' 
                      : 'bg-gray-200 text-gray-800 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start mb-3">
                <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg rounded-bl-none max-w-[80%]">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Chat input */}
          <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3 flex">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about crime prevention, reporting..."
              className="flex-1 border border-gray-300 rounded-l-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isTyping}
            />
            <button 
              type="submit" 
              className="bg-blue-600 hover:bg-red-700 text-white px-4 py-2 rounded-r-lg flex items-center justify-center"
              disabled={isTyping || inputValue.trim() === ''}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default CrimeAIChatbot;

// import React, { useState, useRef, useEffect } from 'react';
// import { GoogleGenerativeAI } from "@google/generative-ai";

// const CrimeAIChatbot = () => {
//   const [isOpen, setIsOpen] = useState(false);
//   const [messages, setMessages] = useState([
//     { 
//       text: "Hello! I'm your Crime Information Assistant. How can I help you today?", 
//       sender: 'bot' 
//     }
//   ]);
//   const [inputValue, setInputValue] = useState('');
//   const [isTyping, setIsTyping] = useState(false);
//   const messagesEndRef = useRef(null);
  
//   // Initialize Gemini client
//   const genAI = new GoogleGenerativeAI("AIzaSyCO8bbC3GNyxE11wMm_hK6FdYwMTScZmVU");
//   const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

//   // Get response from Gemini
//   const getAIResponse = async (userQuery) => {
//     try {
//       // Format the prompt to include instructions
//       const prompt = `You are a helpful crime information assistant. Provide information about crime prevention, safety tips, and how to report incidents. Keep your responses focused on helping users stay safe and informed.

// User query: ${userQuery}`;
      
//       // Simple request without chat history
//       const result = await model.generateContent(prompt);
//       const response = result.response;
//       return response.text();
//     } catch (error) {
//       console.error("Error with Gemini:", error);
      
//       // Handle quota exceeded errors specifically
//       if (error.message && error.message.includes("quota")) {
//         return "I'm sorry, but our AI service is currently unavailable due to usage limits. Please try again later or contact support for assistance.";
//       }
      
//       return "I'm sorry, I encountered a technical issue. Please try again in a moment.";
//     }
//   };

//   // Handle form submission
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     const userInput = inputValue.trim();
//     if (userInput === '') return;
    
//     // Add user message to chat
//     const userMessage = { text: userInput, sender: 'user' };
//     setMessages(prev => [...prev, userMessage]);
//     setInputValue('');
    
//     // Show typing indicator
//     setIsTyping(true);
    
//     // Get AI response
//     const aiResponse = await getAIResponse(userInput);
    
//     // Add AI response to chat
//     const botMessage = { text: aiResponse, sender: 'bot' };
//     setMessages(prev => [...prev, botMessage]);
    
//     // Hide typing indicator
//     setIsTyping(false);
//   };

//   // Auto-scroll to bottom when messages change
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [messages]);

//   return (
//     <div className="fixed bottom-6 right-6 z-40">
//       {/* Chat toggle button */}
//       <button 
//         onClick={() => setIsOpen(!isOpen)}
//         className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg flex items-center justify-center"
//         aria-label={isOpen ? "Close chat" : "Open chat"}
//       >
//         {isOpen ? (
//           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//           </svg>
//         ) : (
//           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
//           </svg>
//         )}
//       </button>
      
//       {/* Chat window - only show when open */}
//       {isOpen && (
//         <div className="absolute bottom-16 right-0 w-80 md:w-96 bg-white rounded-lg shadow-xl flex flex-col border border-gray-200 max-h-[80vh]">
//           {/* Chat header */}
//           <div className="bg-blue-600 text-white px-4 py-3 rounded-t-lg flex justify-between items-center">
//             <div className="flex items-center">
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
//               </svg>
//               <h3 className="font-medium">Crime Information Assistant</h3>
//             </div>
//             <button 
//               onClick={() => setIsOpen(false)}
//               className="text-white hover:text-gray-200"
//               aria-label="Close chat"
//             >
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//                 <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
//               </svg>
//             </button>
//           </div>
          
//           {/* Chat messages */}
//           <div className="flex-1 overflow-y-auto p-4 max-h-96">
//             {messages.map((msg, index) => (
//               <div 
//                 key={index} 
//                 className={`mb-3 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
//               >
//                 <div 
//                   className={`px-4 py-2 rounded-lg max-w-[80%] ${
//                     msg.sender === 'user' 
//                       ? 'bg-blue-500 text-white rounded-br-none' 
//                       : 'bg-gray-200 text-gray-800 rounded-bl-none'
//                   }`}
//                 >
//                   {msg.text}
//                 </div>
//               </div>
//             ))}
//             {isTyping && (
//               <div className="flex justify-start mb-3">
//                 <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg rounded-bl-none max-w-[80%]">
//                   <div className="flex space-x-1">
//                     <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
//                     <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
//                     <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
//                   </div>
//                 </div>
//               </div>
//             )}
//             <div ref={messagesEndRef} />
//           </div>
          
//           {/* Chat input */}
//           <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3 flex">
//             <input
//               type="text"
//               value={inputValue}
//               onChange={(e) => setInputValue(e.target.value)}
//               placeholder="Ask about crime prevention, reporting..."
//               className="flex-1 border border-gray-300 rounded-l-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//               disabled={isTyping}
//             />
//             <button 
//               type="submit" 
//               className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg flex items-center justify-center"
//               disabled={isTyping || inputValue.trim() === ''}
//             >
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//                 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
//               </svg>
//             </button>
//           </form>
//         </div>
//       )}
//     </div>
//   );
// };

// export default CrimeAIChatbot;

// import React, { useState, useRef, useEffect } from 'react';
// import OpenAI from "openai";
// import { getFirestore, collection, addDoc, query, where, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
// import { getAuth } from 'firebase/auth';

// const CrimeAIChatbot = () => {
//   const [isOpen, setIsOpen] = useState(false);
//   const [messages, setMessages] = useState([
//     { 
//       text: "Hello! I'm your Crime Information Assistant. How can I help you today?", 
//       sender: 'bot' 
//     }
//   ]);
//   const [inputValue, setInputValue] = useState('');
//   const [isTyping, setIsTyping] = useState(false);
//   const messagesEndRef = useRef(null);
//   const auth = getAuth();
//   const db = getFirestore();
  
//   // Initialize OpenAI client
//   const openai = new OpenAI({
//     apiKey: "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",
//     dangerouslyAllowBrowser: true // Only use this flag if your key is properly restricted
//   });

//   // Load chat history from Firebase when component mounts
//   useEffect(() => {
//     const loadChatHistory = async () => {
//       // Only load history if user is logged in
//       if (auth.currentUser) {
//         try {
//           const userId = auth.currentUser.uid;
//           const chatRef = collection(db, "chatMessages");
//           const q = query(
//             chatRef,
//             where("userId", "==", userId),
//             orderBy("timestamp", "asc")
//           );
          
//           const querySnapshot = await getDocs(q);
//           const history = [];
          
//           querySnapshot.forEach((doc) => {
//             const data = doc.data();
//             history.push({
//               text: data.message,
//               sender: data.sender
//             });
//           });
          
//           // Only replace default message if we have history
//           if (history.length > 0) {
//             setMessages(history);
//           }
//         } catch (error) {
//           console.error("Error loading chat history:", error);
//         }
//       }
//     };
    
//     loadChatHistory();
//   }, [auth.currentUser, db]);

//   // Save message to Firebase
//   const saveMessageToFirebase = async (message) => {
//     if (!auth.currentUser) return; // Don't save if not logged in
    
//     try {
//       const chatRef = collection(db, "chatMessages");
//       await addDoc(chatRef, {
//         userId: auth.currentUser.uid,
//         message: message.text,
//         sender: message.sender,
//         timestamp: serverTimestamp()
//       });
//     } catch (error) {
//       console.error("Error saving message:", error);
//     }
//   };

//   // Get response from OpenAI
//   const getAIResponse = async (userQuery) => {
//     try {
//       // Prepare system message with crime-focused instructions
//       const systemMessage = {
//         role: "system",
//         content: `You are a helpful crime information assistant for the Transgression Vigilance app, a platform where users can report and track crimes in their neighborhood.
//                  Your role is to:
//                  1. Provide information on crime prevention and safety
//                  2. Guide users on how to report incidents properly
//                  3. Explain legal rights and procedures related to crime reporting
//                  4. Suggest safety measures based on specific crimes mentioned
//                  5. Offer emergency response guidance
                 
//                  Keep your responses focused, factual, and helpful. Emphasize community safety and awareness.
//                  For emergency situations, always direct users to contact emergency services immediately.
//                  Do not provide advice that could help someone commit crimes.`
//       };
      
//       // Format conversation history for OpenAI API
//       const conversationHistory = messages.slice(-5).map(msg => ({
//         role: msg.sender === 'bot' ? 'assistant' : 'user',
//         content: msg.text
//       }));
      
//       // Combine system message, history, and current query
//       const formattedMessages = [
//         systemMessage,
//         ...conversationHistory,
//         { role: "user", content: userQuery }
//       ];
      
//       // Call OpenAI API
//       const completion = await openai.chat.completions.create({
//         model: "gpt-3.5-turbo", // Using the more affordable model
//         messages: formattedMessages,
//         temperature: 0.7,
//         max_tokens: 500,
//       });
      
//       return completion.choices[0].message.content;
//     } catch (error) {
//       console.error("Error with OpenAI:", error);
      
//       // Handle quota exceeded errors specifically
//       if (error.status === 429) {
//         return "I'm sorry, but our AI service is currently unavailable due to usage limits. Please try again later or contact support for assistance.";
//       }
      
//       return "I'm sorry, I encountered a technical issue. Please try again in a moment.";
//     }
//   };

//   // Handle form submission
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     const userInput = inputValue.trim();
//     if (userInput === '') return;
    
//     // Add user message to chat
//     const userMessage = { text: userInput, sender: 'user' };
//     setMessages(prev => [...prev, userMessage]);
//     setInputValue('');
    
//     // Save user message to Firebase
//     await saveMessageToFirebase(userMessage);
    
//     // Show typing indicator
//     setIsTyping(true);
    
//     // Get AI response
//     const aiResponse = await getAIResponse(userInput);
    
//     // Add AI response to chat
//     const botMessage = { text: aiResponse, sender: 'bot' };
//     setMessages(prev => [...prev, botMessage]);
    
//     // Save bot message to Firebase
//     await saveMessageToFirebase(botMessage);
    
//     // Hide typing indicator
//     setIsTyping(false);
//   };

//   // Auto-scroll to bottom when messages change
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [messages]);

//   return (
//     <div className="fixed bottom-6 right-6 z-40">
//       {/* Chat toggle button */}
//       <button 
//         onClick={() => setIsOpen(!isOpen)}
//         className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg flex items-center justify-center"
//         aria-label={isOpen ? "Close chat" : "Open chat"}
//       >
//         {isOpen ? (
//           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//           </svg>
//         ) : (
//           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
//           </svg>
//         )}
//       </button>
      
//       {/* Chat window - only show when open */}
//       {isOpen && (
//         <div className="absolute bottom-16 right-0 w-80 md:w-96 bg-white rounded-lg shadow-xl flex flex-col border border-gray-200 max-h-[80vh]">
//           {/* Chat header */}
//           <div className="bg-blue-600 text-white px-4 py-3 rounded-t-lg flex justify-between items-center">
//             <div className="flex items-center">
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
//               </svg>
//               <h3 className="font-medium">Crime Information Assistant</h3>
//             </div>
//             <button 
//               onClick={() => setIsOpen(false)}
//               className="text-white hover:text-gray-200"
//               aria-label="Close chat"
//             >
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//                 <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
//               </svg>
//             </button>
//           </div>
          
//           {/* Chat messages */}
//           <div className="flex-1 overflow-y-auto p-4 max-h-96">
//             {messages.map((msg, index) => (
//               <div 
//                 key={index} 
//                 className={`mb-3 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
//               >
//                 <div 
//                   className={`px-4 py-2 rounded-lg max-w-[80%] ${
//                     msg.sender === 'user' 
//                       ? 'bg-blue-500 text-white rounded-br-none' 
//                       : 'bg-gray-200 text-gray-800 rounded-bl-none'
//                   }`}
//                 >
//                   {msg.text}
//                 </div>
//               </div>
//             ))}
//             {isTyping && (
//               <div className="flex justify-start mb-3">
//                 <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg rounded-bl-none max-w-[80%]">
//                   <div className="flex space-x-1">
//                     <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
//                     <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
//                     <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
//                   </div>
//                 </div>
//               </div>
//             )}
//             <div ref={messagesEndRef} />
//           </div>
          
//           {/* Chat input */}
//           <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3 flex">
//             <input
//               type="text"
//               value={inputValue}
//               onChange={(e) => setInputValue(e.target.value)}
//               placeholder="Ask about crime prevention, reporting..."
//               className="flex-1 border border-gray-300 rounded-l-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//               disabled={isTyping}
//             />
//             <button 
//               type="submit" 
//               className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg flex items-center justify-center"
//               disabled={isTyping || inputValue.trim() === ''}
//             >
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//                 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
//               </svg>
//             </button>
//           </form>
//         </div>
//       )}
//     </div>
//   );
// };

// export default CrimeAIChatbot;


// import React, { useState, useRef, useEffect } from 'react';
// import OpenAI from "openai";

// const CrimeAIChatbot = () => {
//   const [isOpen, setIsOpen] = useState(false);
//   const [messages, setMessages] = useState([
//     { 
//       text: "Hello! I'm your Crime Information Assistant. How can I help you today?", 
//       sender: 'bot' 
//     }
//   ]);
//   const [inputValue, setInputValue] = useState('');
//   const [isTyping, setIsTyping] = useState(false);
//   const messagesEndRef = useRef(null);
  
//   // Initialize OpenAI client
//   const openai = new OpenAI({
//     apiKey: "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",
//     dangerouslyAllowBrowser: true // Only use this flag if your key is properly restricted
//   });

//   // Get response from OpenAI
//   const getAIResponse = async (userQuery) => {
//     try {
//       // Format conversation history for OpenAI API
//       const systemMessage = {
//         role: "system",
//         content: "You are a helpful crime information assistant. Provide information about crime prevention, safety tips, and how to report incidents. Keep your responses focused on helping users stay safe and informed."
//       };
      
//       const conversationHistory = messages.slice(-5).map(msg => ({
//         role: msg.sender === 'bot' ? 'assistant' : 'user',
//         content: msg.text
//       }));
      
//       const formattedMessages = [
//         systemMessage,
//         ...conversationHistory,
//         { role: "user", content: userQuery }
//       ];
      
//       // Call OpenAI API
//       const completion = await openai.chat.completions.create({
//         model: "gpt-3.5-turbo", // Using the more affordable model
//         messages: formattedMessages,
//         temperature: 0.7,
//         max_tokens: 500,
//       });
      
//       return completion.choices[0].message.content;
//     } catch (error) {
//       console.error("Error with OpenAI:", error);
      
//       // Handle quota exceeded errors specifically
//       if (error.status === 429) {
//         return "I'm sorry, but our AI service is currently unavailable due to usage limits. Please try again later or contact support for assistance.";
//       }
      
//       return "I'm sorry, I encountered a technical issue. Please try again in a moment.";
//     }
//   };

//   // Handle form submission
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     const userInput = inputValue.trim();
//     if (userInput === '') return;
    
//     // Add user message to chat
//     const userMessage = { text: userInput, sender: 'user' };
//     setMessages(prev => [...prev, userMessage]);
//     setInputValue('');
    
//     // Show typing indicator
//     setIsTyping(true);
    
//     // Get AI response
//     const aiResponse = await getAIResponse(userInput);
    
//     // Add AI response to chat
//     const botMessage = { text: aiResponse, sender: 'bot' };
//     setMessages(prev => [...prev, botMessage]);
    
//     // Hide typing indicator
//     setIsTyping(false);
//   };

//   // Auto-scroll to bottom when messages change
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [messages]);

//   return (
//     <div className="fixed bottom-6 right-6 z-40"> {/* Updated z-index to be higher than other elements */}
//       {/* Chat toggle button */}
//       <button 
//         onClick={() => setIsOpen(!isOpen)}
//         className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg flex items-center justify-center"
//         aria-label={isOpen ? "Close chat" : "Open chat"}
//       >
//         {isOpen ? (
//           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//           </svg>
//         ) : (
//           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
//           </svg>
//         )}
//       </button>
      
//       {/* Chat window - only show when open */}
//       {isOpen && (
//         <div className="absolute bottom-16 right-0 w-80 md:w-96 bg-white rounded-lg shadow-xl flex flex-col border border-gray-200 max-h-[80vh]">
//           {/* Chat header */}
//           <div className="bg-blue-600 text-white px-4 py-3 rounded-t-lg flex justify-between items-center">
//             <div className="flex items-center">
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
//               </svg>
//               <h3 className="font-medium">Crime Information Assistant</h3>
//             </div>
//             <button 
//               onClick={() => setIsOpen(false)}
//               className="text-white hover:text-gray-200"
//               aria-label="Close chat"
//             >
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//                 <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
//               </svg>
//             </button>
//           </div>
          
//           {/* Chat messages */}
//           <div className="flex-1 overflow-y-auto p-4 max-h-96">
//             {messages.map((msg, index) => (
//               <div 
//                 key={index} 
//                 className={`mb-3 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
//               >
//                 <div 
//                   className={`px-4 py-2 rounded-lg max-w-[80%] ${
//                     msg.sender === 'user' 
//                       ? 'bg-blue-500 text-white rounded-br-none' 
//                       : 'bg-gray-200 text-gray-800 rounded-bl-none'
//                   }`}
//                 >
//                   {msg.text}
//                 </div>
//               </div>
//             ))}
//             {isTyping && (
//               <div className="flex justify-start mb-3">
//                 <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg rounded-bl-none max-w-[80%]">
//                   <div className="flex space-x-1">
//                     <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
//                     <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
//                     <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
//                   </div>
//                 </div>
//               </div>
//             )}
//             <div ref={messagesEndRef} />
//           </div>
          
//           {/* Chat input */}
//           <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3 flex">
//             <input
//               type="text"
//               value={inputValue}
//               onChange={(e) => setInputValue(e.target.value)}
//               placeholder="Ask about crime prevention, reporting..."
//               className="flex-1 border border-gray-300 rounded-l-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//               disabled={isTyping}
//             />
//             <button 
//               type="submit" 
//               className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg flex items-center justify-center"
//               disabled={isTyping || inputValue.trim() === ''}
//             >
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//                 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
//               </svg>
//             </button>
//           </form>
//         </div>
//       )}
//     </div>
//   );
// };

// export default CrimeAIChatbot;

// // import React, { useState, useRef, useEffect } from 'react';
// // import OpenAI from "openai";
// // import { getFirestore, collection, addDoc, query, where, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
// // import { getAuth } from 'firebase/auth';

// // const CrimeAIChatbot = () => {
// //   const [isOpen, setIsOpen] = useState(false);
// //   const [messages, setMessages] = useState([
// //     { 
// //       text: "Hello! I'm your Crime Information Assistant. How can I help you today?", 
// //       sender: 'bot' 
// //     }
// //   ]);
// //   const [inputValue, setInputValue] = useState('');
// //   const [isTyping, setIsTyping] = useState(false);
// //   const messagesEndRef = useRef(null);
// //   const auth = getAuth();
// //   const db = getFirestore();
  
// //   // OpenAI configuration
// //   // const openai = new OpenAI({
// //   //   apiKey: process.env.REACT_APP_OPENAI_API_KEY, // Move API key to environment variable
// //   // });
// //   const openai = new OpenAI({
// //     apiKey: "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", // WARNING: This should be moved to environment variables
// //   dangerouslyAllowBrowser: true });

// //   // Load chat history from Firebase when component mounts
// //   useEffect(() => {
// //     const loadChatHistory = async () => {
// //       // Only load history if user is logged in
// //       if (auth.currentUser) {
// //         try {
// //           const userId = auth.currentUser.uid;
// //           const chatRef = collection(db, "chatMessages");
// //           const q = query(
// //             chatRef,
// //             where("userId", "==", userId),
// //             orderBy("timestamp", "asc"),
// //             // Limit to last 20 messages
// //             //limitToLast(20)
// //           );
          
// //           const querySnapshot = await getDocs(q);
// //           const history = [];
          
// //           querySnapshot.forEach((doc) => {
// //             const data = doc.data();
// //             history.push({
// //               text: data.message,
// //               sender: data.sender
// //             });
// //           });
          
// //           // Only replace default message if we have history
// //           if (history.length > 0) {
// //             setMessages(history);
// //           }
// //         } catch (error) {
// //           console.error("Error loading chat history:", error);
// //         }
// //       }
// //     };
    
// //     loadChatHistory();
// //   }, [auth.currentUser, db]);

// //   // Save message to Firebase
// //   const saveMessageToFirebase = async (message) => {
// //     if (!auth.currentUser) return; // Don't save if not logged in
    
// //     try {
// //       const chatRef = collection(db, "chatMessages");
// //       await addDoc(chatRef, {
// //         userId: auth.currentUser.uid,
// //         message: message.text,
// //         sender: message.sender,
// //         timestamp: serverTimestamp()
// //       });
// //     } catch (error) {
// //       console.error("Error saving message:", error);
// //     }
// //   };

// //   // Get response from OpenAI
// //   const getAIResponse = async (userQuery) => {
// //     try {
// //       // Prepare system message with crime-focused instructions
// //       const systemMessage = {
// //         role: "system",
// //         content: `You are a helpful crime information assistant for the Transgression Vigilance app, a platform where users can report and track crimes in their neighborhood.
// //                  Your role is to:
// //                  1. Provide information on crime prevention and safety
// //                  2. Guide users on how to report incidents properly
// //                  3. Explain legal rights and procedures related to crime reporting
// //                  4. Suggest safety measures based on specific crimes mentioned
// //                  5. Offer emergency response guidance
                 
// //                  Keep your responses focused, factual, and helpful. Emphasize community safety and awareness.
// //                  For emergency situations, always direct users to contact emergency services immediately.
// //                  Do not provide advice that could help someone commit crimes.`
// //       };
      
// //       // Format conversation history for OpenAI API
// //       const conversationHistory = messages.slice(-5).map(msg => ({
// //         role: msg.sender === 'bot' ? 'assistant' : 'user',
// //         content: msg.text
// //       }));
      
// //       // Combine system message, history, and current query
// //       const formattedMessages = [
// //         systemMessage,
// //         ...conversationHistory,
// //         { role: "user", content: userQuery }
// //       ];
      
// //       // Call OpenAI API
// //       const completion = await openai.chat.completions.create({
// //         model: "gpt-4o-mini",
// //         messages: formattedMessages,
// //         temperature: 0.7,
// //         max_tokens: 500,
// //       });
      
// //       return completion.choices[0].message.content;
// //     } catch (error) {
// //       console.error("Error with OpenAI:", error);
// //       if (error.status === 429) {
// //       return "I'm sorry, but our AI service is currently unavailable due to usage limits. Please try again later or contact support for assistance.";
// //     }
// //       return "I'm sorry, I encountered a technical issue. Please try again in a moment.";
// //     }
// //   };

// //   // Handle form submission
// //   const handleSubmit = async (e) => {
// //     e.preventDefault();
// //     const userInput = inputValue.trim();
// //     if (userInput === '') return;
    
// //     // Add user message to chat
// //     const userMessage = { text: userInput, sender: 'user' };
// //     setMessages(prev => [...prev, userMessage]);
// //     setInputValue('');
    
// //     // Save user message to Firebase
// //     await saveMessageToFirebase(userMessage);
    
// //     // Show typing indicator
// //     setIsTyping(true);
    
// //     // Get AI response
// //     const aiResponse = await getAIResponse(userInput);
    
// //     // Add AI response to chat
// //     const botMessage = { text: aiResponse, sender: 'bot' };
// //     setMessages(prev => [...prev, botMessage]);
    
// //     // Save bot message to Firebase
// //     await saveMessageToFirebase(botMessage);
    
// //     // Hide typing indicator
// //     setIsTyping(false);
// //   };

// //   // Auto-scroll to bottom when messages change
// //   useEffect(() => {
// //     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
// //   }, [messages]);

// //   return (
// //     <div className="fixed bottom-4 right-4 z-50">
// //       {/* Chat toggle button */}
// //       <button 
// //         onClick={() => setIsOpen(!isOpen)}
// //         className="bg-red-600 hover:bg-red-700 text-white rounded-full p-4 shadow-lg flex items-center justify-center"
// //         aria-label={isOpen ? "Close chat" : "Open chat"}
// //       >
// //         {isOpen ? (
// //           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// //             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
// //           </svg>
// //         ) : (
// //           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// //             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
// //           </svg>
// //         )}
// //       </button>
      
// //       {/* Chat window - only show when open */}
// //       {isOpen && (
// //         <div className="absolute bottom-16 right-0 w-80 md:w-96 bg-white rounded-lg shadow-xl flex flex-col border border-gray-200 max-h-[80vh]">
// //           {/* Chat header */}
// //           <div className="bg-red-600 text-white px-4 py-3 rounded-t-lg flex justify-between items-center">
// //             <div className="flex items-center">
// //               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// //                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
// //               </svg>
// //               <h3 className="font-medium">Crime Information Assistant</h3>
// //             </div>
// //             <button 
// //               onClick={() => setIsOpen(false)}
// //               className="text-white hover:text-gray-200"
// //               aria-label="Close chat"
// //             >
// //               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
// //                 <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
// //               </svg>
// //             </button>
// //           </div>
          
// //           {/* Chat messages */}
// //           <div className="flex-1 overflow-y-auto p-4 max-h-96">
// //             {messages.map((msg, index) => (
// //               <div 
// //                 key={index} 
// //                 className={`mb-3 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
// //               >
// //                 <div 
// //                   className={`px-4 py-2 rounded-lg max-w-[80%] ${
// //                     msg.sender === 'user' 
// //                       ? 'bg-blue-500 text-white rounded-br-none' 
// //                       : 'bg-gray-200 text-gray-800 rounded-bl-none'
// //                   }`}
// //                 >
// //                   {msg.text}
// //                 </div>
// //               </div>
// //             ))}
// //             {isTyping && (
// //               <div className="flex justify-start mb-3">
// //                 <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg rounded-bl-none max-w-[80%]">
// //                   <div className="flex space-x-1">
// //                     <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
// //                     <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
// //                     <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
// //                   </div>
// //                 </div>
// //               </div>
// //             )}
// //             <div ref={messagesEndRef} />
// //           </div>
          
// //           {/* Chat input */}
// //           <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3 flex">
// //             <input
// //               type="text"
// //               value={inputValue}
// //               onChange={(e) => setInputValue(e.target.value)}
// //               placeholder="Ask about crime prevention, reporting..."
// //               className="flex-1 border border-gray-300 rounded-l-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
// //               disabled={isTyping}
// //             />
// //             <button 
// //               type="submit" 
// //               className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-r-lg flex items-center justify-center"
// //               disabled={isTyping || inputValue.trim() === ''}
// //             >
// //               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
// //                 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
// //               </svg>
// //             </button>
// //           </form>
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // export default CrimeAIChatbot;

// // // import React, { useState, useRef, useEffect } from 'react';

// // // const CrimeChatbot = () => {
// // //   const [isOpen, setIsOpen] = useState(false);
// // //   const [messages, setMessages] = useState([
// // //     { 
// // //       text: "Hello! I'm your Crime Information Assistant. How can I help you today?", 
// // //       sender: 'bot' 
// // //     }
// // //   ]);
// // //   const [inputValue, setInputValue] = useState('');
// // //   const [isTyping, setIsTyping] = useState(false);
// // //   const messagesEndRef = useRef(null);

// // //   // Sample crime-related responses based on keywords
// // //   const generateResponse = (query) => {
// // //     const lowerQuery = query.toLowerCase();
    
// // //     // Safety related queries
// // //     if (lowerQuery.includes('safety tips') || lowerQuery.includes('how to stay safe')) {
// // //       return "Here are some general safety tips: 1) Stay aware of your surroundings, 2) Travel in groups when possible, 3) Keep your valuables secure, 4) Have emergency contacts ready, 5) Report suspicious activity promptly.";
// // //     }
    
// // //     // Reporting crime queries
// // //     else if (lowerQuery.includes('report') || lowerQuery.includes('reporting')) {
// // //       return "To report a crime, you can: 1) Use the 'Post Incident' feature in this app, 2) Call your local emergency number, 3) Visit your nearest police station. Remember to provide as much detail as possible.";
// // //     }
    
// // //     // Prevention queries
// // //     else if (lowerQuery.includes('prevent') || lowerQuery.includes('prevention')) {
// // //       return "Crime prevention involves community vigilance, proper security measures for your home/property, and staying informed about local crime patterns. Would you like specific prevention tips for home, vehicle, or personal safety?";
// // //     }
    
// // //     // Statistics queries
// // //     else if (lowerQuery.includes('statistics') || lowerQuery.includes('stats')) {
// // //       return "For up-to-date crime statistics in your area, I recommend checking official police websites or government crime data portals. This app's map view also shows recent reported incidents in your vicinity.";
// // //     }
    
// // //     // Emergency queries
// // //     else if (lowerQuery.includes('emergency') || lowerQuery.includes('help now')) {
// // //       return "If you're in immediate danger, please contact emergency services immediately by calling your local emergency number. This chatbot cannot provide emergency assistance.";
// // //     }
    
// // //     // General or unrecognized queries
// // //     else {
// // //       return "I can provide information about crime prevention, safety tips, reporting procedures, and how to use this platform. How can I assist you with crime-related concerns?";
// // //     }
// // //   };

// // //   const handleSubmit = (e) => {
// // //     e.preventDefault();
// // //     if (inputValue.trim() === '') return;
    
// // //     // Add user message
// // //     const userMessage = { text: inputValue, sender: 'user' };
// // //     setMessages(prev => [...prev, userMessage]);
// // //     setInputValue('');
    
// // //     // Simulate bot typing
// // //     setIsTyping(true);
    
// // //     // Generate bot response with a small delay to simulate thinking
// // //     setTimeout(() => {
// // //       const botResponse = { text: generateResponse(inputValue), sender: 'bot' };
// // //       setMessages(prev => [...prev, botResponse]);
// // //       setIsTyping(false);
// // //     }, 1000);
// // //   };

// // //   // Auto-scroll to the latest message
// // //   useEffect(() => {
// // //     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
// // //   }, [messages]);

// // //   return (
// // //     <div className="fixed bottom-4 right-4 z-50">
// // //       {/* Chat toggle button */}
// // //       <button 
// // //         onClick={() => setIsOpen(!isOpen)}
// // //         className="bg-red-600 hover:bg-red-700 text-white rounded-full p-4 shadow-lg flex items-center justify-center"
// // //       >
// // //         {isOpen ? (
// // //           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // //             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
// // //           </svg>
// // //         ) : (
// // //           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // //             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
// // //           </svg>
// // //         )}
// // //       </button>
      
// // //       {/* Chat window */}
// // //       {isOpen && (
// // //         <div className="absolute bottom-16 right-0 w-80 md:w-96 bg-white rounded-lg shadow-xl flex flex-col border border-gray-200">
// // //           {/* Chat header */}
// // //           <div className="bg-red-600 text-white px-4 py-3 rounded-t-lg flex justify-between items-center">
// // //             <div className="flex items-center">
// // //               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // //                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
// // //               </svg>
// // //               <h3 className="font-medium">Crime Information Assistant</h3>
// // //             </div>
// // //           </div>
          
// // //           {/* Chat messages */}
// // //           <div className="flex-1 overflow-y-auto p-4 max-h-96">
// // //             {messages.map((msg, index) => (
// // //               <div 
// // //                 key={index} 
// // //                 className={`mb-3 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
// // //               >
// // //                 <div 
// // //                   className={`px-4 py-2 rounded-lg max-w-[80%] ${
// // //                     msg.sender === 'user' 
// // //                       ? 'bg-blue-500 text-white rounded-br-none' 
// // //                       : 'bg-gray-200 text-gray-800 rounded-bl-none'
// // //                   }`}
// // //                 >
// // //                   {msg.text}
// // //                 </div>
// // //               </div>
// // //             ))}
// // //             {isTyping && (
// // //               <div className="flex justify-start mb-3">
// // //                 <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg rounded-bl-none max-w-[80%]">
// // //                   <div className="flex space-x-1">
// // //                     <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
// // //                     <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
// // //                     <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
// // //                   </div>
// // //                 </div>
// // //               </div>
// // //             )}
// // //             <div ref={messagesEndRef} />
// // //           </div>
          
// // //           {/* Chat input */}
// // //           <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3 flex">
// // //             <input
// // //               type="text"
// // //               value={inputValue}
// // //               onChange={(e) => setInputValue(e.target.value)}
// // //               placeholder="Ask about crime prevention, reporting..."
// // //               className="flex-1 border border-gray-300 rounded-l-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
// // //             />
// // //             <button 
// // //               type="submit" 
// // //               className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-r-lg"
// // //             >
// // //               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
// // //                 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
// // //               </svg>
// // //             </button>
// // //           </form>
// // //         </div>
// // //       )}
// // //     </div>
// // //   );
// // // };

// // // export default CrimeChatbot;
