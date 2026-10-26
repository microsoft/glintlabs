import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UnderConstructionPage } from "../_components/under-construction-page";

const sections = {
  "people-science": {
    description:
      "We’re preparing research topics, methods, and guidance that connect People Science evidence to workplace questions.",
    title: "People Science",
  },
  collaborations: {
    description:
      "This space will feature work that brings together People Science, design, data, and workplace practice.",
    title: "Collaborations",
  },
  search: {
    description:
      "Search isn’t available yet. Explore Reports, Tools, and About from the main navigation.",
    title: "Search",
  },
  subscribe: {
    description:
      "Email updates aren’t open yet. We’ll publish subscription options and privacy details before sign-up begins.",
    title: "Glint Labs updates",
  },
} as const;

type SectionSlug = keyof typeof sections;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  const content = sections[section as SectionSlug];

  if (!content) return {};

  return {
    title: `${content.title} | Glint Labs`,
    description: content.description,
  };
}

export function generateStaticParams() {
  return Object.keys(sections).map((section) => ({ section }));
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const content = sections[section as SectionSlug];

  if (!content) notFound();

  return <UnderConstructionPage {...content} />;
}
