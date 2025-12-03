'use client';

import { Sparkles } from 'lucide-react';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function PromptInput({ value, onChange, disabled }: PromptInputProps) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-muted mb-2">
        Custom Prompt <span className="text-muted/60">(optional)</span>
      </label>
      <div className="relative">
        <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Describe what you want to see... (e.g., 'a serene mountain lake at sunset')"
          className="input-field pl-12"
        />
      </div>
      <p className="text-xs text-muted/60 mt-2">
        Leave empty to let the AI create a beautiful composition in your chosen style
      </p>
    </div>
  );
}
