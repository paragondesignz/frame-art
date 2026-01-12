'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { artStyles, categories } from '@/lib/styles';
import { ArtStyle } from '@/types';
import { Check, Search, ChevronDown } from 'lucide-react';

interface StyleSelectorProps {
  selectedStyle: ArtStyle | null;
  onSelectStyle: (style: ArtStyle) => void;
}

export default function StyleSelector({ selectedStyle, onSelectStyle }: StyleSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredStyles = useMemo(() => {
    let styles = activeCategory === 'all'
      ? artStyles
      : artStyles.filter(style => style.category === activeCategory);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      styles = styles.filter(style =>
        style.name.toLowerCase().includes(query) ||
        style.description.toLowerCase().includes(query)
      );
    }

    return styles;
  }, [activeCategory, searchQuery]);

  const handleSelectStyle = (style: ArtStyle) => {
    onSelectStyle(style);
    setIsExpanded(false);
    setSearchQuery('');
  };

  return (
    <div className="w-full">
      {/* Selected Style Button / Trigger */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full p-3 rounded-lg border text-left transition-all ${
          isExpanded
            ? 'border-accent bg-accent/10'
            : 'border-border bg-surface hover:border-accent/50'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {selectedStyle ? (
              <>
                <p className="font-medium text-foreground text-sm truncate">{selectedStyle.name}</p>
                <p className="text-xs text-muted truncate">{selectedStyle.description}</p>
              </>
            ) : (
              <>
                <p className="font-medium text-muted text-sm">Select a style</p>
                <p className="text-xs text-muted/60">Choose from {artStyles.length} art styles</p>
              </>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-muted ml-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Expanded Dropdown */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-lg border border-border bg-surface overflow-hidden">
              {/* Search Input */}
              <div className="p-2 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search styles..."
                    className="w-full pl-8 pr-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:border-accent text-foreground placeholder:text-muted"
                    autoFocus
                  />
                </div>
              </div>

              {/* Category Tabs */}
              <div className="flex gap-1 p-2 border-b border-border overflow-x-auto scrollbar-hide">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                      activeCategory === category.id
                        ? 'bg-accent text-background'
                        : 'bg-white/5 text-muted hover:text-foreground hover:bg-white/10'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              {/* Style List */}
              <div className="max-h-64 overflow-y-auto">
                {filteredStyles.length === 0 ? (
                  <div className="p-4 text-center text-muted text-sm">
                    No styles found
                  </div>
                ) : (
                  <div className="p-1">
                    {filteredStyles.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => handleSelectStyle(style)}
                        className={`w-full p-2.5 rounded-md text-left transition-colors flex items-start gap-2 ${
                          selectedStyle?.id === style.id
                            ? 'bg-accent/20 border border-accent/30'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm">{style.name}</p>
                          <p className="text-xs text-muted mt-0.5">{style.description}</p>
                        </div>
                        {selectedStyle?.id === style.id && (
                          <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-background" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
