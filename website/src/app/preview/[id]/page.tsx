import type { Metadata } from "next";

import { PreviewClient } from "./preview-client";

export const metadata: Metadata = {
  title: "Report preview | Glint Labs",
  robots: {
    follow: false,
    index: false,
  },
};

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PreviewClient projectId={id} />;
}
