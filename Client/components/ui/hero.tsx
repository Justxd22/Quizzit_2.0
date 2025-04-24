"use client";
import React, { useRef, useEffect, useState } from "react";

export const HeroBackground = () => {
  const patternRef = useRef(null);
  const containerRef = useRef(null);

  const targetRef = useRef({ x: 0, y: 0 }); // Target mouse position
  const currentRef = useRef({ x: 0, y: 0 }); // Smooth interpolated position

  // Handle mouse movement - update the target position
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      targetRef.current = { x, y };
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Smooth animation loop
  useEffect(() => {
    let animationFrameId;

    const animate = () => {
      const current = currentRef.current;
      const target = targetRef.current;

      // Lerp towards target
      current.x += (target.x - current.x) * 0.05;
      current.y += (target.y - current.y) * 0.05;

      // Map to offset
      const offsetX = current.x * 50;
      const offsetY = current.y * 50;

      if (patternRef.current) {
        patternRef.current.setAttribute(
          "patternTransform",
          `rotate(45) translate(${offsetX}, ${offsetY})`
        );
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate(); // Start the loop

    return () => cancelAnimationFrame(animationFrameId); // Cleanup
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 opacity-70 z-0">
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
            id="zigzag1"
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
        <rect width="100%" height="100%" fill="url(#zigzag1)" />
      </svg>
    </div>
  );
};
