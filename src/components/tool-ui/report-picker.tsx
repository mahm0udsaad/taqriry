"use client";

import { useState } from "react";
import { REPORTS } from "@/lib/reports";
import { cn } from "@/lib/cn";
import { Check, FileText } from "lucide-react";

interface ReportPickerProps {
  prompt: string;
  onSelect: (reportIds: string[]) => void;
  disabled?: boolean;
}

export function ReportPicker({ prompt, onSelect, disabled }: ReportPickerProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const toggle = (id: string) => {
    if (submitted || disabled) return;
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    if (selected.length === 0 || submitted || disabled) return;
    setSubmitted(true);
    onSelect(selected);
  };

  return (
    <div className="flex flex-col gap-3 mt-1">
      <p className="text-sm text-fg-muted">{prompt}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {REPORTS.map((report) => {
          const isSelected = selected.includes(report.id);
          return (
            <button
              key={report.id}
              type="button"
              onClick={() => toggle(report.id)}
              disabled={submitted || disabled}
              className={cn(
                "flex items-start gap-3 p-3 rounded-[var(--radius-md)] border text-start transition-all",
                "disabled:opacity-60 disabled:cursor-not-allowed",
                isSelected
                  ? "border-accent bg-accent/5 text-fg"
                  : "border-border bg-surface hover:border-border-strong hover:bg-surface-2 text-fg cursor-pointer"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors",
                  isSelected
                    ? "border-accent bg-accent"
                    : "border-border-strong"
                )}
              >
                {isSelected && <Check size={10} className="text-white" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug">{report.title}</p>
                <p className="text-xs text-fg-muted mt-0.5 truncate">
                  {report.year} · {report.sizeMb} MB
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {!submitted && (
        <button
          type="button"
          onClick={handleConfirm}
          disabled={selected.length === 0 || disabled}
          className={cn(
            "self-start flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)]",
            "text-sm font-medium transition-all",
            selected.length > 0
              ? "bg-fg text-white hover:bg-fg/90 cursor-pointer"
              : "bg-surface-2 text-fg-muted cursor-not-allowed"
          )}
        >
          <FileText size={14} />
          {selected.length === 0
            ? "اختر تقريراً"
            : selected.length === 1
            ? "تحليل التقرير"
            : `تحليل ${selected.length} تقارير`}
        </button>
      )}

      {submitted && (
        <p className="text-xs text-fg-muted flex items-center gap-1.5">
          <Check size={12} className="text-accent" />
          تم الاختيار — جاري تحليل التقرير...
        </p>
      )}
    </div>
  );
}
