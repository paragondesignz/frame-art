'use client';

import { motion } from 'framer-motion';
import { Wand2, Loader2 } from 'lucide-react';

interface GenerateButtonProps {
  onClick: () => void;
  isLoading: boolean;
  disabled: boolean;
}

export default function GenerateButton({ onClick, isLoading, disabled }: GenerateButtonProps) {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      onClick={onClick}
      disabled={disabled || isLoading}
      className="btn-primary flex items-center justify-center gap-2 min-w-[200px]"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Generating...</span>
        </>
      ) : (
        <>
          <Wand2 className="w-5 h-5" />
          <span>Generate Artwork</span>
        </>
      )}
    </motion.button>
  );
}
