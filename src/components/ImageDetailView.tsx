'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Download, ZoomIn, ZoomOut, Maximize2, Wand2, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { GeneratedImage } from '@/types';

interface ImageDetailViewProps {
  image: GeneratedImage;
  onBack: () => void;
  onDelete: (id: string) => void;
  onRegenerate?: (image: GeneratedImage) => void;
}

export default function ImageDetailView({ image, onBack, onDelete, onRegenerate }: ImageDetailViewProps) {
  const [zoom, setZoom] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDownload = async () => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `frame-art-${image.style.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(image.id);
      onBack();
    } catch (error) {
      console.error('Delete failed:', error);
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background overflow-auto"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Gallery</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Delete</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-background hover:bg-accent/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Image Display - Takes 2/3 on large screens */}
          <div className="lg:col-span-2">
            <div className="relative bg-surface rounded-xl overflow-hidden border border-border">
              {/* Zoom Controls */}
              <div className="absolute top-4 right-4 z-10 flex gap-2 bg-surface/80 backdrop-blur-sm rounded-lg p-1">
                <button
                  onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
                  disabled={zoom <= 0.5}
                  className="p-1.5 rounded hover:bg-surface-hover transition-colors disabled:opacity-30"
                  title="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-medium self-center min-w-[40px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom(z => Math.min(z + 0.25, 2))}
                  disabled={zoom >= 2}
                  className="p-1.5 rounded hover:bg-surface-hover transition-colors disabled:opacity-30"
                  title="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoom(1)}
                  className="p-1.5 rounded hover:bg-surface-hover transition-colors"
                  title="Reset zoom"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>

              {/* Image */}
              <div className="overflow-auto" style={{ maxHeight: '70vh' }}>
                <motion.div
                  animate={{ scale: zoom }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="origin-top-left"
                  style={{ transformOrigin: 'center center' }}
                >
                  <div className="relative aspect-video">
                    <Image
                      src={image.url}
                      alt={`${image.style} artwork`}
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Details Panel - Takes 1/3 on large screens */}
          <div className="space-y-6">
            {/* Image Details */}
            <div className="bg-surface rounded-xl p-6 border border-border">
              <h2 className="font-display text-lg font-semibold mb-4">Image Details</h2>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted mb-1">Style</p>
                  <p className="text-foreground font-medium">{image.style}</p>
                </div>

                <div>
                  <p className="text-xs text-muted mb-1">Resolution</p>
                  <p className="text-foreground">3840 × 2160 (4K)</p>
                </div>

                <div>
                  <p className="text-xs text-muted mb-1">Created</p>
                  <p className="text-foreground">{formatDate(image.createdAt)}</p>
                </div>

                {image.prompt && (
                  <div>
                    <p className="text-xs text-muted mb-1">Prompt</p>
                    <p className="text-foreground/80 text-sm leading-relaxed">{image.prompt}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Edit Options */}
            <div className="bg-surface rounded-xl p-6 border border-border">
              <h2 className="font-display text-lg font-semibold mb-4">Edit & Variations</h2>

              <div className="space-y-3">
                {onRegenerate && (
                  <button
                    onClick={() => onRegenerate(image)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 transition-colors"
                  >
                    <Wand2 className="w-4 h-4" />
                    <span>Generate Variation</span>
                  </button>
                )}

                <p className="text-xs text-muted text-center">
                  Create a new variation with the same style and settings
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-surface rounded-xl p-6 border border-border">
              <h2 className="font-display text-lg font-semibold mb-4">Quick Actions</h2>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleDownload}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <Download className="w-5 h-5 text-accent" />
                  <span className="text-xs text-muted">Download PNG</span>
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(image.url);
                  }}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs text-muted">Copy URL</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
