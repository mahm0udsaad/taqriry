import { streamText, convertToModelMessages, tool, stepCountIs } from "ai";
import { geminiModel, buildSystemPrompt } from "@/lib/gemini";
import { getReportsContext } from "@/lib/pdf-extract";
import { REPORTS } from "@/lib/reports";
import { z } from "zod";

export const maxDuration = 60;
export const runtime = "nodejs";

const VALID_REPORT_IDS = new Set(REPORTS.map((r) => r.id));

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, selectedReportIds = [] } = body;

    const validSelectedIds = Array.isArray(selectedReportIds)
      ? selectedReportIds.filter((id: unknown): id is string =>
          typeof id === "string" && VALID_REPORT_IDS.has(id)
        )
      : [];

    const modelMessages = await convertToModelMessages(messages ?? []);

    const result = streamText({
      model: geminiModel,
      system: buildSystemPrompt(validSelectedIds),
      messages: modelMessages,
      stopWhen: stepCountIs(5),
      tools: {
        // Server-side tool: fetches report text and returns it to the AI
        fetchReportContent: tool({
          description:
            "جلب محتوى التقارير المحددة لتحليلها والإجابة على أسئلة المستخدم. استخدم هذه الأداة قبل الإجابة على أي سؤال.",
          inputSchema: z.object({
            reportIds: z
              .array(z.string())
              .describe(
                "معرّفات التقارير المطلوب جلبها. يجب أن تكون من القائمة المتاحة."
              ),
          }),
          execute: async ({ reportIds }) => {
            const validIds = reportIds.filter((id) => VALID_REPORT_IDS.has(id));
            if (validIds.length === 0) {
              return {
                error:
                  "معرّفات التقارير غير صحيحة. استخدم المعرّفات من قائمة التقارير المتاحة.",
              };
            }
            const content = getReportsContext(validIds);
            return { content, fetchedReportIds: validIds };
          },
        }),

        // Client-side tool: renders interactive report picker in the chat
        showReportPicker: tool({
          description:
            "عرض واجهة اختيار التقرير للمستخدم. استخدمها عندما لا يكون هناك تقرير محدد أو عندما يحتاج المستخدم لاختيار تقرير.",
          inputSchema: z.object({
            prompt: z
              .string()
              .describe("رسالة قصيرة تشرح للمستخدم لماذا يحتاج لاختيار تقرير"),
          }),
          // No execute → client-side interactive tool
        }),

        // Client-side tool: renders choice chips for ambiguous questions
        askClarifyingQuestion: tool({
          description:
            "طرح سؤال توضيحي على المستخدم مع خيارات واضحة. استخدمها عندما يكون الطلب غامضاً أو عندما يوجد عدة تقارير ولا تعرف أيها المقصود.",
          inputSchema: z.object({
            question: z.string().describe("السؤال التوضيحي للمستخدم"),
            options: z
              .array(
                z.object({
                  label: z.string().describe("نص الخيار المعروض للمستخدم"),
                  value: z.string().describe("القيمة الداخلية للخيار"),
                })
              )
              .min(2)
              .describe("الخيارات المتاحة (2 على الأقل)"),
          }),
          // No execute → client-side interactive tool
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[chat/route] Error:", error);
    return Response.json(
      { error: "حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى." },
      { status: 500 }
    );
  }
}
