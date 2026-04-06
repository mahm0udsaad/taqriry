# Taqriry — Parallel Agent Execution Plan

## Dependency Graph

```
Phase 1: [1.1] → [1.2] → [1.3]          (sequential — each depends on previous)
Phase 2: [2.1] + [2.2] + [2.3]           (parallel — all independent)
Phase 3: [3.1]                            (needs Phase 1 + 2 done)
Phase 4: [4.1] → [4.2] → [4.3]          (sequential polish)

Optimal execution:
  Round 1: [1.1]
  Round 2: [1.2]
  Round 3: [1.3] + [2.1] + [2.2] + [2.3]   ← 4 agents parallel
  Round 4: [3.1]
  Round 5: [4.1]
  Round 6: [4.2] + [4.3]                    ← 2 agents parallel
```

---

## Shared Context Block

> Copy this into every agent prompt prefix.

```
PROJECT: تقريرك (Taqriry) — AI report analysis SaaS MVP demo
DIR: /Users/mahmoudmac/Documents/Projects/taqriry
NODE: Always run `export PATH="/usr/local/bin:$PATH"` before any node/pnpm/npm command
STACK: Next.js 16.2.2 (App Router) | TypeScript strict | Tailwind CSS v4 | Vercel AI SDK 6 | @ai-sdk/google | @google/genai | Lucide React icons
LANG: Arabic RTL. html lang="ar" dir="rtl". All UI strings in Arabic. Code/vars in English.
FONT: IBM Plex Sans Arabic (loaded via next/font/google, variable --font-plex-arabic)
DESIGN: Editorial minimalism. Warm stone neutrals. NO gradients, glassmorphism, glow, colored shadows.

DESIGN TOKENS (defined in src/app/globals.css — use these, NOT raw Tailwind colors):
  Surfaces: bg-bg(#fafaf9) bg-surface(#fff) bg-surface-2(#f5f5f4)
  Text: text-fg(#0c0a09) text-fg-muted(#57534e) text-fg-subtle(#a8a29e)
  Borders: border-border(#e7e5e4) border-border-strong(#d6d3d1)
  Accent: text-accent(#b45309) bg-accent-soft(#fef3c7) — data highlights only, never CTA
  Semantic: text-success(#15803d) text-danger(#b91c1c)
  Radii: --radius-sm(6px) --radius-md(10px) --radius-lg(14px) --radius-xl(20px) --radius-full(999px)
  Shadows: --shadow-sm --shadow-md
  CTA button: bg-fg text-white (black bg, white text). Secondary: border border-border text-fg.

RTL RULES: Use logical properties only (ps/pe/ms/me/start/end/inline/block). Never pl/pr/ml/mr/left/right/rounded-tl etc.
ICONS: Lucide React only. Never emoji as icons. Import from 'lucide-react'.
A11Y: WCAG AA contrast, aria-labels in Arabic, keyboard nav, focus-visible rings.
STATES: Every component must handle loading/empty/error/success.

EXISTING FILES:
  src/app/globals.css — design tokens, prose-msg styles, typing-dot animation, msg-in animation
  src/app/layout.tsx — RTL html, IBM Plex Arabic, metadata in Arabic
  src/lib/cn.ts — clsx + tailwind-merge utility: import { cn } from "@/lib/cn"
  src/lib/reports.ts — Report type, REPORTS array [{id,title,subtitle,path,sizeMb,year,tags}], getReport(), getReports()
  public/reports/annual-2023.pdf (7.4MB), public/reports/taqriry-1444.pdf (15MB)

ENV VARS (for .env.local):
  GEMINI_API_KEY=AIzaSyB5aW28h5lVeQ_1rkbYG90hstsLzJPoqko
  GEMINI_MODEL=gemini-2.5-flash
```

---

## Task 1.1 — Environment & Config

**Agent type:** general-purpose
**Creates:** .env.local, .env.example, updated next.config.ts, .claude/launch.json
**Prompt:**

```
[SHARED CONTEXT]

Do these steps:

1. Create .env.local at project root:
GEMINI_API_KEY=AIzaSyB5aW28h5lVeQ_1rkbYG90hstsLzJPoqko
GEMINI_MODEL=gemini-2.5-flash
NEXT_PUBLIC_APP_NAME=تقريرك
NEXT_PUBLIC_APP_URL=http://localhost:3000

2. Create .env.example (same keys, placeholder values).

3. Update next.config.ts:
- Add serverExternalPackages: ["@google/genai"] in the config
- That's it. Keep it minimal.

4. Create .claude/launch.json:
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "dev",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["dev"],
      "port": 3000
    }
  ]
}

5. Verify build: run `export PATH="/usr/local/bin:$PATH" && pnpm dev` briefly to confirm no errors, then stop.

Done when: .env.local exists, pnpm dev starts clean.
```

---

## Task 1.2 — Gemini File Upload Helper + AI Provider

**Agent type:** general-purpose
**Creates:** src/lib/gemini.ts
**Depends on:** 1.1
**Prompt:**

```
[SHARED CONTEXT]

Create src/lib/gemini.ts — the core AI infrastructure:

Requirements:
- Server-only file (add "use server" or just keep it server-side by only importing in API routes)
- Uses @google/genai for PDF upload to Gemini Files API
- Uses @ai-sdk/google for the Vercel AI SDK provider
- In-memory Map cache so PDFs upload once, reuse URI forever in same process

Implement these exports:

1. `google` — Vercel AI SDK Google provider:
   import { createGoogleGenerativeAI } from "@ai-sdk/google"
   export const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY! })

2. `geminiModel` — the model instance:
   export const geminiModel = google(process.env.GEMINI_MODEL || "gemini-2.5-flash")

3. `uploadReportToGemini(reportId: string): Promise<string>` — uploads one PDF:
   - Check fileCache Map first, return if hit
   - Get report from getReport(reportId), throw if not found
   - Read PDF from: path.join(process.cwd(), "public", report.path)
   - Upload via: new GoogleGenAI({ apiKey }).files.upload({ file: absolutePath, config: { mimeType: "application/pdf", displayName: report.title } })
   - Wait for file to be ACTIVE (poll file.state if needed — Gemini files can be PROCESSING briefly)
   - Cache the file.uri and return it

4. `getGeminiFileUris(reportIds: string[]): Promise<string[]>` — uploads multiple in parallel:
   - return Promise.all(reportIds.map(uploadReportToGemini))

5. `SYSTEM_PROMPT` — exported string constant:
أنت مساعد ذكي متخصص في تحليل التقارير باللغة العربية. اسمك "تقريرك".

مهامك الأساسية:
- الإجابة عن أي سؤال يتعلق بالتقارير المرفقة بدقة عالية
- تلخيص التقارير واستخراج النقاط الرئيسية
- مقارنة عدة تقارير واستخراج أوجه التشابه والاختلاف
- استخراج الأرقام والإحصائيات والبيانات المهمة
- تحليل الاتجاهات والأنماط في البيانات

قواعد الاستجابة:
- أجب دائماً باللغة العربية الفصحى الواضحة
- استخدم التنسيق المناسب (عناوين، قوائم، جداول) لتنظيم إجاباتك
- عند ذكر أرقام أو إحصائيات، اذكر مصدرها من التقرير
- إذا لم تجد المعلومة في التقارير المرفقة، قل ذلك بوضوح
- كن موجزاً ودقيقاً، وتجنب التكرار
- عند المقارنة، استخدم جداول أو قوائم منظمة

TypeScript strict. No 'any'. Proper error handling with Arabic error messages in thrown errors.
```

---

## Task 1.3 — Chat API Route

**Agent type:** general-purpose
**Creates:** src/app/api/chat/route.ts
**Depends on:** 1.2
**Prompt:**

```
[SHARED CONTEXT]

Read src/lib/gemini.ts first to understand the exports (geminiModel, getGeminiFileUris, SYSTEM_PROMPT).

Create src/app/api/chat/route.ts — streaming chat endpoint:

export const maxDuration = 60;
export const runtime = "nodejs";

POST handler:
1. Parse request body. Vercel AI SDK useChat sends { messages, ...body }. We pass reportIds via the body option in useChat, so extract it:
   const { messages, reportIds } = await req.json()

2. Validate reportIds is a non-empty string array. If empty, return Response with status 400 and Arabic error.

3. Call getGeminiFileUris(reportIds) to get cached/uploaded file URIs.

4. Use streamText() from 'ai' package:
   import { streamText } from "ai"

   const result = streamText({
     model: geminiModel,
     system: SYSTEM_PROMPT,
     messages: [
       // First: inject the PDF files as a user message with file parts
       {
         role: "user",
         content: fileUris.map(uri => ({
           type: "file" as const,
           data: uri,
           mimeType: "application/pdf",
         })),
       },
       // Then: a brief assistant ack so the model knows files are loaded
       {
         role: "assistant",
         content: "تم استلام التقارير. أنا جاهز للإجابة عن أسئلتك.",
       },
       // Then: the actual conversation messages
       ...messages,
     ],
   });

   return result.toDataStreamResponse();

5. Wrap everything in try/catch. On error:
   console.error("Chat API error:", error)
   return new Response(JSON.stringify({ error: "حدث خطأ في معالجة طلبك. يرجى المحاولة مرة أخرى." }), { status: 500, headers: { "Content-Type": "application/json" } })

IMPORTANT: If the file/data approach doesn't work with @ai-sdk/google for pre-uploaded Gemini files, check the @ai-sdk/google docs. The alternative is using google.generativeModel with providerOptions to pass fileData. Read the actual @ai-sdk/google source if needed to find the right format.

Test: after creating this, the full flow should work: useChat → POST /api/chat → stream from Gemini with PDF context.
```

---

## Task 2.1 — Report Library Sidebar

**Agent type:** general-purpose (run in parallel with 2.2, 2.3)
**Creates:** src/components/report-library.tsx
**Depends on:** Phase 1 only for types
**Prompt:**

```
[SHARED CONTEXT]

Create src/components/report-library.tsx — "use client"

Report library sidebar. Users select 1+ reports to chat about.

PROPS:
  reports: Report[] (import from @/lib/reports)
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  isOpen: boolean
  onClose: () => void

DESKTOP (≥768px):
- Fixed 320px panel on START side (right side in RTL since dir=rtl)
- Full viewport height, bg-surface, border-e border-border
- Top: logo area — "تقريرك" (text-xl font-bold text-fg) + "محادثة ذكية مع تقاريرك" (text-sm text-fg-muted)
- Divider line
- Report list: each report is a clickable card:
  - Custom checkbox (20x20, rounded-[var(--radius-sm)], unchecked=border-border-strong bg-surface, checked=bg-fg border-fg white Check icon 14px)
  - FileText icon (lucide, 20px, text-fg-subtle)
  - Title (text-fg font-medium text-[15px])
  - Subtitle (text-fg-muted text-[13px])
  - Tags row: small pills (bg-surface-2 text-fg-muted rounded-full text-xs py-0.5 px-2)
  - Size (text-fg-subtle text-xs)
- Selected card: bg-accent-soft/40 with border-s-2 border-accent
- Hover: bg-surface-2 transition-colors duration-150
- Bottom: disabled "رفع تقرير جديد" button (Upload icon, outlined style, opacity-50, title="قريباً")

MOBILE (<768px):
- Overlay: fixed inset-0 z-50
- Backdrop: bg-black/30 backdrop-blur-sm, onClick=onClose
- Panel: absolute bottom-0 inset-x-0 max-h-[70dvh] bg-surface rounded-t-[var(--radius-xl)]
- Drag handle: centered gray bar (w-10 h-1 bg-border-strong rounded-full my-3)
- Header: "اختيار التقارير" (font-semibold) + X close button
- Same cards but compact
- Slide-up animation: translate-y-full → translate-y-0, duration-300

All interactive elements: cursor-pointer, focus-visible ring.
Aria: role="listbox" on list, role="option" + aria-selected on items, aria-label="مكتبة التقارير" on sidebar.
```

---

## Task 2.2 — Chat Messages

**Agent type:** general-purpose (run in parallel with 2.1, 2.3)
**Creates:** src/components/chat-messages.tsx
**Depends on:** None (uses Message type from ai package)
**Prompt:**

```
[SHARED CONTEXT]

Create src/components/chat-messages.tsx — "use client"

PROPS:
  messages: Message[] (import type { Message } from "ai")
  isLoading: boolean
  onSuggestedPrompt: (text: string) => void

CONTAINER: ref-based scroll container, flex-1 overflow-y-auto. Max-width 768px centered with mx-auto w-full, py-6 px-4 md:px-8.

USER BUBBLE (role=user):
- Aligned inline-end (self-end)
- bg-fg text-white, rounded-[var(--radius-lg)] rounded-ee-[var(--radius-sm)]
- py-3 px-4, max-w-[85%], text-[15px] leading-relaxed
- msg-in animation class

ASSISTANT BUBBLE (role=assistant):
- Aligned inline-start (self-start)
- bg-surface border border-border, rounded-[var(--radius-lg)] rounded-es-[var(--radius-sm)]
- py-4 px-5, max-w-[90%]
- Header row: Sparkles icon (16px text-accent) + "تقريرك" (text-xs text-fg-subtle) + gap
- Content: div with className="prose-msg" using dangerouslySetInnerHTML or just render as text
  Actually, render content as-is (Vercel AI SDK returns plain text, Gemini may return markdown).
  For markdown support: just render the text in a pre-wrap div with prose-msg class.
  Simple approach: split on \n, render paragraphs. Bold **text** can stay as-is for v1.
  OR install a tiny markdown renderer later. For now, whitespace-pre-wrap is fine.
- Footer: Copy button (Copy icon 14px, text-fg-subtle hover:text-fg). On click copy content, show Check icon for 2s.
- msg-in animation

TYPING INDICATOR (when isLoading and last message is user):
- Same position as assistant bubble
- Three dots: span.typing-dot (6px w-1.5 h-1.5 rounded-full bg-fg-subtle) × 3, gap-1.5
- Inside assistant bubble frame

EMPTY STATE (messages.length === 0):
- This is the page hero. Vertically and horizontally centered (flex-1 flex items-center justify-center).
- "تقريرك" (text-3xl font-bold text-fg)
- "اسأل، لخّص، قارِن — اكتشف تقاريرك بذكاء" (text-fg-muted text-base mt-2)
- 4 suggested prompt chips in 2×2 grid (gap-3, mt-8):
  { icon: ListChecks, text: "لخّص التقرير في ٥ نقاط رئيسية" }
  { icon: Hash, text: "استخرج أهم الأرقام والإحصائيات" }
  { icon: GitCompareArrows, text: "قارن بين التقريرين" }
  { icon: Lightbulb, text: "ما أبرز التوصيات؟" }
- Each chip: bg-surface border border-border rounded-[var(--radius-md)] py-3 px-4 flex items-center gap-3
  Icon 18px text-accent, text text-sm text-fg
  hover:bg-surface-2 hover:border-border-strong cursor-pointer transition-colors
  onClick → onSuggestedPrompt(text)

AUTO-SCROLL: useEffect on messages.length. Scroll to bottom only if user is within 150px of bottom. Use scrollHeight - scrollTop - clientHeight check. Smooth behavior.

Aria: aria-live="polite" on container, aria-label="المحادثة".
```

---

## Task 2.3 — Chat Input Bar

**Agent type:** general-purpose (run in parallel with 2.1, 2.2)
**Creates:** src/components/chat-input.tsx
**Depends on:** None
**Prompt:**

```
[SHARED CONTEXT]

Create src/components/chat-input.tsx — "use client"

PROPS:
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  isLoading: boolean
  selectedReports: { id: string; title: string }[]
  onRemoveReport: (id: string) => void
  disabled?: boolean

LAYOUT: sticky bottom-0, bg-bg border-t border-border. Inner: max-w-3xl mx-auto w-full py-3 px-4 md:px-8.

SELECTED REPORTS CHIPS (shown above input when selectedReports.length > 0):
- Horizontal flex wrap, gap-2, mb-2
- Each chip: inline-flex items-center gap-1.5 bg-surface-2 text-fg-muted text-xs rounded-full py-1 px-3
  FileText icon 12px + title (truncated max 20 chars) + X button (X icon 12px, hover:text-fg)
  onClick X → onRemoveReport(id)

NO REPORTS WARNING (when selectedReports.length === 0):
- bg-accent-soft text-accent text-xs rounded-[var(--radius-md)] py-2 px-3 mb-2 flex items-center gap-2
- AlertCircle icon 14px + "اختر تقريراً واحداً على الأقل للبدء"

INPUT WRAPPER:
- bg-surface border border-border rounded-[var(--radius-lg)] relative
- focus-within:border-fg focus-within:shadow-[var(--shadow-sm)]
- transition-all duration-150

TEXTAREA:
- w-full resize-none bg-transparent border-none outline-none
- py-3 ps-4 pe-14 (room for send button)
- text-[15px] leading-relaxed text-fg placeholder:text-fg-subtle
- placeholder="اسأل عن تقاريرك..."
- dir="auto"
- Auto-expand: min-h-[44px] max-h-[160px]. Use ref, on input set height=auto then height=scrollHeight+'px'.
- Keyboard: Enter=submit (if value.trim() && !isLoading && selectedReports.length > 0), Shift+Enter=newline

SEND BUTTON:
- Absolute end-2 bottom-2 (logical, so inline-end)
- w-9 h-9 rounded-full bg-fg text-white flex items-center justify-center
- Icon: when !isLoading → ArrowUp (18px), when isLoading → Loader2 (18px) with animate-spin
- Disabled when: !value.trim() || isLoading || selectedReports.length === 0
  Disabled style: opacity-30 cursor-not-allowed
- hover (when enabled): bg-fg/80
- transition-all duration-150

Aria: role="form" on wrapper, aria-label="أرسل رسالتك" on button, aria-label="اكتب رسالتك" on textarea.
```

---

## Task 3.1 — Main Page Assembly

**Agent type:** general-purpose
**Creates:** src/app/page.tsx (overwrite)
**Depends on:** All Phase 1 + Phase 2 tasks
**Prompt:**

```
[SHARED CONTEXT]

Read these files first to understand their props/exports:
- src/components/report-library.tsx
- src/components/chat-messages.tsx
- src/components/chat-input.tsx
- src/lib/reports.ts

Overwrite src/app/page.tsx — "use client"

This is the main page that wires everything together.

STATE:
- selectedReportIds: string[] — default to all report IDs from REPORTS
- isSidebarOpen: boolean — false by default (mobile sidebar toggle)

VERCEL AI SDK:
import { useChat } from "@ai-sdk/react"

const { messages, input, setInput, handleSubmit, isLoading, error } = useChat({
  api: "/api/chat",
  body: { reportIds: selectedReportIds },
})

The body option sends reportIds alongside messages on every request.

For handleSubmit — it's called as handleSubmit(e) from a form submit, or we can call it programmatically.
Create a wrapper: const submitMessage = () => { if (input.trim()) handleSubmit() }

SUGGESTED PROMPT HANDLER:
const handleSuggestedPrompt = (text: string) => {
  setInput(text)
  // Need to submit after setting input. useChat's handleSubmit reads from input state.
  // Use a ref or useEffect to submit after input changes.
  // Simplest: use append() from useChat instead:
}
Actually use `append` from useChat:
const { ..., append } = useChat(...)
const handleSuggestedPrompt = (text: string) => {
  append({ role: "user", content: text })
}

DESKTOP LAYOUT (≥768px):
- h-dvh flex (row — but since RTL, sidebar naturally goes to right)
- ReportLibrary: w-[320px] flex-shrink-0, on start side
- Main area: flex-1 flex flex-col min-w-0
  - ChatMessages: flex-1 overflow-y-auto
  - ChatInput: sticky bottom

MOBILE LAYOUT (<768px):
- h-dvh flex flex-col
- Top header: h-14 bg-surface border-b border-border flex items-center px-4
  - Start: button to toggle sidebar (PanelRight icon 22px text-fg-muted)
  - Center: "تقريرك" (font-semibold text-lg)
  - End: badge showing selected report count (min-w-6 h-6 rounded-full bg-fg text-white text-xs flex items-center justify-center)
- ChatMessages: flex-1 overflow-y-auto
- ChatInput: sticky bottom
- ReportLibrary: overlay mode (isOpen state)

REPORT SELECTION:
- onSelectionChange: update selectedReportIds
- onRemoveReport in ChatInput: remove that ID from selectedReportIds

ERROR DISPLAY:
- If error from useChat: show an error bar above chat input
  bg-danger/5 border border-danger/20 text-danger text-sm rounded-[var(--radius-md)] py-2 px-3 mx-4
  "حدث خطأ. يرجى المحاولة مرة أخرى." + retry button

KEYBOARD SHORTCUT:
- useEffect: listen for Cmd/Ctrl+K → focus textarea (pass ref via ChatInput)

Make it work perfectly on both desktop and mobile. Test by running pnpm dev.
```

---

## Task 4.1 — Error States & Edge Cases

**Agent type:** general-purpose
**Creates:** fixes across all components
**Depends on:** 3.1
**Prompt:**

```
[SHARED CONTEXT]

Read all component files in src/components/ and src/app/page.tsx.

Audit and fix every component for complete state coverage. The client spec says:
"حالات الواجهة كاملة: loading/empty/error/success"

Check each:

1. ChatMessages:
  - [x] Empty state (welcome + prompts)
  - [ ] Error state: if the last message has an error, show error bubble with retry
  - [ ] Streaming partial content display
  - [ ] Very long messages: ensure no overflow

2. ReportLibrary:
  - [ ] Add skeleton loading state (show 2 shimmer cards on mount briefly, or just instant-render since data is static — skip skeleton if data is sync)
  - [ ] Ensure clicking outside overlay closes it on mobile

3. ChatInput:
  - [ ] Disable submit when no reports selected
  - [ ] Handle paste events (large text paste)
  - [ ] Ensure textarea doesn't break on very long single words

4. Page:
  - [ ] Handle useChat error object — display in UI
  - [ ] Handle window resize (sidebar collapse/expand)
  - [ ] Ensure no hydration mismatches (all "use client" where needed)

5. API route:
  - [ ] Handle Gemini rate limit errors (429) — return specific Arabic message
  - [ ] Handle file upload failures — retry once, then error
  - [ ] Handle missing env vars gracefully on startup

Fix all issues found. Run pnpm build to verify no TS errors.
```

---

## Task 4.2 — RTL, Responsive & Accessibility Audit

**Agent type:** general-purpose
**Creates:** fixes across all files
**Depends on:** 4.1
**Prompt:**

```
[SHARED CONTEXT]

Final quality audit. Run these checks:

1. RTL AUDIT:
   Search ALL .tsx files for forbidden patterns and replace:
   - pl- → ps-    pr- → pe-    ml- → ms-    mr- → me-
   - left- → start-    right- → end-
   - text-left → text-start    text-right → text-end
   - rounded-tl → rounded-ss    rounded-tr → rounded-se
   - rounded-bl → rounded-es    rounded-br → rounded-ee
   - space-x → (verify it works in RTL, otherwise use gap)

2. ACCESSIBILITY:
   Verify every interactive element has:
   - Visible focus ring (focus-visible:)
   - aria-label in Arabic for icon-only buttons
   - Keyboard operability (buttons work with Enter/Space)
   Verify:
   - aria-live="polite" on messages container
   - Skip-to-content link: add <a href="#chat" className="sr-only focus:not-sr-only ...">انتقل إلى المحادثة</a> in layout

3. RESPONSIVE:
   Run pnpm dev. Check for:
   - No horizontal overflow at 320px width
   - Sidebar doesn't overlap content on desktop
   - Input bar visible and functional at all sizes
   - Touch targets ≥ 44px on mobile

4. PERFORMANCE:
   Run: pnpm build
   Check for:
   - No TypeScript errors
   - Bundle size is reasonable (no huge client-side imports)
   - Dynamic imports where beneficial (e.g., heavy components)

5. CODE QUALITY:
   - No console.log left (except in error handlers)
   - No 'any' types
   - No unused imports
   - Consistent naming

Fix everything found. Run pnpm build at the end to confirm clean.
```

---

## Task 4.3 — README & Documentation

**Agent type:** general-purpose (can run parallel with 4.2)
**Creates:** README.md, .env.example
**Depends on:** All code complete
**Prompt:**

```
[SHARED CONTEXT]

Create README.md at project root. ALL IN ARABIC:

# تقريرك — منصة تحليل التقارير بالذكاء الاصطناعي

Sections:
1. نظرة عامة — what this MVP demonstrates (3 sentences max)
2. المميزات — bullet list: محادثة ذكية, تلخيص, مقارنة, استخراج بيانات, دعم RTL كامل
3. التقنيات المستخدمة — Next.js 16, Vercel AI SDK, Google Gemini, TypeScript, Tailwind CSS v4
4. التشغيل المحلي — pnpm install, .env.local setup, pnpm dev
5. هيكل المشروع — directory tree with Arabic descriptions
6. البنية التقنية — brief architecture: client (useChat) → API route (streamText) → Gemini (with cached PDF files)
7. مسار التطوير — how this scales to 30k reports:
   - قاعدة بيانات: Supabase/Postgres + S3 storage
   - البحث الذكي: Vector embeddings for semantic search across reports
   - المصادقة: Supabase Auth / Auth0
   - الاشتراكات: Stripe/Moyasar with webhook billing
   - الأداء: Edge caching, ISR, CDN
8. المتغيرات البيئية — table of all env vars

Also ensure .env.example exists with:
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
NEXT_PUBLIC_APP_NAME=تقريرك
NEXT_PUBLIC_APP_URL=http://localhost:3000

Keep README concise and professional. No emoji. No filler.
```
