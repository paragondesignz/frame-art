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

// Image dimensions (4K)
const IMAGE_WIDTH = 3840;
const IMAGE_HEIGHT = 2160;

export default function ImageDetailView({ image, onBack, onDelete, onRegenerate, onImageEdited }: ImageDetailViewProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [editInput, setEditInput] = useState('');
  const [editMessages, setEditMessages] = useState<EditMessage[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentImage, setCurrentImage] = useState(image);
  const editInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Canvas state for zoom and pan
  const [canvas, setCanvas] = useState<CanvasState | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [fitScale, setFitScale] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageIdRef = useRef(image.id);

  const MIN_SCALE = 0.05;
  const MAX_SCALE = 3;
  const ZOOM_SENSITIVITY = 0.001;

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [editMessages]);

  // Calculate fit scale based on container size
  const calculateFitScale = useCallback((containerWidth: number, containerHeight: number) => {
    if (containerWidth === 0 || containerHeight === 0) return null;
    const padding = 60; // Padding around the image
    const availableWidth = containerWidth - padding;
    const availableHeight = containerHeight - padding;
    const scaleX = availableWidth / IMAGE_WIDTH;
    const scaleY = availableHeight / IMAGE_HEIGHT;
    return Math.min(scaleX, scaleY);
  }, []);

  // Observe container size and update fit scale
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const newFitScale = calculateFitScale(width, height);

        if (newFitScale !== null) {
          setFitScale(newFitScale);

          // Initialize canvas if not yet initialized or if image changed
          setCanvas(prev => {
            if (prev === null || imageIdRef.current !== image.id) {
              imageIdRef.current = image.id;
              return { scale: newFitScale, position: { x: 0, y: 0 } };
            }
            return prev;
          });
        }
      }
    };

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);
    updateSize(); // Initial calculation

    return () => resizeObserver.disconnect();
  }, [calculateFitScale, image.id]);

  // Update current image when prop changes
  useEffect(() => {
    setCurrentImage(image);
    setEditMessages([]);
    // Reset canvas to fit view when image changes
    if (fitScale !== null && imageIdRef.current !== image.id) {
      imageIdRef.current = image.id;
      setCanvas({ scale: fitScale, position: { x: 0, y: 0 } });
    }
  }, [image.id, fitScale]);

  // Zoom function that zooms towards a point
  const zoomToPoint = useCallback((newScale: number, pointX: number, pointY: number) => {
    if (!containerRef.current || !canvas) return;

    const clampedScale = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE);
    const rect = containerRef.current.getBoundingClientRect();

    // Get mouse position relative to container center
    const mouseX = pointX - rect.left - rect.width / 2;
    const mouseY = pointY - rect.top - rect.height / 2;

    // Calculate the point in image space before zoom
    const imageX = (mouseX - canvas.position.x) / canvas.scale;
    const imageY = (mouseY - canvas.position.y) / canvas.scale;

    // Calculate new position to keep the point under the cursor
    const newPosX = mouseX - imageX * clampedScale;
    const newPosY = mouseY - imageY * clampedScale;

    setCanvas({
      scale: clampedScale,
      position: { x: newPosX, y: newPosY }
    });
  }, [canvas]);

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!canvas) return;
    e.preventDefault();
    const delta = -e.deltaY * ZOOM_SENSITIVITY;
    const newScale = canvas.scale * (1 + delta);
    zoomToPoint(newScale, e.clientX, e.clientY);
  }, [canvas, zoomToPoint]);

  // Handle pan start
  const handlePanStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!canvas) return;
    // Only start panning on left mouse button or touch
    if ('button' in e && e.button !== 0) return;

    setIsPanning(true);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setPanStart({
      x: clientX - canvas.position.x,
      y: clientY - canvas.position.y
    });
  }, [canvas]);

  // Handle pan move
  const handlePanMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isPanning) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setCanvas(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        position: {
          x: clientX - panStart.x,
          y: clientY - panStart.y
        }
      };
    });
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
    if (!canvas) return;
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
  }, [canvas, lastTouchDistance, touchCenter, zoomToPoint, handlePanMove]);

  const handleTouchEnd = useCallback(() => {
    setLastTouchDistance(null);
    setTouchCenter(null);
    handlePanEnd();
  }, [handlePanEnd]);

  // Zoom button handlers
  const handleZoomIn = useCallback(() => {
    if (!containerRef.current || !canvas) return;
    const rect = containerRef.current.getBoundingClientRect();
    zoomToPoint(canvas.scale * 1.3, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }, [canvas, zoomToPoint]);

  const handleZoomOut = useCallback(() => {
    if (!containerRef.current || !canvas) return;
    const rect = containerRef.current.getBoundingClientRect();
    zoomToPoint(canvas.scale / 1.3, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }, [canvas, zoomToPoint]);

  // Fit to view - shows entire image in container
  const handleFitToView = useCallback(() => {
    if (fitScale === null) return;
    setCanvas({ scale: fitScale, position: { x: 0, y: 0 } });
  }, [fitScale]);

  // Zoom to actual size (100% = 1 pixel = 1 pixel)
  const handleActualSize = useCallback(() => {
    setCanvas({ scale: 1, position: { x: 0, y: 0 } });
  }, []);

  // Reset view - same as fit to view
  const handleResetView = useCallback(() => {
    handleFitToView();
  }, [handleFitToView]);

  // Double-click to toggle between fit and 100%
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!canvas || fitScale === null) return;
    // If close to fit scale, zoom to 100% centered on click point
    if (Math.abs(canvas.scale - fitScale) < 0.01) {
      zoomToPoint(1, e.clientX, e.clientY);
    } else {
      // Otherwise, fit to view
      handleFitToView();
    }
  }, [canvas, fitScale, zoomToPoint, handleFitToView]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
          e.preventDefault();
          handleZoomOut();
          break;
        case '0':
          e.preventDefault();
          handleFitToView();
          break;
        case '1':
          e.preventDefault();
          handleActualSize();
          break;
        case 'Escape':
          e.preventDefault();
          onBack();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleFitToView, handleActualSize, onBack]);

  // Helper to check if at fit scale
  const isAtFitScale = canvas && fitScale !== null && Math.abs(canvas.scale - fitScale) < 0.01;
  const isAtActualSize = canvas && Math.abs(canvas.scale - 1) < 0.01;

  // Current scale for display
  const currentScale = canvas?.scale ?? fitScale ?? 1;

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
              <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-surface/90 backdrop-blur-sm rounded-lg p-1 shadow-lg">
                <button
                  onClick={handleZoomOut}
                  disabled={!canvas || currentScale <= MIN_SCALE}
                  className="p-2 rounded-md hover:bg-white/10 transition-colors disabled:opacity-30"
                  title="Zoom out (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <div className="px-2 min-w-[60px] text-center">
                  <span className="text-xs font-medium tabular-nums">
                    {Math.round(currentScale * 100)}%
                  </span>
                </div>

                <button
                  onClick={handleZoomIn}
                  disabled={!canvas || currentScale >= MAX_SCALE}
                  className="p-2 rounded-md hover:bg-white/10 transition-colors disabled:opacity-30"
                  title="Zoom in (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <div className="w-px h-5 bg-white/20 mx-1" />

                <button
                  onClick={handleFitToView}
                  className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isAtFitScale
                      ? 'bg-accent/20 text-accent'
                      : 'hover:bg-white/10 text-muted hover:text-foreground'
                  }`}
                  title="Fit to view (0)"
                >
                  Fit
                </button>

                <button
                  onClick={handleActualSize}
                  className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isAtActualSize
                      ? 'bg-accent/20 text-accent'
                      : 'hover:bg-white/10 text-muted hover:text-foreground'
                  }`}
                  title="Actual size (1)"
                >
                  100%
                </button>

                <div className="w-px h-5 bg-white/20 mx-1" />

                <button
                  onClick={handleResetView}
                  className="p-2 rounded-md hover:bg-white/10 transition-colors"
                  title="Reset view"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>

              {/* Pan/zoom hints */}
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 bg-surface/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 shadow-lg">
                  <Move className="w-3 h-3 text-muted" />
                  <span className="text-xs text-muted">Drag to pan</span>
                </div>
                <div className="text-[10px] text-muted/60 px-2.5">
                  Double-click to toggle zoom
                </div>
              </div>

              {/* Image Canvas */}
              <div
                ref={containerRef}
                className="relative overflow-hidden select-none bg-black/20"
                style={{
                  height: '70vh',
                  minHeight: '400px',
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
                onDoubleClick={handleDoubleClick}
              >
                {/* Checkerboard background for transparency */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-10"
                  style={{
                    backgroundImage: `
                      linear-gradient(45deg, #333 25%, transparent 25%),
                      linear-gradient(-45deg, #333 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, #333 75%),
                      linear-gradient(-45deg, transparent 75%, #333 75%)
                    `,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                  }}
                />

                {/* Canvas content - image centered and scaled */}
                {canvas && (
                  <div
                    ref={canvasRef}
                    className="absolute"
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: `translate(calc(-50% + ${canvas.position.x}px), calc(-50% + ${canvas.position.y}px))`,
                      transition: isPanning ? 'none' : 'transform 0.15s ease-out'
                    }}
                  >
                    <div
                      className="relative shadow-2xl"
                      style={{
                        width: `${IMAGE_WIDTH * canvas.scale}px`,
                        height: `${IMAGE_HEIGHT * canvas.scale}px`,
                      }}
                    >
                      <Image
                        src={currentImage.url}
                        alt={`${currentImage.style} artwork`}
                        fill
                        className="object-contain rounded-lg"
                        priority
                        draggable={false}
                        sizes="100vw"
                      />
                    </div>
                  </div>
                )}

                {/* Loading state while calculating fit */}
                {!canvas && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Status bar */}
              <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
                <div className="bg-surface/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-lg">
                  <span className="text-xs text-muted tabular-nums">
                    {Math.round(currentScale * 100)}%
                    {isAtFitScale && ' (Fit)'}
                    {isAtActualSize && ' (Actual)'}
                    {canvas && (canvas.position.x !== 0 || canvas.position.y !== 0) && !isAtFitScale && ' • Panned'}
                  </span>
                </div>
                <div className="bg-surface/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-lg">
                  <span className="text-xs text-muted">
                    {IMAGE_WIDTH} × {IMAGE_HEIGHT}
                  </span>
                </div>
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
