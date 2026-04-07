import { streamText, convertToModelMessages, tool, stepCountIs } from "ai";
import { geminiModel, buildSystemPrompt } from "@/lib/gemini";
import { getReportsContext } from "@/lib/pdf-extract";
import { REPORTS } from "@/lib/reports";
import { z } from "zod";

export const maxDuration = 60;
export const runtime = "nodejs";

const VALID_REPORT_IDS = new Set(REPORTS.map((r) => r.id));

/**
 * Detect if the user message is a simple greeting or general question
 * that doesn't need report tools.
 */
function isSimpleMessage(
  messages: Array<{ role: string; content?: string }>
): boolean {
  if (!messages || messages.length === 0) return true;
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMsg) return true;

  const text =
    typeof lastUserMsg.content === "string" ? lastUserMsg.content : "";
  if (text.length < 30) {
    const reportKeywords = [
      "تقرير", "تلخيص", "لخص", "قارن", "مقارنة", "أرقام", "إحصائ",
      "استخرج", "توصيات", "بيانات", "تحليل", "ملخص", "نقاط",
      "سنوي", "1444", "1445", "2023", "2024", "هدف", "hrdf",
    ];
    if (!reportKeywords.some((kw) => text.includes(kw))) return true;
  }
  return false;
}

/** Build the tools object for report analysis */
function buildTools() {
  return {
    fetchReportContent: tool({
      description:
        "جلب محتوى التقارير المحددة لتحليلها والإجابة على أسئلة المستخدم. استخدم هذه الأداة قبل الإجابة على أي سؤال يتعلق بمحتوى التقارير.",
      inputSchema: z.object({
        reportIds: z
          .array(z.string())
          .describe("معرّفات التقارير المطلوب جلبها."),
      }),
      execute: async ({ reportIds }) => {
        const validIds = reportIds.filter((id) => VALID_REPORT_IDS.has(id));
        if (validIds.length === 0) {
          return { error: "معرّفات التقارير غير صحيحة." };
        }
        const content = getReportsContext(validIds);
        return { content, fetchedReportIds: validIds };
      },
    }),

    showReportPicker: tool({
      description:
        "عرض واجهة اختيار التقرير للمستخدم عندما لا يكون هناك تقرير محدد.",
      inputSchema: z.object({
        prompt: z.string().describe("رسالة قصيرة للمستخدم"),
      }),
    }),

    askClarifyingQuestion: tool({
      description:
        "طرح سؤال توضيحي على المستخدم مع خيارات واضحة عندما يكون الطلب غامضاً.",
      inputSchema: z.object({
        question: z.string().describe("السؤال التوضيحي"),
        options: z
          .array(
            z.object({
              label: z.string().describe("نص الخيار"),
              value: z.string().describe("القيمة الداخلية"),
            })
          )
          .min(2)
          .describe("الخيارات المتاحة"),
      }),
    }),
  };
}

/**
 * Extract a user-friendly Arabic error message from API errors.
 */
function getErrorMessage(error: unknown): { message: string; status: number } {
  const errorStr = String(error);

  // Quota / rate limit exhausted
  if (
    errorStr.includes("429") ||
    errorStr.includes("RESOURCE_EXHAUSTED") ||
    errorStr.includes("quota")
  ) {
    return {
      message:
        "تم استنفاد رصيد الاستخدام المجاني لواجهة Gemini API. يرجى تحديث مفتاح API أو الانتظار حتى يتم تجديد الحصة.",
      status: 429,
    };
  }

  // Invalid API key
  if (
    errorStr.includes("401") ||
    errorStr.includes("API_KEY_INVALID") ||
    errorStr.includes("UNAUTHENTICATED")
  ) {
    return {
      message: "مفتاح API غير صالح. يرجى التحقق من إعدادات المفتاح.",
      status: 401,
    };
  }

  // Model not found
  if (errorStr.includes("404") || errorStr.includes("not found")) {
    return {
      message: "النموذج المطلوب غير متوفر. يرجى التحقق من اسم النموذج في الإعدادات.",
      status: 404,
    };
  }

  // Generic
  return {
    message: "حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.",
    status: 500,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, selectedReportIds = [] } = body;

    const validSelectedIds = Array.isArray(selectedReportIds)
      ? selectedReportIds.filter(
          (id: unknown): id is string =>
            typeof id === "string" && VALID_REPORT_IDS.has(id)
        )
      : [];

    const modelMessages = await convertToModelMessages(messages ?? []);
    const simple = isSimpleMessage(messages ?? []);

    const result = streamText({
      model: geminiModel,
      system: buildSystemPrompt(validSelectedIds),
      messages: modelMessages,
      ...(simple
        ? {}
        : {
            tools: buildTools(),
            stopWhen: stepCountIs(5),
          }),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[chat/route] Error:", error);
    const { message, status } = getErrorMessage(error);
    return Response.json({ error: message }, { status });
  }
}
