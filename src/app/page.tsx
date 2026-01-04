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
import { Tv, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface GenerationInfo {
  prompt: string;
  style: string;
  userInput: string;
  dimensions?: { width: number; height: number };
}

export default function Home() {
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle | null>(null);
  const [userPrompt, setUserPrompt] = useState('');
  const [useTealAccent, setUseTealAccent] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [savedImages, setSavedImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastGeneration, setLastGeneration] = useState<GenerationInfo | null>(null);
  const [promptExpanded, setPromptExpanded] = useState(false);

  // Load saved images on mount
  useEffect(() => {
    loadSavedImages();
  }, []);

  const loadSavedImages = async () => {
    try {
      // Add timestamp to bust any edge caching
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

      // Create data URL from base64
      const imageUrl = `data:image/png;base64,${data.imageBase64}`;
      setCurrentImage(imageUrl);

      // Store generation info
      setLastGeneration({
        prompt: data.prompt,
        style: selectedStyle.name,
        userInput: userPrompt || '(none)',
        dimensions: data.dimensions,
      });
      setPromptExpanded(false);

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
        <div className="flex flex-col md:flex-row gap-6 lg:gap-8 mb-8">
          {/* Left Column - Create Panel */}
          <div className="w-full md:w-[350px] lg:w-[400px] flex-shrink-0 order-2 md:order-1">
            <div className="bg-surface rounded-xl p-6 border border-border">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-accent" />
                <h2 className="font-display text-lg font-semibold">Create Artwork</h2>
              </div>

              {/* Prompt Input */}
              <div className="mb-4">
                <PromptInput
                  value={userPrompt}
                  onChange={setUserPrompt}
                  disabled={isGenerating}
                />
              </div>

              {/* Teal Accent Option */}
              <label className="flex items-center gap-3 mb-6 cursor-pointer group">
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

              {/* Selected Style Display */}
              {selectedStyle && (
                <div className="mb-4 p-3 bg-accent/10 border border-accent/30 rounded-lg">
                  <p className="text-xs text-muted mb-1">Selected Style</p>
                  <p className="font-medium text-foreground">{selectedStyle.name}</p>
                </div>
              )}

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
          </div>

          {/* Right Column - Preview */}
          <div className="flex-1 order-1 md:order-2 md:sticky md:top-8 md:self-start">
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

            {/* Generation Info - Collapsible */}
            {lastGeneration && currentImage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 bg-surface rounded-xl border border-border overflow-hidden"
              >
                <button
                  onClick={() => setPromptExpanded(!promptExpanded)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                >
                  <span className="text-sm font-medium text-foreground">Generation Details</span>
                  {promptExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted" />
                  )}
                </button>
                {promptExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                    <div>
                      <p className="text-xs text-muted mb-1">Style</p>
                      <p className="text-sm text-foreground">{lastGeneration.style}</p>
                    </div>
                    {lastGeneration.dimensions && (
                      <div>
                        <p className="text-xs text-muted mb-1">Resolution</p>
                        <p className={`text-sm font-medium ${
                          lastGeneration.dimensions.width === 3840 && lastGeneration.dimensions.height === 2160
                            ? 'text-green-400'
                            : 'text-yellow-400'
                        }`}>
                          {lastGeneration.dimensions.width} × {lastGeneration.dimensions.height} pixels
                          {lastGeneration.dimensions.width === 3840 && lastGeneration.dimensions.height === 2160
                            ? ' ✓ 4K'
                            : ` (Target: 3840×2160)`}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted mb-1">Your Input</p>
                      <p className="text-sm text-foreground">{lastGeneration.userInput}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted mb-1">AI-Crafted Prompt</p>
                      <p className="text-sm text-foreground/80 leading-relaxed">{lastGeneration.prompt}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Style Selector - Full Width */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold mb-4 text-foreground">
            Choose Your Style
          </h2>
          <StyleSelector
            selectedStyle={selectedStyle}
            onSelectStyle={setSelectedStyle}
          />
        </section>

        {/* Divider */}
        <div className="border-t border-border my-8" />

        {/* Image Library Section */}
        <section>
          <ImageLibrary
            images={savedImages}
            onSelectImage={handleSelectLibraryImage}
            onDeleteImage={handleDeleteImage}
            onRefresh={loadSavedImages}
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
