import React, { useState, useRef } from 'react';

const ImageMagnifier = ({ src, alt }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  
  const imgRef = useRef(null);
  
  // Magnification factor
  const magnifierSize = 150;
  const zoomLevel = 2.5;
  
  const handleMouseMove = (e) => {
    const { left, top, width, height } = imgRef.current.getBoundingClientRect();
    
    // Calculate cursor position relative to the image
    const x = ((e.pageX - left) / width) * 100;
    const y = ((e.pageY - top) / height) * 100;
    
    // Update position
    setPosition({ x, y });
    
    // Update cursor position for the magnifier
    setCursorPosition({
      x: e.pageX - left - magnifierSize / 2,
      y: e.pageY - top - magnifierSize / 2,
    });
  };
  
  return (
    <div 
      className="relative overflow-hidden h-64"
      onMouseEnter={() => setShowMagnifier(true)}
      onMouseLeave={() => setShowMagnifier(false)}
      onMouseMove={handleMouseMove}
    >
      <img 
        ref={imgRef}
        src={src} 
        alt={alt} 
        className="w-full h-full object-cover"
      />
      
      {showMagnifier && (
        <div
          className="absolute pointer-events-none border-2 border-gray-200 rounded-full shadow-lg overflow-hidden bg-white"
          style={{
            width: `${magnifierSize}px`,
            height: `${magnifierSize}px`,
            top: cursorPosition.y,
            left: cursorPosition.x,
            display: showMagnifier ? 'block' : 'none',
            zIndex: 10,
          }}
        >
          <img
            src={src}
            alt={alt}
            style={{
              width: `${zoomLevel * 100}%`,
              height: `${zoomLevel * 100}%`,
              objectFit: 'cover',
              objectPosition: `${position.x}% ${position.y}%`,
              transform: 'scale(1)',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ImageMagnifier;