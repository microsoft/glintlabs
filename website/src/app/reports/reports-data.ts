export type ReportCategory = "annual" | "research-drop";

export type ReportCatalogItem = {
  badge: string;
  category: ReportCategory;
  description: string;
  employeeCount?: number;
  featured?: boolean;
  href: string;
  id: string;
  thumbnail?: {
    alt: string;
    src: string;
    presentation?: "image" | "illustration";
  };
  title: string;
};

export const publishedReports: ReportCatalogItem[] = [
  {
    badge: "2026 Annual Report",
    category: "annual",
    description:
      "The next generation of employee listening is not about collecting more signals. It is about building a system that can turn the right signals into credible action.",
    href: "/annual-report-2026",
    id: "annual-report-2026",
    title: "The next generation of employee listening",
  },
];

export const previewReportPlaceholders: ReportCatalogItem[] = Array.from({ length: 3 }, (_, index) => ({
  badge: "[Month Year] \u2022 Research Drop",
  category: "research-drop",
  description: "[Subtext. 3 lines max at full width]",
  href: "/reports",
  id: `studio-report-placeholder-${index + 1}`,
  title: "[Title]",
}));
