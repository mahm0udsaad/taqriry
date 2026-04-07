import { getReport, getReports } from "./reports";
import reportsTextData from "@/data/reports-text.json";

type ReportsTextMap = Record<
  string,
  { title: string; year: string; text: string; pageCount: number }
>;

const reportsText = reportsTextData as unknown as ReportsTextMap;

/**
 * Max chars per report to send to the model.
 * ~30K chars ≈ ~7.5K tokens. For 4 reports = ~30K tokens total.
 * This keeps us well within Gemini's context + avoids timeouts.
 */
const MAX_CHARS_PER_REPORT = 30_000;

/**
 * Get pre-extracted text for a single report.
 * Text was extracted at build time by `pnpm extract-pdfs`.
 * Truncates to MAX_CHARS_PER_REPORT to avoid token limits.
 */
export function getReportText(reportId: string): string {
  const data = reportsText[reportId];
  if (!data) {
    const report = getReport(reportId);
    throw new Error(
      `لم يتم العثور على نص التقرير: ${report?.title || reportId}. قم بتشغيل: pnpm extract-pdfs`
    );
  }

  let text = data.text;
  const wasTruncated = text.length > MAX_CHARS_PER_REPORT;

  if (wasTruncated) {
    // Truncate at a word boundary
    text = text.slice(0, MAX_CHARS_PER_REPORT);
    const lastSpace = text.lastIndexOf(" ");
    if (lastSpace > MAX_CHARS_PER_REPORT * 0.9) {
      text = text.slice(0, lastSpace);
    }
    text += "\n\n[... تم اقتطاع بقية التقرير لتقليل الحجم ...]";
  }

  return `===== بداية تقرير: "${data.title}" (${data.year}) =====\n\n${text}\n\n===== نهاية تقرير: "${data.title}" =====`;
}

/**
 * Get pre-extracted text for multiple reports.
 * Returns a combined string with clear delimiters between reports.
 */
export function getReportsContext(reportIds: string[]): string {
  const reports = getReports(reportIds);
  if (reports.length === 0) {
    throw new Error("لم يتم العثور على أي تقارير.");
  }

  return reportIds.map((id) => getReportText(id)).join("\n\n");
}
