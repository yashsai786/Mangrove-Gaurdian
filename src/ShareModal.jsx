import React from "react";
import { UilMultiply, UilCopy } from "@iconscout/react-unicons";

const ShareModal = ({ url, onClose, title }) => {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Link copied to clipboard!");
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-20 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-bold text-gray-800">Share Post</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <UilMultiply size="20" />
          </button>
        </div>
        
        <p className="text-gray-600 mb-4 text-sm truncate">{title || "Share this post with your friends"}</p>
        
        <div className="relative mb-6">
          <input
            type="text"
            value={url}
            readOnly
            className="w-full p-3 pr-16 border border-gray-300 rounded-lg bg-gray-50 text-gray-800"
            onClick={(e) => e.target.select()}
          />
          <button
            onClick={() => copyToClipboard(url)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-500 hover:text-blue-700 transition-colors"
          >
            <UilCopy size="20" />
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          {/* WhatsApp */}
          <a 
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(url)}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
          >
            <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.75 13.96c.25.13.41.29.46.45.06.16.07.26.06.27l-.13.82c-.08.51-.42.75-.82.75-.29 0-.65-.15-.9-.27l-1.69-.84c-.64-.32-1.22-.36-1.74.37-.13.18-.36.29-.58.29h-.09c-.1 0-.21-.02-.31-.06-.4-.11-.67-.39-.77-.79-.41-1.37.31-2.07 1.68-3.37l.1-.09c.12-.11.28-.24.45-.4.5-.4 1.25-1.01 1.8-1.61.29-.31.47-.5.56-.61.13-.16.18-.23.24-.35.2-.4.25-.69.16-1.02-.08-.31-.28-.56-.56-.7a1.28 1.28 0 0 0-.93-.15c-.41.08-.78.32-1.14.69-.36.37-.78.83-1.25 1.37-.47.53-.93 1.11-1.32 1.63-.36.49-.65.91-.84 1.2-.19.29-.28.44-.34.52-.2.29-.38.42-.56.42-.11 0-.28-.07-.35-.15C9.23 10.9 9 10.46 9 9.5c0-.7.2-1.42.61-2.16.3-.56.72-1.11 1.27-1.67.55-.56 1.2-1.12 1.95-1.67.75-.55 1.55-1.08 2.37-1.55.82-.47 1.65-.89 2.46-1.22.81-.33 1.59-.57 2.26-.7C20.57.4 21.14.3 21.5.3c.47 0 .89.1 1.25.3.33.17.63.41.79.67.24.39.26.81.08 1.22-.43.95-1.33 2.14-2.96 3.43-1.62 1.29-3.94 2.71-6.94 3.54.23.91.67 1.59 1.29 2.01.61.43 1.38.6 2.32.6h.35c.94-.03 1.88-.34 2.77-.88.89-.53 1.77-1.31 2.63-2.32.16-.2.37-.3.6-.3.47 0 .87.34.96.8.1.47-.08.93-.43 1.2-.91 1.15-1.9 2.01-2.91 2.58-1.01.58-2.09.88-3.16.88h-.52c-1.34-.1-2.47-.53-3.39-1.28-1.02-.83-1.71-1.99-2.03-3.26-.02-.08-.04-.12-.04-.14zm-3.7 1.93c.17-.15.26-.08.3.11.44 1.92 1.29 3 2.55 3.37.6.18 1.28.16 2.05-.06.77-.23 1.57-.62 2.4-1.17.83-.55 1.6-1.25 2.31-2.1.05-.42.15-.77.32-1.03.18-.27.42-.44.72-.5.3-.07.67-.02 1.05.15.39.17.75.47 1.06.9.31.42.48.91.48 1.43 0 .2-.02.4-.07.59-.05.19-.13.37-.24.54-.11.17-.24.32-.39.44-.65.56-1.35 1.08-2.07 1.55-.72.47-1.45.87-2.17 1.18-.73.31-1.43.53-2.09.65-.66.12-1.25.15-1.76.08-.38-.03-.81-.15-1.27-.35-.47-.2-.9-.49-1.29-.87-.39-.38-.73-.84-1.01-1.38-.28-.54-.45-1.16-.52-1.87-.05-.45-.06-.87-.03-1.26.03-.41.13-.78.3-1.11z"/>
              </svg>
            </div>
            <span className="text-sm text-gray-600">WhatsApp</span>
          </a>
          
          {/* Twitter/X */}
          <a 
            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </div>
            <span className="text-sm text-gray-600">Twitter</span>
          </a>
          
          {/* Facebook */}
          <a 
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/>
              </svg>
            </div>
            <span className="text-sm text-gray-600">Facebook</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;



// import React from "react";
// import { UilMultiply, UilCopy } from "@iconscout/react-unicons";

// const ShareModal = ({ onClose, shareUrl, postId }) => {
//   if (!isOpen) return null;

  
//   const copyToClipboard = (text) => {
//     navigator.clipboard.writeText(text);
//     alert("Link copied to clipboard!");
//   };
  
//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-20 p-4">
//       <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
//         <div className="flex justify-between items-center border-b pb-3 mb-4">
//           <h2 className="text-xl font-bold text-gray-800">Share Post</h2>
//           <button 
//             onClick={onClose}
//             className="text-gray-500 hover:text-gray-700 transition-colors"
//           >
//             <UilMultiply size="20" />
//           </button>
//         </div>
        
//         <p className="text-gray-600 mb-4 text-sm truncate">{title}</p>
        
//         <div className="relative mb-6">
//           <input
//             type="text"
//             value={url}
//             readOnly
//             className="w-full p-3 pr-16 border border-gray-300 rounded-lg bg-gray-50 text-gray-800"
//             onClick={(e) => e.target.select()}
//           />
//           <button
//             onClick={() => copyToClipboard(url)}
//             className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-500 hover:text-blue-700 transition-colors"
//           >
//             <UilCopy size="20" />
//           </button>
//         </div>
        
//         <div className="grid grid-cols-3 gap-4">
//           {/* WhatsApp */}
//           <a 
//             href={`https://api.whatsapp.com/send?text=${encodeURIComponent(url)}`} 
//             target="_blank" 
//             rel="noopener noreferrer"
//             className="flex flex-col items-center justify-center p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
//           >
//             <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mb-2">
//               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
//                 <path d="M16.75 13.96c.25.13.41.29.46.45.06.16.07.26.06.27l-.13.82c-.08.51-.42.75-.82.75-.29 0-.65-.15-.9-.27l-1.69-.84c-.64-.32-1.22-.36-1.74.37-.13.18-.36.29-.58.29h-.09c-.1 0-.21-.02-.31-.06-.4-.11-.67-.39-.77-.79-.41-1.37.31-2.07 1.68-3.37l.1-.09c.12-.11.28-.24.45-.4.5-.4 1.25-1.01 1.8-1.61.29-.31.47-.5.56-.61.13-.16.18-.23.24-.35.2-.4.25-.69.16-1.02-.08-.31-.28-.56-.56-.7a1.28 1.28 0 0 0-.93-.15c-.41.08-.78.32-1.14.69-.36.37-.78.83-1.25 1.37-.47.53-.93 1.11-1.32 1.63-.36.49-.65.91-.84 1.2-.19.29-.28.44-.34.52-.2.29-.38.42-.56.42-.11 0-.28-.07-.35-.15C9.23 10.9 9 10.46 9 9.5c0-.7.2-1.42.61-2.16.3-.56.72-1.11 1.27-1.67.55-.56 1.2-1.12 1.95-1.67.75-.55 1.55-1.08 2.37-1.55.82-.47 1.65-.89 2.46-1.22.81-.33 1.59-.57 2.26-.7C20.57.4 21.14.3 21.5.3c.47 0 .89.1 1.25.3.33.17.63.41.79.67.24.39.26.81.08 1.22-.43.95-1.33 2.14-2.96 3.43-1.62 1.29-3.94 2.71-6.94 3.54.23.91.67 1.59 1.29 2.01.61.43 1.38.6 2.32.6h.35c.94-.03 1.88-.34 2.77-.88.89-.53 1.77-1.31 2.63-2.32.16-.2.37-.3.6-.3.47 0 .87.34.96.8.1.47-.08.93-.43 1.2-.91 1.15-1.9 2.01-2.91 2.58-1.01.58-2.09.88-3.16.88h-.52c-1.34-.1-2.47-.53-3.39-1.28-1.02-.83-1.71-1.99-2.03-3.26-.02-.08-.04-.12-.04-.14zm-3.7 1.93c.17-.15.26-.08.3.11.44 1.92 1.29 3 2.55 3.37.6.18 1.28.16 2.05-.06.77-.23 1.57-.62 2.4-1.17.83-.55 1.6-1.25 2.31-2.1.05-.42.15-.77.32-1.03.18-.27.42-.44.72-.5.3-.07.67-.02 1.05.15.39.17.75.47 1.06.9.31.42.48.91.48 1.43 0 .2-.02.4-.07.59-.05.19-.13.37-.24.54-.11.17-.24.32-.39.44-.65.56-1.35 1.08-2.07 1.55-.72.47-1.45.87-2.17 1.18-.73.31-1.43.53-2.09.65-.66.12-1.25.15-1.76.08-.38-.03-.81-.15-1.27-.35-.47-.2-.9-.49-1.29-.87-.39-.38-.73-.84-1.01-1.38-.28-.54-.45-1.16-.52-1.87-.05-.45-.06-.87-.03-1.26.03-.41.13-.78.3-1.11z"/>
//               </svg>
//             </div>
//             <span className="text-sm text-gray-600">WhatsApp</span>
//           </a>
          
//           {/* Twitter/X */}
//           <a 
//             href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`} 
//             target="_blank" 
//             rel="noopener noreferrer"
//             className="flex flex-col items-center justify-center p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
//           >
//             <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mb-2">
//               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
//                 <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
//               </svg>
//             </div>
//             <span className="text-sm text-gray-600">Twitter</span>
//           </a>
          
//           {/* Facebook */}
//           <a 
//             href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} 
//             target="_blank" 
//             rel="noopener noreferrer"
//             className="flex flex-col items-center justify-center p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
//           >
//             <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mb-2">
//               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
//                 <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/>
//               </svg>
//             </div>
//             <span className="text-sm text-gray-600">Facebook</span>
//           </a>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ShareModal;
