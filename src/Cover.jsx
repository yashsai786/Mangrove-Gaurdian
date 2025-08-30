import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Shield } from 'lucide-react';

const Cover = () => {
    const [activeSlide, setActiveSlide] = useState(0);
    const [scrollPosition, setScrollPosition] = useState(0);
    const [windowHeight, setWindowHeight] = useState(0);
    const sectionsRef = useRef([]);
    
    const bannerImages = [
        'https://od.lk/s/MjNfNDk2NTYzMzJf/banner1.jpg',
        'https://od.lk/s/MjNfNDk2NTYzMzZf/banner2.jpg',
        'https://od.lk/s/MjNfNDk2NTYzNDVf/banner3.jpg',
    ];

    // Initialize window height and scroll position
    useEffect(() => {
        setWindowHeight(window.innerHeight);
        
        const handleResize = () => {
            setWindowHeight(window.innerHeight);
        };
        
        const handleScroll = () => {
            setScrollPosition(window.pageYOffset);
        };
        
        // Add event listeners
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleScroll);
        
        // Remove event listeners on cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    // Auto-rotate every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveSlide((prev) => (prev + 1) % bannerImages.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // For navigation
    const navigate = useNavigate();

    // Carousel state and functions
    const [activeMainSlide, setActiveMainSlide] = useState(0);
    const [activeThreatSlide, setActiveThreatSlide] = useState(0);

    // Auto-rotation for main carousel
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveMainSlide((prev) => (prev === 2 ? 0 : prev + 1));
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // Navigation functions
    const prevSlide = () => {
        setActiveSlide((prev) => (prev === 0 ? bannerImages.length - 1 : prev - 1));
    };

    const nextSlide = () => {
        setActiveSlide((prev) => (prev + 1) % bannerImages.length);
    };

    const nextMainSlide = () => {
        setActiveMainSlide((prev) => (prev === 2 ? 0 : prev + 1));
    };

    const prevMainSlide = () => {
        setActiveMainSlide((prev) => (prev === 0 ? 2 : prev - 1));
    };

    const nextThreatSlide = () => {
        setActiveThreatSlide((prev) => (prev === 4 ? 0 : prev + 1));
    };

    const prevThreatSlide = () => {
        setActiveThreatSlide((prev) => (prev === 0 ? 4 : prev - 1));
    };

    // Navigation function for buttons
    const handleRegisterClick = (e) => {
        e.preventDefault();
        navigate('/login');
    };

    const handleViewPostClick = (e) => {
        e.preventDefault();
        navigate('/login');
    };

    // Calculate parallax effect based on element position
    const getParallaxStyle = (sectionIndex, speed = 0.5, offset = 0) => {
        const sectionPosition = sectionIndex * windowHeight;
        const scrollRelativeToSection = scrollPosition - sectionPosition + offset;
        return {
            transform: `translateY(${scrollRelativeToSection * speed}px)`,
            transition: 'transform 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        };
    };

    // Mangrove threat slides content
    const mangroveThreats = [
        {
            id: 1,
            title: "Illegal Cutting & Logging",
            description: "Unauthorized removal of mangrove trees for timber, charcoal production, or land clearing poses the greatest threat to mangrove ecosystems. These activities destroy critical habitat and reduce the natural protection mangroves provide against coastal storms and erosion."
        },
        {
            id: 2,
            title: "Land Reclamation & Development",
            description: "Conversion of mangrove areas for urban development, aquaculture, and industrial projects results in permanent habitat loss. This organized destruction often involves filling wetlands and constructing infrastructure that fundamentally alters coastal ecosystems."
        },
        {
            id: 3,
            title: "Pollution & Waste Dumping",
            description: "Industrial discharge, plastic waste, and chemical runoff severely impact mangrove health. These pollutants affect water quality, soil composition, and the entire food web that depends on healthy mangrove ecosystems for survival."
        },
        {
            id: 4,
            title: "Overfishing & Resource Extraction",
            description: "Unsustainable fishing practices and excessive harvesting of mangrove resources disrupt the delicate balance of these ecosystems. While not directly harming the trees, these activities can destabilize the entire mangrove community structure."
        },
        {
            id: 5,
            title: "Climate Change & Sea Level Rise",
            description: "Rising temperatures, changing precipitation patterns, and sea level rise represent emerging threats to mangrove ecosystems. While natural, these changes happen too rapidly for mangroves to adapt, requiring human intervention and protection efforts."
        }
    ];

    const conservationAreas = [
        {
            title: "Coastal Protection",
            description: "Mangroves serve as natural barriers against tsunamis, storm surges, and coastal erosion. A healthy mangrove forest can reduce wave energy by up to 70%, protecting millions of people living in coastal areas from natural disasters."
        },
        {
            title: "Biodiversity Hotspots",
            description: "Mangrove ecosystems support incredible biodiversity, providing nursery grounds for fish, nesting sites for birds, and habitat for endangered species. They are among the most productive ecosystems on Earth, supporting complex food webs."
        },
        {
            title: "Carbon Storage",
            description: "Mangroves are exceptional carbon sinks, storing up to 10 times more carbon per hectare than terrestrial forests. They play a crucial role in climate regulation by sequestering atmospheric carbon dioxide in their biomass and sediments."
        }
    ];

    // Calculate if an element is in viewport
    const isInViewport = (element) => {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return (
            rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.bottom >= 0
        );
    };

    return (
        <div className="font-sans perspective-1000">
            {/* Hero Section with Parallax Effect */}
            <div className="relative w-full h-screen overflow-hidden">
                {/* Advanced Parallax Background */}
                <div 
                    className="absolute inset-0 w-full h-full bg-black z-10"
                    style={{ opacity: Math.min(scrollPosition / windowHeight * 0.7, 0.7) }}
                ></div>
                
                {bannerImages.map((image, index) => (
                    <div
                        key={index}
                        className={`absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-1000 ${
                            activeSlide === index ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{ 
                            backgroundImage: `url(${image})`,
                            transform: `scale(${1 + scrollPosition * 0.001}) translateY(${scrollPosition * 0.4}px)`,
                            transformOrigin: 'center',
                        }}
                    />
                ))}

                {/* Floating Elements */}
                <div 
                    className="absolute top-1/3 left-1/4 w-32 h-32 rounded-full bg-green-800 opacity-10"
                    style={{ transform: `translate3d(${scrollPosition * -0.2}px, ${scrollPosition * 0.1}px, 0px)` }}
                ></div>
                <div 
                    className="absolute bottom-1/4 right-1/3 w-48 h-48 rounded-full bg-green-800 opacity-10"
                    style={{ transform: `translate3d(${scrollPosition * 0.3}px, ${scrollPosition * -0.15}px, 0px)` }}
                ></div>

                {/* Content with Counter Parallax */}
                <div 
                    className="absolute inset-0 flex items-center justify-center z-20"
                    style={{ transform: `translateY(${scrollPosition * -0.3}px)` }}
                >
                    <div className="text-center">
                        <div 
                            className="w-16 h-16 mx-auto mb-6 bg-white p-2 rounded-full"
                            style={{ transform: `translateY(${scrollPosition * -0.1}px) scale(${1 - scrollPosition * 0.0005})` }}
                        >
                            <Shield className="w-full h-full text-green-800" />
                        </div>
                        <h1 
                            className="text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-8 transition-all duration-500"
                            style={{ 
                                fontFamily: "'Crimson Text', serif",
                                transform: `translateY(${scrollPosition * -0.2}px) scale(${1 - scrollPosition * 0.0005})`,
                                opacity: 1 - scrollPosition * 0.002,
                                textShadow: `0 ${4 + scrollPosition * 0.01}px ${8 + scrollPosition * 0.03}px rgba(0,0,0,0.6)`
                            }}
                        >
                            Mangrove <span className="block">Guardian</span>
                        </h1>
                        <p 
                            className="text-xl text-white mb-8 max-w-2xl mx-auto"
                            style={{ 
                                transform: `translateY(${scrollPosition * -0.15}px)`,
                                opacity: 1 - scrollPosition * 0.002,
                            }}
                        >
                            Protecting Coastal Ecosystems Through Community Monitoring
                        </p>
                        <button 
                            onClick={handleRegisterClick}
                            className="inline-block px-8 py-3 bg-green-800 hover:bg-green-900 text-white font-semibold rounded-md transition duration-300"
                            style={{ 
                                transform: `translateY(${scrollPosition * -0.1}px)`,
                                opacity: 1 - scrollPosition * 0.002,
                            }}
                        >
                            Join as Guardian
                        </button>
                    </div>
                </div>
                
                {/* ScrollDown Indicator */}
                <div 
                    className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-white flex flex-col items-center"
                    style={{ 
                        opacity: 1 - scrollPosition * 0.005,
                        transform: `translate(-50%, ${scrollPosition * 0.5}px)`
                    }}
                >
                    <span className="text-sm mb-2">Scroll Down</span>
                    <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
                        <div 
                            className="w-1 h-3 bg-white rounded-full animate-bounce mt-2"
                            style={{ animationDelay: '0.5s' }}
                        ></div>
                    </div>
                </div>
            </div>
            
            {/* Conservation Areas Section with Parallax */}
            <section 
                ref={el => sectionsRef.current[0] = el}
                className="py-16 bg-white relative overflow-hidden"
            >
                {/* Parallax Background Elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div 
                        className="absolute -top-20 -right-20 w-64 h-64 bg-green-800 opacity-5 rounded-full"
                        style={{ transform: `translate3d(${scrollPosition * 0.05}px, ${scrollPosition * -0.08}px, 0)` }}
                    ></div>
                    <div 
                        className="absolute -bottom-32 -left-32 w-96 h-96 bg-green-800 opacity-5 rounded-full"
                        style={{ transform: `translate3d(${scrollPosition * -0.05}px, ${scrollPosition * 0.08}px, 0)` }}
                    ></div>
                    <div 
                        className="absolute top-1/2 left-1/4 w-48 h-48 bg-green-800 opacity-5 rounded-full"
                        style={{ transform: `translate3d(${scrollPosition * 0.1}px, ${scrollPosition * -0.05}px, 0)` }}
                    ></div>
                </div>
                
                <div className="container mx-auto px-4 relative z-10">
                    <div className="text-center mb-12">
                        <div 
                            className="w-24 h-1 bg-green-800 mx-auto mb-6 transform"
                            style={{ 
                                transformOrigin: 'center',
                                transform: `scaleX(${Math.min(1, (scrollPosition - windowHeight * 0.3) / 100)})`,
                                opacity: Math.min(1, (scrollPosition - windowHeight * 0.3) / 200)
                            }}
                        ></div>
                        <h2 
                            className="text-4xl font-bold text-gray-800 transform"
                            style={{ 
                                transform: `translateY(${Math.max(0, 50 - (scrollPosition - windowHeight * 0.5) * 0.2)}px)`,
                                opacity: Math.min(1, (scrollPosition - windowHeight * 0.3) / 200)
                            }}
                        >
                            IMPORTANCE OF MANGROVES
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {conservationAreas.map((area, index) => {
                            const delay = index * 100;
                            const startFade = windowHeight * 0.5 + delay;
                            const opacity = Math.min(1, Math.max(0, (scrollPosition - startFade) / 200));
                            const translateY = Math.max(0, 100 - (scrollPosition - startFade) * 0.3);
                            
                            return (
                                <div 
                                    key={index} 
                                    className="bg-green-50 p-8 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl border-t-4 border-green-800"
                                    style={{ 
                                        transform: `perspective(1000px) translateY(${translateY}px) rotateX(${Math.max(0, 10 - (scrollPosition - startFade) * 0.02)}deg)`,
                                        opacity: opacity,
                                        transition: 'transform 0.3s ease-out, opacity 0.5s ease-out',
                                    }}
                                >
                                    <h3 className="text-xl font-semibold text-green-800 mb-4 uppercase">{area.title}</h3>
                                    <p className="text-gray-700 text-justify">{area.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>
           
            {/* Slider for Mangrove Threats with Advanced Parallax */}
            <section 
                ref={el => sectionsRef.current[1] = el}
                className="py-16 bg-green-50 relative overflow-hidden"
            >
                {/* Simplified background */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white to-transparent"></div>
                    <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white to-transparent"></div>
                </div>
                        
                <div className="container mx-auto px-4 relative z-10">
                    <div className="text-center mb-12">
                        <div className="w-24 h-1 bg-green-800 mx-auto mb-6"></div>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
                            Threats to Mangroves
                        </h2>
                    </div>

                    <div className="relative">
                        <div className="max-w-4xl mx-auto overflow-hidden relative" style={{ minHeight: "230px" }}>
                            {mangroveThreats.map((slide, index) => (
                                <div 
                                    key={index}
                                    className={`absolute inset-0 w-full transition-opacity duration-300 ${
                                        activeThreatSlide === index ? 'opacity-100' : 'opacity-0'
                                    }`}
                                >
                                    <div className="bg-white p-8 rounded-lg shadow-lg relative">
                                        <h3 className="text-xl font-bold text-green-800 mb-4">{slide.title}</h3>
                                        <p className="text-gray-800 text-justify font-medium">{slide.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Slider Controls */}
                        <div className="flex justify-center mt-8 space-x-2">
                            {mangroveThreats.map((_, index) => (
                                <button 
                                    key={index}
                                    onClick={() => setActiveThreatSlide(index)} 
                                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                        activeThreatSlide === index 
                                            ? 'bg-green-800 w-6' 
                                            : 'bg-gray-300'
                                    }`}
                                ></button>
                            ))}
                        </div>

                        {/* Arrow Controls */}
                        <div className="absolute inset-0 flex items-center justify-between">
                            <button 
                                onClick={prevThreatSlide} 
                                className="bg-transparent hover:bg-green-800 text-gray-800 hover:text-white p-2 rounded-full border border-gray-300 hover:border-green-800 transition duration-300"
                            >
                                <ChevronLeft size="30" className="mr-1"/>
                            </button>
                            <button 
                                onClick={nextThreatSlide} 
                                className="bg-transparent hover:bg-green-800 text-gray-800 hover:text-white p-2 rounded-full border border-gray-300 hover:border-green-800 transition duration-300"
                            >
                                <ChevronRight size="30" className="mr-1"/>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section with Parallax */}
            <section 
                ref={el => sectionsRef.current[2] = el}
                className="py-16 bg-green-800 relative overflow-hidden"
            >
                {/* Animated Background */}
                <div 
                    className="absolute top-0 left-0 w-full h-full bg-cover bg-center"
                    style={{ 
                        backgroundImage: `url(${bannerImages[0]})`,
                        opacity: 0.1,
                    }}
                ></div>
                
                {/* Animated Path */}
                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10">
                    <path 
                        d="M0,50 Q300,100 600,50 T1200,60" 
                        fill="none" 
                        stroke="white" 
                        strokeWidth="2"
                    />
                    <path 
                        d="M0,100 Q300,150 600,100 T1200,110" 
                        fill="none" 
                        stroke="white" 
                        strokeWidth="2"
                    />
                </svg>
                
                <div className="container mx-auto px-4 relative z-10">
                    <div 
                        className="flex flex-col md:flex-row items-center justify-between"
                        style={{ transform: `translateY(${(scrollPosition - 1500) * -0.05}px)` }}
                    >
                        <h3 className="text-2xl font-semibold text-white mb-4 md:mb-0">Help us protect mangrove ecosystems in real-time!</h3>
                        <button 
                            onClick={handleViewPostClick}
                            className="inline-block px-8 py-3 bg-white hover:bg-gray-100 text-green-800 font-semibold rounded-md transition duration-300"
                        >
                            Start Monitoring
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Cover;

// import React, { useState, useEffect, useRef } from 'react';
// import { ChevronLeft, ChevronRight, Shield } from 'lucide-react';

// const Cover = () => {
//     const [activeSlide, setActiveSlide] = useState(0);
//     const [scrollPosition, setScrollPosition] = useState(0);
//     const [windowHeight, setWindowHeight] = useState(0);
//     const sectionsRef = useRef([]);
    
//     const bannerImages = [
//         'https://od.lk/s/MjNfNDk2NTYzMzJf/banner1.jpg',
//         'https://od.lk/s/MjNfNDk2NTYzMzZf/banner2.jpg',
//         'https://od.lk/s/MjNfNDk2NTYzNDVf/banner3.jpg',
//     ];

//     // Initialize window height and scroll position
//     useEffect(() => {
//         setWindowHeight(window.innerHeight);
        
//         const handleResize = () => {
//             setWindowHeight(window.innerHeight);
//         };
        
//         const handleScroll = () => {
//             setScrollPosition(window.pageYOffset);
//         };
        
//         // Add event listeners
//         window.addEventListener('resize', handleResize);
//         window.addEventListener('scroll', handleScroll);
        
//         // Remove event listeners on cleanup
//         return () => {
//             window.removeEventListener('resize', handleResize);
//             window.removeEventListener('scroll', handleScroll);
//         };
//     }, []);

//     // Auto-rotate every 5 seconds
//     useEffect(() => {
//         const interval = setInterval(() => {
//             setActiveSlide((prev) => (prev + 1) % bannerImages.length);
//         }, 5000);
//         return () => clearInterval(interval);
//     }, []);

//     // For navigation
//     const handleNavigation = (path) => {
//         console.log(`Navigating to: ${path}`);
//         // In a real app, this would use router navigation
//     };

//     // Carousel state and functions
//     const [activeMainSlide, setActiveMainSlide] = useState(0);
//     const [activeThreatSlide, setActiveThreatSlide] = useState(0);

//     // Auto-rotation for main carousel
//     useEffect(() => {
//         const interval = setInterval(() => {
//             setActiveMainSlide((prev) => (prev === 2 ? 0 : prev + 1));
//         }, 5000);

//         return () => clearInterval(interval);
//     }, []);

//     // Navigation functions
//     const prevSlide = () => {
//         setActiveSlide((prev) => (prev === 0 ? bannerImages.length - 1 : prev - 1));
//     };

//     const nextSlide = () => {
//         setActiveSlide((prev) => (prev + 1) % bannerImages.length);
//     };

//     const nextMainSlide = () => {
//         setActiveMainSlide((prev) => (prev === 2 ? 0 : prev + 1));
//     };

//     const prevMainSlide = () => {
//         setActiveMainSlide((prev) => (prev === 0 ? 2 : prev - 1));
//     };

//     const nextThreatSlide = () => {
//         setActiveThreatSlide((prev) => (prev === 4 ? 0 : prev + 1));
//     };

//     const prevThreatSlide = () => {
//         setActiveThreatSlide((prev) => (prev === 0 ? 4 : prev - 1));
//     };

//     // Navigation function for buttons
//     const handleRegisterClick = (e) => {
//         e.preventDefault();
//         handleNavigation('/login');
//     };

//     const handleViewPostClick = (e) => {
//         e.preventDefault();
//         handleNavigation('/monitoring-dashboard');
//     };

//     // Calculate parallax effect based on element position
//     const getParallaxStyle = (sectionIndex, speed = 0.5, offset = 0) => {
//         const sectionPosition = sectionIndex * windowHeight;
//         const scrollRelativeToSection = scrollPosition - sectionPosition + offset;
//         return {
//             transform: `translateY(${scrollRelativeToSection * speed}px)`,
//             transition: 'transform 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
//         };
//     };

//     // Mangrove threat slides content
//     const mangroveThreats = [
//         {
//             id: 1,
//             title: "Illegal Cutting & Logging",
//             description: "Unauthorized removal of mangrove trees for timber, charcoal production, or land clearing poses the greatest threat to mangrove ecosystems. These activities destroy critical habitat and reduce the natural protection mangroves provide against coastal storms and erosion."
//         },
//         {
//             id: 2,
//             title: "Land Reclamation & Development",
//             description: "Conversion of mangrove areas for urban development, aquaculture, and industrial projects results in permanent habitat loss. This organized destruction often involves filling wetlands and constructing infrastructure that fundamentally alters coastal ecosystems."
//         },
//         {
//             id: 3,
//             title: "Pollution & Waste Dumping",
//             description: "Industrial discharge, plastic waste, and chemical runoff severely impact mangrove health. These pollutants affect water quality, soil composition, and the entire food web that depends on healthy mangrove ecosystems for survival."
//         },
//         {
//             id: 4,
//             title: "Overfishing & Resource Extraction",
//             description: "Unsustainable fishing practices and excessive harvesting of mangrove resources disrupt the delicate balance of these ecosystems. While not directly harming the trees, these activities can destabilize the entire mangrove community structure."
//         },
//         {
//             id: 5,
//             title: "Climate Change & Sea Level Rise",
//             description: "Rising temperatures, changing precipitation patterns, and sea level rise represent emerging threats to mangrove ecosystems. While natural, these changes happen too rapidly for mangroves to adapt, requiring human intervention and protection efforts."
//         }
//     ];

//     const conservationAreas = [
//         {
//             title: "Coastal Protection",
//             description: "Mangroves serve as natural barriers against tsunamis, storm surges, and coastal erosion. A healthy mangrove forest can reduce wave energy by up to 70%, protecting millions of people living in coastal areas from natural disasters."
//         },
//         {
//             title: "Biodiversity Hotspots",
//             description: "Mangrove ecosystems support incredible biodiversity, providing nursery grounds for fish, nesting sites for birds, and habitat for endangered species. They are among the most productive ecosystems on Earth, supporting complex food webs."
//         },
//         {
//             title: "Carbon Storage",
//             description: "Mangroves are exceptional carbon sinks, storing up to 10 times more carbon per hectare than terrestrial forests. They play a crucial role in climate regulation by sequestering atmospheric carbon dioxide in their biomass and sediments."
//         }
//     ];

//     // Calculate if an element is in viewport
//     const isInViewport = (element) => {
//         if (!element) return false;
//         const rect = element.getBoundingClientRect();
//         return (
//             rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
//             rect.bottom >= 0
//         );
//     };

//     return (
//         <div className="font-sans perspective-1000">
//             {/* Hero Section with Parallax Effect */}
//             <div className="relative w-full h-screen overflow-hidden">
//                 {/* Advanced Parallax Background */}
//                 <div 
//                     className="absolute inset-0 w-full h-full bg-black z-10"
//                     style={{ opacity: Math.min(scrollPosition / windowHeight * 0.7, 0.7) }}
//                 ></div>
                
//                 {bannerImages.map((image, index) => (
//                     <div
//                         key={index}
//                         className={`absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-1000 ${
//                             activeSlide === index ? 'opacity-100' : 'opacity-0'
//                         }`}
//                         style={{ 
//                             backgroundImage: `url(${image})`,
//                             transform: `scale(${1 + scrollPosition * 0.001}) translateY(${scrollPosition * 0.4}px)`,
//                             transformOrigin: 'center',
//                         }}
//                     />
//                 ))}

//                 {/* Floating Elements */}
//                 <div 
//                     className="absolute top-1/3 left-1/4 w-32 h-32 rounded-full bg-green-800 opacity-10"
//                     style={{ transform: `translate3d(${scrollPosition * -0.2}px, ${scrollPosition * 0.1}px, 0px)` }}
//                 ></div>
//                 <div 
//                     className="absolute bottom-1/4 right-1/3 w-48 h-48 rounded-full bg-green-800 opacity-10"
//                     style={{ transform: `translate3d(${scrollPosition * 0.3}px, ${scrollPosition * -0.15}px, 0px)` }}
//                 ></div>

//                 {/* Content with Counter Parallax */}
//                 <div 
//                     className="absolute inset-0 flex items-center justify-center z-20"
//                     style={{ transform: `translateY(${scrollPosition * -0.3}px)` }}
//                 >
//                     <div className="text-center">
//                         <div 
//                             className="w-16 h-16 mx-auto mb-6 bg-white p-2 rounded-full"
//                             style={{ transform: `translateY(${scrollPosition * -0.1}px) scale(${1 - scrollPosition * 0.0005})` }}
//                         >
//                             <Shield className="w-full h-full text-green-800" />
//                         </div>
//                         <h1 
//                             className="text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-8 transition-all duration-500"
//                             style={{ 
//                                 fontFamily: "'Crimson Text', serif",
//                                 transform: `translateY(${scrollPosition * -0.2}px) scale(${1 - scrollPosition * 0.0005})`,
//                                 opacity: 1 - scrollPosition * 0.002,
//                                 textShadow: `0 ${4 + scrollPosition * 0.01}px ${8 + scrollPosition * 0.03}px rgba(0,0,0,0.6)`
//                             }}
//                         >
//                             Mangrove <span className="block">Guardian</span>
//                         </h1>
//                         <p 
//                             className="text-xl text-white mb-8 max-w-2xl mx-auto"
//                             style={{ 
//                                 transform: `translateY(${scrollPosition * -0.15}px)`,
//                                 opacity: 1 - scrollPosition * 0.002,
//                             }}
//                         >
//                             Protecting Coastal Ecosystems Through Community Monitoring
//                         </p>
//                         <button 
//                             onClick={handleRegisterClick}
//                             className="inline-block px-8 py-3 bg-green-800 hover:bg-green-900 text-white font-semibold rounded-md transition duration-300"
//                             style={{ 
//                                 transform: `translateY(${scrollPosition * -0.1}px)`,
//                                 opacity: 1 - scrollPosition * 0.002,
//                             }}
//                         >
//                             Join as Guardian
//                         </button>
//                     </div>
//                 </div>
                
//                 {/* ScrollDown Indicator */}
//                 <div 
//                     className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-white flex flex-col items-center"
//                     style={{ 
//                         opacity: 1 - scrollPosition * 0.005,
//                         transform: `translate(-50%, ${scrollPosition * 0.5}px)`
//                     }}
//                 >
//                     <span className="text-sm mb-2">Scroll Down</span>
//                     <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
//                         <div 
//                             className="w-1 h-3 bg-white rounded-full animate-bounce mt-2"
//                             style={{ animationDelay: '0.5s' }}
//                         ></div>
//                     </div>
//                 </div>
//             </div>
            
//             {/* Conservation Areas Section with Parallax */}
//             <section 
//                 ref={el => sectionsRef.current[0] = el}
//                 className="py-16 bg-white relative overflow-hidden"
//             >
//                 {/* Parallax Background Elements */}
//                 <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
//                     <div 
//                         className="absolute -top-20 -right-20 w-64 h-64 bg-green-800 opacity-5 rounded-full"
//                         style={{ transform: `translate3d(${scrollPosition * 0.05}px, ${scrollPosition * -0.08}px, 0)` }}
//                     ></div>
//                     <div 
//                         className="absolute -bottom-32 -left-32 w-96 h-96 bg-green-800 opacity-5 rounded-full"
//                         style={{ transform: `translate3d(${scrollPosition * -0.05}px, ${scrollPosition * 0.08}px, 0)` }}
//                     ></div>
//                     <div 
//                         className="absolute top-1/2 left-1/4 w-48 h-48 bg-green-800 opacity-5 rounded-full"
//                         style={{ transform: `translate3d(${scrollPosition * 0.1}px, ${scrollPosition * -0.05}px, 0)` }}
//                     ></div>
//                 </div>
                
//                 <div className="container mx-auto px-4 relative z-10">
//                     <div className="text-center mb-12">
//                         <div 
//                             className="w-24 h-1 bg-green-800 mx-auto mb-6 transform"
//                             style={{ 
//                                 transformOrigin: 'center',
//                                 transform: `scaleX(${Math.min(1, (scrollPosition - windowHeight * 0.3) / 100)})`,
//                                 opacity: Math.min(1, (scrollPosition - windowHeight * 0.3) / 200)
//                             }}
//                         ></div>
//                         <h2 
//                             className="text-4xl font-bold text-gray-800 transform"
//                             style={{ 
//                                 transform: `translateY(${Math.max(0, 50 - (scrollPosition - windowHeight * 0.5) * 0.2)}px)`,
//                                 opacity: Math.min(1, (scrollPosition - windowHeight * 0.3) / 200)
//                             }}
//                         >
//                             IMPORTANCE OF MANGROVES
//                         </h2>
//                     </div>

//                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
//                         {conservationAreas.map((area, index) => {
//                             const delay = index * 100;
//                             const startFade = windowHeight * 0.5 + delay;
//                             const opacity = Math.min(1, Math.max(0, (scrollPosition - startFade) / 200));
//                             const translateY = Math.max(0, 100 - (scrollPosition - startFade) * 0.3);
                            
//                             return (
//                                 <div 
//                                     key={index} 
//                                     className="bg-green-50 p-8 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl border-t-4 border-green-800"
//                                     style={{ 
//                                         transform: `perspective(1000px) translateY(${translateY}px) rotateX(${Math.max(0, 10 - (scrollPosition - startFade) * 0.02)}deg)`,
//                                         opacity: opacity,
//                                         transition: 'transform 0.3s ease-out, opacity 0.5s ease-out',
//                                     }}
//                                 >
//                                     <h3 className="text-xl font-semibold text-green-800 mb-4 uppercase">{area.title}</h3>
//                                     <p className="text-gray-700 text-justify">{area.description}</p>
//                                 </div>
//                             );
//                         })}
//                     </div>
//                 </div>
//             </section>
           
//             {/* Slider for Mangrove Threats with Advanced Parallax */}
//             <section 
//                 ref={el => sectionsRef.current[1] = el}
//                 className="py-16 bg-green-50 relative overflow-hidden"
//             >
//                 {/* Simplified background */}
//                 <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
//                     <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white to-transparent"></div>
//                     <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white to-transparent"></div>
//                 </div>
                        
//                 <div className="container mx-auto px-4 relative z-10">
//                     <div className="text-center mb-12">
//                         <div className="w-24 h-1 bg-green-800 mx-auto mb-6"></div>
//                         <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
//                             Threats to Mangroves
//                         </h2>
//                     </div>

//                     <div className="relative">
//                         <div className="max-w-4xl mx-auto overflow-hidden relative" style={{ minHeight: "230px" }}>
//                             {mangroveThreats.map((slide, index) => (
//                                 <div 
//                                     key={index}
//                                     className={`absolute inset-0 w-full transition-opacity duration-300 ${
//                                         activeThreatSlide === index ? 'opacity-100' : 'opacity-0'
//                                     }`}
//                                 >
//                                     <div className="bg-white p-8 rounded-lg shadow-lg relative">
//                                         <h3 className="text-xl font-bold text-green-800 mb-4">{slide.title}</h3>
//                                         <p className="text-gray-800 text-justify font-medium">{slide.description}</p>
//                                     </div>
//                                 </div>
//                             ))}
//                         </div>

//                         {/* Slider Controls */}
//                         <div className="flex justify-center mt-8 space-x-2">
//                             {mangroveThreats.map((_, index) => (
//                                 <button 
//                                     key={index}
//                                     onClick={() => setActiveThreatSlide(index)} 
//                                     className={`w-3 h-3 rounded-full transition-all duration-300 ${
//                                         activeThreatSlide === index 
//                                             ? 'bg-green-800 w-6' 
//                                             : 'bg-gray-300'
//                                     }`}
//                                 ></button>
//                             ))}
//                         </div>

//                         {/* Arrow Controls */}
//                         <div className="absolute inset-0 flex items-center justify-between">
//                             <button 
//                                 onClick={prevThreatSlide} 
//                                 className="bg-transparent hover:bg-green-800 text-gray-800 hover:text-white p-2 rounded-full border border-gray-300 hover:border-green-800 transition duration-300"
//                             >
//                                 <ChevronLeft size="30" className="mr-1"/>
//                             </button>
//                             <button 
//                                 onClick={nextThreatSlide} 
//                                 className="bg-transparent hover:bg-green-800 text-gray-800 hover:text-white p-2 rounded-full border border-gray-300 hover:border-green-800 transition duration-300"
//                             >
//                                 <ChevronRight size="30" className="mr-1"/>
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             </section>

//             {/* CTA Section with Parallax */}
//             <section 
//                 ref={el => sectionsRef.current[2] = el}
//                 className="py-16 bg-green-800 relative overflow-hidden"
//             >
//                 {/* Animated Background */}
//                 <div 
//                     className="absolute top-0 left-0 w-full h-full bg-cover bg-center"
//                     style={{ 
//                         backgroundImage: `url(${bannerImages[0]})`,
//                         opacity: 0.1,
//                     }}
//                 ></div>
                
//                 {/* Animated Path */}
//                 <svg className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10">
//                     <path 
//                         d="M0,50 Q300,100 600,50 T1200,60" 
//                         fill="none" 
//                         stroke="white" 
//                         strokeWidth="2"
//                     />
//                     <path 
//                         d="M0,100 Q300,150 600,100 T1200,110" 
//                         fill="none" 
//                         stroke="white" 
//                         strokeWidth="2"
//                     />
//                 </svg>
                
//                 <div className="container mx-auto px-4 relative z-10">
//                     <div 
//                         className="flex flex-col md:flex-row items-center justify-between"
//                         style={{ transform: `translateY(${(scrollPosition - 1500) * -0.05}px)` }}
//                     >
//                         <h3 className="text-2xl font-semibold text-white mb-4 md:mb-0">Help us protect mangrove ecosystems in real-time!</h3>
//                         <button 
//                             onClick={handleViewPostClick}
//                             className="inline-block px-8 py-3 bg-white hover:bg-gray-100 text-green-800 font-semibold rounded-md transition duration-300"
//                         >
//                             Start Monitoring
//                         </button>
//                     </div>
//                 </div>
//             </section>
//         </div>
//     );
// };

// export default Cover;

// // import React, { useState, useEffect, useRef } from 'react';
// // import { useNavigate } from 'react-router-dom';
// // import { UilAngleLeft, UilAngleRight } from '@iconscout/react-unicons';

// // const Cover = () => {
// //     const [activeSlide, setActiveSlide] = useState(0);
// //     const [scrollPosition, setScrollPosition] = useState(0);
// //     const [windowHeight, setWindowHeight] = useState(0);
// //     const sectionsRef = useRef([]);
    
// //     const bannerImages = [
// //         'https://od.lk/s/MjNfNDk2NTYzMzJf/banner1.jpg',
// //         'https://od.lk/s/MjNfNDk2NTYzMzZf/banner2.jpg',
// //         'https://od.lk/s/MjNfNDk2NTYzNDVf/banner3.jpg',
// //     ];

// //     // Initialize window height and scroll position
// //     useEffect(() => {
// //         setWindowHeight(window.innerHeight);
        
// //         const handleResize = () => {
// //             setWindowHeight(window.innerHeight);
// //         };
        
// //         const handleScroll = () => {
// //             setScrollPosition(window.pageYOffset);
// //         };
        
// //         // Add event listeners
// //         window.addEventListener('resize', handleResize);
// //         window.addEventListener('scroll', handleScroll);
        
// //         // Remove event listeners on cleanup
// //         return () => {
// //             window.removeEventListener('resize', handleResize);
// //             window.removeEventListener('scroll', handleScroll);
// //         };
// //     }, []);

// //     // Auto-rotate every 5 seconds
// //     useEffect(() => {
// //         const interval = setInterval(() => {
// //             setActiveSlide((prev) => (prev + 1) % bannerImages.length);
// //         }, 5000);
// //         return () => clearInterval(interval);
// //     }, []);

// //     // For navigation
// //     const navigate = useNavigate();

// //     // Carousel state and functions
// //     const [activeMainSlide, setActiveMainSlide] = useState(0);
// //     const [activeCrimeSlide, setActiveCrimeSlide] = useState(0);

// //     // Auto-rotation for main carousel
// //     useEffect(() => {
// //         const interval = setInterval(() => {
// //             setActiveMainSlide((prev) => (prev === 2 ? 0 : prev + 1));
// //         }, 5000);

// //         return () => clearInterval(interval);
// //     }, []);

// //     // Navigation functions
// //     const prevSlide = () => {
// //         setActiveSlide((prev) => (prev === 0 ? bannerImages.length - 1 : prev - 1));
// //     };

// //     const nextSlide = () => {
// //         setActiveSlide((prev) => (prev + 1) % bannerImages.length);
// //     };

// //     const nextMainSlide = () => {
// //         setActiveMainSlide((prev) => (prev === 2 ? 0 : prev + 1));
// //     };

// //     const prevMainSlide = () => {
// //         setActiveMainSlide((prev) => (prev === 0 ? 2 : prev - 1));
// //     };

// //     const nextCrimeSlide = () => {
// //         setActiveCrimeSlide((prev) => (prev === 4 ? 0 : prev + 1));
// //     };

// //     const prevCrimeSlide = () => {
// //         setActiveCrimeSlide((prev) => (prev === 0 ? 4 : prev - 1));
// //     };

// //     // Navigation function for buttons
// //     const handleRegisterClick = (e) => {
// //         e.preventDefault();
// //         navigate('/login');
// //     };

// //     const handleViewPostClick = (e) => {
// //         e.preventDefault();
// //         navigate('/login');
// //     };

// //     // Calculate parallax effect based on element position
// //     const getParallaxStyle = (sectionIndex, speed = 0.5, offset = 0) => {
// //         const sectionPosition = sectionIndex * windowHeight;
// //         const scrollRelativeToSection = scrollPosition - sectionPosition + offset;
// //         return {
// //             transform: `translateY(${scrollRelativeToSection * speed}px)`,
// //             transition: 'transform 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
// //         };
// //     };

// //     // Crime type slides content
// //     const crimeTypeSlides = [
// //         {
// //             id: 1,
// //             title: "Crimes against an individual",
// //             description: "The most severe crime a person can commit is to hurt a fellow human being. If you try to rob someone of any of his basic rights, you are liable to severe punishment. When it comes to personal crimes, the situation in America is very unevenly distributed."
// //         },
// //         {
// //             id: 2,
// //             title: "Organized Crime",
// //             description: "This crime is committed by a group of people who exploit illegal sales and services of goods. Where once this was limited to Mafia and gangsters, it has reformed into something very structured. Most of these criminals involve business tycoons who use their wealth and power to lobby different people."
// //         },
// //         {
// //             id: 3,
// //             title: "White-Collar Crime",
// //             description: "One of the biggest woes of Charges ranging from embezzling, insider trading, tax evasion, and violation income tax law, these upper management white-collar people of higher status make a huge part of criminals. As these criminals do not affect the general public, these crimes are not investigated to a greater extent."
// //         },
// //         {
// //             id: 4,
// //             title: "Crimes against Morality",
// //             description: "These crimes are also known as a victimless crime as they do not cause harm to the other person, but they are seen as morally bad. However they are still prosecuted under the law as crimes and there can be severe punishments. They include prostitution, gambling."
// //         },
// //         {
// //             id: 5,
// //             title: "Inchoate Crimes",
// //             description: "These crimes are regarded as incomplete crimes. They are acts which were begun with the intent of causing another person some sort of harm but were left hanging in the middle. This includes when a person has taken substantial steps to formulate, begin, and perform a crime, but he lacked resource or help to complete it."
// //         }
// //     ];

// //     const basicCrimeTypes = [
// //         {
// //             title: "Child Labouring",
// //             description: "According to the ILO, there are around 12.9 million Indian children engaged in work between the ages of 7 to 17 years old. When children are employed or doing unpaid work, they are less likely to attend school or attend only intermittently."
// //         },
// //         {
// //             title: "Fraud",
// //             description: "Fraud (or defrauding or scamming) is a crime in which someone tricks somebody else to get unfair or unlawful gain. Frauds are almost always about money, either directly or indirectly. A fraudster or a fraud is the person who commits the fraud."
// //         },
// //         {
// //             title: "Cyber Crime",
// //             description: "Cybercrime is a crime that involves a computer and a network. The computer may have been used in the commission of a crime, or it may be the target. Cybercrime may harm someone's security and financial health."
// //         }
// //     ];

// //     // Calculate if an element is in viewport
// //     const isInViewport = (element) => {
// //         if (!element) return false;
// //         const rect = element.getBoundingClientRect();
// //         return (
// //             rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
// //             rect.bottom >= 0
// //         );
// //     };

// //     return (
// //         <div className="font-sans perspective-1000">
// //             {/* Hero Section with Parallax Effect */}
// //             <div className="relative w-full h-screen overflow-hidden">
// //                 {/* Advanced Parallax Background */}
// //                 <div 
// //                     className="absolute inset-0 w-full h-full bg-black z-10"
// //                     style={{ opacity: Math.min(scrollPosition / windowHeight * 0.7, 0.7) }}
// //                 ></div>
                
// //                 {bannerImages.map((image, index) => (
// //                     <div
// //                         key={index}
// //                         className={`absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-1000 ${
// //                             activeSlide === index ? 'opacity-100' : 'opacity-0'
// //                         }`}
// //                         style={{ 
// //                             backgroundImage: `url(${image})`,
// //                             transform: `scale(${1 + scrollPosition * 0.001}) translateY(${scrollPosition * 0.4}px)`,
// //                             transformOrigin: 'center',
// //                         }}
// //                     />
// //                 ))}

// //                 {/* Floating Elements */}
// //                 <div 
// //                     className="absolute top-1/3 left-1/4 w-32 h-32 rounded-full bg-red-800 opacity-10"
// //                     style={{ transform: `translate3d(${scrollPosition * -0.2}px, ${scrollPosition * 0.1}px, 0px)` }}
// //                 ></div>
// //                 <div 
// //                     className="absolute bottom-1/4 right-1/3 w-48 h-48 rounded-full bg-red-800 opacity-10"
// //                     style={{ transform: `translate3d(${scrollPosition * 0.3}px, ${scrollPosition * -0.15}px, 0px)` }}
// //                 ></div>

// //                 {/* Content with Counter Parallax */}
// //                 <div 
// //                     className="absolute inset-0 flex items-center justify-center z-20"
// //                     style={{ transform: `translateY(${scrollPosition * -0.3}px)` }}
// //                 >
// //                     <div className="text-center">
// //                         <div 
// //                             className="w-16 h-16 mx-auto mb-6 bg-white p-2 rounded-full"
// //                             style={{ transform: `translateY(${scrollPosition * -0.1}px) scale(${1 - scrollPosition * 0.0005})` }}
// //                         >
// //                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-full h-full text-red-800">
// //                                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
// //                             </svg>
// //                         </div>
// //                         <h1 
// //                             className="text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-8 transition-all duration-500"
// //                             style={{ 
// //                                 fontFamily: "'Crimson Text', serif",
// //                                 transform: `translateY(${scrollPosition * -0.2}px) scale(${1 - scrollPosition * 0.0005})`,
// //                                 opacity: 1 - scrollPosition * 0.002,
// //                                 textShadow: `0 ${4 + scrollPosition * 0.01}px ${8 + scrollPosition * 0.03}px rgba(0,0,0,0.6)`
// //                             }}
// //                         >
// //                             Crime Alert <span className="block">System</span>
// //                         </h1>
// //                         <button 
// //                             onClick={handleRegisterClick}
// //                             className="inline-block px-8 py-3 bg-red-800 hover:bg-red-900 text-white font-semibold rounded-md transition duration-300"
// //                             style={{ 
// //                                 transform: `translateY(${scrollPosition * -0.1}px)`,
// //                                 opacity: 1 - scrollPosition * 0.002,
// //                             }}
// //                         >
// //                             Register/Login
// //                         </button>
// //                     </div>
// //                 </div>
                
// //                 {/* ScrollDown Indicator */}
// //                 <div 
// //                     className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-white flex flex-col items-center"
// //                     style={{ 
// //                         opacity: 1 - scrollPosition * 0.005,
// //                         transform: `translate(-50%, ${scrollPosition * 0.5}px)`
// //                     }}
// //                 >
// //                     <span className="text-sm mb-2">Scroll Down</span>
// //                     <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
// //                         <div 
// //                             className="w-1 h-3 bg-white rounded-full animate-bounce mt-2"
// //                             style={{ animationDelay: '0.5s' }}
// //                         ></div>
// //                     </div>
// //                 </div>
// //             </div>
            
// //             {/* Types of Crimes Section with Parallax */}
// //             <section 
// //                 ref={el => sectionsRef.current[0] = el}
// //                 className="py-16 bg-white relative overflow-hidden"
// //             >
// //                 {/* Parallax Background Elements */}
// //                 <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
// //                     <div 
// //                         className="absolute -top-20 -right-20 w-64 h-64 bg-red-800 opacity-5 rounded-full"
// //                         style={{ transform: `translate3d(${scrollPosition * 0.05}px, ${scrollPosition * -0.08}px, 0)` }}
// //                     ></div>
// //                     <div 
// //                         className="absolute -bottom-32 -left-32 w-96 h-96 bg-red-800 opacity-5 rounded-full"
// //                         style={{ transform: `translate3d(${scrollPosition * -0.05}px, ${scrollPosition * 0.08}px, 0)` }}
// //                     ></div>
// //                     <div 
// //                         className="absolute top-1/2 left-1/4 w-48 h-48 bg-red-800 opacity-5 rounded-full"
// //                         style={{ transform: `translate3d(${scrollPosition * 0.1}px, ${scrollPosition * -0.05}px, 0)` }}
// //                     ></div>
// //                 </div>
                
// //                 <div className="container mx-auto px-4 relative z-10">
// //                     <div className="text-center mb-12">
// //                         <div 
// //                             className="w-24 h-1 bg-red-800 mx-auto mb-6 transform"
// //                             style={{ 
// //                                 transformOrigin: 'center',
// //                                 transform: `scaleX(${Math.min(1, (scrollPosition - windowHeight * 0.3) / 100)})`,
// //                                 opacity: Math.min(1, (scrollPosition - windowHeight * 0.3) / 200)
// //                             }}
// //                         ></div>
// //                         <h2 
// //                             className="text-4xl font-bold text-gray-800 transform"
// //                             style={{ 
// //                                 transform: `translateY(${Math.max(0, 50 - (scrollPosition - windowHeight * 0.5) * 0.2)}px)`,
// //                                 opacity: Math.min(1, (scrollPosition - windowHeight * 0.3) / 200)
// //                             }}
// //                         >
// // {/*                         FACETS OF UNLAWFUL ACTS */}
// //                         GENRES OF FELONIOUS BEHAVIOR
// //                         </h2>
// //                     </div>

// //                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
// //                         {basicCrimeTypes.map((crime, index) => {
// //                             const delay = index * 100;
// //                             const startFade = windowHeight * 0.5 + delay;
// //                             const opacity = Math.min(1, Math.max(0, (scrollPosition - startFade) / 200));
// //                             const translateY = Math.max(0, 100 - (scrollPosition - startFade) * 0.3);
                            
// //                             return (
// //                                 <div 
// //                                     key={index} 
// //                                     className="bg-red-50 p-8 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl border-t-4 border-red-800"
// //                                     style={{ 
// //                                         transform: `perspective(1000px) translateY(${translateY}px) rotateX(${Math.max(0, 10 - (scrollPosition - startFade) * 0.02)}deg)`,
// //                                         opacity: opacity,
// //                                         transition: 'transform 0.3s ease-out, opacity 0.5s ease-out',
// //                                     }}
// //                                 >
// //                                     <h3 className="text-xl font-semibold text-red-800 mb-4 uppercase">{crime.title}</h3>
// //                                     <p className="text-gray-700 text-justify">{crime.description}</p>
// //                                 </div>
// //                             );
// //                         })}
// //                     </div>
// //                 </div>
// //             </section>
           
// //             {/* Slider for Crime Types with Advanced Parallax */}
// //             {/* Slider for Crime Types with Advanced Parallax */}
// // <section 
// //     ref={el => sectionsRef.current[1] = el}
// //     className="py-16 bg-red-50 relative overflow-hidden"
// // >
// //     {/* Simplified background */}
// //     <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
// //         <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white to-transparent"></div>
// //         <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white to-transparent"></div>
// //     </div>
            
// //     <div className="container mx-auto px-4 relative z-10">
// //         <div className="text-center mb-12">
// //             <div className="w-24 h-1 bg-red-800 mx-auto mb-6"></div>
// //             <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
// //                 Types of Crimes
// //             </h2>
// //         </div>

// //         <div className="relative">
// //             <div className="max-w-4xl mx-auto overflow-hidden relative" style={{ minHeight: "230px" }}>
// //                 {crimeTypeSlides.map((slide, index) => (
// //                     <div 
// //                         key={index}
// //                         className={`absolute inset-0 w-full transition-opacity duration-300 ${
// //                             activeCrimeSlide === index ? 'opacity-100' : 'opacity-0'
// //                         }`}
// //                     >
// //                         <div className="bg-white p-8 rounded-lg shadow-lg relative">
// //                             <h3 className="text-xl font-bold text-red-800 mb-4">{slide.title}</h3>
// //                             <p className="text-gray-800 text-justify font-medium">{slide.description}</p>
// //                         </div>
// //                     </div>
// //                 ))}
// //             </div>

// //             {/* Slider Controls */}
// //             <div className="flex justify-center mt-8 space-x-2">
// //                 {crimeTypeSlides.map((_, index) => (
// //                     <button 
// //                         key={index}
// //                         onClick={() => setActiveCrimeSlide(index)} 
// //                         className={`w-3 h-3 rounded-full transition-all duration-300 ${
// //                             activeCrimeSlide === index 
// //                                 ? 'bg-red-800 w-6' 
// //                                 : 'bg-gray-300'
// //                         }`}
// //                     ></button>
// //                 ))}
// //             </div>

// //             {/* Arrow Controls */}
// //             <div className="absolute inset-0 flex items-center justify-between">
// //                 <button 
// //                     onClick={prevCrimeSlide} 
// //                     className="bg-transparent hover:bg-red-800 text-gray-800 hover:text-white p-2 rounded-full border border-gray-300 hover:border-red-800 transition duration-300"
// //                 >
// //                     <UilAngleLeft size="30" className="mr-1"/>
// //                 </button>
// //                 <button 
// //                     onClick={nextCrimeSlide} 
// //                     className="bg-transparent hover:bg-red-800 text-gray-800 hover:text-white p-2 rounded-full border border-gray-300 hover:border-red-800 transition duration-300"
// //                 >
// //                     <UilAngleRight size="30" className="mr-1"/>
// //                 </button>
// //             </div>
// //         </div>
// //     </div>
// // </section>
// //             {/* CTA Section with Parallax */}
// // <section 
// //     ref={el => sectionsRef.current[2] = el}
// //     className="py-16 bg-red-800 relative overflow-hidden"
// // >
// //     {/* Animated Background */}
// //     <div 
// //         className="absolute top-0 left-0 w-full h-full bg-cover bg-center"
// //         style={{ 
// //             backgroundImage: `url(${bannerImages[0]})`,
// //             opacity: 0.1,
// //         }}
// //     ></div>
    
// //     {/* Animated Path */}
// //     <svg className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10">
// //         <path 
// //             d="M0,50 Q300,100 600,50 T1200,60" 
// //             fill="none" 
// //             stroke="white" 
// //             strokeWidth="2"
// //         />
// //         <path 
// //             d="M0,100 Q300,150 600,100 T1200,110" 
// //             fill="none" 
// //             stroke="white" 
// //             strokeWidth="2"
// //         />
// //     </svg>
    
// //     <div className="container mx-auto px-4 relative z-10">
// //         <div 
// //             className="flex flex-col md:flex-row items-center justify-between"
// //             style={{ transform: `translateY(${(scrollPosition - 1500) * -0.05}px)` }}
// //         >
// //             <h3 className="text-2xl font-semibold text-white mb-4 md:mb-0">We Provide real time crime information!</h3>
// //             <button 
// //                 onClick={handleViewPostClick}
// //                 className="inline-block px-8 py-3 bg-white hover:bg-gray-100 text-red-800 font-semibold rounded-md transition duration-300"
// //             >
// //                 View Post
// //             </button>
// //         </div>
// //     </div>
// // </section>
// //         </div>
// //     );
// // };

// // export default Cover;
