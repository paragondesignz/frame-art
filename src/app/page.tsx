'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StyleSelector from '@/components/StyleSelector';
import PromptInput from '@/components/PromptInput';
import GenerateButton from '@/components/GenerateButton';
import ImageLibrary from '@/components/ImageLibrary';
import ImageDetailView from '@/components/ImageDetailView';
import { ArtStyle, GeneratedImage } from '@/types';
import { Tv, Sparkles } from 'lucide-react';

export default function Home() {
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle | null>(null);
  const [userPrompt, setUserPrompt] = useState('');
  const [useTealAccent, setUseTealAccent] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedImages, setSavedImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);

  // Load saved images on mount
  useEffect(() => {
    loadSavedImages();
  }, []);

  const loadSavedImages = async () => {
    try {
      const response = await fetch(`/api/images?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const data = await response.json();
      if (data.images) {
        setSavedImages(data.images);
      }
    } catch (err) {
      console.error('Failed to load images:', err);
    }
  };

  const handleGenerate = async () => {
    if (!selectedStyle) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style: selectedStyle.promptPrefix,
          userPrompt,
          useTealAccent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      if (data.image) {
        console.log('Image generated and saved:', data.image.url);
        setSavedImages(prev => [data.image, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Generate error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectLibraryImage = useCallback((image: GeneratedImage) => {
    setSelectedImage(image);
  }, []);

  const handleDeleteImage = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/images?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSavedImages(prev => prev.filter(img => img.id !== id));
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  }, []);

  const handleRegenerate = useCallback(async (image: GeneratedImage) => {
    setSelectedImage(null);
  }, []);

  const handleImageEdited = useCallback((newImage: GeneratedImage) => {
    setSavedImages(prev => [newImage, ...prev]);
  }, []);

  // Show detail view if an image is selected
  if (selectedImage) {
    return (
      <AnimatePresence>
        <ImageDetailView
          image={selectedImage}
          onBack={() => setSelectedImage(null)}
          onDelete={handleDeleteImage}
          onRegenerate={handleRegenerate}
          onImageEdited={handleImageEdited}
        />
      </AnimatePresence>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border flex-shrink-0">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Tv className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">
                Frame Art
              </h1>
              <p className="text-xs text-muted">
                AI-powered artwork for your Samsung Frame TV
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - 1/3 x 2/3 Layout */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6 h-full" style={{ minHeight: 'calc(100vh - 180px)' }}>
          {/* Left Column - 1/3 width: Create Panel */}
          <div className="w-full lg:w-1/3 xl:w-1/4 order-2 lg:order-1">
            <div className="bg-surface rounded-xl p-5 border border-border lg:sticky lg:top-6">
              <div className="flex items-center gap-2 mb-5">
                <Sparkles className="w-5 h-5 text-accent" />
                <h2 className="font-display text-lg font-semibold">Create Artwork</h2>
              </div>

              {/* Style Selector - Compact Dropdown */}
              <div className="mb-4">
                <label className="block text-xs text-muted mb-2">Art Style</label>
                <StyleSelector
                  selectedStyle={selectedStyle}
                  onSelectStyle={setSelectedStyle}
                />
              </div>

              {/* Prompt Input */}
              <div className="mb-4">
                <label className="block text-xs text-muted mb-2">Custom Prompt (optional)</label>
                <PromptInput
                  value={userPrompt}
                  onChange={setUserPrompt}
                  disabled={isGenerating}
                />
              </div>

              {/* Teal Accent Option */}
              <label className="flex items-center gap-3 mb-5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={useTealAccent}
                  onChange={(e) => setUseTealAccent(e.target.checked)}
                  disabled={isGenerating}
                  className="w-4 h-4 rounded border-border bg-surface text-teal-500 focus:ring-teal-500 focus:ring-offset-0 cursor-pointer disabled:opacity-50"
                />
                <span className="text-sm text-muted group-hover:text-foreground transition-colors">
                  Use teal accent palette
                </span>
              </label>

              {/* Generate Button */}
              <GenerateButton
                onClick={handleGenerate}
                isLoading={isGenerating}
                disabled={!selectedStyle}
              />

              {/* Error Display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
                >
                  {error}
                </motion.div>
              )}
            </div>
          </div>

          {/* Right Column - 2/3 width: Gallery */}
          <div className="w-full lg:w-2/3 xl:w-3/4 order-1 lg:order-2">
            <div className="bg-surface rounded-xl p-5 border border-border h-full" style={{ minHeight: '500px' }}>
              <ImageLibrary
                images={savedImages}
                onSelectImage={handleSelectLibraryImage}
                onDeleteImage={handleDeleteImage}
                onRefresh={loadSavedImages}
                isGenerating={isGenerating}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto flex-shrink-0">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-xs text-muted text-center">
            Powered by Google Gemini AI
          </p>
        </div>
      </footer>
    </div>
  );
}
