'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ImageIcon, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { GeneratedImage } from '@/types';

interface ImageLibraryProps {
  images: GeneratedImage[];
  onSelectImage: (image: GeneratedImage) => void;
  onDeleteImage: (id: string) => void;
  onRefresh?: () => Promise<void>;
  generatingCount?: number;
}

export default function ImageLibrary({ images, onSelectImage, onDeleteImage, onRefresh, generatingCount = 0 }: ImageLibraryProps) {
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

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await onDeleteImage(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="font-display text-lg font-semibold text-foreground">
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
          </button>
        )}
      </div>

      {/* Gallery Grid */}
      {images.length === 0 && generatingCount === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
          <ImageIcon className="w-12 h-12 mb-4 text-muted/30" />
          <p className="text-muted">No saved artworks yet</p>
          <p className="text-sm text-muted/60 mt-1">Generated images will appear here</p>
        </div>
      ) : (images.length > 0 || generatingCount > 0) && (
        <div className="flex-1 overflow-y-auto pr-1 -mr-1">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence>
              {/* Generating skeleton thumbnails */}
              {Array.from({ length: generatingCount }).map((_, index) => (
                <motion.div
                  key={`generating-${index}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="relative"
                >
                  <div className="w-full aspect-video bg-surface rounded-lg overflow-hidden border border-accent/30 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-1.5" />
                      <p className="text-xs text-muted">Creating...</p>
                    </div>
                  </div>
                </motion.div>
              ))}
              {images.map((image, index) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  className="relative group"
                >
                  <button
                    onClick={() => onSelectImage(image)}
                    className="thumbnail-container w-full aspect-video bg-surface rounded-lg overflow-hidden"
                  >
                    <Image
                      src={image.url}
                      alt={image.style}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, image.id)}
                    disabled={deletingId === image.id}
                    className="absolute top-1.5 right-1.5 p-1.5 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                  >
                    {deletingId === image.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {/* Style label on hover */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white truncate">{image.style}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
