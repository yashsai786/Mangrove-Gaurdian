import React, { useState, useEffect } from "react";
import * as toxicity from '@tensorflow-models/toxicity';

// Toxicity detection threshold
const TOXICITY_THRESHOLD = 0.4; // Higher = more strict

const ToxicityDetector = ({ onModelLoad, onCheckToxicity }) => {
  const [toxicityModel, setToxicityModel] = useState(null);
  const [isLoadingModel, setIsLoadingModel] = useState(true);
  const [toxicityError, setToxicityError] = useState("");

  useEffect(() => {
    loadToxicityModel();
  }, []);

  const loadToxicityModel = async () => {
    try {
      setIsLoadingModel(true);
      const model = await toxicity.load(TOXICITY_THRESHOLD);
      setToxicityModel(model);
      console.log("Toxicity model loaded successfully");
      
      // Notify parent component that the model is loaded
      if (onModelLoad) {
        onModelLoad(model);
      }
    } catch (error) {
      console.error("Failed to load toxicity model:", error);
      setToxicityError("Failed to load content filter. Some features may be limited.");
    } finally {
      setIsLoadingModel(false);
    }
  };

  const checkNameToxicity = async (name) => {
    if (!name || !toxicityModel) return true;
    
    try {
      const predictions = await toxicityModel.classify([name]);
      
      const isToxic = predictions.some(
        (prediction) =>
          prediction.results[0].match === true &&
          ['toxicity', 'insult', 'threat', 'identity_attack'].includes(prediction.label)
      );
      
      if (isToxic) {
        setToxicityError("The name you entered appears inappropriate. Please choose a different name.");
        
        // Notify parent component of toxicity check result
        if (onCheckToxicity) {
          onCheckToxicity(false, "The name you entered appears inappropriate. Please choose a different name.");
        }
        return false;
      }
      
      setToxicityError("");
      
      // Notify parent component of toxicity check result
      if (onCheckToxicity) {
        onCheckToxicity(true, "");
      }
      return true;
    } catch (error) {
      console.error("Error checking name toxicity:", error);
      // If there's an error checking toxicity, we'll let it pass but log the error
      if (onCheckToxicity) {
        onCheckToxicity(true, "");
      }
      return true;
    }
  };

  return (
    <>
      {/* Display model loading status */}
      {isLoadingModel && (
        <div className="bg-blue-100 text-blue-700 p-2 rounded mb-4 text-center">
          <p>Loading content filter...</p>
        </div>
      )}
      
      {/* Display any toxicity errors */}
      {toxicityError && (
        <div className="text-red-500 text-sm mt-1">{toxicityError}</div>
      )}
    </>
  );
};

export default ToxicityDetector;