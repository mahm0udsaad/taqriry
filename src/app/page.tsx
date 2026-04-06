"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { PanelRight, RotateCcw } from "lucide-react";

import ReportLibrary from "@/components/report-library";
import ChatMessages from "@/components/chat-messages";
import { ChatInput } from "@/components/chat-input";
import { REPORTS } from "@/lib/reports";
import { cn } from "@/lib/cn";

export default function Home() {
  /* ─── state ─── */
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ─── transport with dynamic body ─── */
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { selectedReportIds },
      }),
    [selectedReportIds]
  );

  /* ─── Vercel AI SDK v6 ─── */
  const { messages, sendMessage, status, error, regenerate, addToolOutput } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const isLoading = status === "streaming" || status === "submitted";

  /* ─── send message ─── */
  const submitMessage = () => {
    if (!inputValue.trim() || isLoading) return;
    sendMessage({ text: inputValue });
    setInputValue("");
  };

  /* ─── suggested prompt → send immediately ─── */
  const handleSuggestedPrompt = (text: string) => {
    sendMessage({ text });
  };

  /* ─── remove report from selection ─── */
  const handleRemoveReport = (id: string) => {
    setSelectedReportIds((prev) => prev.filter((r) => r !== id));
  };

  /* ─── Cmd/Ctrl+K → focus input ─── */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  /* ─── selected reports data for ChatInput ─── */
  const selectedReportsData = REPORTS.filter((r) =>
    selectedReportIds.includes(r.id)
  ).map((r) => ({ id: r.id, title: r.title }));

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* ── Sidebar ── */}
      <ReportLibrary
        reports={REPORTS}
        selectedIds={selectedReportIds}
        onSelectionChange={setSelectedReportIds}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* ── Main chat area ── */}
      <main className="flex flex-1 flex-col min-w-0">
        {/* Mobile header */}
        <header className="flex items-center h-14 bg-surface border-b border-border px-4 md:hidden">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ms-2 rounded-[var(--radius-md)] text-fg-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
            aria-label="فتح مكتبة التقارير"
          >
            <PanelRight size={22} />
          </button>

          <h1 className="flex-1 text-center font-semibold text-lg text-fg">
            تقريرك
          </h1>

          {selectedReportIds.length > 0 && (
            <span className="min-w-6 h-6 rounded-full bg-fg text-white text-xs flex items-center justify-center">
              {selectedReportIds.length}
            </span>
          )}
        </header>

        {/* Messages */}
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          onSuggestedPrompt={handleSuggestedPrompt}
          addToolOutput={addToolOutput}
          onReportSelect={(reportIds) => setSelectedReportIds(reportIds)}
        />

        {/* Error bar */}
        {error && (
          <div className="mx-4 md:mx-auto md:max-w-3xl md:w-full md:px-8 mb-2">
            <div
              className={cn(
                "flex items-center gap-2 py-2 px-3",
                "bg-danger/5 border border-danger/20 text-danger text-sm",
                "rounded-[var(--radius-md)]"
              )}
            >
              <span className="flex-1">
                حدث خطأ. يرجى المحاولة مرة أخرى.
              </span>
              <button
                onClick={() => regenerate()}
                className="flex items-center gap-1 text-xs font-medium hover:underline cursor-pointer"
              >
                <RotateCcw size={12} />
                إعادة المحاولة
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={submitMessage}
          isLoading={isLoading}
          selectedReports={selectedReportsData}
          onRemoveReport={handleRemoveReport}
        />
      </main>
    </div>
  );
}
