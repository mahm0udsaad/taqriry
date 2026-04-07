"use client";

import { useEffect, useRef } from "react";
import { Check, FileText, Upload, X } from "lucide-react";
import type { Report } from "@/lib/reports";
import { cn } from "@/lib/cn";

/* ─────────────────────────────────────────────
   Props
   ───────────────────────────────────────────── */
interface ReportLibraryProps {
  reports: Report[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  /** Controls the mobile bottom-sheet visibility */
  isOpen: boolean;
  onClose: () => void;
}

/* ─────────────────────────────────────────────
   Checkbox (custom 20x20)
   ───────────────────────────────────────────── */
function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        "h-5 w-5 rounded-[var(--radius-sm)] border-2 transition-colors duration-150",
        checked
          ? "border-fg bg-fg"
          : "border-border-strong bg-surface",
      )}
      aria-hidden="true"
    >
      {checked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Report Card
   ───────────────────────────────────────────── */
function ReportCard({
  report,
  selected,
  onToggle,
}: {
  report: Report;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      role="option"
      aria-selected={selected}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className={cn(
        "cursor-pointer rounded-[var(--radius-md)] p-3 transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
        selected
          ? "border-s-2 border-accent bg-accent-soft/40"
          : "hover:bg-surface-2",
      )}
    >
      {/* Row: checkbox + icon + title */}
      <div className="flex items-start gap-3">
        <Checkbox checked={selected} />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {/* Title row */}
          <div className="flex items-center gap-1.5">
            <FileText className="h-5 w-5 shrink-0 text-fg-subtle" />
            <span className="text-[15px] font-medium text-fg truncate">
              {report.title}
            </span>
          </div>

          {/* Subtitle */}
          <span className="text-[13px] text-fg-muted">{report.subtitle}</span>

          {/* Tags */}
          {report.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {report.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-fg-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Size */}
          <span className="text-xs text-fg-subtle">
            {report.sizeMb} MB
            {report.pages != null && ` \u00B7 ${report.pages} صفحة`}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Shared report list
   ───────────────────────────────────────────── */
function ReportList({
  reports,
  selectedIds,
  onToggle,
}: {
  reports: Report[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div
      role="listbox"
      aria-label="\u0645\u0643\u062A\u0628\u0629 \u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631"
      aria-multiselectable="true"
      className="flex flex-1 flex-col gap-2 overflow-y-auto p-4"
    >
      {reports.map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          selected={selectedIds.includes(report.id)}
          onToggle={() => onToggle(report.id)}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Upload button (disabled / coming soon)
   ───────────────────────────────────────────── */
function UploadButton() {
  return (
    <div className="border-t border-border p-4">
      <button
        disabled
        title="\u0642\u0631\u064A\u0628\u0627\u064B"
        className={cn(
          "flex w-full items-center justify-center gap-2",
          "rounded-[var(--radius-md)] border border-border px-4 py-2.5",
          "text-sm font-medium text-fg-muted opacity-50",
          "cursor-not-allowed",
        )}
      >
        <Upload className="h-4 w-4" />
        <span>{"\u0631\u0641\u0639 \u062A\u0642\u0631\u064A\u0631 \u062C\u062F\u064A\u062F"}</span>
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main export
   ───────────────────────────────────────────── */
export default function ReportLibrary({
  reports,
  selectedIds,
  onSelectionChange,
  isOpen,
  onClose,
}: ReportLibraryProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  /* Toggle helper */
  function toggle(id: string) {
    onSelectionChange(
      selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id],
    );
  }

  /* Close mobile sheet on Escape */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  return (
    <>
      {/* ── Desktop sidebar (>= md) ── */}
      <aside className="hidden md:flex md:w-80 md:shrink-0 md:flex-col md:border-e md:border-border md:bg-surface md:h-dvh">
        {/* Header */}
        <div className="p-5">
          <h1 className="text-xl font-bold text-fg">
            {"\u062A\u0642\u0631\u064A\u0631\u064A"}
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            {"\u0645\u062D\u0627\u062F\u062B\u0629 \u0630\u0643\u064A\u0629 \u0645\u0639 \u062A\u0642\u0627\u0631\u064A\u0631\u064A"}
          </p>
        </div>

        {/* Divider */}
        <div className="border-b border-border" />

        {/* Report list */}
        <ReportList
          reports={reports}
          selectedIds={selectedIds}
          onToggle={toggle}
        />

        {/* Upload CTA */}
        <UploadButton />
      </aside>

      {/* ── Mobile bottom-sheet (< md) ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <div
            ref={panelRef}
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 flex max-h-[70dvh] flex-col",
              "rounded-t-[var(--radius-xl)] bg-surface",
              "transition-transform duration-300 ease-out",
              isOpen ? "translate-y-0" : "translate-y-full",
            )}
            role="dialog"
            aria-label="\u0645\u0643\u062A\u0628\u0629 \u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631"
          >
            {/* Drag handle */}
            <div className="flex justify-center">
              <span className="my-3 h-1 w-10 rounded-full bg-border-strong" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3">
              <span className="font-semibold text-fg">
                {"\u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631"}
              </span>
              <button
                onClick={onClose}
                className="rounded-[var(--radius-sm)] p-1 text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
                aria-label="\u0625\u063A\u0644\u0627\u0642"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Report list */}
            <ReportList
              reports={reports}
              selectedIds={selectedIds}
              onToggle={toggle}
            />
          </div>
        </div>
      )}
    </>
  );
}
