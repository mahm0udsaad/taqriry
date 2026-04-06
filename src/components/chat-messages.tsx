"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { UIMessage } from "ai";
import Markdown from "react-markdown";
import {
  Sparkles,
  Copy,
  Check,
  ListChecks,
  Hash,
  GitCompareArrows,
  Lightbulb,
  FileSearch,
  MessageSquare,
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

/* ────────── loading steps ────────── */

const LOADING_STEPS = [
  { icon: FileSearch, text: "جاري قراءة التقارير...", duration: 2000 },
  { icon: Sparkles, text: "جاري تحليل المحتوى...", duration: 4000 },
  { icon: MessageSquare, text: "جاري إعداد الإجابة...", duration: 0 },
];

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
          <h2 className="text-3xl font-bold text-fg">تقريرك</h2>
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
      <div className="max-w-3xl mx-auto w-full py-6 px-4 md:px-8 flex flex-col gap-6">
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

        {showTyping && <LoadingSteps />}
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
        "msg-in self-end max-w-[85%]",
        "bg-fg text-white",
        "rounded-[var(--radius-lg)] rounded-ee-[var(--radius-sm)]",
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
        "msg-in self-start w-full max-w-[90%]",
        "bg-surface border border-border",
        "rounded-[var(--radius-lg)] rounded-es-[var(--radius-sm)]",
        "py-4 px-5 overflow-hidden"
      )}
    >
      {/* header */}
      <div className="flex items-center">
        <Sparkles size={16} className="text-accent" />
        <span className="text-xs text-fg-subtle ms-1.5">تقريرك</span>
      </div>

      {/* parts */}
      <div className="mt-3 flex flex-col gap-3">
        {message.parts.map((part, idx) => {
          /* text part */
          if (part.type === "text") {
            return (
              <div key={idx} className="prose-msg overflow-hidden">
                <Markdown>{part.text}</Markdown>
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
        <div className="flex justify-end mt-3 pt-2 border-t border-border/50">
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

/* ────────── loading steps indicator ────────── */

function LoadingSteps() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;

    LOADING_STEPS.forEach((step, index) => {
      if (index === 0) return;
      elapsed += LOADING_STEPS[index - 1].duration;
      const timer = setTimeout(() => {
        setCurrentStep(index);
      }, elapsed);
      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      className={cn(
        "msg-in self-start max-w-[90%]",
        "bg-surface border border-border",
        "rounded-[var(--radius-lg)] rounded-es-[var(--radius-sm)]",
        "py-4 px-5"
      )}
    >
      <div className="flex items-center">
        <Sparkles size={16} className="text-accent" />
        <span className="text-xs text-fg-subtle ms-1.5">تقريرك</span>
      </div>

      <div className="flex flex-col gap-3 mt-3">
        {LOADING_STEPS.map((step, index) => {
          const isActive = index === currentStep;
          const isDone = index < currentStep;
          const isPending = index > currentStep;

          return (
            <div
              key={step.text}
              className={cn(
                "flex items-center gap-3 transition-all duration-300",
                isPending && "opacity-0 translate-y-1",
                isDone && "opacity-50",
                isActive && "opacity-100"
              )}
            >
              {isDone ? (
                <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <Check size={12} className="text-accent" />
                </div>
              ) : isActive ? (
                <Loader2
                  size={18}
                  className="text-accent animate-spin shrink-0"
                />
              ) : (
                <div className="w-5 h-5 shrink-0" />
              )}
              <span
                className={cn(
                  "text-sm",
                  isActive ? "text-fg" : "text-fg-muted"
                )}
              >
                {step.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
