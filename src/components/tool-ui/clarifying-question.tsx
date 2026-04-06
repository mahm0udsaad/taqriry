"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Check } from "lucide-react";

interface Option {
  label: string;
  value: string;
}

interface ClarifyingQuestionProps {
  question: string;
  options: Option[];
  onSelect: (option: Option) => void;
  disabled?: boolean;
}

export function ClarifyingQuestion({
  question,
  options,
  onSelect,
  disabled,
}: ClarifyingQuestionProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (option: Option) => {
    if (selected || disabled) return;
    setSelected(option.value);
    onSelect(option);
  };

  return (
    <div className="flex flex-col gap-3 mt-1">
      <p className="text-sm text-fg">{question}</p>

      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected === option.value;
          const isDisabled = !!selected || !!disabled;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option)}
              disabled={isDisabled}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all",
                isSelected
                  ? "border-accent bg-accent/10 text-accent font-medium"
                  : isDisabled
                  ? "border-border text-fg-subtle opacity-50 cursor-not-allowed"
                  : "border-border text-fg hover:border-border-strong hover:bg-surface-2 cursor-pointer"
              )}
            >
              {isSelected && <Check size={12} />}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
