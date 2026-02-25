import React, { useState, useEffect } from 'react';
import LoginForm from '../components/LoginForm';

const Login = () => {
  // Array of image URLs that will cycle through
  const images = [
    
    
    '/caldimpic4.png',
    '/caldimpic3.png',
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [loadedImages, setLoadedImages] = useState([]);
  
  // Single scrolling text message
  const scrollingText = "Secure Login System v2.0 • CALDIM Engineering Pvt Ltd • All Rights Reserved © 2026 • Industry 4.0 Ready";

  // Preload images for better quality
  useEffect(() => {
    const loadImages = async () => {
      const promises = images.map(src => {
        return new Promise((resolve) => {
          const img = new Image();
          img.src = src;
          img.onload = () => resolve(src);
          img.onerror = () => resolve(null);
        });
      });
      
      const loaded = await Promise.all(promises);
      setLoadedImages(loaded.filter(img => img !== null));
    };
    
    loadImages();
  }, []);

  // Automatically cycle through images every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (loadedImages.length > 0) {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentImageIndex((prevIndex) => (prevIndex + 1) % loadedImages.length);
          setIsTransitioning(false);
        }, 100);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [loadedImages.length]);

  const handleIndicatorClick = (index) => {
    if (loadedImages.length > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentImageIndex(index);
        setIsTransitioning(false);
      }, 100);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative p-4">
      <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>

      <div className="relative w-full max-w-5xl bg-white/90 rounded-3xl shadow-2xl overflow-hidden border border-white/20 max-h-[90vh]"> {/* Added max-h constraint */}
        <div className="flex flex-col lg:flex-row h-full"> {/* Added h-full */}
          
          {/* Left side - Login Form with Scrolling Text */}
          <div className="w-full lg:w-1/2 p-6 md:p-8 lg:p-10 flex flex-col"> {/* Changed to flex-col */}
            <div className="flex-1 flex items-center justify-center"> {/* Added flex-1 */}
              <div className="w-full max-w-md">
                <LoginForm />
              </div>
            </div>
            
            {/* Scrolling Text Section - Fixed at bottom */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="relative overflow-hidden h-6"> {/* Fixed height */}
                <div className="whitespace-nowrap">
                  <span 
                    className="inline-block text-red-600 font-medium text-xs animate-marquee"
                    style={{
                      animation: 'marquee 10s linear infinite',
                      paddingRight: '2rem'
                    }}
                  >
                    {scrollingText}
                  </span>
                  
                  <span 
                    className="inline-block text-red-600 font-medium text-xs animate-marquee"
                    style={{
                      animation: 'marquee 10s linear infinite',
                      animationDelay: '0s',
                      paddingRight: '2rem'
                    }}
                  >
                    {scrollingText}
                  </span>
                </div>
                
                {/* Fade edges */}
                <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent z-10"></div>
                <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent z-10"></div>
              </div>
            </div>
          </div>

          {/* Right side - Image Carousel */}
          <div className="w-full lg:w-1/2 h-[300px] lg:h-auto"> {/* Fixed heights */}
            <div className="relative w-full h-full min-h-[300px] lg:min-h-0 lg:h-full overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800">
              
              {/* Loading state */}
              {loadedImages.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-pulse flex flex-col items-center">
                    <div className="w-8 h-8 bg-gray-700 rounded-full mb-3"></div>
                    <div className="h-3 bg-gray-700 rounded w-20"></div>
                  </div>
                </div>
              )}

              {/* High Quality Images */}
              {loadedImages.map((image, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 w-full h-full transition-all duration-1000 ${
                    index === currentImageIndex 
                      ? 'opacity-100 scale-100' 
                      : 'opacity-0 scale-105'
                  }`}
                >
                  <div className="relative w-full h-full">
                    <img
                      src={image}
                      alt={`CALDIM Engineering ${index + 1}`}
                      className="w-full h-full object-cover"
                      style={{
                        imageRendering: 'crisp-edges',
                        imageRendering: '-webkit-optimize-contrast',
                        WebkitFontSmoothing: 'antialiased',
                        MozOsxFontSmoothing: 'grayscale',
                        backfaceVisibility: 'hidden',
                        transform: 'translateZ(0)',
                        willChange: 'transform',
                        filter: 'brightness(1.1) contrast(1.15) saturate(1.1)',
                        WebkitFilter: 'brightness(1.1) contrast(1.15) saturate(1.1)',
                      }}
                      loading="eager"
                      decoding="sync"
                      fetchPriority="high"
                    />
                  </div>
                </div>
              ))}

              {/* Quality enhancement overlays */}
              {loadedImages.length > 0 && (
                <>
                  <div 
                    className={`absolute inset-0 transition-opacity duration-700 ${
                      !isTransitioning ? 'opacity-30' : 'opacity-0'
                    }`}
                    style={{
                      background: 'linear-gradient(45deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.03) 100%)',
                      mixBlendMode: 'overlay',
                      pointerEvents: 'none'
                    }}
                  ></div>

                  <div 
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                      background: 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 70%)',
                      mixBlendMode: 'multiply'
                    }}
                  ></div>
                </>
              )}

              {/* Image counter indicator */}
              {loadedImages.length > 0 && (
                <div className="absolute bottom-3 right-3 z-20 flex items-center space-x-1.5">
                  {loadedImages.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${
                        index === currentImageIndex
                          ? 'bg-white scale-125'
                          : 'bg-white/40 hover:bg-white/70'
                      }`}
                      onClick={() => handleIndicatorClick(index)}
                    ></div>
                  ))}
                </div>
              )}

              <div className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 20%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.08) 80%, rgba(0,0,0,0.12) 100%)'
                }}
              ></div>

              <div className="absolute inset-0 pointer-events-none"
                style={{
                  boxShadow: 'inset 0 0 60px rgba(0,0,0,0.15)'
                }}
              ></div>

            </div>
          </div>

        </div>
      </div>
      
      {/* Add CSS animation for marquee */}
      <style>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Login;