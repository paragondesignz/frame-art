'use client';

import { motion } from 'framer-motion';
import { ImageIcon, ZoomIn } from 'lucide-react';
import Image from 'next/image';

interface PreviewPanelProps {
  imageUrl: string | null;
  isLoading: boolean;
  onClick: () => void;
}

export default function PreviewPanel({ imageUrl, isLoading, onClick }: PreviewPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div
        onClick={imageUrl ? onClick : undefined}
        className={`
          relative w-full aspect-video rounded-xl overflow-hidden
          ${imageUrl ? 'preview-glow cursor-pointer group' : 'border border-border bg-surface'}
          ${isLoading ? '' : ''}
        `}
      >
        {isLoading ? (
          <div className="absolute inset-0 skeleton flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted text-sm">Creating your masterpiece...</p>
            </div>
          </div>
        ) : imageUrl ? (
          <>
            <Image
              src={imageUrl}
              alt="Generated artwork"
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              priority
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileHover={{ opacity: 1, scale: 1 }}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              >
                <div className="bg-black/60 backdrop-blur-sm rounded-full p-4">
                  <ZoomIn className="w-8 h-8 text-white" />
                </div>
              </motion.div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted">
            <ImageIcon className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-sm">Select a style and generate your artwork</p>
            <p className="text-xs mt-1 opacity-60">Images will appear here in 16:9 format</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
