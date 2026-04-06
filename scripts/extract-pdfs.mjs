#!/usr/bin/env node
/**
 * Pre-extract text from all PDF reports and save as JSON.
 * Run: pnpm extract-pdfs
 */
import fs from "node:fs";
import path from "node:path";
import { PDFParse } from "pdf-parse";

const REPORTS = [
  { id: "annual-2023", title: "التقرير السنوي 2023", year: "2023", path: "public/reports/annual-2023.pdf" },
  { id: "taqriry-1444", title: "التقرير السنوي 1444هـ", year: "1444هـ", path: "public/reports/taqriry-1444.pdf" },
  { id: "taqriry-1445", title: "التقرير السنوي 1445هـ", year: "1445هـ", path: "public/reports/taqriry-1445.pdf" },
  { id: "hrdf-2024", title: "التقرير السنوي لصندوق تنمية الموارد البشرية 2024", year: "2024", path: "public/reports/hrdf-2024.pdf" },
];

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

async function main() {
  const result = {};

  for (const report of REPORTS) {
    const filePath = path.join(projectRoot, report.path);
    console.log(`Extracting: ${report.title} ...`);

    const buffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();

    result[report.id] = {
      title: report.title,
      year: report.year,
      text: parsed.text || "لم يتم استخراج نص من هذا التقرير",
      pageCount: parsed.pages || 0,
    };

    console.log(`  → ${parsed.pages || "?"} pages, ${(parsed.text || "").length} chars`);
  }

  const outPath = path.join(projectRoot, "src/data/reports-text.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`\nSaved to ${outPath}`);
}

main().catch(console.error);
