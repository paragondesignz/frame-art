'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { artStyles, categories } from '@/lib/styles';
import { ArtStyle } from '@/types';
import { Check } from 'lucide-react';

interface StyleSelectorProps {
  selectedStyle: ArtStyle | null;
  onSelectStyle: (style: ArtStyle) => void;
}

export default function StyleSelector({ selectedStyle, onSelectStyle }: StyleSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredStyles = activeCategory === 'all'
    ? artStyles
    : artStyles.filter(style => style.category === activeCategory);

  return (
    <div className="w-full">
      {/* Category Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`category-tab ${activeCategory === category.id ? 'active' : ''}`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Style Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        <AnimatePresence mode="popLayout">
          {filteredStyles.map((style, index) => (
            <motion.button
              key={style.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, delay: index * 0.02 }}
              onClick={() => onSelectStyle(style)}
              className={`style-card text-left relative ${
                selectedStyle?.id === style.id ? 'selected' : ''
              }`}
            >
              {selectedStyle?.id === style.id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-5 h-5 bg-accent rounded-full flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-background" />
                </motion.div>
              )}
              <h3 className="font-medium text-foreground text-sm mb-1 pr-6">
                {style.name}
              </h3>
              <p className="text-xs text-muted line-clamp-2">
                {style.description}
              </p>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
