"use client";
import React, { useRef, useEffect, useState } from "react";


export const HeroBackgroundDiff = () => {
  const patternRef = useRef(null);
  const containerRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  // Handle mouse movement
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      
      // Get container dimensions
      const rect = containerRef.current.getBoundingClientRect();
      
      // Calculate mouse position as percentage of container
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      
      setMousePosition({ x, y });
    };
    
    // Add event listener
    window.addEventListener('mousemove', handleMouseMove);
    
    // Cleanup
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  // Update pattern based on mouse position
  useEffect(() => {
    if (patternRef.current) {
      // Map mouse position to pattern offset (0-50 range)
      const offsetX = mousePosition.x * 50;
      const offsetY = mousePosition.y * 50;
      
      // Update pattern transformation
      patternRef.current.setAttribute(
        'patternTransform', 
        `rotate(90) translate(${offsetX}, ${offsetY})`
      );
    }
  }, [mousePosition]);

  return (
    <div ref={containerRef} className="absolute inset-0 opacity-70 z-1">
      <svg width="100%" height="100%" preserveAspectRatio="none">
        <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <pattern 
            id="zigzag" 
            ref={patternRef}
            patternUnits="userSpaceOnUse" 
            width="60" 
            height="60" 
            patternTransform="rotate(45)"
          >
            <path
              d="M0,30 L30,0 L60,30"
              fill="none"
              stroke="#70c6c6"
              strokeWidth="6"
              strokeLinecap="round"
              filter="url(#glow)"
            />
          </pattern>
          
        </defs>
        <rect width="100%" height="100%" fill="url(#zigzag)" />
      </svg>
    </div>
  );
};