import React, { useState, useEffect } from 'react';

const Cc = () => {
  const [activeSlide, setActiveSlide] = useState(0);

  const bannerImages = [
    'https://od.lk/s/MjNfNDk2NTYzMzJf/banner1.jpg',
    'https://od.lk/s/MjNfNDk2NTYzMzZf/banner2.jpg',
    'https://od.lk/s/MjNfNDk2NTYzNDVf/banner3.jpg',
  ];

  // Auto-rotate every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % bannerImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const prevSlide = () => {
    setActiveSlide((prev) => (prev === 0 ? bannerImages.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % bannerImages.length);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Slides */}
      {bannerImages.map((image, index) => (
        <div
          key={index}
          className={`absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-1000 ${
            activeSlide === index ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ backgroundImage: `url(${image})` }}
        />
      ))}

      {/* Controls */}
      <button onClick={prevSlide} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-3xl">
        ❮
      </button>
      <button onClick={nextSlide} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-3xl">
        ❯
      </button>

      {/* Indicators */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {bannerImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveSlide(index)}
            className={`w-3 h-3 rounded-full ${activeSlide === index ? 'bg-white' : 'bg-gray-400'}`}
          />
        ))}
      </div>
    </div>
  );
};

export default Cc;




