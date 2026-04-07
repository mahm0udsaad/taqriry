"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { UIMessage } from "ai";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sparkles,
  Copy,
  Check,
  ListChecks,
  Hash,
  GitCompareArrows,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { ReportPicker } from "@/components/tool-ui/report-picker";
import { ClarifyingQuestion } from "@/components/tool-ui/clarifying-question";

/* ────────── helpers ────────── */

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

/* ────────── types ────────── */

type AddToolOutput = (options: { tool: string; toolCallId: string; output: unknown }) => void;

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading: boolean;
  onSuggestedPrompt: (text: string) => void;
  addToolOutput: AddToolOutput;
  onReportSelect: (reportIds: string[]) => void;
}

/* ────────── suggested prompts ────────── */

const SUGGESTED_PROMPTS = [
  { icon: ListChecks, text: "لخص التقرير في 5 نقاط رئيسية" },
  { icon: Hash, text: "استخرج أهم الأرقام والإحصائيات" },
  { icon: GitCompareArrows, text: "قارن بين التقريرين" },
  { icon: Lightbulb, text: "ما أبرز التوصيات؟" },
] as const;

/* ────────── skeleton line widths ────────── */

const SKELETON_LINES = ["100%", "92%", "78%", "85%", "60%"] as const;

/* ────────── component ────────── */

export default function ChatMessages({
  messages,
  isLoading,
  onSuggestedPrompt,
  addToolOutput,
  onReportSelect,
}: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  /* ── auto-scroll ── */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length, messages]);

  /* ── copy handler ── */
  const handleCopy = useCallback((id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  /* ── empty state ── */
  if (messages.length === 0) {
    return (
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto flex items-center justify-center"
        aria-live="polite"
        aria-label="المحادثة"
      >
        <div className="flex flex-col items-center text-center px-4">
          <h2 className="text-3xl font-bold text-fg">تقريري</h2>
          <p className="text-fg-muted text-base mt-2">
            اسأل، لخّص، قارِن — اكتشف تقاريرك بذكاء
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 max-w-lg w-full">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt.text}
                type="button"
                onClick={() => onSuggestedPrompt(prompt.text)}
                className={cn(
                  "bg-surface border border-border rounded-[var(--radius-md)]",
                  "py-3 px-4 flex items-center gap-3",
                  "hover:bg-surface-2 hover:border-border-strong",
                  "cursor-pointer transition-colors"
                )}
              >
                <prompt.icon size={18} className="text-accent shrink-0" />
                <span className="text-sm text-fg text-start">
                  {prompt.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── messages list ── */
  const showTyping =
    isLoading && messages[messages.length - 1]?.role === "user";

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto"
      aria-live="polite"
      aria-label="المحادثة"
    >
      <div className="max-w-3xl mx-auto w-full py-6 px-4 md:px-8 flex flex-col gap-8">
        {messages.map((message) =>
          message.role === "user" ? (
            <UserBubble key={message.id} message={message} />
          ) : message.role === "assistant" ? (
            <AssistantBubble
              key={message.id}
              message={message}
              copiedId={copiedId}
              onCopy={handleCopy}
              isStreaming={
                isLoading &&
                message.id === messages[messages.length - 1]?.id
              }
              addToolOutput={addToolOutput}
              onReportSelect={onReportSelect}
            />
          ) : null
        )}

        {showTyping && <SkeletonLoader />}
      </div>
    </div>
  );
}

/* ────────── user bubble ────────── */

function UserBubble({ message }: { message: UIMessage }) {
  const text = getMessageText(message);
  return (
    <div
      className={cn(
        "user-msg-in self-start max-w-[85%]",
        "bg-fg text-white",
        "rounded-[var(--radius-lg)] rounded-es-[var(--radius-sm)]",
        "py-3 px-4 text-[15px] leading-relaxed"
      )}
    >
      {text}
    </div>
  );
}

/* ────────── assistant bubble ────────── */

function AssistantBubble({
  message,
  copiedId,
  onCopy,
  isStreaming,
  addToolOutput,
  onReportSelect,
}: {
  message: UIMessage;
  copiedId: string | null;
  onCopy: (id: string, content: string) => void;
  isStreaming: boolean;
  addToolOutput: AddToolOutput;
  onReportSelect: (reportIds: string[]) => void;
}) {
  const text = getMessageText(message);
  const isCopied = copiedId === message.id;

  // Check if this message has any tool parts to show
  const hasContent =
    text.length > 0 ||
    message.parts.some((p) => p.type.startsWith("tool-"));

  if (!hasContent) return null;

  return (
    <div
      className={cn(
        "msg-in w-full",
        "overflow-hidden"
      )}
    >
      {/* header — subtle label */}
      <div className="flex items-center gap-1.5 mb-3">
        <Sparkles size={14} className="text-accent" />
        <span className="text-xs font-medium text-fg-subtle">تقريري</span>
      </div>

      {/* parts */}
      <div className="flex flex-col gap-3">
        {message.parts.map((part, idx) => {
          /* text part */
          if (part.type === "text") {
            return (
              <div key={idx} className="prose-msg overflow-hidden">
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ children }) => (
                      <div className="table-wrapper">
                        <table>{children}</table>
                      </div>
                    ),
                  }}
                >
                  {part.text}
                </Markdown>
              </div>
            );
          }

          /* showReportPicker tool */
          if (part.type === "tool-showReportPicker") {
            const toolPart = part as {
              type: string;
              toolCallId: string;
              state: string;
              input?: { prompt: string };
            };
            if (toolPart.state === "input-available" && toolPart.input) {
              return (
                <ReportPicker
                  key={idx}
                  prompt={toolPart.input.prompt}
                  onSelect={(reportIds) => {
                    addToolOutput({
                      tool: "showReportPicker",
                      toolCallId: toolPart.toolCallId,
                      output: { selectedReportIds: reportIds },
                    });
                    onReportSelect(reportIds);
                  }}
                />
              );
            }
            if (toolPart.state === "output-available") {
              return (
                <p key={idx} className="text-xs text-fg-muted flex items-center gap-1.5">
                  <Check size={12} className="text-accent" />
                  تم اختيار التقارير
                </p>
              );
            }
            return null;
          }

          /* askClarifyingQuestion tool */
          if (part.type === "tool-askClarifyingQuestion") {
            const toolPart = part as {
              type: string;
              toolCallId: string;
              state: string;
              input?: { question: string; options: { label: string; value: string }[] };
            };
            if (toolPart.state === "input-available" && toolPart.input) {
              return (
                <ClarifyingQuestion
                  key={idx}
                  question={toolPart.input.question}
                  options={toolPart.input.options}
                  onSelect={(option) => {
                    addToolOutput({
                      tool: "askClarifyingQuestion",
                      toolCallId: toolPart.toolCallId,
                      output: { selectedOption: option },
                    });
                  }}
                />
              );
            }
            if (toolPart.state === "output-available") {
              return (
                <p key={idx} className="text-xs text-fg-muted flex items-center gap-1.5">
                  <Check size={12} className="text-accent" />
                  تم تحديد الخيار
                </p>
              );
            }
            return null;
          }

          /* fetchReportContent tool — show subtle loading indicator */
          if (part.type === "tool-fetchReportContent") {
            const toolPart = part as { type: string; state: string };
            if (
              toolPart.state === "input-streaming" ||
              toolPart.state === "input-available"
            ) {
              return (
                <p key={idx} className="text-xs text-fg-muted flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin text-accent" />
                  جاري تحميل محتوى التقرير...
                </p>
              );
            }
            return null; // transparent once content is fetched
          }

          return null;
        })}
      </div>

      {/* streaming cursor */}
      {isStreaming && (
        <span className="inline-block w-1.5 h-4 bg-accent/60 animate-pulse rounded-full ms-0.5 align-text-bottom" />
      )}

      {/* copy button — only for text responses */}
      {!isStreaming && text.length > 0 && (
        <div className="flex justify-start mt-2">
          <button
            type="button"
            aria-label="نسخ"
            onClick={() => onCopy(message.id, text)}
            className="flex items-center gap-1.5 text-xs text-fg-subtle hover:text-fg p-1.5 rounded-[var(--radius-sm)] hover:bg-surface-2 transition-colors cursor-pointer"
          >
            {isCopied ? (
              <>
                <Check size={13} className="text-accent" />
                <span className="text-accent">تم النسخ</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>نسخ</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

/* ────────── skeleton text loader ────────── */

function SkeletonLoader() {
  const [showLongWait, setShowLongWait] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowLongWait(true), 12000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="msg-in w-full" aria-busy="true" aria-label="جاري التحميل">
      <div className="flex items-center gap-1.5 mb-3">
        <Sparkles size={14} className="text-accent" />
        <span className="text-xs font-medium text-fg-subtle">تقريري</span>
      </div>

      <div className="flex flex-col gap-2.5">
        {SKELETON_LINES.map((width, i) => (
          <div
            key={i}
            className="h-[14px] rounded-[var(--radius-sm)] bg-border/60 skeleton-shimmer"
            style={{
              width,
              animationDelay: `${i * 120}ms`,
            }}
          />
        ))}
      </div>

      {/* Long wait message */}
      {showLongWait && (
        <p className="mt-4 text-xs text-fg-subtle msg-in">
          نعتذر عن التأخير — جاري تحليل محتوى التقارير. قد يستغرق الأمر بضع ثوانٍ إضافية...
        </p>
      )}
    </div>
  );
}
