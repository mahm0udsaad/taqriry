import { getReport, getReports } from "./reports";
import reportsTextData from "@/data/reports-text.json";

type ReportsTextMap = Record<
  string,
  { title: string; year: string; text: string; pageCount: number }
>;

const reportsText = reportsTextData as unknown as ReportsTextMap;

/**
 * Get pre-extracted text for a single report.
 * Text was extracted at build time by `pnpm extract-pdfs`.
 */
export function getReportText(reportId: string): string {
  const data = reportsText[reportId];
  if (!data) {
    const report = getReport(reportId);
    throw new Error(
      `لم يتم العثور على نص التقرير: ${report?.title || reportId}. قم بتشغيل: pnpm extract-pdfs`
    );
  }

  return `===== بداية تقرير: "${data.title}" (${data.year}) =====\n\n${data.text}\n\n===== نهاية تقرير: "${data.title}" =====`;
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
