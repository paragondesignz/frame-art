'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface HoverTooltipProps {
  imageUrl: string | null;
  isVisible: boolean;
  mousePosition: { x: number; y: number };
}

export default function HoverTooltip({ imageUrl, isVisible, mousePosition }: HoverTooltipProps) {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });

    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!imageUrl) return null;

  // Calculate position to keep tooltip on screen
  const tooltipWidth = 400;
  const tooltipHeight = 225; // 16:9 aspect ratio
  const offset = 20;

  let x = mousePosition.x + offset;
  let y = mousePosition.y + offset;

  // Adjust if tooltip would go off right edge
  if (x + tooltipWidth > windowSize.width - 20) {
    x = mousePosition.x - tooltipWidth - offset;
  }

  // Adjust if tooltip would go off bottom edge
  if (y + tooltipHeight > windowSize.height - 20) {
    y = mousePosition.y - tooltipHeight - offset;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.15 }}
          className="fixed pointer-events-none z-40"
          style={{
            left: x,
            top: y,
            width: tooltipWidth,
            height: tooltipHeight,
          }}
        >
          <div className="relative w-full h-full rounded-lg overflow-hidden shadow-2xl border border-border">
            <Image
              src={imageUrl}
              alt="Preview"
              fill
              className="object-cover"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
