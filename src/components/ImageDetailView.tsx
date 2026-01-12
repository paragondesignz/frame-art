'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Download, ZoomIn, ZoomOut, Maximize2, Wand2, Trash2, ChevronDown, ChevronUp, Send, Loader2, Move } from 'lucide-react';
import Image from 'next/image';
import { GeneratedImage } from '@/types';

interface EditMessage {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
}

interface ImageDetailViewProps {
  image: GeneratedImage;
  onBack: () => void;
  onDelete: (id: string) => void;
  onRegenerate?: (image: GeneratedImage) => void;
  onImageEdited?: (newImage: GeneratedImage) => void;
}

interface CanvasState {
  scale: number;
  position: { x: number; y: number };
}

export default function ImageDetailView({ image, onBack, onDelete, onRegenerate, onImageEdited }: ImageDetailViewProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [editInput, setEditInput] = useState('');
  const [editMessages, setEditMessages] = useState<EditMessage[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentImage, setCurrentImage] = useState(image);
  const editInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Infinite canvas state
  const [canvas, setCanvas] = useState<CanvasState>({ scale: 1, position: { x: 0, y: 0 } });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const MIN_SCALE = 0.1;
  const MAX_SCALE = 5;
  const ZOOM_SENSITIVITY = 0.002;

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [editMessages]);

  // Update current image when prop changes
  useEffect(() => {
    setCurrentImage(image);
    setEditMessages([]);
    // Reset canvas when image changes
    setCanvas({ scale: 1, position: { x: 0, y: 0 } });
  }, [image.id]);

  // Zoom function that zooms towards a point
  const zoomToPoint = useCallback((newScale: number, pointX: number, pointY: number) => {
    if (!containerRef.current) return;

    const clampedScale = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE);
    const rect = containerRef.current.getBoundingClientRect();

    // Get point relative to container center
    const containerCenterX = rect.width / 2;
    const containerCenterY = rect.height / 2;
    const mouseX = pointX - rect.left;
    const mouseY = pointY - rect.top;

    // Calculate the point in canvas space before zoom
    const pointInCanvasX = (mouseX - containerCenterX - canvas.position.x) / canvas.scale;
    const pointInCanvasY = (mouseY - containerCenterY - canvas.position.y) / canvas.scale;

    // Calculate new position to keep the point under the cursor
    const newPosX = mouseX - containerCenterX - pointInCanvasX * clampedScale;
    const newPosY = mouseY - containerCenterY - pointInCanvasY * clampedScale;

    setCanvas({
      scale: clampedScale,
      position: { x: newPosX, y: newPosY }
    });
  }, [canvas.scale, canvas.position]);

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * ZOOM_SENSITIVITY;
    const newScale = canvas.scale * (1 + delta);
    zoomToPoint(newScale, e.clientX, e.clientY);
  }, [canvas.scale, zoomToPoint]);

  // Handle pan start
  const handlePanStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsPanning(true);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setPanStart({
      x: clientX - canvas.position.x,
      y: clientY - canvas.position.y
    });
  }, [canvas.position]);

  // Handle pan move
  const handlePanMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isPanning) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setCanvas(prev => ({
      ...prev,
      position: {
        x: clientX - panStart.x,
        y: clientY - panStart.y
      }
    }));
  }, [isPanning, panStart]);

  // Handle pan end
  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Touch pinch zoom state
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const [touchCenter, setTouchCenter] = useState<{ x: number; y: number } | null>(null);

  // Handle touch events for pinch zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;
      setLastTouchDistance(distance);
      setTouchCenter({ x: centerX, y: centerY });
    } else if (e.touches.length === 1) {
      handlePanStart(e);
    }
  }, [handlePanStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance !== null && touchCenter !== null) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;

      const scaleFactor = distance / lastTouchDistance;
      const newScale = canvas.scale * scaleFactor;

      zoomToPoint(newScale, centerX, centerY);
      setLastTouchDistance(distance);
      setTouchCenter({ x: centerX, y: centerY });
    } else if (e.touches.length === 1) {
      handlePanMove(e);
    }
  }, [lastTouchDistance, touchCenter, canvas.scale, zoomToPoint, handlePanMove]);

  const handleTouchEnd = useCallback(() => {
    setLastTouchDistance(null);
    setTouchCenter(null);
    handlePanEnd();
  }, [handlePanEnd]);

  // Zoom button handlers
  const handleZoomIn = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    zoomToPoint(canvas.scale * 1.25, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }, [canvas.scale, zoomToPoint]);

  const handleZoomOut = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    zoomToPoint(canvas.scale / 1.25, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }, [canvas.scale, zoomToPoint]);

  const handleResetView = useCallback(() => {
    setCanvas({ scale: 1, position: { x: 0, y: 0 } });
  }, []);

  const handleEdit = async () => {
    if (!editInput.trim() || isEditing) return;

    const instruction = editInput.trim();
    setEditInput('');
    setIsEditing(true);

    // Add user message
    setEditMessages(prev => [...prev, { role: 'user', content: instruction }]);

    try {
      const response = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: currentImage.url,
          editInstruction: instruction,
          style: currentImage.style,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to edit image');
      }

      if (data.image) {
        // Add assistant message with new image
        setEditMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Here\'s the edited image:',
          imageUrl: data.image.url,
        }]);

        // Update current image for further edits
        setCurrentImage(data.image);

        // Notify parent of new image
        onImageEdited?.(data.image);
      }
    } catch (error) {
      setEditMessages(prev => [...prev, {
        role: 'assistant',
        content: `Edit failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }]);
    } finally {
      setIsEditing(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(currentImage.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `frame-art-${currentImage.style.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
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
              {/* Canvas Controls */}
              <div className="absolute top-4 right-4 z-10 flex gap-2 bg-surface/80 backdrop-blur-sm rounded-lg p-1">
                <button
                  onClick={handleZoomOut}
                  disabled={canvas.scale <= MIN_SCALE}
                  className="p-1.5 rounded hover:bg-surface-hover transition-colors disabled:opacity-30"
                  title="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-medium self-center min-w-[40px] text-center">
                  {Math.round(canvas.scale * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  disabled={canvas.scale >= MAX_SCALE}
                  className="p-1.5 rounded hover:bg-surface-hover transition-colors disabled:opacity-30"
                  title="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetView}
                  className="p-1.5 rounded hover:bg-surface-hover transition-colors"
                  title="Reset view"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>

              {/* Pan indicator */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-surface/80 backdrop-blur-sm rounded-lg px-2 py-1">
                <Move className="w-3 h-3 text-muted" />
                <span className="text-xs text-muted">Drag to pan</span>
              </div>

              {/* Infinite Canvas */}
              <div
                ref={containerRef}
                className="relative overflow-hidden select-none"
                style={{
                  height: '70vh',
                  cursor: isPanning ? 'grabbing' : 'grab',
                  touchAction: 'none'
                }}
                onWheel={handleWheel}
                onMouseDown={handlePanStart}
                onMouseMove={handlePanMove}
                onMouseUp={handlePanEnd}
                onMouseLeave={handlePanEnd}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Subtle grid background */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
                    `,
                    backgroundSize: `${20 * canvas.scale}px ${20 * canvas.scale}px`,
                    backgroundPosition: `${canvas.position.x}px ${canvas.position.y}px`
                  }}
                />

                {/* Canvas content */}
                <div
                  ref={canvasRef}
                  className="absolute"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: `translate(${canvas.position.x}px, ${canvas.position.y}px) scale(${canvas.scale})`,
                    transformOrigin: 'center center',
                    transition: isPanning ? 'none' : 'transform 0.1s ease-out'
                  }}
                >
                  <div
                    className="relative"
                    style={{
                      width: '960px',
                      height: '540px',
                      marginLeft: '-480px',
                      marginTop: '-270px'
                    }}
                  >
                    <Image
                      src={currentImage.url}
                      alt={`${currentImage.style} artwork`}
                      fill
                      className="object-contain rounded-lg shadow-2xl"
                      priority
                      draggable={false}
                    />
                  </div>
                </div>
              </div>

              {/* Zoom level indicator */}
              <div className="absolute bottom-4 left-4 z-10 bg-surface/80 backdrop-blur-sm rounded-lg px-2 py-1">
                <span className="text-xs text-muted">
                  {canvas.scale < 1 ? `${Math.round(canvas.scale * 100)}%` : `${canvas.scale.toFixed(1)}x`}
                  {(canvas.position.x !== 0 || canvas.position.y !== 0) && ' • Panned'}
                </span>
              </div>
            </div>
          </div>

          {/* Details Panel - Takes 1/3 on large screens */}
          <div className="space-y-4">
            {/* Conversational Edit */}
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-accent" />
                  Edit Image
                </h2>
                <p className="text-xs text-muted mt-1">Describe what changes you want</p>
              </div>

              {/* Edit Messages */}
              {editMessages.length > 0 && (
                <div className="max-h-64 overflow-y-auto p-4 space-y-3">
                  {editMessages.map((msg, idx) => (
                    <div key={idx} className={`${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                      <div className={`inline-block max-w-[90%] px-3 py-2 rounded-lg text-sm ${
                        msg.role === 'user'
                          ? 'bg-accent/20 text-foreground'
                          : 'bg-white/5 text-foreground/80'
                      }`}>
                        {msg.content}
                        {msg.imageUrl && (
                          <div className="mt-2 relative aspect-video rounded overflow-hidden">
                            <Image
                              src={msg.imageUrl}
                              alt="Edited image"
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isEditing && (
                    <div className="text-left">
                      <div className="inline-block px-3 py-2 rounded-lg bg-white/5">
                        <Loader2 className="w-4 h-4 animate-spin text-accent" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Edit Input */}
              <div className="p-4 border-t border-border">
                <form onSubmit={(e) => { e.preventDefault(); handleEdit(); }} className="flex gap-2">
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editInput}
                    onChange={(e) => setEditInput(e.target.value)}
                    placeholder="e.g., Make the sky more dramatic..."
                    disabled={isEditing}
                    className="flex-1 px-3 py-2 bg-white/5 border border-border rounded-lg text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!editInput.trim() || isEditing}
                    className="px-3 py-2 bg-accent text-background rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>

            {/* Image Details - Compact */}
            <div className="bg-surface rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Style</span>
                <span className="text-foreground font-medium">{currentImage.style}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted">Resolution</span>
                <span className="text-foreground">3840 × 2160</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted">Created</span>
                <span className="text-foreground">{formatDate(currentImage.createdAt)}</span>
              </div>

              {/* Collapsible Prompt */}
              {image.prompt && (
                <div className="mt-3 pt-3 border-t border-border">
                  <button
                    onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                    className="flex items-center justify-between w-full text-sm text-muted hover:text-foreground transition-colors"
                  >
                    <span>Original Prompt</span>
                    {isPromptExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  <AnimatePresence>
                    {isPromptExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className="text-foreground/70 text-xs leading-relaxed mt-2">
                          {image.prompt}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
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
                    navigator.clipboard.writeText(currentImage.url);
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
