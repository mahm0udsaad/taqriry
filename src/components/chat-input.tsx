"use client";

import { useRef, useCallback, type KeyboardEvent } from "react";
import { FileText, X, ArrowUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  selectedReports: { id: string; title: string }[];
  onRemoveReport: (id: string) => void;
  disabled?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  selectedReports,
  onRemoveReport,
  disabled,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSubmit = value.trim().length > 0 && !isLoading;

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 44), 160)}px`;
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      autoResize();
    },
    [onChange, autoResize],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (canSubmit) onSubmit();
      }
    },
    [canSubmit, onSubmit],
  );

  return (
    <div className="bg-bg border-t border-border">
      <div
        role="form"
        className="max-w-3xl mx-auto w-full py-3 px-4 md:px-8"
      >
        {/* Selected report chips */}
        {selectedReports.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedReports.map((report) => (
              <span
                key={report.id}
                className="inline-flex items-center gap-1.5 bg-surface-2 text-fg-muted text-xs rounded-full py-1 px-3"
              >
                <FileText className="shrink-0" size={12} />
                <span>
                  {report.title.length > 20
                    ? `${report.title.slice(0, 20)}...`
                    : report.title}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveReport(report.id)}
                  className="cursor-pointer hover:text-fg transition-colors duration-150"
                  aria-label={`إزالة ${report.title}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Input wrapper */}
        <div className="bg-surface border border-border rounded-[var(--radius-lg)] relative flex items-end focus-within:border-fg transition-all duration-150">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            dir="auto"
            rows={1}
            placeholder="اسال عن تقاريرك..."
            aria-label="اكتب رسالتك"
            className={cn(
              "w-full resize-none bg-transparent border-none outline-none",
              "py-3 ps-4 pe-14",
              "text-[15px] leading-relaxed text-fg placeholder:text-fg-subtle",
            )}
            style={{ minHeight: 44, maxHeight: 160 }}
          />

          {/* Send button */}
          <button
            type="button"
            onClick={canSubmit ? onSubmit : undefined}
            disabled={!canSubmit}
            aria-label="ارسل رسالتك"
            className={cn(
              "absolute end-2 bottom-2",
              "w-9 h-9 rounded-full bg-fg text-white flex items-center justify-center",
              "transition-all duration-150",
              canSubmit
                ? "cursor-pointer hover:bg-fg/80"
                : "opacity-30 cursor-not-allowed",
            )}
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <ArrowUp size={18} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
