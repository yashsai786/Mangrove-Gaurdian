import React from "react";
import { UilExclamationTriangle, UilMultiply } from "@iconscout/react-unicons";

const ToxicityAlert = ({ isOpen, onClose, result }) => {
  if (!isOpen || !result) return null;

  // Extract category names from the toxicity result
  const categories = result.map(item => item.label.toLowerCase());
  
  // Create a user-friendly message based on the categories
  const getMessageFromCategories = (categories) => {
    if (categories.includes('identity_attack')) {
      return "Your comment contains language that may attack someone's identity.";
    }
    if (categories.includes('insult')) {
      return "Your comment contains insulting language.";
    }
    if (categories.includes('obscene')) {
      return "Your comment contains obscene language.";
    }
    if (categories.includes('severe_toxicity') || categories.includes('toxicity')) {
      return "Your comment contains toxic language that may be harmful.";
    }
    if (categories.includes('threat')) {
      return "Your comment contains threatening language.";
    }
    if (categories.includes('sexual_explicit')) {
      return "Your comment contains sexually explicit language.";
    }
    
    return "Your comment contains language that may violate our community guidelines.";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-30 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <UilExclamationTriangle size="24" className="text-red-500 mr-2" />
            <h2 className="text-xl font-bold text-gray-800">Comment Blocked</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <UilMultiply size="20" />
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-700 mb-4">{getMessageFromCategories(categories)}</p>
          <p className="text-gray-600 text-sm">We encourage positive and respectful conversation. Please edit your comment to comply with our community guidelines.</p>
        </div>
        
        <button
          onClick={onClose}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          I Understand
        </button>
      </div>
    </div>
  );
};

export default ToxicityAlert;

// import React from "react";
// import { UilExclamationTriangle, UilMultiply } from "@iconscout/react-unicons";

// const ToxicityAlert = ({ isOpen, onClose, result }) => {
//   if (!isOpen || !result) return null;

//   // Create a user-friendly message based on the categories
//   const getMessageFromCategories = (categories) => {
//     if (categories.includes('identity_attack')) {
//       return "Your comment contains language that may attack someone's identity.";
//     }
//     if (categories.includes('insult')) {
//       return "Your comment contains insulting language.";
//     }
//     if (categories.includes('obscene')) {
//       return "Your comment contains obscene language.";
//     }
//     if (categories.includes('severe_toxicity') || categories.includes('toxicity')) {
//       return "Your comment contains toxic language that may be harmful.";
//     }
//     if (categories.includes('threat')) {
//       return "Your comment contains threatening language.";
//     }
//     if (categories.includes('sexual_explicit')) {
//       return "Your comment contains sexually explicit language.";
//     }
    
//     return "Your comment contains language that may violate our community guidelines.";
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-30 p-4">
//       <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
//         <div className="flex justify-between items-center mb-4">
//           <div className="flex items-center">
//             <UilExclamationTriangle size="24" className="text-red-500 mr-2" />
//             <h2 className="text-xl font-bold text-gray-800">Comment Blocked</h2>
//           </div>
//           <button 
//             onClick={onClose}
//             className="text-gray-500 hover:text-gray-700 transition-colors"
//           >
//             <UilMultiply size="20" />
//           </button>
//         </div>
        
//         <div className="mb-6">
//           <p className="text-gray-700 mb-4">{getMessageFromCategories(result.categories)}</p>
//           <p className="text-gray-600 text-sm">We encourage positive and respectful conversation. Please edit your comment to comply with our community guidelines.</p>
//         </div>
        
//         <button
//           onClick={onClose}
//           className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
//         >
//           I Understand
//         </button>
//       </div>
//     </div>
//   );
// };

// export default ToxicityAlert;
