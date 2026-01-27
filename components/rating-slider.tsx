'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface RatingSliderProps {
  label: string;
  description?: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

const scoreLabels: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Excellent',
};

const scoreColors: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-yellow-500',
  3: 'bg-blue-500',
  4: 'bg-green-500',
};

export function RatingSlider({ label, description, value, onChange }: RatingSliderProps) {
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);

  const displayValue = hoveredValue ?? value;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium">{label}</span>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {displayValue && (
          <span className={cn(
            'text-sm font-medium px-2 py-1 rounded',
            scoreColors[displayValue],
            'text-white'
          )}>
            {displayValue} - {scoreLabels[displayValue]}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(value === score ? undefined : score)}
            onMouseEnter={() => setHoveredValue(score)}
            onMouseLeave={() => setHoveredValue(null)}
            className={cn(
              'flex-1 h-12 rounded-md border-2 transition-all duration-200',
              'flex items-center justify-center font-medium',
              value === score
                ? cn(scoreColors[score], 'text-white border-transparent')
                : 'bg-muted/50 hover:bg-muted border-transparent',
              hoveredValue === score && value !== score && 'ring-2 ring-offset-2 ring-primary'
            )}
          >
            {score}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>Poor</span>
        <span>Fair</span>
        <span>Good</span>
        <span>Excellent</span>
      </div>
    </div>
  );
}
