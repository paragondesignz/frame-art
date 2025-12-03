'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import Image from 'next/image';

interface LightboxProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
}

export default function Lightbox({ isOpen, imageUrl, onClose }: LightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const resetView = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.5, 4));
      if (e.key === '-') setZoom(z => Math.max(z - 0.5, 1));
      if (e.key === '0') resetView();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, resetView]);

  useEffect(() => {
    if (!isOpen) resetView();
  }, [isOpen, resetView]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `frame-art-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const zoomLevels = [
    { label: 'Fit', value: 1 },
    { label: '100%', value: 1.5 },
    { label: '200%', value: 2 },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 lightbox-backdrop flex items-center justify-center"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          {/* Top Controls */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
            <div className="flex gap-2">
              {zoomLevels.map((level) => (
                <button
                  key={level.label}
                  onClick={() => {
                    setZoom(level.value);
                    if (level.value === 1) setPosition({ x: 0, y: 0 });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    zoom === level.value
                      ? 'bg-accent text-background'
                      : 'bg-surface text-foreground hover:bg-surface-hover'
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="p-2.5 rounded-lg bg-surface text-foreground hover:bg-surface-hover transition-colors"
                title="Download"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2.5 rounded-lg bg-surface text-foreground hover:bg-surface-hover transition-colors"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Image Container */}
          <div
            ref={containerRef}
            className={`relative w-full h-full flex items-center justify-center ${
              zoom > 1 ? 'cursor-grab' : ''
            } ${isDragging ? 'cursor-grabbing' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <motion.div
              animate={{
                scale: zoom,
                x: position.x,
                y: position.y,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative w-[85vw] h-[85vh] max-w-[1600px]"
            >
              <Image
                src={imageUrl}
                alt="Lightbox view"
                fill
                className="object-contain select-none"
                draggable={false}
                priority
              />
            </motion.div>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-surface/80 backdrop-blur-sm rounded-full px-4 py-2">
            <button
              onClick={() => setZoom(z => Math.max(z - 0.5, 1))}
              disabled={zoom <= 1}
              className="p-1.5 rounded-full hover:bg-surface-hover transition-colors disabled:opacity-30"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium min-w-[50px] text-center self-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(z + 0.5, 4))}
              disabled={zoom >= 4}
              className="p-1.5 rounded-full hover:bg-surface-hover transition-colors disabled:opacity-30"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <div className="w-px bg-border mx-1" />
            <button
              onClick={resetView}
              className="p-1.5 rounded-full hover:bg-surface-hover transition-colors"
              title="Reset view"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
