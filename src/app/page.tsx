'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import StyleSelector from '@/components/StyleSelector';
import PromptInput from '@/components/PromptInput';
import GenerateButton from '@/components/GenerateButton';
import PreviewPanel from '@/components/PreviewPanel';
import Lightbox from '@/components/Lightbox';
import ImageLibrary from '@/components/ImageLibrary';
import { ArtStyle, GeneratedImage } from '@/types';
import { Tv, Sparkles } from 'lucide-react';

export default function Home() {
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle | null>(null);
  const [userPrompt, setUserPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [savedImages, setSavedImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load saved images on mount
  useEffect(() => {
    loadSavedImages();
  }, []);

  const loadSavedImages = async () => {
    try {
      const response = await fetch('/api/images');
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      // Create data URL from base64
      const imageUrl = `data:image/png;base64,${data.imageBase64}`;
      setCurrentImage(imageUrl);

      // Save to library
      const saveResponse = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: data.imageBase64,
          style: selectedStyle.name,
          prompt: data.prompt,
        }),
      });

      const saveData = await saveResponse.json();
      if (saveData.image) {
        setSavedImages(prev => [saveData.image, ...prev]);
        // Update currentImage to use the blob URL
        setCurrentImage(saveData.image.url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Generate error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectLibraryImage = useCallback((image: GeneratedImage) => {
    setCurrentImage(image.url);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Tv className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                Frame Art
              </h1>
              <p className="text-sm text-muted">
                AI-powered artwork for your Samsung Frame TV
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main App Section - Settings Left, Preview Right */}
        <div className="grid lg:grid-cols-[minmax(300px,400px),1fr] gap-8 mb-12">
          {/* Left Column - Settings */}
          <div className="space-y-6">
            {/* Create Artwork Panel */}
            <div className="bg-surface rounded-xl p-6 border border-border">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-accent" />
                <h2 className="font-display text-lg font-semibold">Create Artwork</h2>
              </div>

              {/* Prompt Input */}
              <div className="mb-6">
                <PromptInput
                  value={userPrompt}
                  onChange={setUserPrompt}
                  disabled={isGenerating}
                />
              </div>

              {/* Generate Button */}
              <GenerateButton
                onClick={handleGenerate}
                isLoading={isGenerating}
                disabled={!selectedStyle}
              />

              {!selectedStyle && (
                <p className="text-xs text-muted mt-3 text-center">
                  Select a style below to start
                </p>
              )}
            </div>

            {/* Style Selector */}
            <div className="bg-surface rounded-xl p-6 border border-border">
              <h2 className="font-display text-lg font-semibold mb-4 text-foreground">
                Choose Style
              </h2>
              <StyleSelector
                selectedStyle={selectedStyle}
                onSelectStyle={setSelectedStyle}
              />
            </div>

            {/* Selected Style Display */}
            {selectedStyle && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface rounded-xl p-4 border border-accent/30"
              >
                <p className="text-xs text-muted mb-1">Selected Style</p>
                <p className="font-medium text-foreground">{selectedStyle.name}</p>
                <p className="text-sm text-muted mt-1">{selectedStyle.description}</p>
              </motion.div>
            )}
          </div>

          {/* Right Column - Preview */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <PreviewPanel
              imageUrl={currentImage}
              isLoading={isGenerating}
              onClick={() => currentImage && setLightboxOpen(true)}
            />
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border my-8" />

        {/* Image Library Section */}
        <section>
          <ImageLibrary
            images={savedImages}
            onSelectImage={handleSelectLibraryImage}
            onDeleteImage={handleDeleteImage}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-sm text-muted text-center">
            Powered by Google Gemini AI
          </p>
        </div>
      </footer>

      {/* Lightbox */}
      {currentImage && (
        <Lightbox
          isOpen={lightboxOpen}
          imageUrl={currentImage}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
