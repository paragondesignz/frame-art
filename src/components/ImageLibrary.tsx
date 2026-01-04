'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ImageIcon, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import HoverTooltip from './HoverTooltip';
import { GeneratedImage } from '@/types';

interface ImageLibraryProps {
  images: GeneratedImage[];
  onSelectImage: (image: GeneratedImage) => void;
  onDeleteImage: (id: string) => void;
  onRefresh?: () => Promise<void>;
}

export default function ImageLibrary({ images, onSelectImage, onDeleteImage, onRefresh }: ImageLibraryProps) {
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await onDeleteImage(id);
    } finally {
      setDeletingId(null);
    }
  };

  if (images.length === 0) {
    return (
      <div className="w-full py-12 text-center">
        <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted/30" />
        <p className="text-muted">No saved artworks yet</p>
        <p className="text-sm text-muted/60 mt-1">Generated images will appear here</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Your Gallery
        </h2>
        {onRefresh && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted hover:text-foreground transition-colors disabled:opacity-50"
            title="Refresh gallery"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        <AnimatePresence>
          {images.map((image, index) => (
            <motion.div
              key={image.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, delay: index * 0.02 }}
              className="relative group"
              onMouseEnter={() => setHoveredImage(image.url)}
              onMouseLeave={() => setHoveredImage(null)}
              onMouseMove={handleMouseMove}
            >
              <button
                onClick={() => onSelectImage(image)}
                className="thumbnail-container w-full aspect-video bg-surface"
              >
                <Image
                  src={image.url}
                  alt={image.style}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 12.5vw"
                />
              </button>
              <button
                onClick={(e) => handleDelete(e, image.id)}
                disabled={deletingId === image.id}
                className="absolute top-1 right-1 p-1.5 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
              >
                {deletingId === image.id ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <HoverTooltip
        imageUrl={hoveredImage}
        isVisible={!!hoveredImage}
        mousePosition={mousePosition}
      />
    </div>
  );
}
