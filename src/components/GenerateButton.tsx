'use client';

import { motion } from 'framer-motion';
import { Wand2, Plus } from 'lucide-react';

interface GenerateButtonProps {
  onClick: () => void;
  queueCount: number;
  maxQueue: number;
  disabled: boolean;
}

export default function GenerateButton({ onClick, queueCount, maxQueue, disabled }: GenerateButtonProps) {
  const isQueueFull = queueCount >= maxQueue;
  const hasActiveGenerations = queueCount > 0;

  return (
    <div className="space-y-2">
      <motion.button
        whileHover={!disabled && !isQueueFull ? { scale: 1.02 } : {}}
        whileTap={!disabled && !isQueueFull ? { scale: 0.98 } : {}}
        onClick={onClick}
        disabled={disabled || isQueueFull}
        className="btn-primary flex items-center justify-center gap-2 min-w-[200px]"
      >
        {hasActiveGenerations ? (
          <>
            <Plus className="w-5 h-5" />
            <span>Queue Another</span>
          </>
        ) : (
          <>
            <Wand2 className="w-5 h-5" />
            <span>Generate Artwork</span>
          </>
        )}
      </motion.button>
      {hasActiveGenerations && (
        <p className="text-xs text-muted text-center">
          {queueCount} of {maxQueue} generating
        </p>
      )}
    </div>
  );
}
