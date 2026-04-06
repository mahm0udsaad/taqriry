/**
 * Reports manifest.
 *
 * In production, this would come from the database (Postgres / Supabase).
 * For the MVP demo, PDFs live in /public/reports and are listed here.
 */
export type Report = {
  id: string;
  title: string;
  subtitle: string;
  /** path under /public, served as a static file */
  path: string;
  /** file size in MB */
  sizeMb: number;
  year: string;
  pages?: number;
  tags: string[];
};

export const REPORTS: Report[] = [
  {
    id: "annual-2023",
    title: "التقرير السنوي 2023",
    subtitle: "بيانات وإنجازات العام المالي 2023",
    path: "/reports/annual-2023.pdf",
    sizeMb: 7.4,
    year: "2023",
    tags: ["سنوي", "مالي", "إنجازات"],
  },
  {
    id: "taqriry-1444",
    title: "التقرير السنوي 1444هـ",
    subtitle: "تقرير النشر العام — السنة المالية 1444هـ",
    path: "/reports/taqriry-1444.pdf",
    sizeMb: 15.0,
    year: "1444هـ",
    tags: ["سنوي", "نشر", "1444"],
  },
  {
    id: "taqriry-1445",
    title: "التقرير السنوي 1445هـ",
    subtitle: "تقرير النشر العام — السنة المالية 1445هـ",
    path: "/reports/taqriry-1445.pdf",
    sizeMb: 27.2,
    year: "1445هـ",
    tags: ["سنوي", "نشر", "1445"],
  },
  {
    id: "hrdf-2024",
    title: "التقرير السنوي لصندوق تنمية الموارد البشرية 2024",
    subtitle: "تقرير هدف السنوي — 2024م",
    path: "/reports/hrdf-2024.pdf",
    sizeMb: 31.5,
    year: "2024",
    tags: ["هدف", "موارد بشرية", "توظيف"],
  },
];

export function getReport(id: string): Report | undefined {
  return REPORTS.find((r) => r.id === id);
}

export function getReports(ids: string[]): Report[] {
  const set = new Set(ids);
  return REPORTS.filter((r) => set.has(r.id));
}
